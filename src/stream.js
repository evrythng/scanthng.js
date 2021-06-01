const Utils = require('./utils');

/** The interval between QR code local stream samples. */
const DEFAULT_LOCAL_INTERVAL = 300;
/** The interval between other image requests. */
const DEFAULT_REMOTE_INTERVAL = 2000;
/** The minimum interval between image requests. */
const MIN_REMOTE_INTERVAL = 500;
/** Optimal settings for digimarc and discover.js */
const OPTIMAL_DIGIMARC_IMAGE_CONVERSION = {
  exportFormat: 'image/jpeg',
  greyscale: false,
  resizeTo: 1920,
  exportQuality: 1.0,
};

let frameIntervalHandle;
let stream;

/**
 * Get the image data from the canvas.
 *
 * @param {HTMLCanvasElement} canvas - Canvas to use.
 * @param {CanvasRenderingContext2D} context - Canvas context.
 * @param {float} cropPercent - Amount to crop by to simulate zoom.
 * @returns {ImageData} Image data.
 */
const getImageData = (canvas, context, cropPercent) => {
  let x = 0;
  let y = 0;
  let width = canvas.width;
  let height = canvas.height;

  // Zoom?
  if (cropPercent) {
    if (typeof cropPercent !== 'number' || cropPercent < 0.1 || cropPercent > 0.9) {
      throw new Error('cropPercent option must be between 0.1 and 0.9');
    }

    // For cropPercent=0.1, crop 10% from the outside of the image
    x = cropPercent * width;
    y = cropPercent * height;
    width -= 2 * x;
    height -= 2 * y;
  }

  try {
    return context.getImageData(x, y, width, height);
  } catch (e) {
    console.log('Failed to getImageData - device may not be ready.');
    return;
  }
}

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {Object} canvas - The canvas element.
 * @param {Object} cropCanvas - The canvas element used for copying and cropping.
 * @param {Object} video - The SDK-inserted <video> element.
 * @param {Object} opts - The scanning options.
 * @param {function} foundCb - Callback for if a code is found.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 */
const scanSample = (canvas, cropCanvas, video, opts, foundCb, scope) => {
  // Match canvas internal dimensions to that of the video and draw for the user
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  const { width, height } = canvas;
  const {
    filter: {
      method,
      type,
    },
    useDiscover = false,
    cropPercent = undefined,
  } = opts;

  // Client-side QR code scan
  if (method === '2d' && type === 'qr_code') {
    const imgData = getImageData(canvas, context);
    if (!imgData) return;

    // Scan image data with jsQR
    const result = window.jsQR(imgData.data, imgData.width, imgData.height);
    if (result) foundCb(result.data);
    return;
  }

  // Client-side digimarc pre-scan watermark detection
  if (method === 'digimarc' && useDiscover) {
    const imgData = getImageData(canvas, context, cropPercent);
    if (!imgData) return;

    const { result } = Discover.detectWatermark(width, height, imgData.data);
    console.log({
      ready_for_read: result.ready_for_read,
      width,
      height,
    });

    // If nothing was found in this frame, don't send to the API (save data)
    if (!result.ready_for_read) return;
  }

  // If Application scope not specified, don't try and identify the code.
  if (!scope) return;

  // Also crop here for dataURL data
  if (cropPercent) {
    // Adjust the width
    cropCanvas.width = width - (2 * (cropPercent * width));
    cropCanvas.height = height - (2 * (cropPercent * height));

    // Adjust source X,Y
    const cropX = cropPercent * width;
    const cropY = cropPercent * height;

    // Draw crop area onto cropCanvas for laser toDataURL() usage
    cropCanvas
      .getContext('2d')
      .drawImage(
        canvas,
        cropX, cropY,
        cropCanvas.width, cropCanvas.height,
        0, 0,
        cropCanvas.width, cropCanvas.height
      );
  }

  // Else, send image data to ID Rec API - whatever filter is requested is passed through.
  const dataUrl = cropPercent ? cropCanvas.toDataURL() : canvas.toDataURL();
  scope
    .scan(dataUrl, opts)
    .then((res) => {
      // Only stop scanning if a resource is found
      if (res.length) foundCb(res);
    })
    .catch((err) => {
      // Handle 'not found' for empty images based on API response
      if (err.errors && err.errors[0].includes('lacking sufficient detail')) return;

      throw err;
    });
};

/**
 * Consume a getUserMedia() video stream and resolves once recognition is completed.
 *
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} A Promise that resolves once recognition is completed.
 */
const findBarcode = (opts, scope) => {
  const video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  const {
    filter: {
      method,
      type,
    },
    autoStop = true,
    useDiscover,
    imageConversion,
  } = opts;
  const usingLocalDiscover = method === 'digimarc' && useDiscover;
  const localScan = (method === '2d' && type === 'qr_code') || usingLocalDiscover;
  const interval = opts.interval || localScan ? DEFAULT_LOCAL_INTERVAL : DEFAULT_REMOTE_INTERVAL

  // Autopilot best digimarc imageConversion settings
  if (!imageConversion && usingLocalDiscover) {
    opts.imageConversion = OPTIMAL_DIGIMARC_IMAGE_CONVERSION;
  }

  // If not a local QR scan, or using discover.js and no Scope is available
  if ((!localScan && !scope) || (useDiscover && !scope)) {
    throw new Error('Non-local code scanning requires specifying an Application or Operator scope for API access');
  }

  const canvas = document.createElement('canvas');
  const cropCanvas = document.createElement('canvas');
  return new Promise((resolve, reject) => {
    /**
     * Check a single frame, resolving if something is scanned.
     */
    const checkFrame = () => {
      try {
        // Scan each sample for a barcode
        scanSample(canvas, cropCanvas, video, opts, (scanValue) => {
          // Unless specified otherwise, by default close the stream and remove the video
          if (autoStop) {
            clearInterval(frameIntervalHandle);
            frameIntervalHandle = null;

            stream.getVideoTracks()[0].stop();
            video.parentElement.removeChild(video);
          }

          resolve(scanValue);
        }, scope);
      } catch (e) {
        reject(e);
      }
    };

    frameIntervalHandle = setInterval(
      checkFrame,
      localScan ? interval : Math.max(MIN_REMOTE_INTERVAL, interval),
    );
  });
};

/**
 * Stop the video stream
 */
const stop = () => {
  if (!frameIntervalHandle) {
    return;
  }

  clearInterval(frameIntervalHandle);
  frameIntervalHandle = null;

  stream.getVideoTracks()[0].stop();
  const video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.parentElement.removeChild(video);
}

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

  return navigator.mediaDevices.enumerateDevices()
    .then(devices => devices.filter(device => device.kind === 'videoinput'))
    .then(devices => {
      const constraints = {
        video: {
          facingMode: 'environment',
          // devicesId: devices.length > 0 ? devices[devices.length - 1].deviceId : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 } ,
        },
      };

      return navigator
        .mediaDevices
        .getUserMedia(constraints)
    })
    .then(function (newStream) {
      stream = newStream;
      Utils.insertVideoElement(opts.containerId);

      return findBarcode(opts, scope);
    });
};

if (typeof module !== 'undefined') {
  module.exports = {
    scanCode,
    stop,
  };
}
