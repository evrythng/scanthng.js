# v4.5.0 (10-12-2020)

## Features

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
