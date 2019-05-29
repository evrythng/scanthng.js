const MegaPixImage = require('@koba04/ios-imagefile-megapixel');
const Utils = require('./utils');

/** The default prepare options. */
const DEFAULT_OPTIONS = {
  invisible: true,
  imageConversion:{
    greyscale: true,
    resizeTo: 480,
    exportFormat: 'image/png',
    exportQuality: 0.9,
  }
};

/** minimum image size accepted by API */
const MIN_SIZE = 144;

/** 
 * Create the DOM elements to handle user image selection.
 *
 * @param {object} options - The prepare options.
 */
const insertMediaCapture = options => new Promise((resolve, reject) => {
  const captureForm = document.createElement('form');
  captureForm.setAttribute('id', `scanthng${Date.now()}`);
  captureForm.setAttribute('class', 'scanthng_form');
  captureForm.style.visibility = options.invisible ? 'hidden' : 'initial';

  const captureInput = document.createElement('input');
  captureInput.setAttribute('type', 'file');
  captureInput.setAttribute('name', 'scanThng_upload');
  captureInput.setAttribute('accept', 'image/*');
  captureInput.setAttribute('capture', 'camera');
  captureForm.appendChild(captureInput);

  // Remove previous  media capture forms before creating a new one (multiple scans)
  const existing = document.getElementsByClassName('scanthng_form');
  if (existing.length) {
    for (let i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].parentElement) {
        existing[i].parentElement.removeChild(existing[i]);
      }
    }
  }

  // Add listener for changes in our Media Capture element
  captureInput.addEventListener('change', function () {
    const [file] = this.files;
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }

    resolve(file);
  });

  document.body.appendChild(captureForm);

  if (Utils.isAndroidBrowser() || Utils.isFirefoxMobileBrowser()) {
    window.setTimeout(() => captureInput.click(), 800);
    return;
  }

  captureInput.click();
});

/**
 * Read file selected by user.
 *
 * @param {object} file - The file chosen by the user.
 * @returns {Promise}
 */ 
const readUserFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Load an image from a data URL.
 *
 * @param {string} dataUrl - The data URL.
 * @returns {Promise}
 */
const loadImage = dataUrl => new Promise((resolve, reject) => {
  const image = document.createElement('img');
  image.onload = function () {
    if ('naturalHeight' in this) {
      if (this.naturalHeight + this.naturalWidth === 0) {
        this.onerror();
        return;
      }
    }

    if (this.width + this.height === 0) {
      this.onerror();
      return;
    }

    resolve(image);
  };
  image.onerror = () => reject(new Error('Invalid image'));
  image.src = dataUrl;
});

/**
 * Run a greyscale filter on the canvas.
 *
 * @param {object} canvas - Canvas object to use in drawing.
 * @returns {object} The updated canvas.
 */
const convertToGreyscale = (canvas) => {
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const { data: pixels } = imageData;
  for (let i = 0; i < pixels.length; i += 4) {
    const grayscale = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
    pixels[i] = grayscale; // red
    pixels[i + 1] = grayscale; // green
    pixels[i + 2] = grayscale; // blue
    // alpha - n/a
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Load the image to canvas, resize and optionally run greyscale filter.
 *
 * @param {object} image - The image to convert.
 * @param {object} options - The prepare options.
 * @returns {object} The updated canvas.
 */
const convertImage = (image, { imageConversion }) => new Promise((resolve) => {
  const canvas = document.createElement('canvas');

  // resize the image so it's smaller dimension equals the option value
  // but not smaller than minimum dimensions allowed
  const smaller = Math.max(imageConversion.resizeTo, MIN_SIZE);
  const ratio = image.width / image.height;
  const zoom = smaller / Math.min(image.width, image.height);
  const width = ratio > 1 ? image.width * zoom : smaller;
  const height = ratio > 1 ? smaller : image.height * zoom;

  // render image on canvas using Megapixel library (Fixes problems for
  // iOS Safari) https://github.com/stomita/ios-imagefile-megapixel
  new MegaPixImage(image).render(canvas, { width, height });

  if (imageConversion.greyscale) {
    convertToGreyscale(canvas);
  }

  resolve(canvas);
});

/**
 * Export the image from canvas to a data URL.
 *
 * @param {object} canvas - The canvas to export.
 * @param {object} options - The prepare options.
 * @returns {string} The data URL.
 */
const exportDataUrl = (canvas, { imageConversion }) => 
  canvas.toDataURL(imageConversion.exportFormat, imageConversion.exportQuality);

/**
 * Merge user options with the default.
 *
 * @param {object} userOptions - User options, if any.
 * @returns {object} Merged options.
 */
const mergeOptions = (userOptions = {}) => ({
  invisible: userOptions.invisible ? userOptions.invisible : DEFAULT_OPTIONS.invisible,
  imageConversion: Utils.extend(DEFAULT_OPTIONS.imageConversion, userOptions.imageConversion)
});

/**
 * Get image file from user and convert to data URL.
 *
 * @param {object} userOptions - User options, if any.
 * @returns {Promise}
 */
const getFile = userOptions => insertMediaCapture(mergeOptions(userOptions)).then(readUserFile);

/**
 * Put image on canvas, convert it and export as data URL.
 *
 * @param {*} imageData - Image data.
 * @param {object} userOptions - User options, if any.
 * @returns {Promise}
 */
const processImage = (imageData, userOptions) => {
  const options = mergeOptions(userOptions);
  if (!Utils.isDataUrl(imageData)) {
    throw new Error('Invalid Image Data URL.');
  }

  return loadImage(imageData)
    .then(image => convertImage(image, options))
    .then(canvas => exportDataUrl(canvas, options))
    .then(dataUrl => ({ image: dataUrl }));
};

module.exports = {
  getFile,
  processImage,
};
