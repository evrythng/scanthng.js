import 'regenerator-runtime/runtime';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import * as evrythng from 'evrythng';
import ScanThng from 'scanthng';

evrythng.setup({ apiVersion: 1 });
evrythng.use(ScanThng);

/**
 * Get a query param by name.
 */
const getParam = name => new URLSearchParams(window.location.search).get(name);

/**
 * Start the scanning viewfinder.
 */
const startScanning = async () => {
  try {
    const appScope = new evrythng.Application(getParam('app'));
    await appScope.init();

    const res = await appScope.scanStream({
      filter: {
        method: '2d',
        type: 'qr_code',
      },
      containerId: 'scanthng_container',
    });

    alert(res);
  } catch (e) {
    console.log(e);
  }
};

/**
 * Application component.
 */
const Application = () => {

  // When app loads, start scanning
  useEffect(() => {
    startScanning();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#efefef',
      }}>
      <h2
        style={{
          width: '100%',
          textAlign: 'center',
        }}>
        scanthng.js React Test App
      </h2>

      <div
        id="scanthng_container"
        style={{ width: '100vw' }}>
        </div>
    </div>
  );
};

ReactDOM.render(<Application />, document.getElementById('app'));
