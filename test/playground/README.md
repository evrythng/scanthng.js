# Playground

Simple app that allows testing of scanthng.js functionality.


## Setup

1. Build scanthng.js from the project root:

```
npm ci && npm run build
```

2. Change to the `test/playground` directory.
3. Download a copy of `jsQR.js` to `lib/jsQR.js`:

```
mkdir -p lib

curl https://raw.githubusercontent.com/cozmo/jsQR/master/dist/jsQR.js > lib/jsQR.js
```

All libraries should now be in place.


## Usage

Open `index.html` and enter an Application API Key to get started.

Query parameters can be used to simplify testing flow:

* `app` - pre-fill Application API Key.

* `method` - pre-fill scan method field.

* `type` - pre-fill scan type field.
