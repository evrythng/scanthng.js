define([
  'utils',
  'megapix',
  'polyfill'
], function (Utils, MegaPixImage) {
  'use strict';

  var defaultPrepareOptions = {
      invisible: true,
      imageConversion:{
        greyscale: true,
        resizeTo: 240,
        exportFormat: 'image/jpeg',
        exportQuality: 0.8
      }
    },
    minSize = 144, // minimum image size accepted by API
    prepareOptions = {};

  // Create the DOM elements to handle image selection
  function _insertMediaCapture() {
    return new Promise(function(resolve, reject) {
      var elementId = prepareOptions.id ? prepareOptions.id : 'scanthng' + Date.now();

      var captureForm = document.createElement('form'),
        captureInput = document.createElement('input');

      captureForm.setAttribute('id', elementId);
      captureForm.setAttribute('class', 'scanThng_form');
      captureInput.setAttribute('type', 'file');
      captureInput.setAttribute('name', 'scanThng_upload');
      captureInput.setAttribute('accept', 'image/*');
      captureInput.setAttribute('capture', 'camera');

      if (prepareOptions.invisible) {
        captureForm.style.visibility = 'hidden';
      }
      captureForm.appendChild(captureInput);

      // Remove any previously created media capture forms before creating a new one
      var existing = document.getElementsByClassName('scanThng_form');
      if (existing.length) {
        for(var i = 0, len = existing.length; i < len; i++) {
          if(existing[i] && existing[i].parentElement) {
            existing[i].parentElement.removeChild(existing[i]);
          }
        }
      }

      // Append Media Capture form with the right URL
      document.getElementsByTagName('body')[0].appendChild(captureForm);

      // Add listener for changes in our Media Capture element

      // TODO: Change the event from onchange to onblur (<input id="uploadImage" type="file" name="myPhoto" onblur="PreviewImage();">?
      // http://stackoverflow.com/questions/26668950/safari-crash-while-taking-photo-in-iphone-4s-ios-8-1#comment45587634_26668950
      captureInput.addEventListener('change', function() {
        var file = this.files[0];
        if (!file){
          reject(new Error('No file selected.'));
        }
        resolve(file);
      });

      if (Utils.isAndroidBrowser() || Utils.isFirefoxMobileBrowser()) {
        var _activateMediaCapture = function() {
          captureInput.click();
        };
        window.setTimeout( _activateMediaCapture.bind(this, elementId), 800 );
      } else {
        captureInput.click();
      }
    });
  }

  // Read file selected by user
  function _readUserFile(file) {
    // Export with the same file type as input
    prepareOptions.imageConversion.exportFormat = file.type;

    return new Promise(function(resolve, reject){
      var reader = new FileReader();

      reader.onload = function(event) {
        resolve(event.target.result);
      };
      reader.onerror = function(error){
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  function _loadImage(dataUrl){
    return new Promise(function(resolve, reject){
      var image = document.createElement('img');
      image.onload = function() {
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
      image.onerror = function(){
        reject(new Error('Invalid image'));
      };

      image.src = dataUrl;
    });
  }

  // Load the image to canvas, resize and optionally run greyscale filter
  function _convertImage(image) {

    return new Promise(function(resolve){
      var canvas = document.createElement('canvas');

      // resize the image so it's smaller dimension equals the option value
      // but not smaller than minimum dimensions allowed
      var smaller = Math.max(prepareOptions.imageConversion.resizeTo, minSize),
        ratio = image.width / image.height,
        zoom = smaller / Math.min (image.width, image.height),
        width = ratio > 1 ? image.width * zoom : smaller,
        height = ratio > 1 ? smaller : image.height * zoom;

      // render image on canvas using Megapixel library (Fixes problems for
      // iOS Safari) https://github.com/stomita/ios-imagefile-megapixel
      var mpImage = new MegaPixImage(image);
      mpImage.render(canvas, {
        width: width,
        height: height
      });

      if (prepareOptions.imageConversion.greyscale){
        _convertToBlackWhite(canvas);
      }

      resolve(canvas);
    });
  }

  // Run a greyscale filter on the canvas
  function _convertToBlackWhite(canvas) {
    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    var pixels = imageData.data;
    for (var i = 0, n = pixels.length; i < n; i += 4) {
      var grayscale = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
      pixels[i] = grayscale; // red
      pixels[i + 1] = grayscale; // green
      pixels[i + 2] = grayscale; // blue
      // alpha
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Export the image from canvas to a blob
  function _exportBlob(canvas) {
    return new Promise(function(resolve){
      canvas.toBlob(function(blob){
          // Destroy the canvas - prepare for GC
          canvas = null;
          resolve(blob);
        },
        prepareOptions.imageConversion.exportFormat,
        prepareOptions.imageConversion.exportQuality
      );
    });
  }

  function _setup(userOptions){
    prepareOptions = {
      invisible: userOptions.hasOwnProperty('invisible') ? userOptions.invisible : defaultPrepareOptions.invisible,
      imageConversion: Utils.extend(defaultPrepareOptions.imageConversion, userOptions.imageConversion)
    };
    return prepareOptions;
  }

  // Get image file from user and convert to data url
  function _getFile(options){
    _setup(options);
    return _insertMediaCapture().then(_readUserFile);
  }

  // Put image on canvas, convert it and export as data url
  function _processImage(imageData, options){
    if(options){
      _setup(options);
    }

    return _loadImage(imageData)
      .then(_convertImage)
      .then(_exportBlob)
      .then(function(blob){
        return {image: blob};
      });
  }

  return {
    getFile: _getFile,
    processImage: _processImage
  };

});
