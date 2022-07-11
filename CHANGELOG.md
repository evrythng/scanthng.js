# v4.12.0 (11-07-2022)

## Features

- Add `onScanFrameData` option that allows an app to obtain an image of the video stream at the point
  in time a code was scanned, which can be useful for driving UIs. It accepts a callback function
  that is called with the base64 image data in the chosen `imageConversion` format:

  ```js
  const opts = {
    filter: { method, type },
    containerId,
    onScanFrameData: (base64) => {
      // Show the frame at the point of decode
      img.src = base64;
    },
  };

  const res = await operator.scanStream(opts);
  console.log(res);
  ```

  If the `autoStop: false` option is used, then this callback is called for each successive scan.

# v4.11.0

## Features

- Adjust minimum allowed local scanning intervals.
- Add `idealWidth` and `idealHeight` options to adjust the request for video stream constraints.
- Add `onScanValue` callback option, to be used when `autoStop` is `false` to receive scan values instead of via promise resolution.

## Other

- Reduce objects allocated on each invocation and on each frame.
- Clean up `README.md` and make the full list of options more readable.

# v4.10.0 (05-11-2021)

## Features

- Add ability to scan 1D barcodes locally with `zxing-js/browser`, in addition to the already implemented local scanning of 2D barcodes with `jsQR`. To use, include the library and use the following options:

  ```html
  <script type="text/javascript" src="https://unpkg.com/@zxing/browser@latest"></script>
  ```

  ```js
  const opts = {
    filter: {
      method: '1d',
      type: 'auto',
    },
    containerId: SCANSTREAM_CONTAINER_ID,
    useZxing: true,
  };

  const res = await operator.scanStream(opts);
  console.log(res);
  ```

  If the scanned value has a [mappable type](https://github.com/evrythng/scanthng.js/blob/master/src/utils.js#L152) to the EVRYTHNG Identifier Recognition API, the usual Thng/product lookup by `identifiers` will be done and a Thng or product included in the results.

  See the `test/zxing-test-app` directory for a full usable example.

## Other

* Tidy up example apps
* Tidy up feature tests
* Improve `README.md`

# v4.9.0 (24-09-2021)

## Features

- Updated the integration with Digimarc `discover.js` to use the latest version of the library (v1.0.0), if configured to do so and the library files are included first.

- `onWatermarkDetected` now passes the full result from `discover.js`, not just the detected state.

Before this version:

```js
operator.scanStream({
  containerId,
  filter,
  useDiscover: true,
  onWatermarkDetected: (detected) => console.log(`Watermark detected: ${detected}`),
}).then(console.log);
```

After this version:

```js
operator.scanStream({
  containerId,
  filter,
  useDiscover: true,
  onWatermarkDetected: (discoverResult) => {
    const detected = discoverResult.watermark;

    // x, y, width, height, rotation also available
    console.log(discoverResult);
  },
}).then(console.log);
```

# v4.8.0 (07-07-2021)

## Features

- Add `useDiscover` option to enable client-side Digimarc watermark sensing, if the library is also made available.
- Add `onWatermarkDetected` option to get called when the detection state changes.
- Add `imageConversion.cropPercent` option to square crop some of the sent frame when `useDiscover` is `true`.
- Add `downloadFrames` option to prompt file download for frames sent to the API.
- Add `setTorchEnabled` to enable the torch, on supported devices, while the video stream is open.
- When `method` is `digimarc`, autoselect `imageConversion` options if not already specified.

## Other changes

- Replace `MegaPixImage` dependency with native canvas scaling.
- Update default remote image frame send interval to 1500ms.
- Add new `discover-test-app`.
- Rework `stream.js` so that the same post-compression image data is given to discover _and_ the API.
- Apply `eslint` with `eslint-config-airbnb` where there was no linter before.


# v4.6.0 (02-03-2021)

## Features

- **ScanThng.convertToDataUrl**: Provides functionality to read a user file into a data URL.

- **ScanThng.convertImageFormat**: Pre-processs an image for QR decoding.

```
<input
  id="file"
  name="file"
  type="file"
  onChange={async event => {
    const file = event.currentTarget.files[0];
    const dataUrl = await ScanThng.convertToDataUrl(file);
    const processedDataUrl = await ScanThng.convertImageFormat(
      dataUrl,
      {
        imageConversion: {
          exportFormat: 'image/jpeg',
          exportQuality: 0.9,
          greyscale: false,
          resizeTo: 480,
        },
      },
    );
    console.log(processedDataUrl);
  }}
/>
```

# v4.5.0 (10-12-2020)

## Features

- **Operator**: `Operator` SDK scopes can be used as well as Application scopes.

> When using with `Operator`, the `createAnonymousUser` option is not available.

```js
const res = await operator.scanStream(opts);
```

# v4.4.0 (31-07-2020)

## Features

- **scanStream**: `app.scanStream()` now accepts `imageConversion`.

```js
app.scanStream({
  filter: { method: 'digimarc', type: 'gs1:21' },
  containerId: 'stream_container',
  imageConversion: {
    greyscale: false,
    exportFormat: 'image/jpeg',
    resizeTo: 1080,
  },
})
  .then(console.log)
  .catch(console.log);
```

# v4.3.0 (22-07-2020)

## Features

- **scanStream**: `app.scanStream()` now accepts `interval` which changes its
  scan rate. The minimum interval for non-native scanning is 500ms.

```js
app.scanStream({
  filter: { method: '2d', type: 'qr_code' },
  containerId: 'stream_container',
  interval: 300,
})
  .then(console.log)
  .catch(console.log);
```

# v3.1.0 (21-11-2018)

## Features

- **scanStream**: `app.scanStream()` can now be used to scan natively in the 
  browser via the `getUserMedia()` API, else falling back to `app.scan()`. The
  app developer must include `jsQR.js` by adding a `<script>` tag before us. The
  method adds a `<video>` element inside a container specified by the developer. 
  A fast scan rate is used for local scanning of QR codes, and a slower one for 
  all other code types (since more requests are made to the API).

```
app.scanStream({
  filter: { method: '2d', type: 'qr_code' },
  containerId: 'stream_container',
}).then(function (res) {
  if (!res.length) {
    console.log('Nothing found!');
    return;
  }

  console.log(res[0].results[0].redirections[0]);  
}).catch(console.log);
```


# v2.0.0 (11-01-2017)

## Breaking changes

- **implicitScans**: `implicitScans` are not created automatically when scanning an image.
- **Options**: `type`, `timeout`, `threshold`, `redirect`, `createScanAction` and `spinner` options have been removed.
See [README](https://github.com/evrythng/evrythng-scan.js#spinner) for more information on how to use custom spinner.

## Features
- **Options**: Use `filter` option to filter out results based on `method` and `type`
```
app.scan({
  filter: {
    type: 'image'
  }
});
```
- **Options**: Use `debug` option to include debug information in response.
- **Options**: Use `perPage` option to specify max number of matches in response.
- **identify**: `.identify` method is now available on the app and allows to get Thng/product infromation
associated with provided value:
```
app.identify({
  filter: {
    type: 'text',
    value: 'value'
  }
});
```
- **redirect**: Redirect to url provided `app.redirect('https://evrythng.com')`

# v1.2.3 (20-10-2016)

## Bug fixes

- **Image resize**: send larger images when using `qrcode`, `1dbarcode`, `datamatrix` and `autodetect` types.
- **Timing**: Adds timing and type information to the created scan action.

# v1.2.2 (16-09-2016)

## Bug fixes

- **Options**: Send `threshold` param to server regardless of recognition type.

# v1.2.1 (15-09-2016)

## Bug fixes

- **Prepare options**: Allow to specify imageConversion options on setup.

# v1.2.0 (20-07-2016)

## Features

- **Options**: Supports new scanning engine. Added additional scan types `datamatrix` and `autodetect`.

## Bug fixes

- **Format**: Convert image to same format as the original file.

# v1.1.0 (09-06-2016)

## Changes

- **Scan plugin**: When `createScanAction` option is set, we return the `redirectionContext` and 
                   `redirectUrl` found in the _reaction_ of the created _scan_ action are
                   in the payload top level. It potentially overrides value obtained
                   from the _redirection_.

# v1.0.1 (05-09-2015)

## Bug fixes

- **Prepare options**: fixed bug when trying to process image without custom prepare options.

# v1.0.0 (18-08-2015)

## Features

- **Scan**: _Scanthng.js_ was converted to a plugin. This adds Product Recognition capabilities to any EVRYTHNG App.
