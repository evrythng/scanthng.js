/* globals jsQR */

const Utils = require('./utils');
const Media = require('./media');
const Stream = require('./stream');

const API_PATH = '/scan/identifications';

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
    resizeTo: 1000,
    exportQuality: 0.9
  },
  createAnonymousUser: false
};

/**
 * Deeply extend options.
 *
 * @param {Object} userOptions - The user options.
 * @returns {Object} The full options object.
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
 * @param {Object} app - The Application scope.
 * @param {Object} options - Current options.
 * @param {Object} [data] - Optional request data as { image }.
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
 * @param {Object} app - The Application scope.
 * @param {Object} options - Current options.
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
 * @param {Object} app - The Application scope.
 * @param {Object} response - The response.
 * @param {Object} options - Current options.
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
 * @param {Object} app - The Application scope.
 * @param {Object} options - Current options.
 * @param {Object} [data] - Optional request data.
 * @returns {Promise}
 */
const decode = (app, options, data) =>
  decodeRequest(app, options, data).then(res => processResponse(app, res, options));

/**
 * Create a normalised API response object.
 *
 * @param {Object} thisApp - Current Application scope.
 * @param {Object} options - Current options.
 * @param {string} scanValue - Scanned value.
 * @returns {Promise<Object>} Promise that resolves an object resembling an API response.
 */
const createResultObject = (thisApp, options, scanValue) => {
  const metaOnlyRes = [{
    results: [],
    meta: { value: scanValue },
  }];

  // Emulate a meta-only response from the API
  if (options.offline) {
    return metaOnlyRes;
  }

  // Identify a URL with ScanThng, or else return meta-only response
  if (typeof scanValue === 'string') {
    options.filter = `type=${options.filter.type}&value=${scanValue}`;
    return thisApp.identify(options)
      .catch((e) => {
        console.log('Identification failed, falling back to meta-only response');
        console.log(e);

        return metaOnlyRes;
      });
  }
};

/**
 * Use getUserMedia() and jsQR.js to scan QR codes locally, using /identifications for lookup.
 *
 * @param {Object} opts - Scanning options including standard 'filter' and 'containerId'.
 * @returns {Promise} A Promise that resolves with any scan results.
 */
const scanStream = function (opts = {}) {
  const { filter, offline } = opts;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia() is not supported with this browser; falling back to Media Capture.');
    return this.scan(opts);
  }

  if (!filter || !filter.method || !filter.type) {
    throw new Error('Please provide valid filter');
  }

  // Open the stream, identify barcode, then inform the caller.
  const thisApp = this;
  return Stream.scanCode(opts, thisApp)
    .then(scanValue => createResultObject(thisApp, opts, scanValue))
    .then(res => processResponse(thisApp, res));
};

/**
 * Stop the stream and hide the video.
 */
const stopStream = function () {
  Stream.stop();
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
 * @param {Object} opts - Additional options.
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
 * @param {Object} [param2] - Optional options.
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
    ? Media.processImage(imageData, prepareOptions)
    // Fetch the image data from the file input, before processing.
    : Media.getFile(prepareOptions).then(Media.processImage);

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
    api.scopes.Application.prototype.stopStream = stopStream;
    api.scopes.Application.prototype.scan = scan;
  },
  scanQrCode: (containerId) => {
    const filter = { method: '2d', type: 'qr_code' };
    return Stream.scanCode({ containerId, filter });
  },
  stopScanQrCode: Stream.stop,
};

module.exports = ScanThng;
