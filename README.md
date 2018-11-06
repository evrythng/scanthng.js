# scanthng.js (plugin for EVT.js)

**scanthng.js** is the Web SDK of our SCANTHNG product. It is an extension 
plugin to be used with [evrythng.js](https://github.com/evrythng/evrythng.js) or 
[evrythng-extended.js](https://github.com/evrythng/evrythng-extended.js) JS 
libraries.

It lets you identify EVRYTHNG Products and Thngs directly from any Web 
Application. By using a blend of cutting-edge HTML5 and our backend product 
recognition service, it allows a (mobile) browser to take a `picture` of an 
object, a `QR code` or a `barcode` and recognize them as 
[EVRYTHNG Products or Thngs](https://dashboard.evrythng.com).


## Setting your Thngs and Products to work with scanthng.js

### Prerequisites

Before using the Product Recognition service you'll need:

- [An EVRYTHNG developer account](https://dashboard.evrythng.com)
- Create a Project and an Application in your Account
- Create a Web Application and initialize your EVRYTHNG App with 
  [evrythng.js](https://github.com/evrythng/evrythng.js)

### Supported Devices

The following mobile browsers are currently supported by **scanthng.js**:

- Android 3.0+ browser
- Chrome for Android 0.16+
- iOS version 6+
- Firefox Mobile 10.0+
- IE 10+

### Using QR codes

QR codes can be used to identify both Products and Thngs (i.e.: unique instances 
of Products). To enable this all you need to do is to create a Thng or a Product 
(via our API or Dashboard) and setup a 
[Redirection](https://developers.evrythng.com/docs/redirections).
 
This basically creates a short identity for your object and stores it directly 
in a QR code.  Therefore scanning this QR Code recognizes this Product, 
moreover, other type of codes such like Datamatrix can also encodes Url. It the 
encoded Url is the short identify of an existing entity, it will works the same 
way.


### Using identifier recognition

#### 1D/2D barcodes

Usually barcodes identify a type of product (aka SKU) and not an instance. 
However, the EVRYTHNG Platform
supports identifying both Thngs and Products based on barcodes.

Full list of barcodes supported can be seen at 
[Identifier Recognition](https://developers.evrythng.com/docs/identifier-recognition#section-identify-from-image).

To enable this, you need to add an **Identifier to your Thng or Product** 
(via our API or Dashboard). In the
Dashboard, the **Name of the indentifer** must match the type of barcode you 
want to read.  Use any of the keys below for the type of barcode you want to 
use:

- dm
- qr_code
- codabar
- code_11
- code_39
- code_93
- code_128
- ean_8
- ean_13
- industr_25
- itf
- rss_14
- rss_expanded
- rss_limited
- upc_a
- upc_e

The Value field must match the full value of the barcode, 
**e.g.: 3057640100178.**

#### Optical character recognition (OCR)

Similar to the barcodes, you can use the OCR capability of our service by adding 
a `text` identifier to your Thng or Product, where the value could be any 
sequence of characters, **e.g.: Frrjs9bf6klmek.**

Read more about 
[Identifier Recognition](https://developers.evrythng.com/docs/identifier-recognition).

### Using Image Recognition

Image recognition allows you to recognize Products simply by taking a picture of 
the product itself. 

You can activate image recognition for any Product through the dashboard by 
clicking on "Setup image recognition" on the Product page and upload your 
reference images.


## Installation

### Browser

##### With [Bower](http://bower.io/)

```
bower install scanthng --save
```
    
The Bower package is [AMD](http://requirejs.org/docs/whyamd.html)-compatible. 
This means you can load it asynchronously using tools like 
[Require.js](http://requirejs.org/) or simply dropping the script tag into your 
HTML page:

```html
<script src="bower_components/scanthng/dist/scanthng.min.js"></script>
```

See [Usage](#usage) below for more details.


##### Load from CDN

Add the script tag to your HTML page, specifying the version you will use:

```html
<script src="https://d10ka0m22z5ju5.cloudfront.net/toolkit/evrythng-js-sdk/scanthng-3.1.0.min.js"></script>
```

If **insecure** HTTP is required, use this URL (though this is not recommended):

```html
<script src="http://cdn.evrythng.com/toolkit/evrythng-js-sdk/scanthng-3.1.0.min.js"></script>
```


## Usage

#### RequireJS (AMD)

```js
requirejs.config({
  paths: {
    'evrythng': '../bower_components/evrythng/dist/evrythng',
    'scanthng': '../bower_components/scanthng/dist/scanthng'
  }
});
    
require([
  'evrythng', 
  'scanthng'
], function (EVT, Scan) {
  EVT.use(Scan);
  ...
  
});
```

#### Globals

```js
// The plugin is attached as EVT.Scan
EVT.use(EVT.Scan);
...
```

## Examples

#### General

Setup global settings - see more below

```js
// Always scan for 2D QR codes
EVT.Scan.setup({
  filter: {
    method: '2d', type: `qr_code`,
  }
});
```

`app` now has `scan()`, `scanStream()`, `identify()` and `redirect()` methods. 
`scan()` will open up the file browser or image capture, whereas `scanStream()`
uses [`jsQR.js`](https://github.com/cozmo/jsQR) to scan a video stream for 
**QR codes** in the browser. Specifying other types will use the web API as 
usual.

Process it to ensure best results and send a recognition request to the 
[API](https://developers.evrythng.com/docs/identifier-recognition).

Additionally, you can use `.identify()` method to submit 'corrected' value and 
read the data associated with it.


Use the Promise API

```js
app.scan()
  .then(function(result) {
    // Do something on success
  })
  .catch(function(error) {
    // Do something on error
  });
```

Use one-off settings

```js
app.scan({
  createAnonymousUser: true
}).then(...);
```


Process a base64 image if you already have it (does not launch image capture)

```js
app.scan('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...').then(...);
```

**Note: Due to browser limitations, the `scan` method without supplied image 
data must be called as a result of a user action - a click event handler or 
similar. E.g.:**

```js
document.querySelector('#scan').addEventListener('click', function() {
  app.scan().then(...);
});

// jQuery
$('#scan').on('click', function() {
  app.scan().then(...);
});
```

#### Spinner

Using [spin.js](http://spin.js.org)

```js
// use your custom id instead of 'spinner'
var spinner = new Spinner().spin(document.getElementById('spinner')); 

app.scan()
  .then(matches => console.log(matches))
  .catch(err => console.log(err))
  .then(() => spinner.stop());
```


## Options

### filter
Type: `String` or `Object`

There are different identifier types available for each scanning method. You can 
easily filter out matches based on `method` or `type`. If `filter` option is not 
provided, both are detected automatically. Results are always ordered by score 
(highest first).

```js
filter: {
  method: '2d', // this includes dm and qr_code types
}
```

or

```js
filter: 'method=2d', // this includes dm and qr_code types
```

Multiple items:

```js
filter: {
  method: ['2d', 'ir'], // this includes 2D and image types
}
```

or

```js
filter: 'method=2d,ir' // this includes 2D and image types
```

#### filter.method
Type: `String`

Available methods: `ocr`, `ir`, `1d` or `2d`.

```js
filter: {
  method: '2d',
}
```

####filter.type
Type: `String`

Type of recognition `text`, `image`, `qr_code`, etc.
Full list of types available here: 
[Identifier Recognition](https://developers.evrythng.com/docs/identifier-recognition#section-types-of-request).

```js
filter: {
  type: 'qr_code'
}
```

**NOTE:** When using `filter.type`, `filter.method` is irrelevant. When using 
both, `type` must fit the `method` chosen.

### debug
Type: `Boolean` Default: `false`

Include debug information in response (`timings` and `vertices`).

### perPage
Type: `Integer`

Max number of matches in response. To only get the best result, use 
`perPage: 1`.


### imageConversion

```js
imageConversion: {
  greyscale: Boolean,
  resizeTo: Integer,
  exportQuality: Float
}
```

#### imageConversion.greyscale
Type: `Boolean` Default: `true`

Indicates whether the library should send a black and white version of the 
scanned image for identification. If you do not need to distinguish similar 
images with different colors, this yields better and faster results.

#### imageConversion.resizeTo
Type: `Integer` Default: `600` Range: `144..`

Sets the maximum *smaller* dimension of the image (in pixels, automatically 
resized) to be sent to the server for recognition. The best trade-off between 
speed and quality is currently around 600.

#### imageConversion.exportQuality
Type: `Integer` Default: `0.8` Range: `0..1`

Sets the quality of exported image in relation to the original (1 being the 
original quality).

### invisible
Type: `Boolean` Default: `true`

If enabled, hides the `<input type=file>` element used to prompt for file 
upload.

### createAnonymousUser
Type: `Boolean` Default: `false`

If enabled, **scanthng.js** will try to create an Anonymous User and save it in 
local storage (falling back to cookies) for subsequent requests. For 
convenience, this User will be added to the output of the `scan()` method. In 
these scenarios, the item recognized is also converted into a resource.


```js
app.scan({
  filter: 'method=2d',
  createAnonymousUser: true
}).then((matches) => {
  console.log(matches[0].user);
  console.log(matches[0].results[0].product);
});
```

The most common use case for this is easily tracking users from the beginning, 
by device, without forcing them to create an account or login with Facebook in 
our "experience" app. Obviously, Anonymous Users are not as "valuable" as full 
App Users, because we don't store their personal details, but in some situations 
that's good enough.


## Scenarios

Recognize the image using the Image Recognition service, read debug information

```js
app.scan({
  filter: {
    method: 'ir'
  },
  debug: true
}).then(matches => console.log(matches[0].meta.debug));
```

Recognize the image, redirect to url (using redirections short url)

```js
app.scan({
  filter: {
    method: 'ocr'
  },
  perPage: 5
}).then((matches) => {
  let result = matches[0].results[0];

  // this will create an implicit scan
  return app.redirect(result.redirections[0]); 
});
```

Recoginize the image, then create a scan action and redirect to url (using 
reaction url). **Anonymous user is required!**

```js
app.scan({
  filter: {
    method: '2d'
  },
  createAnonymousUser: true
}).then((matches) => {
  let result = matches[0].results[0];

  // Action made as a User
  return result.thng.action('scans').create();
}).then((action) => {
  console.log(action);
  return app.redirect(action.reactions[0].redirectUrl);
});
```

Try to recognize the image, correct the value returned and read the match again

```js
app.scan({
  filter: {
    method: '2d'
  },
}).then(matches => {
  let meta = matches[0].meta;

  return app.identify({
    filter: {
      // put correct value
      value: meta.value + '4', 
      type: meta.type
    }
  });
}).then(matches => {
  let result = matches[0].results[0];
  console.log(result);
});
```

---

## Documentation

Check the 
[Identifier Recognition Service API](https://developers.evrythng.com/reference#identifier-recognition).

## Related tools

#### evrythng.js

[`evrythng.js`](https://github.com/evrythng/evrythng.js) is the core version of 
*evrythng.js* intended to be used in public applications and/or devices.

#### evrythng-extended.js

[`evrythng-extended.js`](https://github.com/evrythng/evrythng-extended.js) is an 
extended version of *evrythng.js* which includes Operator access to the API.
