/** Stream container ID */
const CONTAINER_ID = 'stream-container';

let scope;
let scopeType;

/**
 * Setup Application scope.
 *
 * @returns {Promise}
 */
const setup = async () => {
  const appApiKey = getUrlParam('app');
  const operatorApiKey = getUrlParam('operator');
  if (!appApiKey && !operatorApiKey) {
    alert('Please provide \'app\' or \'operator\' query param to select SDK scope');
    return;
  }

  scope = appApiKey ? new evrythng.Application(appApiKey) : new evrythng.Operator(operatorApiKey);
  scopeType = appApiKey ? 'app' : 'operator';
  return scope.init().catch(e => alert('API key is invalid'));
};

/**
 * Test scope related functionality.
 */
const testScope = async () => {
  await it('should install plugin', async () => {
    evrythng.use(ScanThng);
    return true;
  });

  await it('should add scan() to scope', async () => {
    return typeof scope.scan === 'function';
  });

  await it('should add scanStream() to scope', async () => {
    return typeof scope.scanStream === 'function';
  });

  await it('should add stopStream() to scope', async () => {
    return typeof scope.stopStream === 'function';
  });

  await it('should add setTorchEnabled() to scope', async () => {
    return typeof scope.setTorchEnabled === 'function';
  });

  if (scopeType === 'app') {
    await it('should add identify() to scope', async () => {
      return typeof scope.identify === 'function';
    });

    await it('should add redirect() to scope', async () => {
      return typeof scope.redirect === 'function';
    });
  }
};

/**
 * Test Utils.js functionality.
 */
const testUtils = async () => {
  await it('Utils - should export expected functions', async () => {
    return (
      typeof isDataUrl === 'function' &&
      typeof writeStorage === 'function' &&
      typeof readStorage === 'function' &&
      typeof restoreUser === 'function' &&
      typeof storeUser === 'function' &&
      typeof insertVideoElement === 'function' &&
      typeof promptImageDownload === 'function' &&
      typeof getCropDimensions === 'function' &&
      typeof getZxingBarcodeFormatType === 'function'
    );
  });

  await it('Utils - should validate a data URL', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABqgAwAEAAAAAQAAABoAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/AABEIABoAGgMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/3QAEAAL/2gAMAwEAAhEDEQA/ALl1A1pavL5e5gPlX1PauMbW9WjuGkRra7jjJLwRJzjvg5/nXTz+MlvEiFnYq0yyq0YeTG4g4xj8axdT1PXbiwt7pBpkdxNJIrwCHDFQcKevTqMmrq4tyl7j0DDYSLg3JXZ0dh5eoWVve2pLRTIHQ9Dg1b+yz/3pP++jWfoWrwaVoNvayWkkhiUgvGQATk9B6Zqf/hMbX/oD6j/37H+NdEcbTa3OGWGlFtH/0OfUQWlwkM8a+duDKoXawJ6H2rpNbhkl+xtDbRm2ZflnB5z3BHZs1x8p3a85PJ/dnn6VuxzzJPcIksiqYtxUMQCc9aydCMVob0ajTsZwu4otUk09kP2hDkJ0Ld8gng1fD3OB+8kHsH/+tXnt9I8jLLI7NJ57HexyeDxz+FeuR8xqT6CuPEUlTa5epCd2z//Z';
    return isDataUrl(dataUrl).length === 4;
  });

  await it('Utils - should validate an invalid data URL', async () => {
    const dataUrl = 'This is not the data URL you\'re looking for';
    return isDataUrl(dataUrl) === null;
  });

  await it('Utils - should write to localStorage', async () => {
    writeStorage('foo', { foo: 'bar' });

    return localStorage.getItem('foo') === '{"foo":"bar"}';
  });

  await it('Utils - should read from localStorage', async () => {
    const data = readStorage('foo');
    return data.foo === 'bar';
  });

  if (scopeType === 'app') {
    await it('Utils - should store a user', async () => {
      const user = await scope.appUser().create({ anonymous: true });
      storeUser(scope, user);

      const data = JSON.parse(localStorage.getItem(`scanthng-${scope.id}`));
      return data.apiKey.length === 80;
    });

    await it('Utils - should restore a stored user', async () => {
      const user = restoreUser(scope, evrythng.User);

      return user.apiKey.length === 80;
    });
  }
};

/**
 * Test Media.js functionality.
 */
const testMedia = async () => {
  let file, dataUrl;

  await it('Media - should insert a form for media capture', async () => {
    await insertMediaCapture({});

    return document.getElementsByClassName(FORM_CLASS).length === 1;
  });

  await it('Media - should remove all existing media capture forms', async () => {
    removeExistingForms();

    return document.getElementsByClassName(FORM_CLASS).length === 0;
  });

  await it('Media - should trigger media capture', async () => {
    await waitAsync(500);
    alert('Please choose any image file');

    const input = await insertMediaCapture({});
    file = await triggerMediaCapture(input);
    removeExistingForms();

    return file !== undefined;
  });

  await it('Media - should read a user file into a data URL', async () => {
    dataUrl = await readUserFile(file);

    return dataUrl.length > 10 && dataUrl.includes('data');
  });

  await it('Media - should read the dataUrl into an img element', async () => {
    const image = await loadImage(dataUrl);

    return image.tagName === 'IMG';
  });
};

/**
 * Test scanStream functionality.
 */
const testScanStream = async () => {
  await it('scanStream - should open a camera stream to scan a QR code (local)', async () => {
    alert('Please scan any QR code');

    const filter = { method: '2d', type: 'qr_code' };
    const res = await scope.scanStream({ filter, containerId: CONTAINER_ID });
    return Array.isArray(res) && res.length > 0 && res[0].meta.value.length > 1;
  });

  await it('scanStream - should open a camera stream to scan a datamatrix code (API)', async () => {
    alert('Please scan any datamatrix code');

    const filter = { method: '2d', type: 'dm' };
    const res = await scope.scanStream({ filter, containerId: CONTAINER_ID });
    console.log(res);
    return Array.isArray(res) && res.length > 0 && res[0].meta.value.length > 1;
  });

  await it('scanStream - should open a camera stream, then stop it', async () => {
    // Don't know when the permission box is closed
    alert('Accept camera permission within 5 seconds, but do not scan anything');

    const filter = { method: '2d', type: 'qr_code' };
    scope.scanStream({ filter, containerId: CONTAINER_ID });

    await waitAsync(5000);
    scope.stopStream();
    return true;
  });

  await it('scanStream - should open a camera stream and scan repeatedly', async () => {
    alert('Please scan any QR code three times');

    let scanCount = 0;
    return new Promise((resolve) => {
      scope.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: CONTAINER_ID,
        autoStop: false,
        /**
         * Callback when a value is scanned
         * @param {*} value 
         */
        onScanValue: (value) => {
          console.log({ scanCount, value });
          scanCount += 1;

          // After three, pass the test
          if (scanCount === 3) {
            scope.stopStream();
            resolve(true);
          }
        }
      });
    });
  });
};

/**
 * Test functionality globally available on ScanThng object.
 */
const testGlobal = async () => {
  await it('Global - should export scanQrCode', async () => {
    return typeof ScanThng.scanQrCode === 'function';
  });

  await it('Global - should export stopScanQrCode', async () => {
    return typeof ScanThng.stopScanQrCode === 'function';
  });
};

/**
 * Test scanQrCode functionality.
 */
const testScanQrCode = async () => {
  await it('scanQrCode - should open a camera stream to scan a QR code', async () => {
    alert('Please scan any QR code');

    const scanValue = await ScanThng.scanQrCode(CONTAINER_ID);
    return typeof scanValue === 'string' && scanValue.length > 0;
  });

  await it('scanQrCode - should open a camera stream, then stop it', async () => {
    // Don't know when the permission box is closed
    alert('Accept camera permission within 5 seconds, but do not scan anything');

    ScanThng.scanQrCode(CONTAINER_ID);

    await waitAsync(5000);
    ScanThng.stopScanQrCode();
    return true;
  });
};

/**
 * Test local 1D/DataMatrix barcode scanning.
 *
 * Note: Works best with physical barcodes as opposed to reading from a screen.
 */
const testScanWithZxing = async () => {
  await it('with zxing-js/browser - should scan a 1D barcode locally', async () => {
    alert('Please scan a 1D barcode, such as EAN-13 or Code 128');

    const filter = { method: '1d', type: 'auto' };
    const res = await scope.scanStream({ filter, containerId: CONTAINER_ID, useZxing: true });
    console.log(res);
    return Array.isArray(res) && res.length > 0 && typeof res[0].meta.value !== 'undefined';
  });

  await it('with zxing-js/browser - should scan a DataMatrix barcode locally', async () => {
    alert('Please scan a DataMatrix code');

    const filter = { method: '2d', type: 'dm' };
    const res = await scope.scanStream({ filter, containerId: CONTAINER_ID, useZxing: true });
    console.log(res);
    return Array.isArray(res) && res.length > 0 && typeof res[0].meta.value !== 'undefined';
  });
};

/**
 * The tests. Each is asynchronous.
 */
const main = async () => {
  if(!await setup()) return;

  await testScope();
  await testUtils();
  await testMedia();
  await testScanStream();
  await testGlobal();
  await testScanQrCode();
  await testScanWithZxing();

  await waitAsync(500);
  alert('Suite is complete');
};

main();
