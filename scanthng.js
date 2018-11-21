/* globals jsQR */

define([
  'utils',
  'prepare'
], function (Utils, Prepare) {
  'use strict';

  var version = '3.1.0';

  // The ID of the <video> element inserted by the SDK.
  var VIDEO_ELEMENT_ID = 'scanthng-video-' + Date.now();
  // The interval between QR code local stream samples.
  var SAMPLE_INTERVAL_FAST = 300;
  // The interval between other image requests.
  var SAMPLE_INTERVAL_SLOW = 2000;

  // Setup default settings:

  // - _**invisible**: File input visibility_
  // - _**imageConversion.greyscale**: Send black & white image, instead of colors_
  // - _**imageConversion.resizeTo**: Maximum smaller dimension of the image sent_
  // - _**imageConversion.exportQuality**: Conversion quality (0 no quality - 1 original quality)_
  // - _**createAnonymousUser**: Create anonymous user when making scan actions_
  var defaultSettings = {
    invisible: true,
    imageConversion: {
      greyscale: true,
      resizeTo: 600,
      exportQuality: 0.8
    },
    createAnonymousUser: false
  };


  // These objects are defined once the Plugin is installed - reused from EVT.js.
  var Promise, EVT;

  var app,
    path = '/scan/identifications',
    currentOptions;

  // Deeply extension of options.
  function _extendOptions(defaultOptions, userOptions) {
    var fullOptions = Utils.extend(defaultOptions, userOptions);

    // Setup all nested object as copies of the default
    fullOptions.imageConversion = Utils.extend(
      defaultOptions.imageConversion,
      userOptions && userOptions.imageConversion || {}
    );

    // Use bigger size from default and what user defines.
    if(userOptions && userOptions.imageConversion && userOptions.imageConversion.resizeTo){
      fullOptions.imageConversion.resizeTo = Math.max(fullOptions.imageConversion.resizeTo,
        userOptions.imageConversion.resizeTo);
    }

    return fullOptions;
  }

  // Effectively send the recognition request to the API, passing in the
  // Base64 image data and request options.
  function _decodeRequest(data) {
    var params;

    ['debug', 'perPage', 'filter'].forEach(function (option) {
      if (typeof currentOptions[option] !== 'undefined') {
        params = params || {};
        params[option] = currentOptions[option];
      }
    });

    var requestOptions = {
      url: path,
      method: data ? 'post' : 'get',
      authorization: app.apiKey,
      params: params
    };

    if (data) {
      requestOptions.formData = data;
    }

    return EVT.api(requestOptions);
  }

  // Convert JSON Object to EVT.Entity.
  function _buildEntity(type, data, scope) {
    var resource = scope[type](data.id),
      entityName = type.charAt(0).toUpperCase() + type.slice(1);

    return new EVT.Entity[entityName](data, resource);
  }

  // Process response of the decode request.
  function _processResponse(response) {
    return _getAnonymousUser().then(function (anonymousUser) {
      return response.map(function (item) {

        // Attach user if avaialble.
        if (Utils.isObject(anonymousUser)) {
          item.user = anonymousUser;

          item.results = item.results.map(function (result) {

            // Convert thng/product JSON to EVT.Entity.
            ['product', 'thng'].forEach(function (type) {
              if (result[type]) {
                result[type] = _buildEntity(type, result[type], anonymousUser);
              }
            });

            return result;
          });
        }

        return item;
      });
    });
  }

  // If `createAnonymousUser` options is enabled, will try to restore anonymous user saved
  // in local storage (or cookie) and create a new anonymous user if there's no saved one.
  function _getAnonymousUser() {
    if (currentOptions.createAnonymousUser) {
      var anonymousUser = Utils.restoreUser(app, EVT.User);

      if (Utils.isObject(anonymousUser)) {
        return Promise.resolve(anonymousUser);
      } else {
        return app.appUser().create({
          anonymous: true
        }).then(function (anonymousUser) {
          Utils.storeUser(app, anonymousUser);
          return anonymousUser;
        });
      }
    } else {
      return Promise.resolve();
    }
  }

  // Decode image (send request to IR API and process the response)
  function _decode(data) {
    return _decodeRequest(data)
      .then(_processResponse);
  }

  /**
   * Process a sample frame from the stream, and find any code present.
   * A callback is required since any promise per-frame won't necessarily resolve or reject.
   *
   * @param {Object} scope - The App scope.
   * @param {Object} canvas - The canvas element.
   * @param {Object} video - The SDK-inserted <video> element.
   * @param {Object} filter - The scanning filter.
   * @param {function} foundCb - Callback for if a code is found.
   */
  function scanSample(scope, canvas, video, filter, foundCb) {
    // Match canvas internal dimensions to that of the video and draw for the user
    var context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    if (filter.method === '2d' && filter.type === 'qr_code') {
      var imgData;
      try {
        imgData = context.getImageData(0, 0, video.videoWidth, video.videoHeight);
      } catch (e) {
        console.log('Failed to getImageData - device may not be ready.');
        return;
      }

      // Scan image data with jsQR
      var result = window.jsQR(imgData.data, imgData.width, imgData.height);
      if (result) {
        foundCb(result.data);
      }
      return;
    }

    // Else, send image data to ScanThng - 1d && ir implicitly included
    scope.scan(canvas.toDataURL()).then(function (res) {
      if (res.length) {
        foundCb(res);
      }
    }).catch(function (err) {
      if (err.errors && err.errors[0].includes('lacking sufficient detail')) {
        // Handle 'not found' for empty images based on API response
        return;
      }

      throw err;
    });
  }

  /**
   * Consume a getUserMedia() video stream and resolves once recognition is completed. 
   *
   * @param {Object} scope - The App scope.
   * @param {Object} stream - The stream to consume.
   * @param {Object} opts - The scanning options.
   * @returns {Promise} A Promise that resolves once recognition is completed.
   */
  function findBarcode(scope, stream, opts) {
    var video = document.getElementById(VIDEO_ELEMENT_ID);
    video.srcObject = stream;
    video.play();

    return new Promise(function (resolve, reject) {
      var interval = SAMPLE_INTERVAL_SLOW;
      if (opts.filter.method === '2d' && opts.filter.type === 'qr_code') {
        interval = SAMPLE_INTERVAL_FAST;
      }

      var canvas = document.createElement('canvas');
      var handle = setInterval(function () {
        try {
          // Scan each sample for a barcode, and resolve if a result is found.
          scanSample(scope, canvas, video, opts.filter, function (res) {
            clearInterval(handle);
            stream.getVideoTracks()[0].stop();
            video.parentElement.removeChild(video);

            // Identify a URL with ScanThng
            if (typeof res === 'string') {
              opts.filter = 'type=qr_code&value=' + res;
              scope.identify(opts).then(resolve);
              return;
            }

            resolve(res);
          });
        } catch (e) {
          reject(e);
        }
      }, interval);
    });
  }

  /**
   * Insert a Safari-compatible <video> element inside parent, if it doesn't already exist.
   *
   * @param {string} containerId - ID of the user's desired parent element.
   */
  function insertVideoElement(containerId) {
    if (document.getElementById(VIDEO_ELEMENT_ID)) {
      return;
    }
    
    const video = document.createElement('video');
    video.id = VIDEO_ELEMENT_ID;
    video.autoPlay = true;
    video.playsInline = true;
    document.getElementById(containerId).appendChild(video);
  }

  /**
   * Use getUserMedia() and jsQR.js to scan QR codes locally, using /identifications for lookup.
   *
   * @param {Object} opts - Scanning options including standard 'filter' and 'containerId'.
   * @returns {Promise} A Promise that resolves with any scan results.
   */
  function scanStream(opts) {
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
    var scope = this;
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        insertVideoElement(opts.containerId);
        return findBarcode(scope, stream, opts);
      })
      .then(_processResponse);
  }

  // Plugin API
  var EVTScanPlugin = {

    version: version,

    settings: defaultSettings,

    // Setup new settings.
    setup: function (customSettings) {
      if (Utils.isObject(customSettings)) {
        this.settings = _extendOptions(this.settings, customSettings);
      } else {
        throw new TypeError('Setup should be called with an options object.');
      }

      return this.settings;
    },

    install: function (_Promise_, _EVT_) {
      var $this = this;

      Promise = _Promise_;
      EVT = _EVT_;

      // Add redirect method to the ApplicationScope
      EVT.App.prototype.redirect = function (url) {
        window.location.href = url;
      };

      // Add identify method to the ApplicationScope
      EVT.App.prototype.identify = function (opts, successCallback, errorCallback) {

        // Set global app object defining the scope of this call.
        app = this;

        if (!(Utils.isObject(opts) && opts.hasOwnProperty('filter'))) {
          throw new Error('Missing filter option.');
        }

        currentOptions = _extendOptions($this.settings, opts);

        return new Promise(function (resolve, reject) {
          _decode().then(function (result) {
            if (Utils.isFunction(successCallback)) {
              successCallback(result);
            }
            resolve(result);
          }, function (error) {
            if (Utils.isFunction(errorCallback)) {
              errorCallback(error);
            }
            reject(error);
          });
        });
      };

      EVT.App.prototype.scanStream = scanStream;

      // Add scan method to the ApplicationScope
      EVT.App.prototype.scan = function (imgData, opts, successCallback, errorCallback) {
        var imageData, options, successCb, errorCb;

        // Set global app object defining the scope of this call.
        app = this;

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

        currentOptions = _extendOptions($this.settings, options);

        var prepareOptions = {
          invisible: currentOptions.invisible,
          imageConversion: currentOptions.imageConversion
        };

        return new Promise(function (resolve, reject) {
          var imagePromise;

          if (Utils.isString(imageData)) {

            // Reject if string is not a valid Image Data Url
            if (!Utils.isDataUrl(imageData)) {
              return reject(new Error('Invalid Image Data URL.'));
            }

            // We already have the image string data, so we only need to process it.
            imagePromise = Prepare.processImage(imageData, prepareOptions);
          } else {
            // Fetch the image data from the file input, before processing.
            imagePromise = Prepare.getFile(prepareOptions).then(Prepare.processImage);
          }

          // Send recognition request to the EVRYTHNG API once image is done processing
          // and resolve or reject accordingly.
          imagePromise.then(_decode).then(function (result) {
            if (Utils.isFunction(successCb)) {
              successCb(result);
            }
            resolve(result);
          }, function (error) {
            if (Utils.isFunction(errorCb)) {
              errorCb(error);
            }
            reject(error);
          });
        });
      };

    }

  };

  // Modules that this plugin requires. Injected into the install method.
  EVTScanPlugin.$inject = ['promise', 'evrythng'];

  // Export for testing
  EVTScanPlugin.insertVideoElement = insertVideoElement;

  return EVTScanPlugin;

});
