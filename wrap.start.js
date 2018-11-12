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
