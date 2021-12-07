const Utils = require('./utils');
const Media = require('./media');

/** The interval between local stream samples. */
const DEFAULT_LOCAL_INTERVAL = 500;
/** The interval between other image requests. */
const DEFAULT_REMOTE_INTERVAL = 1500;
/** The minimum interval between image requests. */
const MIN_REMOTE_INTERVAL = 1000;
/** Repeat scan interval */
const REPEAT_SCAN_INTERVAL = 1000;
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
let drawImg;
let digimarcDetector;
let zxingReader;
let framePending = false;
let lastScanTime = 0;

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
 * @param {object} scope - SDK scope.
 * @param {Function} foundCb - Callback when a result contains a found resource.
 * @returns {Promise}
 */
const scanDataUrl = (dataUrl, opts, scope, foundCb) => {
  const { downloadFrames } = opts;

  // If required, prompt and wait for downloading the frame file
  if (downloadFrames) Utils.promptImageDownload(dataUrl);

  framePending = true;
  return scope
    .scan(dataUrl, opts)
    .then((res) => {
      framePending = false;

      // Only stop scanning if a code or resource is found
      if (res.length) foundCb(res);
    })
    .catch((err) => {
      framePending = false;

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
 * Scan canvas with zxing-js/browser.
 *
 * @returns {object} - Scanned text and type name, if found.
 */
const scanWithZxing = () => {
  try {
    const zxingRes = zxingReader.decodeFromCanvas(canvas);
    const formatType = Utils.getZxingBarcodeFormatType(zxingRes.getBarcodeFormat());
    return { text: zxingRes.text, formatType };
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
 * @param {function} foundCb - Callback for if a code is found.
 * @param {object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 */
const scanSample = (opts, foundCb, scope) => {
  // Source may not yet be ready
  if (video.videoWidth === 0 || video.videoHeight === 0) return undefined;

  // Draw video frame onto the main canvas
  updateCanvasFrame();

  // Extract required options
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

    if (result) foundCb(result.data);
    return undefined;
  }

  // Client-side 1D barcode scan with zxing-js/browser, else fallback to API if not imported
  if (method === '1d' && window.ZXingBrowser) {
    const result = scanWithZxing();
    if (!result) return undefined;

    // Update filter to allow createResultObject to identify Thng/product
    opts.filter.type = result.formatType;

    // Resolve the scan value
    foundCb(result.text);
    return undefined;
  }

  // If Application scope not specified, can't use the API - can go no fuxrther here
  if (!scope) return undefined;

  // Crop canvas to square, if required
  if (cropPercent) cropCanvasToSquare(cropPercent);

  // Use the correct format here in case downloadFrames is enabled
  const { exportFormat, exportQuality } = imageConversion;
  const dataUrl = canvas.toDataURL(exportFormat, exportQuality);

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
        if (!detectResult.watermark) return undefined;

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
 * @returns {Promise<string>} A Promise that resolves the scan value once recognition is completed.
 */
const findBarcodeInStream = (opts, scope) => {
  if (!canvas) canvas = document.createElement('canvas');
  video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  // Extract required options
  const {
    filter: { method, type },
    autoStop = true,
    imageConversion,
    useDiscover = false,
    useZxing = false,
    onScanValue,
  } = opts;
  const usingDiscover = method === 'digimarc' && useDiscover;
  const usingJsQR = method === '2d' && type === 'qr_code';
  const usingZxing = method === '1d' && useZxing;
  const isLocalScan = usingJsQR || usingZxing;

  // Local code scans are fast, so can be more frequent
  const interval = opts.interval || (
    isLocalScan ? DEFAULT_LOCAL_INTERVAL : DEFAULT_REMOTE_INTERVAL
  );

  // Pre-load related libraries
  if (usingJsQR) {
    if (!window.jsQR) throw new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.');
  }
  if (usingDiscover && !digimarcDetector) {
    if (!window.DigimarcDetector) throw new Error('discover.js not found. You must include it (and associated WASM/wrapper) in a <script> tag');

    digimarcDetector = new window.DigimarcDetector();
  }
  if (usingZxing && !zxingReader) {
    if (!window.ZXingBrowser) throw new Error('zxing-js/browser not found. You must include it in a <script> tag');

    zxingReader = new window.ZXingBrowser.BrowserMultiFormatOneDReader();
  }

  // If not a local QR scan, or using discover.js and no Scope is available
  if (!scope && !isLocalScan) {
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

  return new Promise((resolve, reject) => {
    /**
     * Check a single frame, resolving if something is scanned.
     */
    const checkFrame = () => {
      try {
        // If API requests take longer than the chosen interval, skip this frame.
        if (framePending) return;

        // Scan each sample for a barcode
        scanSample(opts, (scanValue) => {
          // Close the stream, remove the video, and resolve the single value
          if (autoStop) {
            stop();
            resolve(scanValue);
            return;
          }

          // De-bounce continuous scans
          const now = Date.now();
          if (now - lastScanTime > REPEAT_SCAN_INTERVAL) {
            lastScanTime = now;

            // Keep returning values until explicitly stopped
            onScanValue(scanValue);
          }
        }, scope);
      } catch (e) {
        reject(e);
      }
    };

    frameIntervalHandle = setInterval(
      checkFrame,
      isLocalScan ? interval : Math.max(MIN_REMOTE_INTERVAL, interval),
    );
  });
};

/**
 * Use webRTC to open the camera, scan for a code, and resolve the value.
 *
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} Promise resolving the scan value once recognition is completed.
 */
const scanCode = (opts, scope) => {
  const {
    containerId,
    idealWidth = 1920,
    idealHeight = 1080,
  } = opts;

  // Location of video container is required to place it
  if (!document.getElementById(containerId)) {
    throw new Error('Please specify \'containerId\' where the video element can be added as a child');
  }

  // Begin the stream by selecting a read facing camera, the last usually being the HQ sensor
  return navigator.mediaDevices.enumerateDevices()
    .then((devices) => devices.filter((device) => device.kind === 'videoinput'))
    .then((devices) => navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        deviceId: devices.length > 0 ? devices[devices.length - 1].deviceId : undefined,
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
      },
    }))
    .then((newStream) => {
      stream = newStream;
      Utils.insertVideoElement(containerId);

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
