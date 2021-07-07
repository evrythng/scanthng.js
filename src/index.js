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
    exportQuality: 0.9,
  },
  createAnonymousUser: false,
};

/**
 * Deeply extend options.
 *
 * @param {Object} userOptions - The user options.
 * @returns {Object} The full options object.
 */
const getMergedOptions = (userOptions) => {
  const fullOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  // Setup all nested object as copies of the default
  fullOptions.imageConversion = {
    ...DEFAULT_OPTIONS.imageConversion,
    ...(userOptions ? userOptions.imageConversion : {}),
  };

  // Use biggest size from default and what user defines.
  if (userOptions && userOptions.imageConversion && userOptions.imageConversion.resizeTo) {
    fullOptions.imageConversion.resizeTo = Math.max(
      fullOptions.imageConversion.resizeTo,
      userOptions.imageConversion.resizeTo,
    );
  }

  return fullOptions;
};

/**
 * Get parameter string.
 *
 * @param {object} params - Query parameters to convert.
 * @returns {string}
 */
const getParamStr = (params) => Object.entries(params).map((p) => `${p[0]}=${p[1]}`).join('&');

/**
 * If `createAnonymousUser` options is enabled, will try to restore anonymous
 * user saved in local storage and create a new anonymous user if
 * there's no saved one. Only works with an Application scope.
 *
 * @param {Object} scope - The Application or Operator scope.
 * @param {Object} options - Current options.
 * @returns {Promise}
 */
const getAnonymousUser = (scope, options) => {
  if (!(options && options.createAnonymousUser)) return Promise.resolve();

  // Not an Application scope
  if (!scope.appUser) {
    throw new Error('createAnonymousUser only available with Application Scope type');
  }

  // Read one stored previously
  const anonUser = Utils.restoreUser(scope, evrythng.User);
  if (typeof anonUser === 'object') return Promise.resolve(anonUser);

  // Create a new one
  const payload = { anonymous: true };
  return scope
    .appUser()
    .create(payload)
    .then((createdUser) => {
      Utils.storeUser(scope, createdUser);
      return createdUser;
    });
};

/**
 * Process response of the decode request, adding an anonymous user if requested.
 * Note: Adding an anonymous App User is only supported when used with Application scope.
 *
 * @param {Object} scope - The Application or Operator scope.
 * @param {Object} response - The response.
 * @param {Object} options - Current options.
 * @returns {Promise}
 */
const processResponse = (scope, response, options) => getAnonymousUser(scope, options)
  .then((anonUser) => response.map((item) => ({ ...item, user: anonUser })));

/**
 * Effectively send the recognition request to the API, passing in the
 * Base64 image data and request options.
 *
 * @param {Object} scope - The Application or Operator scope.
 * @param {Object} options - Current options.
 * @param {Object} [data] - Optional request data as { image }.
 * @returns {Promise}
 */
const scanApiRequest = (scope, options, data) => {
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
    apiKey: scope.apiKey,
    params,
  };

  if (data) {
    requestOptions.body = JSON.stringify(data);
  }

  return evrythng.api(requestOptions)
    .then((res) => processResponse(scope, res, options));
};

/**
 * Create a normalised API response object.
 *
 * @param {Object} thisScope - Current Application or Operator scope.
 * @param {Object} options - Current options.
 * @param {string} res - Scanned value, or API response object.
 * @returns {Promise<Object>} Promise that resolves an object resembling an API response.
 */
const createResultObject = (thisScope, options, res) => {
  const metaOnlyRes = [{
    results: [],
    meta: { value: res },
  }];

  // Emulate a meta-only response from the API
  if (options.offline) {
    return metaOnlyRes;
  }

  // Identify a URL with ScanThng, or else return meta-only response
  if (typeof res === 'string') {
    const finalOptions = {
      ...options,
      filter: `type=${options.filter.type}&value=${res}`,
    };
    return thisScope.identify(finalOptions)
      .catch((e) => {
        console.log('Identification failed, falling back to meta-only response');
        console.log(e);

        return metaOnlyRes;
      });
  }

  // It's a response object
  return res;
};

/**
 * Use getUserMedia() and jsQR.js to scan QR codes locally, using /identifications for lookup.
 *
 * @param {object} opts - Scanning options including 'filter', 'containerId' and `interval`.
 * @returns {Promise} A Promise that resolves with any scan results.
 */
function scanStream(opts = {}) {
  const { filter } = opts;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia() is not supported with this browser; falling back to Media Capture.');
    return this.scan(opts);
  }

  if (!filter || !filter.method || !filter.type) {
    throw new Error('Please provide valid filter');
  }

  // Open the stream, identify barcode, then inform the caller.
  const thisScope = this;
  return Stream.scanCode(opts, thisScope)
    .then((res) => createResultObject(thisScope, opts, res))
    .then((res) => processResponse(thisScope, res));
}

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
function identify(opts) {
  if (!(typeof opts === 'object' && opts.filter)) {
    throw new Error('Missing filter option.');
  }

  return scanApiRequest(this, getMergedOptions(opts));
}

/**
 * Begin an image scan.
 *
 * @param {string} [param1] - Optional image data. If not supplued, 'catch all' mode is used.
 * @param {Object} [param2] - Optional options.
 * @returns {Promise}
 */
function scan(param1, param2) {
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
    imageConversion: options.imageConversion,
  };

  const preparePromise = (typeof imageData === 'string')
    // We already have the image string data, so we only need to process it.
    ? Media.processImage(imageData, prepareOptions)
    // Fetch the image data from the file input, before processing.
    : Media.getFile(prepareOptions).then((data) => Media.processImage(data, prepareOptions));

  // Send recognition request to the EVRYTHNG API once image is done processing
  const thisApp = this;
  return preparePromise.then((data) => scanApiRequest(thisApp, getMergedOptions(options), data));
}

// Use evrythng.js plugin API
const ScanThng = {
  /**
   * Standard plugin interface to set things up.
   *
   * @param {Object} api - API object provided by evrythng.js
   */
  install: (api) => {
    api.scopes.Application.prototype.redirect = redirect;
    api.scopes.Application.prototype.identify = identify;
    api.scopes.Application.prototype.scanStream = scanStream;
    api.scopes.Application.prototype.stopStream = Stream.stop;
    api.scopes.Application.prototype.scan = scan;
    api.scopes.Application.prototype.setTorchEnabled = Stream.setTorchEnabled;

    if (api.scopes.AccessToken) {
      api.scopes.AccessToken.prototype.redirect = redirect;
      api.scopes.AccessToken.prototype.identify = identify;
      api.scopes.AccessToken.prototype.scanStream = scanStream;
      api.scopes.AccessToken.prototype.stopStream = Stream.stop;
      api.scopes.AccessToken.prototype.scan = scan;
      api.scopes.AccessToken.prototype.setTorchEnabled = Stream.setTorchEnabled;
    }

    api.scopes.Operator.prototype.redirect = redirect;
    api.scopes.Operator.prototype.identify = identify;
    api.scopes.Operator.prototype.scanStream = scanStream;
    api.scopes.Operator.prototype.stopStream = Stream.stop;
    api.scopes.Operator.prototype.scan = scan;
    api.scopes.Operator.prototype.setTorchEnabled = Stream.setTorchEnabled;
  },
  /**
   * Put image on canvas, convert it and export as data URL.
   *
   * @param {*} imageData - Image data.
   * @param {object} userOptions - User options, if any.
   * @returns {Promise<object>} Promise resolving an object containing the image as a data URL.
   */
  convertImageFormat: Media.processImage,
  /**
   * Read file selected by user.
   *
   * @param {object} file - The file chosen by the user.
   * @returns {Promise<string>} Promise resolving a string containing the image as a data URL.
   */
  convertToDataUrl: Media.readUserFile,
  /**
   * Convenience function to scan a QR code with a local stream, but not use the API.
   *
   * @param {string} containerId - HTML container element ID to place the stream.
   * @param {Object} opts - Other standard ScanThng options.
   * @returns {Promise}
   */
  scanQrCode: (containerId, opts) => {
    const filter = { method: '2d', type: 'qr_code' };
    return Stream.scanCode({ containerId, filter, ...opts });
  },
  /**
   * Stop a stream previously opened with scanQrCode()
   */
  stopScanQrCode: Stream.stop,
};

module.exports = ScanThng;
