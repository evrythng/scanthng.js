evrythng.use(ScanThng);

evrythng.setup({ apiVersion: 1 });

/**
 * Get an element by ID.
 * 
 * @param {string} id - ID to find.
 * @returns {HTMLElement}
 */
const get = id => document.getElementById(id);

/** UI component handles */
const UI = {
  buttonBase64DataScan: get('input-base64data-scan'),
  buttonIdentify: get('input-identify'),
  buttonScan: get('input-scan'),
  buttonScanStream: get('input-scanstream'),
  buttonStopStream: get('input-stopstream'),
  buttonScanCode: get('input-scancode'),
  buttonStopScanCode: get('input-stopscancode'),
  buttonUseKey: get('input-use-api-key'),
  inputApiKey: get('input-app-api-key'),
  inputIdentifyType: get('input-identify-type'),
  inputIdentifyValue: get('input-identify-value'),
  inputScanBase64Data: get('input-scan-base64data-data'),
  inputScanMethod: get('input-scan-method'),
  inputScanType: get('input-scan-type'),
  inputScanstreamMethod: get('input-scanstream-method'),
  inputScanstreamType: get('input-scanstream-type'),
  inputScanstreamOffline: get('input-scanstream-offline'),
  inputScanstreamAutostop: get('input-scanstream-autostop'),
};

/** Container ID for scanStream */
const SCANSTREAM_CONTAINER_ID = 'scanstream-container';
/** Container ID for scanQrCode */
const SCANCODE_CONTAINER_ID = 'scancode-container';

/**
 * Get a query param value.
 *
 * @param {string} key - Key to use.
 * @returns {string} Value, if found.
 */
const getQueryParam = key => new URLSearchParams(window.location.search).get(key);

/**
 * Load Application scope.
 */
const loadScope = () => {
  const appApiKey = getQueryParam('app');
  const operatorApiKey = getQueryParam('operator');
  if (!appApiKey && !operatorApiKey) return;

  UI.inputApiKey.value = appApiKey || operatorApiKey || '';
  window.scope = appApiKey
    ? new evrythng.Application(appApiKey)
    : new evrythng.Operator(operatorApiKey);
  window.scope.init().catch(() => alert('API key is invalid'));
};

/**
 * Load filter from query params
 */
const loadFilter = () => {
  UI.inputScanMethod.value = getQueryParam('method') || '2d';
  UI.inputScanType.value = getQueryParam('type') || 'qr_code';
  UI.inputScanstreamMethod.value = getQueryParam('method') || '2d';
  UI.inputScanstreamType.value = getQueryParam('type') || 'qr_code';
};

/**
 * Handle results.
 *
 * @param {*} res 
 */
const handleResults = (res) => {
  console.log(JSON.stringify(res, null, 2));

  if (typeof res === 'string') {
    alert(res);
    return;
  }

  const numResults = res.length;
  let numFound = 0;
  if (numResults) {
    numFound = res[0].results.length;
  }

  setTimeout(() => alert(`Results: ${numResults}, Found: ${numFound}`), 100);
};

/**
 * Test a function and handle results and errors.
 *
 * @param {Function} f - Function to test.
 */
const testFunction = f => f().catch(console.log).then(handleResults);

/**
 * When the page loads.
 */
const onLoad = () => {
  loadScope();
  loadFilter();

  // Add button click listeners
  UI.buttonUseKey.addEventListener('click', () => {
    window.scope = new evrythng.Application(UI.inputApiKey.value);
    window.scope.init().catch(() => alert('Invalid Application API Key'));
  });

  UI.buttonIdentify.addEventListener('click', () => {
    const type = UI.inputIdentifyType.value;
    const { value } = UI.inputIdentifyValue;
    testFunction(() => window.scope.identify({ filter: { type, value } }));
  });

  UI.buttonScan.addEventListener('click', () => {
    const method = UI.inputScanMethod.value;
    const type = UI.inputScanType.value;
    testFunction(() => window.scope.scan({
      filter: { method, type },
      imageConversion: {
        exportFormat: 'image/jpeg',
      },
    }));
  });

  UI.buttonBase64DataScan.addEventListener('click', () => {
    const method = UI.inputScanMethod.value;
    const type = UI.inputScanType.value;
    const base64Data = UI.inputScanBase64Data.value;
    testFunction(() => window.scope.scan(base64Data, {
      filter: { method, type },
      imageConversion: {
        exportFormat: 'image/jpeg',
      },
    }));
  });

  UI.buttonScanStream.addEventListener('click', () => {
    const method = UI.inputScanstreamMethod.value;
    const type = UI.inputScanstreamType.value;
    const offline = UI.inputScanstreamOffline.checked;
    const autoStop = UI.inputScanstreamAutostop.checked;
    const opts = {
      filter: { method, type },
      containerId: SCANSTREAM_CONTAINER_ID,
      offline,
      autoStop,
      imageConversion: {
        exportFormat: 'image/jpeg',
        greyscale: false,
        resizeTo: 1080,
      },
    };
    testFunction(() => window.scope.scanStream(opts));
  });

  UI.buttonStopStream.addEventListener('click', () => {
    window.scope.stopStream();
  });

  UI.buttonScanCode.addEventListener('click', () => {
    testFunction(() => ScanThng.scanQrCode(SCANCODE_CONTAINER_ID));
  });

  UI.buttonStopScanCode.addEventListener('click', () => {
    ScanThng.stopScanQrCode();
  });
};

window.addEventListener('DOMContentLoaded', onLoad, false);
