evrythng.use(ScanThng);

const UI = {
  buttonBase64DataScan: document.getElementById('input-base64data-scan'),
  buttonIdentify: document.getElementById('input-identify'),
  buttonScan: document.getElementById('input-scan'),
  buttonScanStream: document.getElementById('input-scanstream'),
  buttonStopStream: document.getElementById('input-stopstream'),
  buttonUseKey: document.getElementById('input-use-api-key'),
  inputApiKey: document.getElementById('input-app-api-key'),
  inputIdentifyType: document.getElementById('input-identify-type'),
  inputIdentifyValue: document.getElementById('input-identify-value'),
  inputScanBase64Data: document.getElementById('input-scan-base64data-data'),
  inputScanMethod: document.getElementById('input-scan-method'),
  inputScanstreamMethod: document.getElementById('input-scanstream-method'),
  inputScanstreamType: document.getElementById('input-scanstream-type'),
  inputScanstreamOffline: document.getElementById('input-scanstream-offline'),
  inputScanType: document.getElementById('input-scan-type'),
};

const CONTAINER_ID = 'scanstream-container';

const getUrlParam = key => new URLSearchParams(window.location.search).get(key);

const loadApp = () => {
  const apiKey = getUrlParam('app');
  if (apiKey) {
    UI.inputApiKey.value = apiKey || '';
    window.app = new evrythng.Application(apiKey);
    window.app.init().catch(e => alert('Invalid Application API Key'));
  }
};

const handleResults = (res) => {
  console.log(JSON.stringify(res, null, 2));
  const numResults = res.length;
  let numFound = 0;
  if (numResults) {
    numFound = res[0].results.length;
  }

  alert(`numResults: ${numResults}, numFound: ${numFound}`);
};

const testFunction = f => f().catch(console.log).then(handleResults);

const onLoad = () => {
  loadApp();

  UI.buttonUseKey.addEventListener('click', () => {
    window.app = new evrythng.Application(UI.inputApiKey.value);
    window.app.init().catch(e => alert('Invalid Application API Key'));
  });

  UI.buttonIdentify.addEventListener('click', () => {
    const type = UI.inputIdentifyType.value;
    const { value } = UI.inputIdentifyValue;
    testFunction(() => window.app.identify({ filter: { type, value } }));
  });

  UI.buttonScan.addEventListener('click', () => {
    const method = UI.inputScanMethod.value;
    const type = UI.inputScanType.value;
    testFunction(() => window.app.scan({ filter: { method, type } }));
  });

  UI.buttonBase64DataScan.addEventListener('click', () => {
    const base64Data = UI.inputScanBase64Data.value;
    testFunction(() => window.app.scan(base64Data));
  });

  UI.buttonScanStream.addEventListener('click', () => {
    const method = UI.inputScanstreamMethod.value;
    const type = UI.inputScanstreamType.value;
    const offline = UI.inputScanstreamOffline.checked;
    const opts = {
      filter: { method, type },
      containerId: CONTAINER_ID,
      offline,
    };
    testFunction(() => window.app.scanStream(opts));
  });

  UI.buttonStopStream.addEventListener('click', () => {
    window.app.stopStream();
  });
};

window.addEventListener('DOMContentLoaded', onLoad, false);
