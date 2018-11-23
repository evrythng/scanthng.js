// ## scanthng.js (evrythng.js Plugin)

// This is an evrythng.js plugin that adds the ability to scan QR Codes, 
// Product images (Image recognition) or barcodes that exist in your EVRYTHNG project.
//
// Once the `app.scan()` method is called from inside your application events (e.g.
// click button to scan) it opens the camera if on a mobile devices, or a File Browser
// on a Browser, for you to pick and shoot a picture to be recognized by our engine.
//
// Alternatively, use the `app.scanStream()` method to display a video stream and
// scan QR codes natively within the browser. All other `method` and `type` scans
// are processed by the API at a slower page, but can still be scanned from the stream. 

(function (root, factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {

    // AMD.
    define(factory());

  } else {

    // Browser globals
    root.EVT.Scan = root.Evrythng.Scan = factory();

  }

}(this, function () {
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('utils',[],function () {
  'use strict';

  return {

    // Check if a variable is a function.
    isFunction: function(fn){
      return Object.prototype.toString.call(fn) == "[object Function]";
    },

    // Check if a variable is a string.
    isString: function(str){
      return Object.prototype.toString.call(str) == "[object String]";
    },

    // Check if a variable is an array.
    isArray: function(arr){
      return Object.prototype.toString.call(arr) == "[object Array]";
    },

    // Check if a variable is an Object (includes Object functions and
    // plain objects)
    isObject: function(obj) {
      return obj === Object(obj) && !this.isArray(obj);
    },

    // Check if a variable is an Image Data URL
    isDataUrl: function(str) {
      return Object.prototype.toString.call(str) == "[object String]" && str.match(/^\s*data:image\/(\w+)(;charset=[\w-]+)?(;base64)?,/);
    },

    // Simple and shallow extend method, used to extend an object's properties
    // with another object's. The `override` parameter defines if the
    // source object should be overriden or if this method should return a new
    // object (it is *false by default*).
    extend: function(source, obj, override) {
      var out;

      // Create extensible object.
      if(override) {
        out = source;
      } else {
        // Create shallow copy of source.
        out = {};
        for(var i in source){
          out[i] = source[i];
        }
      }

      // Copy properties.
      for(var j in obj) {
        if(obj.hasOwnProperty(j)) {
          out[j] = obj[j];
        }
      }

      return out;
    },

    isFirefoxMobileBrowser: function(){
      var ua = navigator.userAgent.toLowerCase(),
          version,
          majorVersion;
      if ( ua.indexOf('firefox') > -1 && ua.indexOf('mobile') > -1 ) {
        version = ua.match(/firefox\/([\d.]+)/)[1];
        majorVersion = version.split('.')[0];
        return ( majorVersion >= 10 );
      }
      return false;
    },

    isAndroidBrowser: function() {
      var rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/),
          isaosp = (rxaosp && rxaosp[1]<537);
      return isaosp;
    },

    restoreUser: function(app, User) {
      var userData,
          user;
      if (window.localStorage) {
        userData = this.readStorage('scanthng-' + app.id);
      } else {
        userData = this.readCookie('scanthng-' + app.id);
      }
      if (this.isObject(userData)) {
        user = new User(userData, app);
      }
      return user;
    },

    storeUser: function(app, user) {
      var userData = {
        id: user.id,
        apiKey: user.apiKey
      };
      if (window.localStorage) {
        this.writeStorage('scanthng-' + app.id, userData);
      } else {
        this.writeCookie('scanthng-' + app.id, userData);
      }
    },

    writeStorage: function(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },

    readStorage: function(key) {
      var value = window.localStorage.getItem(key);
      return JSON.parse(value);
    },

    writeCookie: function(key, value) {
      document.cookie = encodeURI(key) + "=" + encodeURI(JSON.stringify(value)) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
    },

    readCookie: function(key) {
      var value = decodeURI(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + decodeURI(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
      return JSON.parse(value);
    }

  };

});

/**
 * Mega pixel image rendering library for iOS6 Safari
 *
 * Fixes iOS6 Safari's image file rendering issue for large size image (over mega-pixel),
 * which causes unexpected subsampling when drawing it in canvas.
 * By using this library, you can safely render the image with proper stretching.
 *
 * Copyright (c) 2012 Shinichi Tomita <shinichi.tomita@gmail.com>
 * Released under the MIT license
 */
(function() {

  /**
   * Detect subsampling in loaded image.
   * In iOS, larger images than 2M pixels may be subsampled in rendering.
   */
  function detectSubsampling(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (iw * ih > 1024 * 1024) { // subsampling may happen over megapixel image
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, -iw + 1, 0);
      // subsampled image becomes half smaller in rendering size.
      // check alpha channel value to confirm image is covering edge pixel or not.
      // if alpha value is 0 image is not covering, hence subsampled.
      return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
    } else {
      return false;
    }
  }

  /**
   * Detecting vertical squash in loaded image.
   * Fixes a bug which squash image vertically while drawing into canvas for some images.
   */
  function detectVerticalSquash(img, iw, ih) {
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = ih;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, 1, ih).data;
    // search image edge pixel position in case it is squashed vertically.
    var sy = 0;
    var ey = ih;
    var py = ih;
    while (py > sy) {
      var alpha = data[(py - 1) * 4 + 3];
      if (alpha === 0) {
        ey = py;
      } else {
        sy = py;
      }
      py = (ey + sy) >> 1;
    }
    var ratio = (py / ih);
    return (ratio===0)?1:ratio;
  }

  /**
   * Rendering image element (with resizing) and get its data URL
   */
  function renderImageToDataURL(img, options, doSquash) {
    var canvas = document.createElement('canvas');
    renderImageToCanvas(img, canvas, options, doSquash);
    return canvas.toDataURL("image/jpeg", options.quality || 0.8);
  }

  /**
   * Rendering image element (with resizing) into the canvas element
   */
  function renderImageToCanvas(img, canvas, options, doSquash) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!(iw+ih)) return;
    var width = options.width, height = options.height;
    var ctx = canvas.getContext('2d');
    ctx.save();
    transformCoordinate(canvas, ctx, width, height, options.orientation);
    var subsampled = detectSubsampling(img);
    if (subsampled) {
      iw /= 2;
      ih /= 2;
    }
    var d = 1024; // size of tiling canvas
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = tmpCanvas.height = d;
    var tmpCtx = tmpCanvas.getContext('2d');
    var vertSquashRatio = doSquash ? detectVerticalSquash(img, iw, ih) : 1;
    var dw = Math.ceil(d * width / iw);
    var dh = Math.ceil(d * height / ih / vertSquashRatio);
    var sy = 0;
    var dy = 0;
    while (sy < ih) {
      var sx = 0;
      var dx = 0;
      while (sx < iw) {
        tmpCtx.clearRect(0, 0, d, d);
        tmpCtx.drawImage(img, -sx, -sy);
        ctx.drawImage(tmpCanvas, 0, 0, d, d, dx, dy, dw, dh);
        sx += d;
        dx += dw;
      }
      sy += d;
      dy += dh;
    }
    ctx.restore();
    tmpCanvas = tmpCtx = null;
  }

  /**
   * Transform canvas coordination according to specified frame size and orientation
   * Orientation value is from EXIF tag
   */
  function transformCoordinate(canvas, ctx, width, height, orientation) {
    switch (orientation) {
      case 5:
      case 6:
      case 7:
      case 8:
        canvas.width = height;
        canvas.height = width;
        break;
      default:
        canvas.width = width;
        canvas.height = height;
    }
    switch (orientation) {
      case 2:
        // horizontal flip
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        // 180 rotate left
        ctx.translate(width, height);
        ctx.rotate(Math.PI);
        break;
      case 4:
        // vertical flip
        ctx.translate(0, height);
        ctx.scale(1, -1);
        break;
      case 5:
        // vertical flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        // 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -height);
        break;
      case 7:
        // horizontal flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(width, -height);
        ctx.scale(-1, 1);
        break;
      case 8:
        // 90 rotate left
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-width, 0);
        break;
      default:
        break;
    }
  }

  var URL = window.URL && window.URL.createObjectURL ? window.URL :
            window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
            null;

  /**
   * MegaPixImage class
   */
  function MegaPixImage(srcImage) {
    if (window.Blob && srcImage instanceof Blob) {
      if (!URL) { throw Error("No createObjectURL function found to create blob url"); }
      var img = new Image();
      img.src = URL.createObjectURL(srcImage);
      this.blob = srcImage;
      srcImage = img;
    }
    if (!srcImage.naturalWidth && !srcImage.naturalHeight) {
      var _this = this;
      srcImage.onload = srcImage.onerror = function() {
        var listeners = _this.imageLoadListeners;
        if (listeners) {
          _this.imageLoadListeners = null;
          for (var i=0, len=listeners.length; i<len; i++) {
            listeners[i]();
          }
        }
      };
      this.imageLoadListeners = [];
    }
    this.srcImage = srcImage;
  }

  /**
   * Rendering megapix image into specified target element
   */
  MegaPixImage.prototype.render = function(target, options, callback) {
    if (this.imageLoadListeners) {
      var _this = this;
      this.imageLoadListeners.push(function() { _this.render(target, options, callback); });
      return;
    }
    options = options || {};
    var imgWidth = this.srcImage.naturalWidth, imgHeight = this.srcImage.naturalHeight,
        width = options.width, height = options.height,
        maxWidth = options.maxWidth, maxHeight = options.maxHeight,
        doSquash = !this.blob || this.blob.type === 'image/jpeg';
    if (width && !height) {
      height = (imgHeight * width / imgWidth) << 0;
    } else if (height && !width) {
      width = (imgWidth * height / imgHeight) << 0;
    } else {
      width = imgWidth;
      height = imgHeight;
    }
    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = (imgHeight * width / imgWidth) << 0;
    }
    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = (imgWidth * height / imgHeight) << 0;
    }
    var opt = { width : width, height : height };
    for (var k in options) opt[k] = options[k];

    var tagName = target.tagName.toLowerCase();
    if (tagName === 'img') {
      target.src = renderImageToDataURL(this.srcImage, opt, doSquash);
    } else if (tagName === 'canvas') {
      renderImageToCanvas(this.srcImage, target, opt, doSquash);
    }
    if (typeof this.onrender === 'function') {
      this.onrender(target);
    }
    if (callback) {
      callback();
    }
    if (this.blob) {
      this.blob = null;
      URL.revokeObjectURL(this.srcImage.src);
    }
  };

  /**
   * Export class to global
   */
  if (typeof define === 'function' && define.amd) {
    define('megapix',[], function() { return MegaPixImage; }); // for AMD loader
  } else if (typeof exports === 'object') {
    module.exports = MegaPixImage; // for CommonJS
  } else {
    this.MegaPixImage = MegaPixImage;
  }

})();

define('polyfill',[],function () {
  'use strict';

  // Add Canvas.toBlob if not existent (IE<11)
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback, type, quality) {

        var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
          len = binStr.length,
          arr = new Uint8Array(len);

        for (var i=0; i<len; i++ ) {
          arr[i] = binStr.charCodeAt(i);
        }

        callback( new Blob( [arr], {type: type || 'image/png'} ) );
      }
    });
  }

});

define('prepare',[
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

/* globals jsQR */

define('scanthng',[
  'utils',
  'prepare'
], function (Utils, Prepare) {
  'use strict';

  var version = '3.1.0';

  // The ID of the <video> element inserted by the SDK.
  var VIDEO_ELEMENT_ID = 'scanthng-video-' + Date.now();
  // The interval between QR code local stream samples.
  var SAMPLE_INTERVAL_FAST = 300;
  // The interval between other image requests.
  var SAMPLE_INTERVAL_SLOW = 2000;

  // Setup default settings:

  // - _**invisible**: File input visibility_
  // - _**imageConversion.greyscale**: Send black & white image, instead of colors_
  // - _**imageConversion.resizeTo**: Maximum smaller dimension of the image sent_
  // - _**imageConversion.exportQuality**: Conversion quality (0 no quality - 1 original quality)_
  // - _**createAnonymousUser**: Create anonymous user when making scan actions_
  var defaultSettings = {
    invisible: true,
    imageConversion: {
      greyscale: true,
      resizeTo: 600,
      exportQuality: 0.8
    },
    createAnonymousUser: false
  };


  // These objects are defined once the Plugin is installed - reused from EVT.js.
  var Promise, EVT;

  var app,
    path = '/scan/identifications',
    currentOptions;

  // Deeply extension of options.
  function _extendOptions(defaultOptions, userOptions) {
    var fullOptions = Utils.extend(defaultOptions, userOptions);

    // Setup all nested object as copies of the default
    fullOptions.imageConversion = Utils.extend(
      defaultOptions.imageConversion,
      userOptions && userOptions.imageConversion || {}
    );

    // Use bigger size from default and what user defines.
    if(userOptions && userOptions.imageConversion && userOptions.imageConversion.resizeTo){
      fullOptions.imageConversion.resizeTo = Math.max(fullOptions.imageConversion.resizeTo,
        userOptions.imageConversion.resizeTo);
    }

    return fullOptions;
  }

  // Effectively send the recognition request to the API, passing in the
  // Base64 image data and request options.
  function _decodeRequest(data) {
    var params;

    ['debug', 'perPage', 'filter'].forEach(function (option) {
      if (typeof currentOptions[option] !== 'undefined') {
        params = params || {};
        params[option] = currentOptions[option];
      }
    });

    var requestOptions = {
      url: path,
      method: data ? 'post' : 'get',
      authorization: app.apiKey,
      params: params
    };

    if (data) {
      requestOptions.formData = data;
    }

    return EVT.api(requestOptions);
  }

  // Convert JSON Object to EVT.Entity.
  function _buildEntity(type, data, scope) {
    var resource = scope[type](data.id),
      entityName = type.charAt(0).toUpperCase() + type.slice(1);

    return new EVT.Entity[entityName](data, resource);
  }

  // Process response of the decode request.
  function _processResponse(response) {
    return _getAnonymousUser().then(function (anonymousUser) {
      return response.map(function (item) {

        // Attach user if avaialble.
        if (Utils.isObject(anonymousUser)) {
          item.user = anonymousUser;

          item.results = item.results.map(function (result) {

            // Convert thng/product JSON to EVT.Entity.
            ['product', 'thng'].forEach(function (type) {
              if (result[type]) {
                result[type] = _buildEntity(type, result[type], anonymousUser);
              }
            });

            return result;
          });
        }

        return item;
      });
    });
  }

  // If `createAnonymousUser` options is enabled, will try to restore anonymous user saved
  // in local storage (or cookie) and create a new anonymous user if there's no saved one.
  function _getAnonymousUser() {
    if (currentOptions.createAnonymousUser) {
      var anonymousUser = Utils.restoreUser(app, EVT.User);

      if (Utils.isObject(anonymousUser)) {
        return Promise.resolve(anonymousUser);
      } else {
        return app.appUser().create({
          anonymous: true
        }).then(function (anonymousUser) {
          Utils.storeUser(app, anonymousUser);
          return anonymousUser;
        });
      }
    } else {
      return Promise.resolve();
    }
  }

  // Decode image (send request to IR API and process the response)
  function _decode(data) {
    return _decodeRequest(data)
      .then(_processResponse);
  }

  /**
   * Process a sample frame from the stream, and find any code present.
   * A callback is required since any promise per-frame won't necessarily resolve or reject.
   *
   * @param {Object} scope - The App scope.
   * @param {Object} canvas - The canvas element.
   * @param {Object} video - The SDK-inserted <video> element.
   * @param {Object} filter - The scanning filter.
   * @param {function} foundCb - Callback for if a code is found.
   */
  function scanSample(scope, canvas, video, filter, foundCb) {
    // Match canvas internal dimensions to that of the video and draw for the user
    var context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    if (filter.method === '2d' && filter.type === 'qr_code') {
      var imgData;
      try {
        imgData = context.getImageData(0, 0, video.videoWidth, video.videoHeight);
      } catch (e) {
        console.log('Failed to getImageData - device may not be ready.');
        return;
      }

      // Scan image data with jsQR
      var result = window.jsQR(imgData.data, imgData.width, imgData.height);
      if (result) {
        foundCb(result.data);
      }
      return;
    }

    // Else, send image data to ScanThng - 1d && ir implicitly included
    scope.scan(canvas.toDataURL()).then(function (res) {
      if (res.length) {
        foundCb(res);
      }
    }).catch(function (err) {
      if (err.errors && err.errors[0].includes('lacking sufficient detail')) {
        // Handle 'not found' for empty images based on API response
        return;
      }

      throw err;
    });
  }

  /**
   * Consume a getUserMedia() video stream and resolves once recognition is completed. 
   *
   * @param {Object} scope - The App scope.
   * @param {Object} stream - The stream to consume.
   * @param {Object} opts - The scanning options.
   * @returns {Promise} A Promise that resolves once recognition is completed.
   */
  function findBarcode(scope, stream, opts) {
    var video = document.getElementById(VIDEO_ELEMENT_ID);
    video.srcObject = stream;
    video.play();

    return new Promise(function (resolve, reject) {
      var interval = SAMPLE_INTERVAL_SLOW;
      if (opts.filter.method === '2d' && opts.filter.type === 'qr_code') {
        interval = SAMPLE_INTERVAL_FAST;
      }

      var canvas = document.createElement('canvas');
      var handle = setInterval(function () {
        try {
          // Scan each sample for a barcode, and resolve if a result is found.
          scanSample(scope, canvas, video, opts.filter, function (res) {
            clearInterval(handle);
            stream.getVideoTracks()[0].stop();
            video.parentElement.removeChild(video);

            // Identify a URL with ScanThng
            if (typeof res === 'string') {
              opts.filter = 'type=qr_code&value=' + res;
              scope.identify(opts).then(resolve);
              return;
            }

            resolve(res);
          });
        } catch (e) {
          reject(e);
        }
      }, interval);
    });
  }

  /**
   * Insert a Safari-compatible <video> element inside parent, if it doesn't already exist.
   *
   * @param {string} containerId - ID of the user's desired parent element.
   */
  function insertVideoElement(containerId) {
    if (document.getElementById(VIDEO_ELEMENT_ID)) {
      return;
    }
    
    const video = document.createElement('video');
    video.id = VIDEO_ELEMENT_ID;
    video.autoPlay = true;
    video.playsInline = true;
    document.getElementById(containerId).appendChild(video);
  }

  /**
   * Use getUserMedia() and jsQR.js to scan QR codes locally, using /identifications for lookup.
   *
   * @param {Object} opts - Scanning options including standard 'filter' and 'containerId'.
   * @returns {Promise} A Promise that resolves with any scan results.
   */
  function scanStream(opts) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia() is not supported with this browser; falling back to Media Capture.');
      return this.scan(opts);
    }

    if (!window.jsQR) {
      throw new Error('jsQR (https://github.com/cozmo/jsQR) not found. You must include it in a <script> tag.');
    }

    if (!document.getElementById(opts.containerId)) {
      throw new Error('Please specify \'containerId\' where the video element can be added as a child');
    }

    if (!(opts.filter.method && opts.filter.type)) {
      throw new Error('Please specify both \'method\' and \'type\' in \'filter\'.');
    }

    // Handle '2D' instead of '2d' entered by user
    opts.filter.method = opts.filter.method.toLowerCase();
    opts.filter.type = opts.filter.type.toLowerCase();

    // Open the stream, identify barcode, then inform the caller.
    var scope = this;
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        insertVideoElement(opts.containerId);
        return findBarcode(scope, stream, opts);
      })
      .then(_processResponse);
  }

  // Plugin API
  var EVTScanPlugin = {

    version: version,

    settings: defaultSettings,

    // Setup new settings.
    setup: function (customSettings) {
      if (Utils.isObject(customSettings)) {
        this.settings = _extendOptions(this.settings, customSettings);
      } else {
        throw new TypeError('Setup should be called with an options object.');
      }

      return this.settings;
    },

    install: function (_Promise_, _EVT_) {
      var $this = this;

      Promise = _Promise_;
      EVT = _EVT_;

      // Add redirect method to the ApplicationScope
      EVT.App.prototype.redirect = function (url) {
        window.location.href = url;
      };

      // Add identify method to the ApplicationScope
      EVT.App.prototype.identify = function (opts, successCallback, errorCallback) {

        // Set global app object defining the scope of this call.
        app = this;

        if (!(Utils.isObject(opts) && opts.hasOwnProperty('filter'))) {
          throw new Error('Missing filter option.');
        }

        currentOptions = _extendOptions($this.settings, opts);

        return new Promise(function (resolve, reject) {
          _decode().then(function (result) {
            if (Utils.isFunction(successCallback)) {
              successCallback(result);
            }
            resolve(result);
          }, function (error) {
            if (Utils.isFunction(errorCallback)) {
              errorCallback(error);
            }
            reject(error);
          });
        });
      };

      EVT.App.prototype.scanStream = scanStream;

      // Add scan method to the ApplicationScope
      EVT.App.prototype.scan = function (imgData, opts, successCallback, errorCallback) {
        var imageData, options, successCb, errorCb;

        // Set global app object defining the scope of this call.
        app = this;

        // Process and prepare options and arguments.
        if (Utils.isFunction(arguments[0])) {
          /* callback first */
          successCb = arguments[0];
          errorCb = arguments[1];

        } else if (Utils.isObject(arguments[0])) {
          /* options first */
          options = arguments[0];
          successCb = arguments[1];
          errorCb = arguments[2];

        } else {
          /* image first */
          imageData = arguments[0];
          if (Utils.isFunction(arguments[1])) {
            /* callback second */
            successCb = arguments[1];
            errorCb = arguments[2];
          } else {
            /* options second */
            options = arguments[1];
            successCb = arguments[2];
            errorCb = arguments[3];
          }
        }

        currentOptions = _extendOptions($this.settings, options);

        var prepareOptions = {
          invisible: currentOptions.invisible,
          imageConversion: currentOptions.imageConversion
        };

        return new Promise(function (resolve, reject) {
          var imagePromise;

          if (Utils.isString(imageData)) {

            // Reject if string is not a valid Image Data Url
            if (!Utils.isDataUrl(imageData)) {
              return reject(new Error('Invalid Image Data URL.'));
            }

            // We already have the image string data, so we only need to process it.
            imagePromise = Prepare.processImage(imageData, prepareOptions);
          } else {
            // Fetch the image data from the file input, before processing.
            imagePromise = Prepare.getFile(prepareOptions).then(Prepare.processImage);
          }

          // Send recognition request to the EVRYTHNG API once image is done processing
          // and resolve or reject accordingly.
          imagePromise.then(_decode).then(function (result) {
            if (Utils.isFunction(successCb)) {
              successCb(result);
            }
            resolve(result);
          }, function (error) {
            if (Utils.isFunction(errorCb)) {
              errorCb(error);
            }
            reject(error);
          });
        });
      };

    }

  };

  // Modules that this plugin requires. Injected into the install method.
  EVTScanPlugin.$inject = ['promise', 'evrythng'];

  // Export for testing
  EVTScanPlugin.insertVideoElement = insertVideoElement;

  return EVTScanPlugin;

});

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('scanthng');
}));
