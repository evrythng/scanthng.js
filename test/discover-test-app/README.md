# discover-test-app

Simple app that allows testing of scanthng.js functionality with discover.js.


## Setup

Copy a build of `scanthng.js` to the `lib` directory, and include `discover.js`
files if required.


## Usage

Start a dev server:

```
python3 -m http.server
```

Open `index.html` with `operator` query parameters specified to start using
the app.

Other query parameters can be used to simplify testing flow:

* `type` - pre-fill scsan type, such as 'discover'

* `options` - Show more options for scanning.
