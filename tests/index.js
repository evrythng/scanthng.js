let app;

/**
 * Setup Application scope.
 *
 * @returns {Promise}
 */
const setup = async () => {
  const apiKey = getUrlParam('app');
  if (!apiKey) {
    alert('Please provide \'app\' query param with Application API Key to use');
    return;
  }

  app = new evrythng.Application(apiKey);
  return app.init().catch(e => alert('API key is invalid'));
};

/**
 * Test scope related functionality.
 */
const testScope = async () => {
  await it('should install plugin', async () => {
    evrythng.use(ScanThng);
    return true;
  });

  await it('should add scan() to Application scope', async () => {
    return typeof app.scan === 'function';
  });

  await it('should add scanStream() to Application scope', async () => {
    return typeof app.scanStream === 'function';
  });

  await it('should add identify() to Application scope', async () => {
    return typeof app.identify === 'function';
  });

  await it('should add redirect() to Application scope', async () => {
    return typeof app.redirect === 'function';
  });
};

/**
 * Test Utils.js functionality.
 */
const testUtils = async () => {
  await it('Utils - should export expected functions', async () => {
    return (
      typeof isDataUrl === 'function' &&
      typeof extend === 'function' &&
      typeof isFirefoxMobileBrowser === 'function' &&
      typeof isAndroidBrowser === 'function' &&
      typeof writeStorage === 'function' &&
      typeof readStorage === 'function' &&
      typeof writeCookie === 'function' &&
      typeof readCookie === 'function' &&
      typeof restoreUser === 'function' &&
      typeof storeUser === 'function'
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

  await it('Utils - should extend an object and create a copy', async () => {
    const source = { foo: 'bar' };
    const extension = { foo2: 'bar2' };

    const result = extend(source, extension);
    return (
      result.foo === 'bar' &&
      result.foo2 === 'bar2' &&
      source.foo2 === undefined
    );
  });

  await it('Utils - should extend an object and override the source', async () => {
    const source = { foo: 'bar' };
    const extension = { foo2: 'bar2' };

    const result = extend(source, extension, true);
    return (
      result.foo === 'bar' &&
      result.foo2 === 'bar2' &&
      source.foo2 === 'bar2'
    );
  });

  await it('Utils - should recognise Firefox mobile browser from UA', async () => {
    const uaStr = 'Mozilla/5.0 (Android 7.0; Mobile; rv:54.0) Gecko/54.0 Firefox/54.0';
    
    return isFirefoxMobileBrowser(uaStr);
  });

  await it('Utils - should recognise Android browser from UA', async () => {
    const uaStr = 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; SCH-I535 Build/KOT49H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    
    return isAndroidBrowser(uaStr);
  });

  await it('Utils - should recognise non-Firefox mobile browser from UA', async () => {
    return !isFirefoxMobileBrowser(window.navigator.userAgent);
  });

  await it('Utils - should recognise non-Android browser from UA', async () => {
    return !isAndroidBrowser(window.navigator.userAgent);
  });

  await it('Utils - should write to localStorage', async () => {
    writeStorage('foo', { foo: 'bar' });

    return localStorage.getItem('foo') === '{"foo":"bar"}';
  });

  await it('Utils - should read from localStorage', async () => {
    const data = readStorage('foo');
    return data.foo === 'bar';
  });

  await it('Utils - should write to a cookie', async () => {
    writeCookie('foo', { foo: 'bar' });

    return document.cookie.includes('foo');
  });

  await it('Utils - should read from cookie', async () => {
    const data = readCookie('foo');

    return data.foo === 'bar';
  });

  await it('Utils - should store a user', async () => {
    const user = await app.appUser().create({ anonymous: true });
    storeUser(app, user);

    const data = JSON.parse(localStorage.getItem(`scanthng-${app.id}`));
    return data.apiKey.length === 80;
  });

  await it('Utils - should restore a stored user', async () => {
    const user = restoreUser(app, evrythng.User);

    return user.apiKey.length === 80;
  });
}

/**
 * The tests. Each is asynchronous.
 */
const main = async () => {
  await setup();
  await testScope();
  await testUtils();
};

main();
