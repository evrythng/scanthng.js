/* eslint-disable global-require */

let Convert;
let Utils;

/** The default prepare options. */
const DEFAULT_OPTIONS = {
  invisible: true,
  imageConversion: {
    greyscale: true,
    resizeTo: 480,
    exportFormat: 'image/png',
    exportQuality: 0.9,
  },
};

/** Class shared by all media capture forms. */
const FORM_CLASS = 'scanthng_form';

/**
 * Remove previous media capture forms before creating a new one (multiple scans)
 */
const removeExistingForms = () => {
  const existing = document.getElementsByClassName(FORM_CLASS);
  for (let i = 0; i < existing.length; i += 1) {
    if (existing[i].parentElement) {
      existing[i].parentElement.removeChild(existing[i]);
    }
  }
};

/**
 * Create the DOM elements to handle user image selection.
 *
 * @param {object} options - The prepare options.
 * @returns {object} The created input for media capture.
 */
const insertMediaCapture = (options) => new Promise((resolve) => {
  removeExistingForms();

  const captureForm = document.createElement('form');
  captureForm.setAttribute('id', `scanthng${Date.now()}`);
  captureForm.setAttribute('class', FORM_CLASS);
  captureForm.style.visibility = options.invisible ? 'hidden' : 'initial';

  const captureInput = document.createElement('input');
  captureInput.setAttribute('type', 'file');
  captureInput.setAttribute('name', 'scanThng_upload');
  captureInput.setAttribute('accept', 'image/*');
  captureInput.setAttribute('capture', 'camera');
  captureForm.appendChild(captureInput);

  document.body.appendChild(captureForm);

  resolve(captureInput);
});

/**
 * Trigger a click event on an input.
 *
 * @param {object} input - The <input> to trigger.
 * @returns {Promise} Promise that resolves the chosen file.
 */
const triggerMediaCapture = (input) => new Promise((resolve, reject) => {
  // Add listener for changes in our Media Capture element
  input.addEventListener('change', (e) => {
    const [file] = e.target.files;
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }

    resolve(file);
  });

  input.click();
});

/**
 * Read file selected by user.
 *
 * @param {object} file - The file chosen by the user.
 * @returns {Promise}
 */
const readUserFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Load an image from a data URL.
 *
 * @param {string} dataUrl - The data URL.
 * @returns {Promise}
 */
const loadImage = (dataUrl) => new Promise((resolve, reject) => {
  const image = document.createElement('img');
  image.onload = function onload() {
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
 * Export the image from canvas to a data URL.
 *
 * @param {object} canvas - The canvas to export.
 * @param {object} options - The prepare options.
 * @returns {string} The data URL.
 */
const exportDataUrl = (canvas, { imageConversion }) => canvas.toDataURL(
  imageConversion.exportFormat, imageConversion.exportQuality,
);

/**
 * Merge user options with the default.
 *
 * @param {object} userOptions - User options, if any.
 * @returns {object} Merged options.
 */
const mergeOptions = (userOptions = {}) => ({
  invisible: userOptions.invisible ? userOptions.invisible : DEFAULT_OPTIONS.invisible,
  imageConversion: { ...DEFAULT_OPTIONS.imageConversion, ...userOptions.imageConversion },
});

/**
 * Get image file from user and convert to data URL.
 *
 * @param {object} userOptions - User options, if any.
 * @returns {Promise}
 */
const getFile = (userOptions) => insertMediaCapture(mergeOptions(userOptions))
  .then(triggerMediaCapture)
  .then(readUserFile);

/**
 * Put image on canvas, convert it and export as data URL.
 *
 * @param {*} imageData - Image data.
 * @param {object} userOptions - User options, if any.
 * @returns {Promise}
 */
const processImage = (imageData, userOptions) => {
  if (!Utils.isDataUrl(imageData)) {
    throw new Error('Invalid Image Data URL.');
  }

  const options = mergeOptions(userOptions);
  return loadImage(imageData)
    .then((image) => Convert.convertImage(image, options))
    .then((canvas) => exportDataUrl(canvas, options))
    .then((dataUrl) => ({ image: dataUrl }));
};

if (typeof module !== 'undefined') {
  Convert = require('./convert');
  Utils = require('./utils');

  module.exports = {
    DEFAULT_OPTIONS,
    getFile,
    processImage,
    readUserFile,
  };
}
