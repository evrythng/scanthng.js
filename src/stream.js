const Utils = require('./utils');

/** The interval between QR code local stream samples. */
const DEFAULT_LOCAL_INTERVAL = 300;
/** The interval between other image requests. */
const DEFAULT_REMOTE_INTERVAL = 2000;
/** The minimum interval between image requests. */
const MIN_REMOTE_INTERVAL = 500;

let frameIntervalHandle;
let stream;

/**
 * Process a sample frame from the stream, and find any code present.
 * A callback is required since any promise per-frame won't necessarily resolve or reject.
 *
 * @param {Object} canvas - The canvas element.
 * @param {Object} video - The SDK-inserted <video> element.
 * @param {Object} opts - The scanning options.
 * @param {function} foundCb - Callback for if a code is found.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 */
const scanSample = (canvas, video, opts, foundCb, scope) => {
  // Match canvas internal dimensions to that of the video and draw for the user
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  const { filter } = opts;
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

  // If Application scope not specified, don't try and identify the code.
  // findBarcode checks that this can only be the case if local scanning is done.
  if (!scope) {
    return;
  }

  // Else, send image data to ScanThng - whatever filter is requested is passed through.
  scope.scan(canvas.toDataURL(), opts).then((res) => {
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
 * @param {Object} opts - The scanning options.
 * @param {Object} [scope] - Application or Operator scope, if decoding with the API is to be used.
 * @returns {Promise} A Promise that resolves once recognition is completed.
 */
const findBarcode = (opts, scope) => {
  const video = document.getElementById(Utils.VIDEO_ELEMENT_ID);
  video.srcObject = stream;
  video.play();

  const {
    filter,
    interval = localQrCodeScan ? DEFAULT_LOCAL_INTERVAL : DEFAULT_REMOTE_INTERVAL,
    autoStop = true,
  } = opts;
  const localQrCodeScan = (filter.method === '2d' && filter.type === 'qr_code');
  if (!localQrCodeScan && !scope) {
    throw new Error('Non-QR code scanning requires specifying an Application or Operator scope');
  }

  const canvas = document.createElement('canvas');

  return new Promise((resolve, reject) => {
    /**
     * Check a single frame, resolving if something is scanned.
     */
    const checkFrame = () => {
      try {
        // Scan each sample for a barcode
        scanSample(canvas, video, opts, (scanValue) => {
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
      localQrCodeScan ? interval : Math.max(MIN_REMOTE_INTERVAL, interval),
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
          devicesId: devices.length > 0 ? devices[devices.length - 1].deviceId : undefined,
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
