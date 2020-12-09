const testList = document.getElementById('test-list');

/**
 * Add a green or red item to the list of test results.
 *
 * @param {string} summary - Test summary.
 * @param {boolean} result - Whether or not the test result is 'passed'.
 */
const addResult = (summary, result) => {
  const el = document.createElement('li');
  el.style.color = result ? 'green' : 'red';
  el.innerHTML = summary;
  testList.appendChild(el);
};

/**
 * Simple test clause function. 'cb' must return a boolean expectation.
 *
 * @param {string} summary - Test summary.
 * @param {async function} cb - async function returning a boolean expectation.
 */
const it = async (summary, cb) => {
  try {
    const result = await cb();
    addResult(summary, result);
  } catch (e) {
    console.log(e);
    addResult(`${summary} - ${e.message}`, false);
  }
};

/**
 * Get a URL search param.
 *
 * @param {string} key - Parameter name.
 * @returns {string} Parameter value.
 */
const getUrlParam = key => new URLSearchParams(window.location.search).get(key);

/**
 * Wait for a while.
 *
 * @param {number} ms - Milliseconds to wait for.
 */
const waitAsync = ms => new Promise(resolve => setTimeout(resolve, ms));
