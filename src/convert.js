/** minimum image size accepted by API */
const MIN_SIZE = 144;

/**
 * Run a greyscale filter on the canvas.
 *
 * @param {object} canvas - Canvas object to use in drawing.
 * @returns {object} The updated canvas.
 */
const convertToGreyscale = (canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const { data: pixels } = imageData;
  for (let i = 0; i < pixels.length; i += 4) {
    const grayscale = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
    pixels[i] = grayscale; // red
    pixels[i + 1] = grayscale; // green
    pixels[i + 2] = grayscale; // blue
    // alpha - n/a
  }

  ctx.putImageData(imageData, 0, 0);
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

  let { width, height } = image;
  const original = { width, height };

  const { resizeTo, greyscale } = imageConversion;

  // If resizing not disabled
  if (resizeTo !== false) {
    // resize the image so it's smaller dimension equals the option value
    // but not smaller than minimum dimensions allowed
    const smaller = Math.max(resizeTo, MIN_SIZE);
    const ratio = image.width / image.height;
    const zoom = smaller / Math.min(image.width, image.height);
    width = ratio > 1 ? image.width * zoom : smaller;
    height = ratio > 1 ? smaller : image.height * zoom;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, original.width, original.height, 0, 0, canvas.width, canvas.height);

  if (greyscale) {
    convertToGreyscale(canvas);
  }

  resolve(canvas);
});

module.exports = {
  convertImage,
};
