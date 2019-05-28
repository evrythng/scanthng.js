/* globals jsQR */

const Utils = require('./utils');
const Prepare = require('./prepare');

const API_PATH = '/scan/identifications';

/** The ID of the <video> element inserted by the SDK. */
const VIDEO_ELEMENT_ID = 'scanthng-video-' + Date.now();
/** The interval between QR code local stream samples. */
const SAMPLE_INTERVAL_FAST = 300;
/** The interval between other image requests. */
const SAMPLE_INTERVAL_SLOW = 2000;

/** 
 * Setup default settings:
 * - _**invisible**: File input visibility_
 * - _**imageConversion.greyscale**: Send black & white image, instead of colors_
 * - _**imageConversion.resizeTo**: Maximum smaller dimension of the image sent_
 * - _**imageConversion.exportQuality**: Conversion quality (0 no quality - 1 original quality)_
 * - _**createAnonymousUser**: Create anonymous user when making scan actions_
 */
const DEFAULT_OPTIONS = {
  invisible: true,
  imageConversion: {
    greyscale: true,
    resizeTo: 600,
    exportQuality: 0.8
  },
  createAnonymousUser: false
};

/**
 * Deeply extend options.
 *
 * @param {object} userOptions - The user options.
 * @returns {object} The full options object.
 */
const _extendOptions = (userOptions) => {
  const fullOptions = Utils.extend(DEFAULT_OPTIONS, userOptions);

  // Setup all nested object as copies of the default
  fullOptions.imageConversion = Utils.extend(
    DEFAULT_OPTIONS.imageConversion,
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

/**
 * Effectively send the recognition request to the API, passing in the
 * Base64 image data and request options.
 *
 * @param {object} app - The Application scope.
 * @param {object} options - Current options.
 * @param {object} [data] - Optional request data.
 * @returns {Promise}
 */
const _decodeRequest = (app, options, data) => {
  const params = {};
  ['debug', 'perPage', 'filter'].forEach((option) => {
    if (options[option]) {
      params[option] = options[option];
    }
  });

  console.log({ params });
  const paramsStr = Object.entries(params).map(p => `${p[0]}=${p[1]}`).join('&');
  const requestOptions = {
    url: `${API_PATH}?${paramsStr}`,
    method: data ? 'post' : 'get',
    apiKey: app.apiKey,
  };

  if (data) {
    requestOptions.formData = data;
  }
  console.log({ requestOptions });

  return evrythng.api(requestOptions);
};

/**
 * Process response of the decode request.
 *
 * @param {object} response - The response.
 * @param {object} options - Current options.
 * @returns {Promise}
 */
const _processResponse = (response, options) => _getAnonymousUser(options)
  .then(anonUser => response.map((item) => {
    // Attach user if avaialble.
    if (typeof anonUser === 'object') {
      item.user = anonUser;
    }

    return item;
  }));

/**
 * If `createAnonymousUser` options is enabled, will try to restore anonymous 
 * user saved in local storage (or cookie) and create a new anonymous user if 
 * there's no saved one.
 *
 * @param {object} options - Current options.
 * @returns {Promise}
 */
const _getAnonymousUser = async function (options) {
  if (!options.createAnonymousUser) {
    return;
  }


  const anonUser = Utils.restoreUser(this, evrythng.User);
  if (typeof anonUser === 'object') {
    return anonUser;
  }

  const payload = { anonymous: true };
  return this.appUser().create(payload)
    .then(function (createdUser) {
      Utils.storeUser(this, createdUser);
      return createdUser;
    });
}

/**
 * Decode image (send request to IR API and process the response)
 *
 * @param {object} app - The Application scope.
 * @param {object} options - Current options.
 * @param {object} [data] - Optional request data.
 * @returns {Promise}
 */
const _decode = (app, options, data) => 
  _decodeRequest(app, options, data).then(res => _processResponse(res, options));

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {object} app - The app performing the scan.
 * @param {object} canvas - The canvas element.
 * @param {object} video - The SDK-inserted <video> element.
 * @param {object} filter - The scanning filter.
 * @param {function} foundCb - Callback for if a code is found.
 */
const scanSample = (app, canvas, video, filter, foundCb) => {
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
 * @param {object} app - The app performing the scan.
 * @param {object} stream - The stream to consume.
 * @param {object} opts - The scanning options.
 * @returns {Promise} A Promise that resolves once recognition is completed.
 */
const findBarcode = (app, stream, opts) => {
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
        scanSample(app, canvas, video, opts.filter, (res) => {
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
const scanStream = function (opts) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia() is not supported with this browser; falling back to Media Capture.');
    return this.scan(opts);
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
  const _app = this
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function (stream) {
      insertVideoElement(opts.containerId);
      return findBarcode(_app, stream, opts);
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
 */
const identify = async function (opts) {
  if (!(typeof opts === 'object' && opts.filter)) {
    throw new Error('Missing filter option.');
  }

  return _decode(this, _extendOptions(opts));
};

/**
 * Begin an image scan.
 *
 * @param {string} [imgData] - Optional image data. If not supplued, 'catch all' mode is used.
 * @param {object} [opts] - Optional options.
 * @returns {Promise}
 */
const scan  = async function (imgData, opts) {
  let imageData, options;

  if (typeof arguments[0] === 'object') {
    // options first, no image data
    options = arguments[0];
  } else {
    // image first
    imageData = arguments[0];
    options = arguments[1];
  }

  options = _extendOptions(options);
  const prepareOptions = {
    invisible: options.invisible,
    imageConversion: options.imageConversion
  };

  let preparePromise;
  if (typeof imageData === 'string') {
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
  return preparePromise.then(function (data) {
    return _decode(this, options, data);
  });
};

// Plugin API
const ScanThng = {
  install: (api) => {
    api.scopes.Application.prototype.redirect = redirect;
    api.scopes.Application.prototype.identify = identify;
    api.scopes.Application.prototype.scanStream = scanStream;
    api.scopes.Application.prototype.scan = scan;
  },

  // Export for testing
  insertVideoElement,
};

module.exports = ScanThng;
