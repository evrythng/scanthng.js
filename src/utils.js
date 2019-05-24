define(function () {
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
