# scanthng.js

![](assets/infographic.png)

`scanthng.js` is a plugin to be used with the
[evrythng.js](https://github.com/evrythng/evrythng.js)
Web SDKs to quickly and easily identify products stored in the EVRYTHNG
Platform via 1D, 2D barcodes or image recognition.

With `scanthng.js` there is no need to use a native mobile application to scan
tags such as QR or EAN/UPC codes on products, or to recognize products in images -
it works directly from any supported browser!

When an EVRYTHNG product or Thng has a
[redirection](https://developers.evrythng.com/v3.0/reference#redirections) set,
the resulting short URL is shown in the Dashboard as a QR code (this can also be
[generated via the API](https://developers.evrythng.com/v3.0/reference#section-generate-a-qr-code)
if needed).

After this is done, `scanthng.js` can be used to scan for this QR code when it
is printed on a product using either `scan()` or `scanStream()` methods (see
below).

In addition to simply decoding QR codes, more than 20 barcode types can also be
decoded. Both single image and video stream scanning is also offered, applicable
for all kinds of scanning use-cases.

## Contents

* [Installation](#installation)
* [Demo App](#demo-app)
* [Account Setup](#account-setup)
* [Available scan types](#available-scan-types)
* [Scan a Single Photo](#scan-a-single-photo)
* [Scan a Camera Stream](#scan-a-camera-stream)
* [Scan a QR code value only](#scan-a-qr-code-value-only)
* [Full Scan Options](#full-scan-options)
* [Example Scenarios](#example-scenarios)


## Installation

In addition to the instructions below, make sure to also install the
[evrythng.js](https://github.com/evrythng/evrythng.js) (or
[evrythng-extended.js](https://github.com/evrythng/evrythng-extended.js)) SDKs
according to their instructions.


### npm

Install the `scanthng` npm module:

```
npm i -D scanthng
```

Include using a script tag:

```html
<script src="./node_modules/scanthng/dist/scanthng.js"></script>
```


### CDN Distribution

Add the script tag to your HTML page, specifying the version you will use:

```html
<script src="https://d10ka0m22z5ju5.cloudfront.net/js/scanthng/4.14.0/scanthng-4.14.0.js"></script>
```

### Supported Devices

The following browsers are currently supported by `scanthng.js`, based on
support for [`getUserMedia()`](https://caniuse.com/#feat=stream).

- Chrome 53+
- Safari 11+
- Firefox 36+
- Edge 17+
- Firefox for Android 62+
- Safari for iOS 11+
- IE 10+ (except `scanStream()`)


## Demo App

Check out our [`scanthng.js` demo app](https://scanthng-demo.evrythng.io) to see
how barcode scanning works in the browser on desktop and mobile devices. You can 
use the example Application API Key or your own key to test scanning all the 
supported barcode types. Scan the QR code below to open the demo app on your 
phone:

![](assets/demo-app.png)


## Account Setup

`scanthng.js` is designed for recognition of EVRYTHNG products and Thngs via the
[Identifier Recognition API](https://developers.evrythng.com/reference#identifier-recognition).

Before using this can be done you will need:

- An [EVRYTHNG Dashboard](https://dashboard.evrythng.com) account.
- A project and application within that account.
- One or more products or Thngs that have redirections and `identifiers` set
  corresponding to the `type` chosen (see below).

In order to be recognised when scanned, an EVRYTHNG product or Thng must have a
redirection set up. Depending on the `method` and `type` of code selections,
some `identifiers` to associate the item with barcodes such as DataMatrix or
UPC/EAN 13 etc. are required.

For example, to associate a Thng with a datamatrix code:

```json
{
  "name": "Test Pallet",
  "tags": ["demo"],
  "identifiers": {
    "dm": "84289433"
  }
}
```

or associating a product with an EAN-13 barcode:

```json
{
  "name": "Iain M. Banks - Excession",
  "tags": ["books"],
  "brands": ["Orbit"],
  "identifiers": {
    "ean_13": "9781857234572"
  }
}
```


## Available scan types

The full range of `method` and `type` parameters are listed below:


**`method: 2d`**

`type`s available:
- `dm`
- `qr_code`

**`method: 1d`**

`type`s available:
- `codabar`
- `code_11`
- `code_39`
- `code_93`
- `code_128`
- `ean_8`
- `ean_13`
- `industr_25`
- `itf`
- `rss_14`
- `rss_expanded`
- `rss_limited`
- `upc_a`
- `upc_e`

> Note: You can use `method: 1d` and `type: auto` after including
> [`zxing-js/browser`](https://github.com/zxing-js/browser) to perform decoding
> of 1D barcodes locally, instead of via the API.

**`method: digimarc`**

`type`s available:
- `gs1:01` - Watermarks containing GTIN match to `gs1:01` product identifiers.
- `gs1:21` - Watermarks containing Serial or Extra data match to `gs1:21` Thng identifiers.
- `serialized` - Watermarks containing GTIN and Serial/Extra Data. Same as `gs1:21`, except Thng and product are both verified as linked. 
- `discover` - Watermarks containing a 'discover-type' payload match to `digimarc:discover` Thng identifiers.

When scanning with `method: digimarc`, the following `imageConversion`
configuration in `option` is recommended, and will be used if not specified
explicitly:

```js
imageConversion: {
  greyscale: false,
  exportFormat: 'image/jpeg',
  resizeTo: 1080,
  exportQuality: 0.85,
}
```

Additionally, make use of pre-imported `discover.js` with the `useDiscover`
option to only send frames to the API when there is a high chance of decoding
a Digimarc watermark. You can also get notified when detection results are
available:

```js
useDiscover: true,
onWatermarkDetected: (discoverResult) => console.log(discoverResult),
```

If `useDiscover` is enabled, make sure you also include `discover.js` and
associated libraries as well.


## Scan a Single Photo

> Note: Due to browser security features, the `scan()` or `scanStream()` methods
> (without supplied image) Base64 data must be called as a result of a user
> action - a click event handler or similar.

Use the `scan()` method on an SDK scope to scan for a barcode or QR code. This
method will use either the device's camera app, or a file browser depending on
what is supported and available.

```js
// Operator, Application, or AccessToken can be used
const operator = new evrythng.Operator(APP_API_KEY);

operator.scan({
  // Specify the code type to be identified
  filter: { method: '2d', type: 'qr_code' },
})
  .then(res => console.log(`Results: ${JSON.stringify(res)}`))
  .catch(err => console.log(err));
```

If photo data is already obtained, the raw Base64 format data can also be
scanned without taking a new photo:

```js
// Image converted to Base64 from disk or Canvas (truncated for brevity)
const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...';

// Scan the data
operator.scan(base64)
  .then(res => console.log(`Results: ${JSON.stringify(res)}`))
  .catch(err => console.log(err));
```

See the
[_Matching and Response_](https://developers.evrythng.com/v3.0/reference#section-matching-and-response)
section to see the expected response format. Both the recognised Thngs/products
and metadata about the scan attempt is returned. An example is shown below:

```json
[
  {
    "results": [
      {
        "redirections": [
          "https://tn.gg/Q9Wqcg4w"
        ],
        "product": {
          "id": "UYKNDMGcswyFBdf6wr7M5Erm",
          "properties": {},
          "name": "Box of Cereals",
          "identifiers": {}
        }
      }
    ],
    "meta": {
      "method": "2d",
      "score": 100,
      "value": "https://tn.gg/Q9Wqcg4w",
      "type": "qr_code"
    }
  }
]
```


## Scan a Camera Stream

For a more seamless user experience, we recommend scanning for barcodes from a
device's camera stream, similar to the default experience in modern mobile
barcode scanners including Google Lens and the iOS Camera app. This is achieved
simply by using the `scanStream()` method instead of `scan()`, with a slightly
different HTML page structure.

This method uses client-side libraries to scan a video stream for QR codes or
1D barcodes locally in the browser via the native
[`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
Web API. To use the `scanStream()` method, make sure you add the required
library to  your project and include it with a `<script>` tag, for example:

```html
<!-- For QR codes (method=2d type=qr_code) use jsQR -->
<script src="./lib/jsQR.js"></script>

<!-- For 1D barcodes (method=1d type=auto) use zxing-js/browser -->
<script type="text/javascript" src="https://unpkg.com/@zxing/browser@0.0.3"></script>
```

Then, specify the `id` of a container such as a `<div>` that the SDK can insert
the camera viewfinder `<video>` element into. This `<video>` should be styled as
desired to fit the application experience.

```html
<div id="stream_container">
  <!-- video will be inserted here -->
</div>
```

This container is then used when calling `scanStream()`. The results are in the
same format as for the `scan()` method.

```js
// Scan locally for QR codes in a video stream every half-second
operator.scanStream({
  filter: { method: '2d', type: 'qr_code' },
  containerId: 'stream_container',
  interval: 500,
})
  .then(console.log)
  .catch(console.log);
```

**Note: specifying other `method` and `type` combinations to `method=2d` and
`type=qr_code` will still use the camera stream, but will query the web API
instead of analysing the image locally, and at a slower rate by default
(300ms vs 2000ms). The minimum scan rate for non-native scanning is 500ms.**


### Scan a QR code value only

If all you want to do is scan a QR code for a string representation, and do not
require any kind of lookup of the corresponding Thng or product in the EVRYTHNG
Platform, use convenience `scanQrCode()` method. This is similar to
`scanStream()` available from an SDK scope (see above), but doesn't communicate
with the Platform to enrich the results.

Similar to the example above, a specified container ID is used, instead calling
`scanQrCode()` with no SDK scope required. The result in this case is a single
string decoded from the observed QR code.

```js
ScanThng.scanQrCode('stream_container')
  .then(console.log)
  .catch(console.log);
```

The scanner can be stopped at any time:

```js
ScanThng.stopScanQrCode();
```


## Full Scan Options

This section details all of the available `options` values that can be passed to
`scan()` or `scanStream()` when performing a scan.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `filter` | `object` | Required | Contains the `method` and `type` for the type of code to scan. See above for all available values. |
| `autoStop` | `boolean` | `true` | Stop the stream and remove the video when the first scan result is obtained. |
| `onScanResult` | `function` | None | When `autostop=false`, get multiple results using this callback. You must stop the video stream manually. |
| `useDiscover` | `boolean` | `false` | (Digimarc only) Use `discover.js` to detect a watermark and only send likely frames to be decoded. Saves on bandwidth. |
| `onWatermarkDetected` | `function` | None | Callback to be notifed when a frame may contain a watermark. Useful for showing in the UI when something is detected and a result is expected soon after. |
| `useZxing` | `boolean` | `false` | (1D only) Use `zxing-js/browser` to decode locally. Check which code types are supported in `src/utils.js`. Currently, version `0.0.3` should be used to prevent issues on iOS. |
| `idealWidth` | `number` | `1920` | Request an ideal video stream width, which _may_ be honored by the browser. |
| `idealHeight` | `number` | `1080` | Request an ideal video stream height, which _may_ be honored by the browser. |
| `imageConversion` | `object` | See `media.js` | Optional constraints for how a single image scan photo is processed before being sent to the API. |
| `imageConversion.greyscale` | `boolean` | `true` | Convert the image to greyscale which can yield better results. |
| `imageConversion.resizeTo` | `number` | `1000` | Sets the maximum size of the smaller dimension of the image. |
| `imageConversion.exportQuality` | `number` | `0.8` | Sets the quality of exported image in relation to the original with `1` being the original quality. |
| `imageConversion.exportFormat` | `string` | `image/png` | Sets the format of exported image, possible values are `image/png` and `image/jpeg`. |
| `imageConversion.cropPercent` | `number` | `0` | (Digimarc only) Specify a square crop percentage. For example, `0.1` to crop 10% of each edge. | 
| `invisible` | `boolean` | `true` | Hide the input element used to prompt for file upload. |
| `offline` | `boolean` | `false` | Do not attempt to resolve the scanned URL as an EVRYTHNG resource. |
| `createAnonymousUser` | `boolean` | `false` | (Application scope only) Try to create an Anonymous User. |
| `debug` | `boolean` | `false` | Include debug information in the response. |
| `downloadFrames` | `boolean` | `false` | (API only) Prompt a file download for each frame just before the request is sent. Useful for debugging image format/quality. |
| `onScanFrameData` | `function` | None | Callback to receive video frame when a scan value was decoded, for local scan types only. |

## Example Scenarios

Scan an image and redirect to URL (using redirections short URL).

```js
operator.scan({
  filter: { method: '2d', type: 'qr_code' },
}).then((matches) => {
  const result = matches[0].results[0];

  // Redirect the browser (this will create an implicitScan action)
  return operator.redirect(result.redirections[0]);
});
```

Scan an image, then create a scan action and redirect to URL (using
reaction URL). **createAnonymousUser is required!**

```js
operator.scan({
  filter: { method: '2d', type: 'dm' },
  createAnonymousUser: true,
}).then((matches) => {
  const result = matches[0].results[0];

  // Action made as an Anonymous User
  return result.thng.action('scans').create();
}).then((action) => {
  console.log(action);
  return operator.redirect(action.reactions[0].redirectUrl);
});
```

Try to recognize the product, correct the incorrectly decoded value returned and
try and identify the product again. In this example, `0` was omitted from the
start of the barcode.

```js
operator.scan({
  filter: { method: '1d', type: `ean_13` },
}).then(matches => {
  const meta = matches[0].meta;

  return operator.identify({
    filter: {
      // Correct the value originally decoded
      value: '0' + meta.value,
      type: meta.type,
    }
  });
}).then((matches) => {
  const result = matches[0].results[0];
  console.log(result);
});
```


## More Documentation

Check the
[Identifier Recognition API](https://developers.evrythng.com/reference/identifier-recognition)
page for full details on the EVRYTHNG Platform API behind the scenes of this
SDK.


## Testing

The `test` directories contain simple pages that allow quick testing of SDK
functionality. See their respective `README.md` files for more details.


## Third-party Software

We use these great software projects help us build this one:

* [`jsQR.js`](https://github.com/cozmo/jsQR) (under Apache 2.0)

* [`zxing-js/browser`](https://github.com/zxing-js/browser) (under MIT)
