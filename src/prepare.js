import Utils from './utils'

const MegaPixImage = require('@koba04/ios-imagefile-megapixel');

const defaultOptions = {
  invisible: true,
  imageConversion:{
    greyscale: true,
    resizeTo: 240,
    exportFormat: 'image/jpeg',
    exportQuality: 0.8,
  }
};

// minimum image size accepted by API
const minSize = 144;
const prepareOptions = {};

// Create the DOM elements to handle image selection
const _insertMediaCapture = () => new Promise((resolve, reject) => {
  const elementId = prepareOptions || `scanthng${Date.now()}`;

  const captureForm = document.createElement('form');
  captureForm.setAttribute('id', elementId);
  captureForm.setAttribute('class', 'scanthng_form');

  const captureInput = document.createElement('input');
  captureInput.setAttribute('type', 'file');
  captureInput.setAttribute('name', 'scanThng_upload');
  captureInput.setAttribute('accept', 'image/*');
  captureInput.setAttribute('capture', 'camera');

  if (prepareOptions.invisible) {
    captureForm.style.visibility = 'hidden';
  }

  captureForm.appendChild(captureInput);

  // Remove any previously created media capture forms before creating a new one
  const existing = document.getElementsByClassName('scanthng_form');
  if (existing.length) {
    for (let i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].parentElement) {
        existing[i].parentElement.removeChild(existing[i]);
      }
    }
  }

  // Append Media Capture form with the right URL
  document.getElementsByTagName('body')[0].appendChild(captureForm);

  // Add listener for changes in our Media Capture element
  captureInput.addEventListener('change', () => {
    const [file] = this.files;
    if (!file) {
      reject(new Error('No file selected.'));
    }

    resolve(file);
  });

  if (Utils.isAndroidBrowser() || Utils.isFirefoxMobileBrowser()) {
    window.setTimeout(() => captureInput.click(), 800);
    return;
  }

  captureInput.click();
});

// Read file selected by user
const _readUserFile = (file) => {
  // Export with the same file type as input
  prepareOptions.imageConversion.exportFormat = file.type;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const _loadImage = (dataUrl) => new Promise(function(resolve, reject) {
  const image = document.createElement('img');
  image.onload = function () {
    if ('naturalHeight' in this) {
      if (this.naturalHeight + this.naturalWidth === 0) {
        this.onerror();
        return;
      }
    } else if (this.width + this.height === 0) {
      this.onerror();
      return;
    }

    resolve(image);
  };
  image.onerror = () => reject(new Error('Invalid image'));
  image.src = dataUrl;
});

// Load the image to canvas, resize and optionally run greyscale filter
const _convertImage = async (image) => {
  const canvas = document.createElement('canvas');

  // resize the image so it's smaller dimension equals the option value
  // but not smaller than minimum dimensions allowed
  const smaller = Math.max(prepareOptions.imageConversion.resizeTo, minSize);
  const ratio = image.width / image.height;
  const zoom = smaller / Math.min (image.width, image.height);
  const width = ratio > 1 ? image.width * zoom : smaller;
  const height = ratio > 1 ? smaller : image.height * zoom;

  // render image on canvas using Megapixel library (Fixes problems for
  // iOS Safari) https://github.com/stomita/ios-imagefile-megapixel
  const mpImage = new MegaPixImage(image);
  mpImage.render(canvas, {
    width: width,
    height: height
  });

  if (prepareOptions.imageConversion.greyscale) {
    _convertToBlackWhite(canvas);
  }

  return canvas;
};

// Run a greyscale filter on the canvas
const _convertToBlackWhite = (canvas) => {
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const grayscale = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
    pixels[i] = grayscale; // red
    pixels[i + 1] = grayscale; // green
    pixels[i + 2] = grayscale; // blue
    // alpha
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

// Export the image from canvas to a blob
const _exportBlob = canvas => new Promise((resolve) => {
  canvas.toBlob((blob) => {
      // Destroy the canvas - prepare for GC
      canvas = null;
      resolve(blob);
    },
    prepareOptions.imageConversion.exportFormat,
    prepareOptions.imageConversion.exportQuality,
  );
});

const _setup = (userOptions) => {
  prepareOptions = {
    invisible: userOptions.invisible ? userOptions.invisible : defaultOptions.invisible,
    imageConversion: Utils.extend(defaultOptions.imageConversion, userOptions.imageConversion)
  };
  return prepareOptions;
};

// Get image file from user and convert to data url
const _getFile = (options) => {
  _setup(options);
  return _insertMediaCapture().then(_readUserFile);
};

// Put image on canvas, convert it and export as data url
const _processImage = (imageData, options) => {
  if (options) {
    _setup(options);
  }

  return _loadImage(imageData)
    .then(_convertImage)
    .then(_exportBlob)
    .then(image => ({ image }));
};

const Prepare = {
  getFile: _getFile,
  processImage: _processImage,
};

export default Prepare;
