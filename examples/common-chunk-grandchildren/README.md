This example illustrates how common modules from deep ancestors of an entry point can be split into a separate common chunk

- `pageA` and `pageB` are dynamically required
- `pageC` and `pageA` both require the `reusableComponent`
- `pageB` dynamically requires `PageC`

You can see that webpack outputs five files/chunks:

- `output.js` is the entry chunk and contains
  - the module system
  - chunk loading logic
  - the entry point `example.js`
- `0.output.js` is an additional chunk
  - module `reusableComponent`
- `1.output.js` is an additional chunk
  - module `pageB`
- `2.output.js` is an additional chunk
  - module `pageA`
- `3.output.js` is an additional chunk
  - module `pageC`

# example.js

```javascript
var main = function() {
	console.log("Main class");
	require.ensure([], () => {
		const page = require("./pageA");
		page();
	});
	require.ensure([], () => {
		const page = require("./pageB");
		page();
	});
};

main();
```

# pageA.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};
```

# pageB.js

```javascript
module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
```

# pageC.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};
```

# reusableComponent.js

```javascript
module.exports = function() {
	console.log("reusable Component");
};
```

# webpack.config.js

```javascript
"use strict";
const path = require("path");

module.exports = {
	// mode: "development || "production",
	entry: {
		main: ["./example.js"]
	},
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small, in practice you can use the defaults
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	}
};
```

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__.e, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var main = function() {
	console.log("Main class");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(366)]).then((() => {
		const page = __webpack_require__(/*! ./pageA */ 1);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e(/*! require.ensure */ 588).then((() => {
		const page = __webpack_require__(/*! ./pageB */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = Object.prototype.hasOwnProperty.call(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have JS
/******/ 						// setup Promise in chunk cache
/******/ 						var promise = new Promise(function(resolve, reject) {
/******/ 							installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 						});
/******/ 						promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 						// start chunk loading
/******/ 						var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 						var loadingEnded = function() {
/******/ 							if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) return installedChunks[chunkId][1];
/******/ 							if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 						};
/******/ 						var script = document.createElement('script');
/******/ 						var onScriptComplete;
/******/ 		
/******/ 						script.charset = 'utf-8';
/******/ 						script.timeout = 120;
/******/ 						if (__webpack_require__.nc) {
/******/ 							script.setAttribute("nonce", __webpack_require__.nc);
/******/ 						}
/******/ 						script.src = url;
/******/ 		
/******/ 						// create error before stack unwound to get useful stacktrace later
/******/ 						var error = new Error();
/******/ 						onScriptComplete = function (event) {
/******/ 							// avoid mem leaks in IE.
/******/ 							script.onerror = script.onload = null;
/******/ 							clearTimeout(timeout);
/******/ 							var reportError = loadingEnded();
/******/ 							if(reportError) {
/******/ 								var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 								var realSrc = event && event.target && event.target.src;
/******/ 								error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 								error.name = 'ChunkLoadError';
/******/ 								error.type = errorType;
/******/ 								error.request = realSrc;
/******/ 								reportError(error);
/******/ 							}
/******/ 						};
/******/ 						var timeout = setTimeout(function(){
/******/ 							onScriptComplete({ type: 'timeout', target: script });
/******/ 						}, 120000);
/******/ 						script.onerror = script.onload = onScriptComplete;
/******/ 						document.head.appendChild(script);
/******/ 					} else installedChunks[chunkId] = 0;
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no deferred startup or startup prefetching
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/366.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[366],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};


/***/ })
]]);
```

# dist/588.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[588],{

/***/ 3:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__.e, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = function() {
	console.log("Page B");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(145)]).then((()=>{
		const page = __webpack_require__(/*! ./pageC */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};


/***/ })

}]);
```

# dist/145.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[145],{

/***/ 4:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};


/***/ })

}]);
```

# dist/421.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[421],{

/***/ 2:
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	console.log("reusable Component");
};


/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
        Asset       Size  Chunks             Chunk Names
145.output.js  510 bytes   {145}  [emitted]
366.output.js  516 bytes   {366}  [emitted]
421.output.js  401 bytes   {421}  [emitted]
588.output.js  671 bytes   {588}  [emitted]
    output.js   8.31 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {145} 145.output.js 136 bytes [rendered]
    > [3] ./pageB.js 3:1-6:3
 [4] ./pageC.js 136 bytes {145} [built]
     [used exports unknown]
     cjs require ./pageC [3] ./pageB.js 4:15-33
chunk {179} output.js (main) 220 bytes (javascript) 4.13 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 220 bytes {179} [built]
     [used exports unknown]
     entry ./example.js main
     + 4 hidden chunk modules
chunk {366} 366.output.js 136 bytes [rendered]
    > [0] ./example.js 3:1-6:3
 [1] ./pageA.js 136 bytes {366} [built]
     [used exports unknown]
     cjs require ./pageA [0] ./example.js 4:15-33
chunk {421} 421.output.js 69 bytes [rendered] split chunk (cache group: default)
    > [0] ./example.js 3:1-6:3
    > [3] ./pageB.js 3:1-6:3
 [2] ./reusableComponent.js 69 bytes {421} [built]
     [used exports unknown]
     cjs require ./reusableComponent [1] ./pageA.js 1:24-54
     cjs require ./reusableComponent [4] ./pageC.js 1:24-54
chunk {588} 588.output.js 133 bytes [rendered]
    > [0] ./example.js 7:1-10:3
 [3] ./pageB.js 133 bytes {588} [built]
     [used exports unknown]
     cjs require ./pageB [0] ./example.js 8:15-33
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
        Asset       Size  Chunks             Chunk Names
145.output.js  144 bytes   {145}  [emitted]
366.output.js  144 bytes   {366}  [emitted]
421.output.js  135 bytes   {421}  [emitted]
588.output.js  208 bytes   {588}  [emitted]
    output.js   1.66 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {145} 145.output.js 136 bytes [rendered]
    > [588] ./pageB.js 3:1-6:3
 [145] ./pageC.js 136 bytes {145} [built]
       cjs require ./pageC [588] ./pageB.js 4:15-33
chunk {179} output.js (main) 220 bytes (javascript) 4.13 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 220 bytes {179} [built]
       entry ./example.js main
     + 4 hidden chunk modules
chunk {366} 366.output.js 136 bytes [rendered]
    > [144] ./example.js 3:1-6:3
 [366] ./pageA.js 136 bytes {366} [built]
       cjs require ./pageA [144] ./example.js 4:15-33
chunk {421} 421.output.js 69 bytes [rendered] split chunk (cache group: default)
    > [144] ./example.js 3:1-6:3
    > [588] ./pageB.js 3:1-6:3
 [421] ./reusableComponent.js 69 bytes {421} [built]
       cjs require ./reusableComponent [145] ./pageC.js 1:24-54
       cjs require ./reusableComponent [366] ./pageA.js 1:24-54
chunk {588} 588.output.js 133 bytes [rendered]
    > [144] ./example.js 7:1-10:3
 [588] ./pageB.js 133 bytes {588} [built]
       cjs require ./pageB [144] ./example.js 8:15-33
```
