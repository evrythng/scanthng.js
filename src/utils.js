/**
 * Check if a variable is an Image Data URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} true if the str is a valid data URL.
 */
const isDataUrl = str => Object.prototype.toString.call(str) == '[object String]' &&
  str.match(/^\s*data:image\/(\w+)(;charset=[\w-]+)?(;base64)?,/);

/**
 * Simple and shallow extend method, used to extend an object's properties
 * with another object's. The `override` parameter defines if the
 * source object should be overriden or if this method should return a new
 * object (it is *false by default*).
 */
const extend = (source, obj, override) => {
  let out = {};

  // Create extensible object.
  if (override) {
    out = source;
  } else {
    // Create shallow copy of source.
    for (let i in source) {
      out[i] = source[i];
    }
  }

  // Copy properties
  for (let j in obj) {
    if (obj.hasOwnProperty(j)) {
      out[j] = obj[j];
    }
  }

  return out;
};

/**
 * Check if the user agent is a Firefox Mobile browser.
 *
 * @returns {boolean} true if the user agent is a Firefox Mobile browser.
 */
const isFirefoxMobileBrowser = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox') && ua.includes('mobile')) {
    const version = ua.match(/firefox\/([\d.]+)/)[1];
    const majorVersion = version.split('.')[0];
    return majorVersion >= 10;
  }

  return false;
};

/**
 * Check if the user agent is the Android browser.
 *
 * @returns {boolean} true if the user agent is the Android browser.
 */
const isAndroidBrowser = () => {
  const rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/);
  return rxaosp && rxaosp[1] < 537;
};

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
const readStorage = key => JSON.parse(localStorage.getItem(key));

/**
 * Write a key-value pair as a cookie.
 *
 * @param {string} key - The key.
 * @param {*} value - The value.
 */
const writeCookie = (key, value) => {
  document.cookie = encodeURI(key) + '=' + encodeURI(JSON.stringify(value)) + '; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/';
};

/**
 * Read a key-value pair from cookie.
 *
 * @param {string} key - The key.
 * @returns {*} The value as a JSON object.
 */
const readCookie = (key) => {
  var value = decodeURI(document.cookie.replace(new RegExp('(?:^|.*;\\s*)' + decodeURI(key).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*'), "$1"));
  return JSON.parse(value);
};

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

  // Fallback to cookie
  writeCookie(key, userData);
};

/**
 * Restore the user scope instance.
 *
 * @param {object} app - The Application scope.
 * @param {object} User - The User scope class.
 */
const restoreUser = (app, User) => {
  const userData = localStorage
   ? readStorage('scanthng-' + app.id)
   : readCookie('scanthng-' + app.id);

  if (typeof userData === 'object') {
    return new User(userData.apiKey);
  }
};

module.exports = {
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
