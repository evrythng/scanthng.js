
// should ask for image and return results

// should ask for image and scan with options

// should scan with image data

// should scan with image data and options

// should identify an existing redirection

// should scan from a video stream

evrythng.use(ScanThng);

const UI = {
  buttonIdentify: document.getElementById('input-identify'),
  buttonScan: document.getElementById('input-scan'),
  buttonScanStream: document.getElementById('input-scanstream'),
  buttonUseKey: document.getElementById('input-use-api-key'),
  inputApiKey: document.getElementById('input-app-api-key'),
  inputIdentifyType: document.getElementById('input-identify-type'),
  inputIdentifyValue: document.getElementById('input-identify-value'),
  inputScanMethod: document.getElementById('input-scan-method'),
  inputScanType: document.getElementById('input-scan-type'),
  inputScanstreamMethod: document.getElementById('input-scanstream-method'),
  inputScanstreamType: document.getElementById('input-scanstream-type'),
};

const CONTAINER_ID = 'scanstream-container';

const getUrlParam = key => new URLSearchParams(window.location.search).get(key);

const loadApp = () => {
  const apiKey = getUrlParam('app');
  if (apiKey) {
    UI.inputApiKey.value = apiKey || '';
    window.app = new evrythng.Application(apiKey);
  }
};

const runAsync = f => f().catch(console.log);

const handleResults = (res) => {
  console.log(JSON.stringify(res, null, 2));
  const numResults = res.length;
  let numFound = 0;
  if (numResults) {
    numFound = res[0].results.length;
  }
  alert(`numResults: ${numResults}, numFound: ${numFound}`);
};

const onLoad = () => {
  loadApp();

  UI.buttonUseKey.addEventListener('click', () => {
    window.app = new evrythng.Application(UI.inputApiKey.value);
    window.app.init()
      .catch(e => alert('Invalid Application API Key'));
  });

  UI.buttonIdentify.addEventListener('click', () => {
    const type = UI.inputIdentifyType.value;
    const { value } = UI.inputIdentifyValue;

    runAsync(async () => {
      const res = await window.app.identify({ filter: { type, value } });
      handleResults(res);
    });
  });

  UI.buttonScan.addEventListener('click', () => {
    const method = UI.inputScanMethod.value;
    const type = UI.inputScanType.value;

    runAsync(async () => {
      const res = await window.app.scan({ filter: { method, type } });
      handleResults(res);
    });
  });

  UI.buttonScanStream.addEventListener('click', () => {
    const method = UI.inputScanstreamMethod.value;
    const type = UI.inputScanstreamType.value;
    
    runAsync(async () => {
      const filter = { method, type };
      const res = await window.app.scanStream({ filter, containerId: CONTAINER_ID });
      handleResults(res);
    });
  });
};

window.addEventListener('DOMContentLoaded', onLoad, false);
