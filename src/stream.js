const Utils = require('./utils');

/**
 * Use webRTC to open the camera, scan for a code, and resolve the value.
 *
 * @param {Object} opts - options object.
 * @returns {Promise} Promise resolving the stream opened.
 */
const scanCode = opts => new Promise((resolve, reject) => {
  if (!window.jsQR) {
    reject(new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.'));
    return;
  }

  if (!document.getElementById(opts.containerId)) {
    reject(new Error('Please specify \'containerId\' where the video element can be added as a child'));
    return;
  }

  // scanCode the stream, identify barcode, then inform the caller.
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function (stream) {
      Utils.insertVideoElement(opts.containerId);

      resolve(stream);
    });
});

if (typeof module !== 'undefined') {
  module.exports = {
    scanCode,
  };
}
