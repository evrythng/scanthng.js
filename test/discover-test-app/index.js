evrythng.use(ScanThng);

evrythng.setup({
  // apiUrl: 'https://api-eu.evrythng.com',
});

/**
 * Get an element by ID.
 *
 * @param {string} id - ID to find.
 * @returns {HTMLElement}
 */
const get = (id) => document.getElementById(id);

/** Container ID for scanStream */
const SCANSTREAM_CONTAINER_ID = 'scanstream-container';

/** UI component handles */
const UI = {
  buttonScanStream: get('input-scanstream'),
  buttonStopStream: get('input-stopstream'),

  inputScanstreamType: get('select-scanstream-type'),
  inputScanstreamDiscover: get('input-scanstream-discover'),
  inputScanstreamGreyscale: get('input-scanstream-greyscale'),
  inputScanstreamQuality: get('input-scanstream-quality'),
  inputScanstreamResize: get('input-scanstream-resize'),
  inputScanstreamCrop: get('input-scanstream-crop'),
  inputDownloadFrames: get('input-download-frames'),

  logsContainer: get('logs-container'),
  scanstreamContainer: get(SCANSTREAM_CONTAINER_ID),
  optsContainer: get('opts-container'),
  resultsContainer: get('results-container'),
  scanInstructions: get('scan-instructions'),
  optsHint: get('opts-hint'),
  torchButton: get('torch-button'),
};

const statistics = {
  consecRequests: 0,
  requestStartTime: 0,
  duration: 0,
};
let showOptions = false;
let torchOn = false;

// Log to the page as well as the console
const originalConsoleLog = console.log;
console.log = (msg) => {
  const s = document.createElement('span');
  s.innerHTML = typeof msg === 'object' ? JSON.stringify(msg) : msg;
  s.classList = 'log-entry';
  UI.logsContainer.appendChild(s);
  originalConsoleLog(msg);
};

/**
 * Get a query param value.
 *
 * @param {string} key - Key to use.
 * @returns {string} Value, if found.
 */
const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);

/**
 * Load SDK scope.
 */
const loadScope = () => {
  const operatorApiKey = getQueryParam('operator');
  if (!operatorApiKey) {
    document.body.style.display = 'none';
    setTimeout(() => alert('Please specify Operator API key as \'operator\' query parameter.'), 10);
    return;
  }

  window.scope = new evrythng.Operator(operatorApiKey);
  window.scope.init().catch(() => alert('API key is invalid'));
};

/**
 * Load data from query params
 */
const loadParams = () => {
  // Scan type
  UI.inputScanstreamType.value = getQueryParam('type') || 'discover';

  // Advanced mode from query?
  showOptions = !!getQueryParam('options');
  if (showOptions) {
    UI.optsHint.innerText = 'Hide advanced options';
    UI.optsContainer.style.opacity = 1;
  }
};

/**
 * Show instructions over the video.
 *
 * @param {boolean} visible - true if instructions should be shown.
 */
const showInstructions = (visible) => {
  UI.scanInstructions.style.opacity = visible ? 1 : 0;
  UI.scanInstructions.style.display = visible ? 'flex' : 'none';

  // Also torch
  UI.torchButton.style.display = visible ? 'flex' : 'none';
};

/**
 * Show results and set visibility of results container.
 *
 * @param {boolean} visible - true if visible.
 * @param {string} text - Text to show.
 */
const showResults = (visible, text) => {
  UI.resultsContainer.style.opacity = visible ? 1 : 0;
  UI.resultsContainer.style.display = visible ? 'flex' : 'none';
  UI.resultsContainer.innerText = text;
};

/**
 * Handle results.
 *
 * @param {*} res
 */
const handleResults = (res) => {
  console.log(JSON.stringify(res, null, 2));
  showInstructions(false);

  if (typeof res === 'string') {
    alert(res);
    return;
  }

  // Show all data in advanced mode
  if (showOptions) {
    alert(JSON.stringify(res, null, 2));
    return;
  }

  // Nice output otherwise
  if (!res.length) return;

  // Meta details
  const { meta, results } = res[0];
  let output = `Type: ${meta.type}\nValue: ${meta.value}\n`;
  if (meta.gtin) {
    output += `GTIN: ${meta.gtin}\n`;
  }
  if (meta.serial) {
    output += `Serial: ${meta.serial}\n`;
  }
  if (meta.payloadVersion) {
    output += `Payload version: ${meta.payloadVersion}\n`;
  }
  if (meta.payloadSubType !== undefined) {
    output += `Payload subtype: ${meta.payloadSubType}\n`;
  }

  // Statistics
  statistics.duration = Date.now() - statistics.requestStartTime;
  output += `\nConsecutive requests: ${statistics.consecRequests}\nRequest duration: ${statistics.duration}ms\n`;

  // Thng/product?
  if (results.length) {
    const [result] = results;
    if (result.thng) {
      output += `\nThng: ${result.thng.name}`;
    }
    if (result.product) {
      output += `\nProduct: ${result.product.name}`;
    }
  }

  showResults(true, output);
  // alert(output);
};

/**
 * Test a function and handle results and errors.
 *
 * @param {Function} f - Function to test.
 */
const test = (f) => f().catch(console.log).then(handleResults);

/**
 * When discover.js detects a watermark in a frame.
 *
 * @param {object} discoverResult - Results object from discover.js
 */
const onWatermarkDetected = (discoverResult) => {
  const detected = !!discoverResult.watermark;

  // If detected, go dark
  document.getElementsByTagName('video')[0].style.opacity = detected ? 0.3 : 1;

  if (detected) {
    statistics.consecRequests += 1;
    statistics.requestStartTime = Date.now();
  } else {
    statistics.consecRequests = 0;
  }
};

/**
 * Setup click handlers on UI elements.
 */
const setupClickHandlers = () => {
  // Start stream button
  UI.buttonScanStream.addEventListener('click', () => {
    // Clear results and logs
    UI.logsContainer.innerHTML = '';
    showResults(false);
    showInstructions(true);
    statistics.consecRequests = 0;

    const opts = {
      filter: {
        method: 'digimarc',
        type: UI.inputScanstreamType.value,
      },
      containerId: SCANSTREAM_CONTAINER_ID,
      useDiscover: UI.inputScanstreamDiscover.checked,
      onWatermarkDetected,
      downloadFrames: UI.inputDownloadFrames.checked,
      imageConversion: {
        exportFormat: 'image/jpeg',
        greyscale: UI.inputScanstreamGreyscale.checked,
        resizeTo: parseInt(UI.inputScanstreamResize.value, 10),
        exportQuality: parseFloat(UI.inputScanstreamQuality.value),
        cropPercent: parseFloat(UI.inputScanstreamCrop.value),
      },
    };
    console.log(JSON.stringify(opts, null, 2));
    test(() => window.scope.scanStream(opts));
  });

  // Stop stream button
  UI.buttonStopStream.addEventListener('click', () => {
    window.scope.stopStream();
    showInstructions(false);
  });

  // Show/hide options link
  UI.optsHint.addEventListener('click', () => {
    if (showOptions) {
      // Hide now
      UI.optsContainer.style.opacity = 0;
      UI.optsHint.innerText = 'Show advanced options';
    } else {
      // Show now
      UI.optsContainer.style.opacity = 1;
      UI.optsHint.innerText = 'Hide advanced options';
    }

    showOptions = !showOptions;
  });

  // Torch button
  UI.torchButton.addEventListener('click', () => {
    torchOn = !torchOn;

    window.scope.setTorchEnabled(torchOn);
  });
};

/**
 * When the page loads.
 */
const onLoad = () => {
  loadScope();
  loadParams();

  setupClickHandlers();
};

window.addEventListener('DOMContentLoaded', onLoad, false);
