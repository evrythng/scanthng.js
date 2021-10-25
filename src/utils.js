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
  if (document.getElementById(VIDEO_ELEMENT_ID)) {
    return;
  }

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
 * Get the type name from the enum value for zxing/browser 1D code types.
 *
 * Based on https://github.com/zxing-js/library/blob/master/src/core/BarcodeFormat.ts
 *
 * @param {number} format - From the above enum.
 * @returns {string} thng-scan compatible type for API query ot fetch Thng/product.
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

  // If it's not in this map, we can't lookup with thng-scan
  if (!map[format]) {
    throw new Error(`Type returned by zxing/browser not supported by ID API: ${format}`);
  }

  return map[format];
};

if (typeof module !== 'undefined') {
  module.exports = {
    VIDEO_ELEMENT_ID,
    isDataUrl,
    writeStorage,
    readStorage,
    restoreUser,
    storeUser,
    insertVideoElement,
    promptImageDownload,
    getZxingBarcodeFormatType,
  };
}
