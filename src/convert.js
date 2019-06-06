const MegaPixImage = require('@koba04/ios-imagefile-megapixel');

/** minimum image size accepted by API */
const MIN_SIZE = 144;

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

module.exports = {
  convertImage,
};
