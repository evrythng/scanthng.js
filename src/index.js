/* globals jsQR */

import Utils from './utils';
import Prepare from './prepare';

// The ID of the <video> element inserted by the SDK.
const VIDEO_ELEMENT_ID = 'scanthng-video-' + Date.now();
// The interval between QR code local stream samples.
const SAMPLE_INTERVAL_FAST = 300;
// The interval between other image requests.
const SAMPLE_INTERVAL_SLOW = 2000;

// Setup default settings:
// - _**invisible**: File input visibility_
// - _**imageConversion.greyscale**: Send black & white image, instead of colors_
// - _**imageConversion.resizeTo**: Maximum smaller dimension of the image sent_
// - _**imageConversion.exportQuality**: Conversion quality (0 no quality - 1 original quality)_
// - _**createAnonymousUser**: Create anonymous user when making scan actions_
const defaultSettings = {
  invisible: true,
  imageConversion: {
    greyscale: true,
    resizeTo: 600,
    exportQuality: 0.8
  },
  createAnonymousUser: false
};

const API_PATH = '/scan/identifications';

let app;
let currentOptions;

// Deep extension of options.
const _extendOptions = (defaultOptions, userOptions) => {
  const fullOptions = Utils.extend(defaultOptions, userOptions);

  // Setup all nested object as copies of the default
  fullOptions.imageConversion = Utils.extend(
    defaultOptions.imageConversion,
    userOptions && userOptions.imageConversion || {}
  );

  // Use biggest size from default and what user defines.
  if (userOptions && userOptions.imageConversion && userOptions.imageConversion.resizeTo) {
    fullOptions.imageConversion.resizeTo = Math.max(
      fullOptions.imageConversion.resizeTo,
      userOptions.imageConversion.resizeTo
    );
  }

  return fullOptions;
};

// Effectively send the recognition request to the API, passing in the
// Base64 image data and request options.
const _decodeRequest = (data) => {
  const params = {};
  ['debug', 'perPage', 'filter'].forEach((option) => {
    if (currentOptions[option]) {
      params[option] = currentOptions[option];
    }
  });

  const requestOptions = {
    url: API_PATH,
    method: data ? 'post' : 'get',
    apiKey: app.apiKey,
    params,
  };

  if (data) {
    requestOptions.formData = data;
  }

  return evrythng.api(requestOptions);
};

// Process response of the decode request.
const _processResponse = response => _getAnonymousUser()
  .then(anonUser => response.map((item) => {
    // Attach user if avaialble.
    if (Utils.isObject(anonUser)) {
      item.user = anonUser;
    }

    return item;
  }));

// If `createAnonymousUser` options is enabled, will try to restore anonymous user saved
// in local storage (or cookie) and create a new anonymous user if there's no saved one.
const _getAnonymousUser = async () => {
  if (!currentOptions.createAnonymousUser) {
    return;
  }

  const anonUser = Utils.restoreUser(app, evrythng.User);
  if (Utils.isObject(anonUser)) {
    return anonUser;
  }

  const payload = { anonymous: true };
  return app.appUser().create(payload)
    .then((createdUser) => {
      Utils.storeUser(app, createdUser);
      return createdUser;
    });
};

// Decode image (send request to IR API and process the response)
const _decode = data => _decodeRequest(data).then(_processResponse);

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {object} canvas - The canvas element.
 * @param {object} video - The SDK-inserted <video> element.
 * @param {object} filter - The scanning filter.
 * @param {function} foundCb - Callback for if a code is found.
 */
const scanSample = (canvas, video, filter, foundCb) => {
  // Match canvas internal dimensions to that of the video and draw for the user
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  if (filter.method === '2d' && filter.type === 'qr_code') {
    let imgData;
    try {
      imgData = context.getImageData(0, 0, video.videoWidth, video.videoHeight);
    } catch (e) {
      console.log('Failed to getImageData - device may not be ready.');
      return;
    }

    // Scan image data with jsQR
    const result = window.jsQR(imgData.data, imgData.width, imgData.height);
    if (result) {
      foundCb(result.data);
    }
    return;
  }

  // Else, send image data to ScanThng - 1d && ir implicitly included
  app.scan(canvas.toDataURL()).then((res) => {
    if (res.length) {
      foundCb(res);
    }
  }).catch((err) => {
    if (err.errors && err.errors[0].includes('lacking sufficient detail')) {
      // Handle 'not found' for empty images based on API response
      return;
    }

    throw err;
  });
};

/**
 * Consume a getUserMedia() video stream and resolves once recognition is completed.
 *
 * @param {object} stream - The stream to consume.
 * @param {object} opts - The scanning options.
 * @returns {Promise} A Promise that resolves once recognition is completed.
 */
const findBarcode = (stream, opts) => {
  const video = document.getElementById(VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  return new Promise((resolve, reject) => {
    const interval = (opts.filter.method === '2d' && opts.filter.type === 'qr_code')
      ? SAMPLE_INTERVAL_FAST
      : SAMPLE_INTERVAL_SLOW;

    const canvas = document.createElement('canvas');
    const handle = setInterval(() => {
      try {
        // Scan each sample for a barcode, and resolve if a result is found.
        scanSample(canvas, video, opts.filter, (res) => {
          clearInterval(handle);
          stream.getVideoTracks()[0].stop();

          // Hide the video's parent element - nothing to show anymore
          video.parentElement.removeChild(video);

          // Identify a URL with ScanThng
          if (typeof res === 'string') {
            opts.filter = `type=qr_code&value=${res}`;
            app.identify(opts).then(resolve);
            return;
          }

          resolve(res);
        });
      } catch (e) {
        reject(e);
      }
    }, interval);
  });
};

/**
 * Insert a Safari-compatible <video> element inside parent, if it doesn't already exist.
 *
 * @param {string} containerId - ID of the user's desired parent element.
 */
const insertVideoElement = (containerId) => {
  // Prevent duplicates
  if (document.getElementById(VIDEO_ELEMENT_ID)) {
    return;
  }

  const video = document.createElement('video');
  video.id = VIDEO_ELEMENT_ID;
  video.autoPlay = true;
  video.playsInline = true;
  document.getElementById(containerId).appendChild(video);
};

/**
 * Use getUserMedia() and jsQR.js to scan QR codes locally, using /identifications for lookup.
 *
 * @param {object} opts - Scanning options including standard 'filter' and 'containerId'.
 * @returns {Promise} A Promise that resolves with any scan results.
 */
function scanStream (opts) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia() is not supported with this browser; falling back to Media Capture.');
    return app.scan(opts);
  }

  if (!window.jsQR) {
    throw new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.');
  }

  if (!document.getElementById(opts.containerId)) {
    throw new Error('Please specify \'containerId\' where the video element can be added as a child');
  }

  if (!(opts.filter.method && opts.filter.type)) {
    throw new Error('Please specify both \'method\' and \'type\' in \'filter\'.');
  }

  // Handle '2D' instead of '2d' entered by user
  opts.filter.method = opts.filter.method.toLowerCase();
  opts.filter.type = opts.filter.type.toLowerCase();

  // Open the stream, identify barcode, then inform the caller.
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      insertVideoElement(opts.containerId);
      return findBarcode(stream, opts);
    })
    .then(_processResponse);
};

/**
 * Redirect the browser to a given URL.
 *
 * @param {string} url - The URL to redirect to.
 */
const redirect = (url) => {
  window.location.href = url;
};

/**
 * Identify a scanned value.
 *
 * @param {object} opts - Additional options.
 * @param {function} successCb - Success callback.
 * @param {function} errorCb - Error callback.
 */
async function identify (opts, successCb, errorCb) {
  if (!(Utils.isObject(opts) && opts.hasOwnProperty('filter'))) {
    throw new Error('Missing filter option.');
  }

  currentOptions = _extendOptions(ScanThng.settings, opts);

  return _decode().then((result) => {
    if (Utils.isFunction(successCb)) {
      successCb(result);
    }

    return result;
  }).catch((err) => {
    if (Utils.isFunction(errorCb)) {
      errorCb(err);
    }

    throw err;
  });
}

async function scan (imgData, opts, successCallback, errorCallback) {
  var imageData, options, successCb, errorCb;

  // Process and prepare options and arguments.
  if (Utils.isFunction(arguments[0])) {
    /* callback first */
    successCb = arguments[0];
    errorCb = arguments[1];
  } else if (Utils.isObject(arguments[0])) {
    /* options first */
    options = arguments[0];
    successCb = arguments[1];
    errorCb = arguments[2];
  } else {
    /* image first */
    imageData = arguments[0];
    if (Utils.isFunction(arguments[1])) {
      /* callback second */
      successCb = arguments[1];
      errorCb = arguments[2];
    } else {
      /* options second */
      options = arguments[1];
      successCb = arguments[2];
      errorCb = arguments[3];
    }
  }

  currentOptions = _extendOptions(ScanThng.settings, options);

  const prepareOptions = {
    invisible: currentOptions.invisible,
    imageConversion: currentOptions.imageConversion
  };

  let preparePromise;
  if (Utils.isString(imageData)) {
    // Reject if string is not a valid Image Data Url
    if (!Utils.isDataUrl(imageData)) {
      throw new Error('Invalid Image Data URL.');
    }

    // We already have the image string data, so we only need to process it.
    preparePromise = Prepare.processImage(imageData, prepareOptions);
  } else {
    // Fetch the image data from the file input, before processing.
    preparePromise = Prepare.getFile(prepareOptions).then(Prepare.processImage);
  }

  // Send recognition request to the EVRYTHNG API once image is done processing
  preparePromise.then(_decode).then((result) => {
    if (Utils.isFunction(successCb)) {
      successCb(result);
    }

    return result;
  }).catch((err) => {
    if (Utils.isFunction(errorCb)) {
      errorCb(err);
    }

    throw err;
  });
}

// Plugin API
const ScanThng = {
  settings: defaultSettings,

  install: (api) => {
    // Add redirect method to the ApplicationScope
    api.scopes.App.prototype.redirect = redirect;

    // Add identify method to the ApplicationScope
    api.scopes.App.prototype.identify = identify;

    // Scan a video stream for QR codes
    api.scopes.App.prototype.scanStream = scanStream;

    // Scan an image from the camera or local file.
    api.scopes.App.prototype.scan = scan;
  },

  // Export for testing
  insertVideoElement,
};

export default ScanThng;
