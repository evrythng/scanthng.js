/** The ID of the <video> element inserted by the SDK. */
const VIDEO_ELEMENT_ID = `scanthng-video-${Date.now()}`;

/**
 * Check if a variable is an Image Data URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} true if the str is a valid data URL.
 */
const isDataUrl = (str) => typeof str === 'string'
  && str.match(/^\s*data:image\/(\w+)(;charset=[\w-]+)?(;base64)?,/);

/**
 * Write a key-value pair to localStorage.
 *
 * @param {string} key - The key.
 * @param {*} value - The value.
 */
const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Read a key-value pair from localStorage.
 *
 * @param {string} key - The key.
 * @returns {*} The value as a JSON object.
 */
const readStorage = (key) => JSON.parse(localStorage.getItem(key));

/**
 * Store the user credentials for a later launch.
 *
 * @param {object} app - The Application scope.
 * @param {object} user - The User scope instance.
 */
const storeUser = (app, user) => {
  const userData = { apiKey: user.apiKey };
  const key = `scanthng-${app.id}`;
  if (typeof localStorage !== 'undefined') {
    writeStorage(key, userData);
    return;
  }

  throw new Error('Failed to write user to LocalStorage');
};

/**
 * Restore the user scope instance.
 *
 * @param {object} app - The Application scope.
 * @param {object} User - The User scope class.
 */
const restoreUser = (app, User) => {
  if (!localStorage) throw new Error('Cannot restore user, localStorage is not available');

  const userData = readStorage(`scanthng-${app.id}`);
  if (userData && userData.apiKey) {
    return new User(userData.apiKey);
  }

  return undefined;
};

/**
 * Insert a Safari-compatible <video> element inside parent, if it doesn't already exist.
 *
 * @param {string} containerId - ID of the user's desired parent element.
 */
const insertVideoElement = (containerId) => {
  // Prevent duplicates
  if (document.getElementById(VIDEO_ELEMENT_ID)) return;

  const video = document.createElement('video');
  video.id = VIDEO_ELEMENT_ID;
  video.autoPlay = true;
  video.playsInline = true;
  document.getElementById(containerId).appendChild(video);
};

/**
 * Use an anchor to prompt frame file download.
 *
 * @param {string} dataUrl - Image data URL.
 */
const promptImageDownload = (dataUrl) => {
  const ext = dataUrl.split('/')[1].split(';')[0];
  const anchor = document.createElement('a');
  anchor.download = `frame.${ext}`;
  anchor.href = dataUrl;
  anchor.click();
};

/**
 * Get dimensions for a cropped canvas based on percentage reduced from the edge.
 * E.g: cropPercent = 0.1 means 10% cropped inwards.
 *
 * @param {object} canvas - Canvas to measure.
 * @param {number} cropPercent - Amount to crop, from 0.1 to 1.0.
 * @returns {object} { x, y, width, height } of the cropped canvas.
 */
const getCropDimensions = (canvas, cropPercent = 0) => {
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
 * Get the type name from the enum value for zxing-js/browser 1D code types.
 *
 * Based on https://github.com/zxing-js/library/blob/master/src/core/BarcodeFormat.ts
 *
 * @param {number} format - From the above enum.
 * @returns {string} Compatible 'type' value for API query to fetch Thng/product.
 */
const getZxingBarcodeFormatType = (format) => {
  const map = {
    /** Aztec 2D barcode format. */
    0: null,
    /** CODABAR 1D format. */
    1: 'codabar',
    /** Code 39 1D format. */
    2: 'code_39',
    /** Code 93 1D format. */
    3: 'code_93',
    /** Code 128 1D format. */
    4: 'code_128',
    /** Data Matrix 2D barcode format. */
    5: 'dm',
    /** EAN-8 1D format. */
    6: 'ean_8',
    /** EAN-13 1D format. */
    7: 'ean_13',
    /** ITF (Interleaved Two of Five) 1D format. */
    8: 'itf',
    /** MaxiCode 2D barcode format. */
    9: null,
    /** PDF417 format. */
    10: null,
    /** QR Code 2D barcode format. */
    11: null,
    /** RSS 14 */
    12: 'rss_14',
    /** RSS EXPANDED */
    13: 'rss_expanded',
    /** UPC-A 1D format. */
    14: 'upc_a',
    /** UPC-E 1D format. */
    15: 'upc_e',
    /** UPC/EAN extension format. Not a stand-alone format. */
    16: null,
  };

  // If it's not in this map, we can't lookup with ID Rec API
  if (!map[format]) {
    throw new Error(`Type returned by zxing-js/browser not supported by ID API: ${format}`);
  }

  return map[format];
};

/**
 * Test if this device is running any version of Android.
 *
 * @returns {boolean} true if 'Android' is in the UserAgent string.
 */
const isAndroidDevice = () => navigator.userAgent && navigator.userAgent.includes('Android');

if (typeof module !== 'undefined') {
  module.exports = {
    VIDEO_ELEMENT_ID,
    isDataUrl,
    writeStorage,
    readStorage,
    restoreUser,
    storeUser,
    insertVideoElement,
    isAndroidDevice,
    promptImageDownload,
    getCropDimensions,
    getZxingBarcodeFormatType,
  };
}
