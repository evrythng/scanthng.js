#scanthng.js 
## Identify Products & Thngs directly from a (mobile) browser...

**scanthng.js** allows your Javascript Web application (Mobile or Desktop) to leverage EVRYTHNG's [products recognition service](https://dev.evrythng.com/documentation/extended#recognitions) by decoding QR codes, barcodes or images and identifying them as EVRYTHNG Products or Thngs!

## Setting your Thngs and Products to work with scanthng.js

### Prerequisites
Before using scanthng you'll need:

* [An EVRYTHNG developer account](https://dashboard.evrythng.com)
* To create an [Application](https://dashboard.evrythng.com/projects/setup/details) as scanthng.js operates on a per Application basis. Note: Applications are called Projects in our [dashboard](https://dashboard.evrythng.com/projects/setup/details).

### Supported Devices

The following devices are currently supported by scanthng.js:

* Android 3.0+ browser
* Chrome for Android 0.16+
* iOS version 6+ (Chrome or Safari, except for 8.0 and 8.0.1)
* Firefox Mobile 10.0+
* IE 10+

### Using QR codes

QR codes can be used to identify both Products and Thngs (i.e., unique instances of Products). To enable this all you need to do is to create a Thngs or a Product (via our API or dashboard) and enable a Redirection. This basically creates a short identity for your object and stores it directly in a QR code.

You can now use scanthng.js to identify the QR of this Thng or Product!

### Using 1D barcodes

Usually a 1D barcode identifies a type of product (aka SKU) and not an instance. However, the EVRYTHNG engine supports identifying both Thngs and Products based on 1D barcodes.

To enable this, edit the `data` field of your Thng or Product and add an Identifier. `type` must match the type of barcode you want to read, currently we support the following types:
* `ean_13`
* `ean_8`
* `upc_8`
* `upc_13`

The `value` field must match the full number on the barcode, e.g., 3057640100178.

You can now use scanthng.js to identify the 1D barcode of of this Thng or Product!

### Using image recognition

Image recognition allows you to recognize Products simply by taking a picture of the product itself. Unlike 1D and QR code recongnition, image recognition is not enabled as a default in your account and requires a premium account. [Contact us to enable it for your account](https://evrythng.com/contact-us/).

If you do have this feature enabled, you can activate image recognition for any Product through the dashboard by clicking on "Setup image recognition" on the Product page.

##Adding scanthng.js to your webapp

To add **scanthng.js** to your site, you can just use our CDN to serve the file by using a script tag like this:

    <script src='//d10ka0m22z5ju5.cloudfront.net/toolkit/scanthng/scanthng-2.0.js'></script>

If you like living on the bleeding edge, you can also use 

    <script src='//d10ka0m22z5ju5.cloudfront.net/toolkit/scanthng/scanthng.js'></script>
    
Which also refers to the latest released version. Be aware that we may introduce backwards incompatible changes into the library now and then so using this version could break your code.


##Dependencies

**scanthng.js** is a module of [evrythng.js](https://github.com/evrythng/evrythng-js-sdk), our main Javascript SDK so you'll need to import it as well. 

##Basic usage
Triggering an identification action is a two-step process. First of all, we instanciate an App with evrythng.js like this:

    var app = new EVT.App(APP-KEY-HERE);
    
then, we initialize a ScanThng instance:

    var st = new EVT.ScanThng(app);

Finally, we call the `identify` method on the instance we just created and use a promise to fetch the results:

    st.identify()
          .then(function(result){
            // Do something on success
          },
          function(error){
            // Do something on error
    });
    
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
      var app = new EVT.App('YOUR-APP-API-KEY');
      var st = new EVT.ScanThng(app);
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

##Options
**scanthng.js** supports the following configuration options to be passed as parameters of the identify method (`st.identify({option1 : value}`)

###type
Type: `String`
Default: `qrcode`

Indicate the type of image that the user is supposed to be scanning. Accepts a string with any of the following values: `qrcode`, `1dbarcode` or `objpic`. `objpic` is the option to indicate for scanning product labels.

###timeout
Type: `Integer`
Default: `10000`

Sets the timeout for AJAX calls and geolocation, in ms.

###redirect
Type: `Boolean`
Default: `true`

Indicates whether the library should automatically redirect user to the redirection URL associated with the scanned Thng or Product. This can be set in the [dashboard](https://dashboard.evrythng.com) on any Product or Thng page.

###imageConversion
    imageConversion : {
              greyscale: Boolean,
              resizeTo: Integer
    }
    
#### imageConversion.grayscale
Type: `Boolean`
Default: `true`
    
Indicates whether the library should to send a black and white version of the scanned image for identification. If do do not need to distinguish images with different colors, this yields better and faster results.

#### imageConversion.resizeTo
Type: `Integer`
Default: 480
    
This sets the maximal size of the image (in pixels, automatically resized) to be sent to the server for recognition. The best tradeoff between speed and quality is currently around 480
