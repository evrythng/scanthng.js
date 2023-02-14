# Playground

Simple app that allows testing of scanthng.js functionality.


## Setup

1. Build scanthng.js from the project root:

```
npm ci && npm run build
```

2. Change to the `test/playground` directory.
3. Create a `lib` directory and place the `dist/scanthng.js` build there.

  ```shell
  mkdir -p lib
  ```

4. Download a copy of `jsQR.js` to `lib/jsQR.js`:

```
curl https://raw.githubusercontent.com/cozmo/jsQR/master/dist/jsQR.js > lib/jsQR.js
```

All libraries should now be in place.


## Usage

Run a web server and open `index.html`, then enter an Application API Key to get
started.

```shell
python3 -m http.server
```

Query parameters can be used to simplify testing flow:

* `operator` - pre-fill Operator API Key.

* `method` - pre-fill scan method field.

* `type` - pre-fill scan type field.
