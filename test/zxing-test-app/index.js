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
  buttonUseKey: get('input-use-api-key'),

  inputApiKey: get('input-app-api-key'),

  logsContainer: get('logs-container'),
  scanstreamContainer: get(SCANSTREAM_CONTAINER_ID),
  optsContainer: get('opts-container'),
  optsHint: get('opts-hint'),
  resultsContainer: get('results-container'),
};

let showOptions = false;

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
 * Load data from query params
 */
const loadParams = () => {
  // Advanced mode from query?
  showOptions = !!getQueryParam('options');
  if (showOptions) {
    UI.optsHint.innerText = 'Hide advanced options';
    UI.optsContainer.style.opacity = 1;
  }
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
 * Setup click handlers on UI elements.
 */
const setupClickHandlers = () => {
  // Use API key
  UI.buttonUseKey.addEventListener('click', () => {
    window.scope = new evrythng.Application(UI.inputApiKey.value);
    window.scope.init().catch(() => alert('Invalid Application API Key'));
  });

  // Start stream button
  UI.buttonScanStream.addEventListener('click', () => {
    // Clear results and logs
    UI.logsContainer.innerHTML = '';
    showResults(false);

    const opts = {
      filter: {
        method: '1d',
        type: 'auto',
      },
      containerId: SCANSTREAM_CONTAINER_ID,
      useZxing: true,
    };
    console.log(JSON.stringify(opts, null, 2));
    test(() => window.scope.scanStream(opts));
  });

  // Stop stream button
  UI.buttonStopStream.addEventListener('click', () => {
    window.scope.stopStream();
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
