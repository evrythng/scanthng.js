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
const getMergedOptions = (userOptions) => {
  const fullOptions = Utils.extend(DEFAULT_OPTIONS, userOptions);

  // Setup all nested object as copies of the default
  fullOptions.imageConversion = Utils.extend(
    DEFAULT_OPTIONS.imageConversion,
    userOptions ? userOptions.imageConversion : {}
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

const getParamStr = params => Object.entries(params).map(p => `${p[0]}=${p[1]}`).join('&');

/**
 * Effectively send the recognition request to the API, passing in the
 * Base64 image data and request options.
 *
 * @param {object} app - The Application scope.
 * @param {object} options - Current options.
 * @param {object} [data] - Optional request data as { image }.
 * @returns {Promise}
 */
const decodeRequest = (app, options, data) => {
  const params = {};
  ['debug', 'perPage', 'filter'].forEach((option) => {
    if (options[option]) {
      params[option] = options[option];
    }
  });

  // Handle object filter
  if (typeof params.filter === 'object') {
    params.filter = getParamStr(params.filter);
  }

  const requestOptions = {
    url: API_PATH,
    method: data ? 'post' : 'get',
    apiKey: app.apiKey,
    params,
  };

  if (data) {
    requestOptions.body = JSON.stringify(data);
  }

  return evrythng.api(requestOptions);
};

/**
 * If `createAnonymousUser` options is enabled, will try to restore anonymous 
 * user saved in local storage (or cookie) and create a new anonymous user if 
 * there's no saved one.
 *
 * @param {object} app - The Application scope.
 * @param {object} options - Current options.
 * @returns {Promise}
 */
const getAnonymousUser = (app, options) => new Promise((resolve) => {
  if (!(options && options.createAnonymousUser)) {
    resolve();
    return;
  }

  const anonUser = Utils.restoreUser(app, evrythng.User);
  if (typeof anonUser === 'object') {
    resolve(anonUser);
    return;
  }

  const payload = { anonymous: true };
  return app.appUser().create(payload)
    .then((createdUser) => {
      Utils.storeUser(app, createdUser);
      return createdUser;
    });
});

/**
 * Process response of the decode request, adding an anonymous user if requested.
 *
 * @param {object} app - The Application scope.
 * @param {object} response - The response.
 * @param {object} options - Current options.
 * @returns {Promise}
 */
const processResponse = (app, response, options) => getAnonymousUser(app, options)
  .then(anonUser => response.map((item) => {
    // Attach user if avaialble.
    if (anonUser) {
      item.user = anonUser;
    }

    return item;
  }));

/**
 * Decode image (send request to IR API and process the response)
 *
 * @param {object} app - The Application scope.
 * @param {object} options - Current options.
 * @param {object} [data] - Optional request data.
 * @returns {Promise}
 */
const decode = (app, options, data) => 
  decodeRequest(app, options, data).then(res => processResponse(app, res, options));

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
  app.scan(canvas.toDataURL(), { filter }).then((res) => {
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
const scanStream = function (opts = {}) {
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

  // Handle defaults and casing
  opts.filter = opts.filter || {};
  opts.filter.method = (opts.filter.method || '2d').toLowerCase();
  opts.filter.type = (opts.filter.type || 'qr_code').toLowerCase();

  // Open the stream, identify barcode, then inform the caller.
  const thisApp = this;
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function (stream) {
      insertVideoElement(opts.containerId);
      return findBarcode(thisApp, stream, opts);
    })
    .then(res => processResponse(thisApp, res));
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
const identify = function (opts) {
  if (!(typeof opts === 'object' && opts.filter)) {
    throw new Error('Missing filter option.');
  }

  return decode(this, getMergedOptions(opts));
};

/**
 * Begin an image scan.
 *
 * @param {string} [param1] - Optional image data. If not supplued, 'catch all' mode is used.
 * @param {object} [param2] - Optional options.
 * @returns {Promise}
 */
const scan = function (param1, param2) {
  let imageData;
  let options = {};
  if (!param1) {
    // Default mode
  } else if (!param2) {
    if (typeof param1 === 'string') {
      // Data only
      imageData = param1;
    } else {
      // Options only
      options = param1;
    }
  } else {
    // Data, then options
    imageData = param1;
    options = param2;
  }

  const prepareOptions = {
    invisible: options.invisible,
    imageConversion: options.imageConversion
  };

  const preparePromise = (typeof imageData === 'string')
    // We already have the image string data, so we only need to process it.
    ? Prepare.processImage(imageData, prepareOptions)
    // Fetch the image data from the file input, before processing.
    : Prepare.getFile(prepareOptions).then(Prepare.processImage);

  // Send recognition request to the EVRYTHNG API once image is done processing
  const thisApp = this;
  return preparePromise.then(data => decode(thisApp, getMergedOptions(options), data));
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
