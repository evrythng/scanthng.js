const Utils = require('./utils');
const Media = require('./media');

/** The interval between QR code local stream samples. */
const DEFAULT_LOCAL_INTERVAL = 300;
/** The interval between other image requests. */
const DEFAULT_REMOTE_INTERVAL = 1500;
/** The minimum interval between image requests. */
const MIN_REMOTE_INTERVAL = 500;
/** Optimal settings for digimarc and discover.js */
const OPTIMAL_DIGIMARC_IMAGE_CONVERSION = {
  exportFormat: 'image/jpeg',
  greyscale: false,
  resizeTo: 1080,
  exportQuality: 0.85,
  cropPercent: 0.1,
};

let video;
let stream;
let frameIntervalHandle;
let canvas;
let requestPending = false;

/**
 * Get dimensions for a cropped canvas based on percentage reduced from the edge.
 * E.g: cropPercent = 0.1 means 10% cropped inwards.
 *
 * @param {number} cropPercent - Amount to crop, from 0.1 to 1.0.
 * @returns {object} { x, y, width, height } of the cropped canvas.
 */
const getCropDimensions = (cropPercent = 0) => {
  if (typeof cropPercent !== 'number' || cropPercent < 0 || cropPercent > 0.9) {
    throw new Error('cropPercent option must be between 0 and 0.9');
  }

  let x = 0;
  let y = 0;
  let { width, height } = canvas;

  // No change requested
  if (cropPercent === 0) {
    return {
      x, y, width, height,
    };
  }

  // Crop to a central square
  const isPortrait = height > width;
  if (isPortrait) {
    y = (height - width) / 2;
    height = width;
  } else {
    x = (width - height) / 2;
    width = height;
  }

  const margin = isPortrait ? cropPercent * width : cropPercent * height;
  x += margin;
  y += margin;
  width -= margin;
  height -= margin;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Get the image data from the canvas.
 *
 * @returns {ImageData} Image data.
 */
const getCanvasImageData = () => {
  try {
    const { width, height } = canvas;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return ctx.getImageData(0, 0, width, height);
  } catch (e) {
    console.log('Failed to getImageData - device may not be ready.');
  }

  return undefined;
};

/**
 * Draw a square cropped canvas image to the cropCanvas.
 *
 * @param {number} cropPercent - Percentage as a float to crop from edges (0.1 means 10% cropped).
 */
const cropCanvasToSquare = (cropPercent) => {
  const {
    x, y, width, height,
  } = getCropDimensions(cropPercent);

  // Draw crop area onto cropCanvas
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = width;
  cropCanvas.height = height;
  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.imageSmoothingEnabled = false;
  cropCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  // Resize and draw cropped image back to main canvas
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cropCanvas, 0, 0);
};

/**
 * Draw over the canvas with specific image data.
 *
 * @param {ImageData} imgData - New image data to use.
 * @returns {Promise<void>}
 */
const updateCanvasImageData = (imgData) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    resolve();
  };
  img.src = imgData;
});

/**
 * Scan a data URL using the API.
 *
 * @param {string} dataUrl - Image data URL to scan.
 * @param {object} opts - User's options object.
 * @param {object} scope - SDK scope.
 * @param {Function} foundCb - Callback when a result contains a found resource.
 * @returns {Promise}
 */
const scanDataUrl = (dataUrl, opts, scope, foundCb) => {
  const { downloadFrames } = opts;

  // If required, prompt and wait for downloading the frame file
  if (downloadFrames) Utils.promptImageDownload(dataUrl);

  requestPending = true;
  return scope
    .scan(dataUrl, opts)
    .then((res) => {
      requestPending = false;

      // Only stop scanning if a resource is found
      if (res.length) foundCb(res);
    })
    .catch((err) => {
      requestPending = false;

      // Handle 'not found' for empty images based on API response
      if (err.errors && err.errors[0].includes('lacking sufficient detail')) return;

      throw err;
    });
};

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {object} opts - The scanning options.
 * @param {function} foundCb - Callback for if a code is found.
 * @param {object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 */
const scanSample = (opts, foundCb, scope) => {
  // Draw video frame onto the main canvas
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  // Extract required options
  const {
    filter: { method, type },
    useDiscover = false,
    onDiscoverResult,
    imageConversion = {},
  } = opts;
  const { cropPercent = 0 } = imageConversion;
  const { width, height } = canvas;

  // Client-side QR code scan
  if (method === '2d' && type === 'qr_code') {
    const imgData = getCanvasImageData();
    if (!imgData) return undefined;

    // Scan image data with jsQR
    const result = window.jsQR(imgData.data, width, height);
    if (result) foundCb(result.data);
    return undefined;
  }

  // If Application scope not specified, can't identify the code via the API.
  if (!scope) return undefined;

  // Crop canvas to square, if required
  cropCanvasToSquare(cropPercent);

  // Use the correct format here in case downloadFrames is enabled
  const { exportFormat, exportQuality } = imageConversion;
  const dataUrl = canvas.toDataURL(exportFormat, exportQuality);

  // Client-side digimarc pre-scan watermark detection
  //   For this mode, use the exact same post-compression data for discover.js and the API request.
  if (method === 'digimarc' && useDiscover) {
    // Update canvas image data with the compressed version
    return updateCanvasImageData(dataUrl)
      .then(() => {
        // Perform Digimarc detection with discover.js
        const imgData = getCanvasImageData();
        const { width: imgDataWidth, height: imgDataHeight, data } = imgData;
        const { result } = window.Discover.detectWatermark(imgDataWidth, imgDataHeight, data);

        // Notify application if it wants
        if (onDiscoverResult) {
          // Pass true if this frame detected a watermark, and whatever discover.js provides
          onDiscoverResult(result.ready_for_read, result);
        }

        // If nothing was found in this frame, don't send to the API (save data usage)
        if (!result.ready_for_read) return undefined;

        return scanDataUrl(dataUrl, opts, scope, foundCb);
      });
  }

  // Else, send image data to ID Rec API - whatever filter is requested is passed through.
  return scanDataUrl(dataUrl, opts, scope, foundCb);
};

/**
 * Stop the video stream.
 */
const stop = () => {
  if (!frameIntervalHandle) return;

  clearInterval(frameIntervalHandle);
  frameIntervalHandle = null;

  stream.getVideoTracks()[0].stop();
  stream = null;
  video.parentElement.removeChild(video);
};

/**
 * Consume a getUserMedia() video stream and resolves once recognition is completed.
 *
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} A Promise that resolves once recognition is completed.
 */
const findBarcodeInStream = (opts, scope) => {
  video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  canvas = document.createElement('canvas');

  const {
    filter: { method, type },
    autoStop = true,
    useDiscover = false,
    imageConversion,
  } = opts;
  const usingDiscover = method === 'digimarc' && useDiscover;
  const usingJsQR = method === '2d' && type === 'qr_code';

  // Local QR codes scans are fast, so can be more frequent
  const interval = opts.interval || usingJsQR ? DEFAULT_LOCAL_INTERVAL : DEFAULT_REMOTE_INTERVAL;

  // Autopilot recommended digimarc imageConversion settings
  if (usingDiscover && !imageConversion) {
    console.log(`Selecting optimal digimarc imageConversion: ${JSON.stringify(OPTIMAL_DIGIMARC_IMAGE_CONVERSION)}`);
    opts.imageConversion = OPTIMAL_DIGIMARC_IMAGE_CONVERSION;
  } else {
    // Use provided conversion options, or prep the default in case needed in scanSample()
    opts.imageConversion = imageConversion || Media.DEFAULT_OPTIONS.imageConversion;
  }

  // If not a local QR scan, or using discover.js and no Scope is available
  if (!scope && (!usingJsQR || useDiscover)) {
    throw new Error('Non-local code scanning requires specifying an Application or Operator scope for API access');
  }

  return new Promise((resolve, reject) => {
    /**
     * Check a single frame, resolving if something is scanned.
     */
    const checkFrame = () => {
      try {
        if (requestPending) return;

        // Scan each sample for a barcode
        scanSample(opts, (scanValue) => {
          // Unless specified otherwise, by default close the stream and remove the video
          if (autoStop) stop();

          resolve(scanValue);
        }, scope);
      } catch (e) {
        reject(e);
      }
    };

    frameIntervalHandle = setInterval(
      checkFrame,
      usingJsQR ? interval : Math.max(MIN_REMOTE_INTERVAL, interval),
    );
  });
};

/**
 * Use webRTC to open the camera, scan for a code, and resolve the value.
 *
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} Promise resolving the stream opened.
 */
const scanCode = (opts, scope) => {
  if (!window.jsQR) {
    throw new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.');
  }
  if (!document.getElementById(opts.containerId)) {
    throw new Error('Please specify \'containerId\' where the video element can be added as a child');
  }
  if (opts.useDiscover && !window.Discover) {
    throw new Error('Discover library not found. Disable \'useDiscover\' to use the API only, or provide the library.');
  }

  return navigator.mediaDevices.enumerateDevices()
    .then((devices) => devices.filter((device) => device.kind === 'videoinput'))
    .then((devices) => {
      const constraints = {
        video: {
          facingMode: 'environment',
          deviceId: devices.length > 0 ? devices[devices.length - 1].deviceId : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      return navigator
        .mediaDevices
        .getUserMedia(constraints);
    })
    .then((newStream) => {
      stream = newStream;
      Utils.insertVideoElement(opts.containerId);

      return findBarcodeInStream(opts, scope);
    });
};

/**
 * Enable/disable the torch, if supported by the browser/device.
 * The video stream must be started before using this method.
 *
 * @param {boolean} enabled - true if the torch should be switched on.
 */
const setTorchEnabled = (enabled) => {
  if (!stream) throw new Error('Stream not ready, torch cannot be enabled');

  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities();
  if (!capabilities.torch) throw new Error('Device does not support the torch capability');

  track
    .applyConstraints({
      advanced: [{ torch: enabled }],
    })
    .catch((e) => console.log(e));
};

if (typeof module !== 'undefined') {
  module.exports = {
    scanCode,
    stop,
    setTorchEnabled,
  };
}
