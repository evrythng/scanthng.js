// Check if a variable is a function.
const isFunction = fn => Object.prototype.toString.call(fn) === '[object Function]';

// Check if a variable is a string.
const isString = str => Object.prototype.toString.call(str) == '[object String]';

// Check if a variable is an array.
const isArray = arr => Object.prototype.toString.call(arr) == '[object Array]';

// Check if a variable is an Object (includes Object functions and plain objects)
const isObject = obj => obj === Object(obj) && !isArray(obj);

// Check if a variable is an Image Data URL
const isDataUrl = str => Object.prototype.toString.call(str) == '[object String]' &&
  str.match(/^\s*data:image\/(\w+)(;charset=[\w-]+)?(;base64)?,/);

/**
 * Simple and shallow extend method, used to extend an object's properties
 * with another object's. The `override` parameter defines if the
 * source object should be overriden or if this method should return a new
 * object (it is *false by default*).
 */
const extend = (source, obj, override) => {
  let out;

  // Create extensible object.
  if (override) {
    out = source;
  } else {
    // Create shallow copy of source.
    out = {};
    for (var i in source){
      out[i] = source[i];
    }
  }

  // Copy properties.
  for (var j in obj) {
    if (obj.hasOwnProperty(j)) {
      out[j] = obj[j];
    }
  }

  return out;
};

const isFirefoxMobileBrowser = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox') && ua.includes('mobile')) {
    const version = ua.match(/firefox\/([\d.]+)/)[1];
    const majorVersion = version.split('.')[0];
    return majorVersion >= 10;
  }

  return false;
};

const isAndroidBrowser = () => {
  const rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/);
  return rxaosp && rxaosp[1] < 537;
};

const writeStorage = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readStorage = (key) => {
  var value = window.localStorage.getItem(key);
  return JSON.parse(value);
};

const writeCookie = (key, value) => {
  document.cookie = encodeURI(key) + '=' + encodeURI(JSON.stringify(value)) + '; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/';
};

const readCookie = (key) => {
  var value = decodeURI(document.cookie.replace(new RegExp('(?:^|.*;\\s*)' + decodeURI(key).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*'), "$1"));
  return JSON.parse(value);
}

const restoreUser = (app, User) => {
  const userData = window.localStorage
   ? readStorage('scanthng-' + app.id)
   : readCookie('scanthng-' + app.id);

  if (isObject(userData)) {
    return new User(userData.apiKey);
  }
};

const storeUser = (app, user) => {
  const userData = { apiKey: user.apiKey };
  if (window.localStorage) {
    writeStorage('scanthng-' + app.id, userData);
    return;
  }

  // Fallback to cookie
  writeCookie('scanthng-' + app.id, userData);
};

const Utils = {
  isFunction,
  isString,
  isArray,
  isObject,
  isDataUrl,
  extend,
  isFirefoxMobileBrowser,
  isAndroidBrowser,
  writeStorage,
  readStorage,
  writeCookie,
  readCookie,
  restoreUser,
  storeUser,
};

export default Utils;
