const Utils = require('./utils');
const Media = require('./media');

/** The interval between stream samples, once a sample is complete */
const SAMPLE_GAP_MS = 500;
/** Optimal settings for digimarc and discover.js */
const OPTIMAL_DIGIMARC_IMAGE_CONVERSION = {
  exportFormat: 'image/jpeg',
  greyscale: false,
  resizeTo: 1080,
  exportQuality: 0.85,
  cropPercent: 0.1,
};

let apiScope;
let video;
let stream;
let canvas;
let drawImg;
let digimarcDetector;
let zxing1DReader;
let zxingDMReader;
let apiRequestPending = false;
let lastScanTime = 0;
let isScanning = false;
let intervalHandle;

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
  } = Utils.getCropDimensions(canvas, cropPercent);

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
const setCanvasImageData = (imgData) => new Promise((resolve) => {
  if (!drawImg) drawImg = new Image();

  drawImg.src = null;
  drawImg.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(drawImg, 0, 0);
    resolve();
  };
  drawImg.src = imgData;
});

/**
 * Scan a data URL using the API.
 *
 * @param {string} dataUrl - Image data URL to scan.
 * @param {object} opts - User's options object.
 * @returns {Promise}
 */
const scanDataUrl = (dataUrl, opts) => {
  const { downloadFrames } = opts;

  // If required, prompt and wait for downloading the frame file
  if (downloadFrames) Utils.promptImageDownload(dataUrl);

  apiRequestPending = true;
  return apiScope
    .scan(dataUrl, opts)
    .then((res) => {
      apiRequestPending = false;

      // Only stop scanning if a code or resource is found
      return res.length ? res : undefined;
    })
    .catch((err) => {
      apiRequestPending = false;

      // Handle 'not found' for empty images based on API response
      if (err.errors && err.errors[0].includes('lacking sufficient detail')) return;

      throw err;
    });
};

/**
 * Update the canvas frame visible to the user.
 */
const updateCanvasFrame = () => {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
};

/**
 * Get latest canvas dataUrl.
 *
 * @param {object} imageConversion - Selected image conversion options.
 * @returns {string} Image data URL.
 */
const getCanvasDataUrl = (imageConversion) => {
  const { exportFormat, exportQuality } = imageConversion;
  return canvas.toDataURL(exportFormat, exportQuality);
};

/**
 * Scan canvas with jsQR.
 *
 * @returns {object} jsQR result object.
 */
const scanWithJsQr = () => {
  const { width, height } = canvas;
  const imgData = getCanvasImageData();
  if (!imgData) return undefined;

  // Scan image data with jsQR
  return window.jsQR(imgData.data, width, height);
};

/**
 * Scan canvas with zxing-js/browser for 1D barcodes.
 *
 * @returns {object} - Scanned text and type name, if found.
 */
const scanWithZxing1D = () => {
  try {
    const res = zxing1DReader.decodeFromCanvas(canvas);
    const formatType = Utils.getZxingBarcodeFormatType(res.getBarcodeFormat());
    return { text: res.text, formatType };
  } catch (err) {
    // No codes found in sample
    return undefined;
  }
};

/**
 * Scan canvas with zxing-js/browser for 2D DataMatrix barcodes.
 *
 * @returns {object} - Scanned text and type name, if found.
 */
const scanWithZxingDataMatrix = () => {
  try {
    const res = zxingDMReader.decodeFromCanvas(canvas);
    return { text: res.text, formatType: 'dm' };
  } catch (err) {
    // No codes found in sample
    return undefined;
  }
};

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {object} opts - The scanning options.
 * @returns {Promise} Promise that resolves a result, or nothing for this frame.
 */
const scanSample = (opts) => new Promise((resolve) => {
  // Source may not yet be ready
  if (video.videoWidth === 0 || video.videoHeight === 0) return resolve();

  // Draw video frame onto the main canvas
  updateCanvasFrame();

  const {
    filter: { method, type },
    useDiscover = false,
    onWatermarkDetected,
    imageConversion = {},
  } = opts;
  const { cropPercent = 0 } = imageConversion;

  // Client-side QR code scan with jsQR
  if (method === '2d' && type === 'qr_code') {
    const result = scanWithJsQr();
    if (!result) return resolve();

    return resolve(result.data);
  }

  // Client-side 1D barcode scan with zxing-js/browser if it's available
  if (method === '1d' && window.ZXingBrowser) {
    const result = scanWithZxing1D();
    if (!result) return resolve();

    // Update filter to allow createResultObject to identify Thng/product
    opts.filter.type = result.formatType;
    return resolve(result.text);
  }

  // Client-side 2D DataMatrix scan with zxing-js/browser if it's available
  if (method === '2d' && type === 'dm' && window.ZXingBrowser) {
    const result = scanWithZxingDataMatrix();
    if (!result) return resolve();

    // Update filter to allow createResultObject to identify Thng/product
    opts.filter.type = result.formatType;
    return resolve(result.text);
  }

  // If Application scope not specified, can't use the API - can go no further here
  if (!apiScope) return resolve();

  // Crop canvas to square, if required
  if (cropPercent) cropCanvasToSquare(cropPercent);

  // Use the correct format here in case downloadFrames is enabled
  const dataUrl = getCanvasDataUrl(imageConversion);

  // Client-side digimarc pre-scan watermark detection
  if (method === 'digimarc' && useDiscover) {
    // For this mode, use the exact same post-compression data for discover.js and the API request.
    return setCanvasImageData(dataUrl)
      .then(() => {
        // Perform Digimarc detection with discover.js
        const { width: imgDataWidth, height: imgDataHeight, data } = getCanvasImageData();

        const detectResult = digimarcDetector.detect(data, imgDataWidth, imgDataHeight);

        // Check .watermark for a boolean result. x, y, width, height, rotation also available
        if (onWatermarkDetected) onWatermarkDetected(detectResult);

        // If nothing was found in this frame, don't send to the API (save data usage)
        if (!detectResult.watermark) return resolve();

        // Ask API to fullt decode watermark
        return scanDataUrl(dataUrl, opts).then(resolve);
      });
  }

  // Else, send image data to ID Rec API - whatever filter is requested is passed through.
  return scanDataUrl(dataUrl, opts).then(resolve);
});

/**
 * Stop the video stream.
 */
const stop = () => {
  isScanning = false;
  clearTimeout(intervalHandle);

  stream.getVideoTracks()[0].stop();
  stream = null;
  video.parentElement.removeChild(video);
};

/**
 * Check a single frame, resolving if something is scanned.
 *
 * @param {object} opts - SDK options.
 * @param {Function} onComplete - Callback when a scan value is ready.
 * @param {Function} onError - Callback if an error occurs sampling a frame.
 */
const checkFrame = (opts, onComplete, onError) => {
  const {
    autoStop, onScanFrameData, imageConversion, onScanValue,
  } = opts;

  try {
    // If API requests take longer than the chosen interval, skip this frame.
    if (apiRequestPending) {
      // eslint-disable-next-line no-use-before-define
      scheduleNextSample(opts, onComplete, onError);
      return undefined;
    }

    // Scan each sample for a barcode
    return scanSample(opts)
      .then((scanValue) => {
        // Nothin was found, wait until next frame
        if (!scanValue) {
          // Schedule next sample now this one is completed
          // eslint-disable-next-line no-use-before-define
          scheduleNextSample(opts, onComplete, onError);
          return;
        }

        // Close the stream, remove the video, and resolve the single value
        if (autoStop) {
          stop();

          // Provide the image frame if required
          if (onScanFrameData) onScanFrameData(getCanvasDataUrl(imageConversion));

          // Resolve the scan value to the SDK caller
          onComplete(scanValue);
          return;
        }

        // De-bounce continuous scans giving time to other tasks
        const now = Date.now();
        if (now - lastScanTime > SAMPLE_GAP_MS) {
          lastScanTime = now;

          // Provide the image frame if required
          if (onScanFrameData) onScanFrameData(getCanvasDataUrl(imageConversion));

          // Keep returning values until explicitly stopped
          onScanValue(scanValue);

          // Schedule next sample now this one is completed
          // eslint-disable-next-line no-use-before-define
          scheduleNextSample(opts, onComplete, onError);
        }
      });
  } catch (e) {
    console.log(e);
    onError(e);
    return undefined;
  }
};

/**
 * Schedule next sample, giving time for other tasks.
 *
 * @param {object} opts - SDK options.
 * @param {Function} onComplete - Callback when a scan value is ready.
 * @param {Function} onError - Callback if an error occurs sampling a frame.
 */
function scheduleNextSample(opts, onComplete, onError) {
  // Break the loop, SDK caller cancelled scanning
  if (!isScanning) return;

  intervalHandle = setTimeout(() => checkFrame(opts, onComplete, onError), SAMPLE_GAP_MS);
}

/**
 * Consume a getUserMedia() video stream and resolves once recognition is completed.
 *
 * @param {Object} opts - The scanning options.
 * @returns {Promise<string>} A Promise that resolves the scan value once recognition is completed.
 */
const findBarcodeInStream = (opts) => {
  if (!canvas) canvas = document.createElement('canvas');
  video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  // Set defaults
  if (typeof opts.autoStop === 'undefined') opts.autoStop = true;
  if (typeof opts.useDiscover === 'undefined') opts.useDiscover = false;
  if (typeof opts.useZxing === 'undefined') opts.useZxing = false;

  // Extract required options
  const {
    filter: { method, type },
    autoStop,
    imageConversion,
    useDiscover,
    onScanValue,
  } = opts;
  const usingDiscover = method === 'digimarc' && useDiscover;
  const usingJsQR = method === '2d' && type === 'qr_code';
  const usingZxing = method === '1d' || (method === '2d' && type === 'dm');
  const isLocalScan = usingJsQR || usingZxing;

  // Pre-load related libraries if scan types use them
  if (usingJsQR && !window.jsQR) {
    throw new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.');
  }
  if (usingDiscover && !digimarcDetector) {
    if (!window.DigimarcDetector) throw new Error('discover.js not found. You must include it (and associated WASM/wrapper) in a <script> tag');

    digimarcDetector = new window.DigimarcDetector();
  }
  if (usingZxing && !zxing1DReader) {
    if (!window.ZXingBrowser) throw new Error('zxing-js/browser not found. You must include it in a <script> tag');

    zxing1DReader = new window.ZXingBrowser.BrowserMultiFormatOneDReader();
    zxingDMReader = new window.ZXingBrowser.BrowserDatamatrixCodeReader();
  }

  // If not a local QR scan, or using discover.js and no Scope is available
  if (!apiScope && !isLocalScan) {
    throw new Error('Non-local code scanning requires specifying an Application or Operator scope for API access');
  }

  // If not using autoStop, a callback is required
  if (!autoStop && !onScanValue) throw new Error('onScanValue is required to get results when autoStop is disabled');

  // Autopilot recommended digimarc imageConversion settings
  if (usingDiscover && !imageConversion) {
    console.log(`Selecting optimal digimarc imageConversion: ${JSON.stringify(OPTIMAL_DIGIMARC_IMAGE_CONVERSION)}`);
    opts.imageConversion = OPTIMAL_DIGIMARC_IMAGE_CONVERSION;
  } else {
    // Use provided conversion options, or prep the default in case needed in scanSample()
    opts.imageConversion = imageConversion || Media.DEFAULT_OPTIONS.imageConversion;
  }

  // Begin sampling
  return new Promise((resolve, reject) => scheduleNextSample(opts, resolve, reject));
};

/**
 * Use webRTC to open the camera, scan for a code, and resolve the value.
 *
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} Promise resolving the scan value once recognition is completed.
 */
const scanCode = (opts, scope) => {
  apiScope = scope;

  const {
    containerId,
    idealWidth = 1920,
    idealHeight = 1080,
  } = opts;

  // Location of video container is required to place it
  if (!document.getElementById(containerId)) {
    throw new Error('Please specify \'containerId\' where the video element can be added as a child');
  }

  // Begin the stream by selecting a rear-facing camera, the last usually being the HQ sensor on
  // Android devices
  return navigator.mediaDevices.enumerateDevices()
    .then((devices) => devices.filter((device) => device.kind === 'videoinput'))
    .then((devices) => {
      const deviceId = Utils.isAndroidDevice() && devices.length > 0
        ? devices[devices.length - 1].deviceId
        : undefined;
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          deviceId,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
      });
    })
    .then((newStream) => {
      stream = newStream;
      Utils.insertVideoElement(containerId);

      isScanning = true;
      return findBarcodeInStream(opts);
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
