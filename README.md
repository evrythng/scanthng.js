#scanthng.js 
## Identify Products & Thngs directly from a (mobile) browser...

`scanthng.js` is an [evrythng.js](https://github.com/evrythng/evrythng-js-sdk) module that lets you identify Products and Thngs. By using a blend of cutting-edge HTML5 and our backend product recognition service, it allows a (mobile) browser to take a picture of an object, a QR code or a barcode and recognize them as [EVRYTHNG Products or Thngs](https://dashboard.evrythng.com)!

## Setting your Thngs and Products to work with scanthng.js

### Prerequisites
Before using scanthng you'll need:

* [An EVRYTHNG developer account](https://dashboard.evrythng.com)
* To create an [Application](https://dashboard.evrythng.com/projects/setup/details) as `scanthng.js` operates on a per Application basis. Note: Applications are called Projects in our [dashboard](https://dashboard.evrythng.com/projects/setup/details).

### Supported Devices

The following mobile browsers are currently supported by `scanthng.js`:

* Android 3.0+ browser
* Chrome for Android 0.16+
* iOS version 6+ (Chrome or Safari, except for 8.0 and 8.0.1)
* Firefox Mobile 10.0+
* IE 10+

### Using QR codes

QR codes can be used to identify both Products and Thngs (i.e., unique instances of Products). To enable this all you need to do is to create a Thngs or a Product (via our API or dashboard) and enable a Redirection. This basically creates a short identity for your object and stores it directly in a QR code.

You can now use `scanthng.js` to identify the QR of this Thng or Product!

### Using 1D barcodes

Usually a 1D barcode identifies a type of product (aka SKU) and not an instance. However, the EVRYTHNG engine supports identifying both Thngs and Products based on 1D barcodes.

To enable this, edit the `data` field of your Thng or Product and add an Identifier. `type` must match the type of barcode you want to read, currently we support the following types:
* `ean_13`
* `ean_8`
* `upc_8`
* `upc_13`

The `value` field must match the full number on the barcode, e.g., 3057640100178.

You can now use `scanthng.js` to identify the 1D barcode of of this Thng or Product!

### Using image recognition

Image recognition allows you to recognize Products simply by taking a picture of the product itself. Unlike 1D and QR code recongnition, image recognition is not enabled as a default in your account and requires a premium account. [Contact us to enable it for your account](https://evrythng.com/contact-us/).

If you do have this feature enabled, you can activate image recognition for any Product through the dashboard by clicking on "Setup image recognition" on the Product page.

##Adding scanthng.js to your web app

###Dependencies

`scanthng.js` is a module of [`evrythng.js`](https://github.com/evrythng/evrythng-js-sdk), our main Javascript SDK.

###Adding link to script

To add `scanthng.js` to your project, you can just use our CDN to serve the file by using a script tag like this:

    <script src='//d10ka0m22z5ju5.cloudfront.net/toolkit/scanthng/scanthng-2.0.0.js'></script>

**Note**: For scanthing.js to work, you must load `evrythng.js` first.

###Installing as [Bower component](http://bower.io)

If you're using Bower in your project, simply run

    bower install scanthng.js

`Scanthng.js` (and `evrythng.js` if it's not installed yet) will be downloaded and installed in your project's components folder.
Now add it to your project:

    <script src="bower_components/scanthng.js/scanthng.js"></script>

**Note**: Remember to load `evrythng.js` first!

##Basic usage

Triggering an identification action is a two-step process. First of all, we instanciate an App with `evrythng.js` like this:

    var app = new EVT.App(APP-KEY-HERE);
    
then, we initialize a ScanThng instance:

    var st = new EVT.ScanThng(app);

Finally, we call the `identify` method on the instance we just created and use a promise to fetch the results:

    st.identify()
        .then(function(result) {
            // Do something on success
          },
          function(error) {
            // Do something on error
          });
    
We use a promise above as the preferred style, but callbacks are also supported:

    st.identify(
        {}, 
        function(result) {
          // success callback
        }, 
        function(error) {
          // error callback
        }
      );

**Note**: Due to browser limitations, the `identify` method **must** be called as a result of a user action - a click event handler or similar.

###Simplistic usage example

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="identify">Identify</button>

    <script src="http://cdn.evrythng.net/toolkit/evrythng-js-sdk/evrythng.js"></script>
    <script src="http://cdn.evrythng.net/toolkit/scanthng/scanthng-2.0.0.js"></script>
    <script type="text/javascript">    
    (function(){
      // Initialise Evrythng.js App
      var app = new EVT.App('YOUR-APP-API-KEY');
      // Initialise Scanthng
      var st = new EVT.ScanThng(app);

      // Add click event handler to start identification when user clicks the button
      var el = document.getElementById('identify');
      el.addEventListener('click', function(){
        /*
         * We use a promise but callbacks are also supported:
         * s.identify(options, successCb, errorCb);
         */
        st.identify({
            type: 'objpic', // options are: objpic, 1dbarcode, qrcode
            redirect: false // 'true' means we get redirected to the App 
                            // corresponding to this Product
          })
          .then(function(result){
            // Do something with the results, like loading the Product/Thng
            // information from the EVRYTHNG API
            console.log('SUCCESS', result);
          },
          function(error){
            console.log('ERROR', error);
          });
      })
    })();
    </script>
</body>
</html>
```

## Options

`scanthng.js` supports the following configuration options.

These options can be passed as parameters to each call of the identify method

    st.identify({ option1 : value1 }) ...

Or set as default for all calls:

    st.setup({ option1: value1 });
    st.identify() ...

### type
Type: `String`
Default: `qrcode`

Indicate the type of image that the user is supposed to be scanning. Accepts a string with any of the following values: `qrcode`, `1dbarcode` or `objpic`. `objpic` is the option to indicate for scanning product labels.

### timeout
Type: `Integer`
Default: `10000`

Sets the timeout for AJAX calls and geolocation, in ms.

### redirect
Type: `Boolean`
Default: `true`

Indicates whether the library should automatically redirect user to the redirection URL associated with the scanned Thng or Product. This URL can be set in the [dashboard](https://dashboard.evrythng.com) on any Product or Thng page.

### imageConversion
    imageConversion : {
      greyscale: Boolean,
      resizeTo: Integer
    }
    
#### imageConversion.greyscale
Type: `Boolean`
Default: `true`
    
Indicates whether the library should to send a black and white version of the scanned image for identification.
If you do not need to distinguish similar images with different colors, this yields better and faster results.

#### imageConversion.resizeTo
Type: `Integer`
Default: `480`
    
Sets the maximum size of the image (in pixels, automatically resized) to be sent to the server for recognition. The best tradeoff between speed and quality is currently around 480.

### spinner
    spinner: {
      enabled: true,
      appendTo: document.getElementsByTagName('body')[0],
      options: {
        length: 30,
        radius: 48,
        hwaccel: true
      }
    }

`scanthng.js` uses the [`spin.js`](http://fgnass.github.io/spin.js/) library to display a configurable spinner.

####enabled
Type: `Boolean`
Default: `true`

Indicates whether to display the built-in spinner. Set to `false` to disable it.

####appendTo
Type: `DOM Element`
Default: `document.getElementsByTagName('body')[0]`

Reference to DOM element our spinner will be attached to. If invalid or null, spinner will be attached to the body.

####options
Type: `Object`
Default: `{ length: 30, radius: 48, hwaccel: true }`

Spinner options as described in [`spin.js` documentation](http://fgnass.github.io/spin.js/).
