This example shows automatically created async commons chunks.

The example entry references two chunks:

- entry chunk
  - async require -> chunk X
  - async require -> chunk Y
- chunk X
  - module `a`
  - module `b`
  - module `c`
- chunk Y
  - module `a`
  - module `b`
  - module `d`

These chunks share modules `a` and `b`. The optimization extract these into chunk Z:

Note: Actually the optimization compare size of chunk Z to some minimum value, but this is disabled from this example. In practice there is no configuration needed for this.

- entry chunk
  - async require -> chunk X & Z
  - async require -> chunk Y & Z
- chunk X
  - module `c`
- chunk Y
  - module `d`
- chunk Z
  - module `a`
  - module `b`

Pretty useful for a router in a SPA.

# example.js

```javascript
// a chunks with a, b, c
require(["./a", "./b", "./c"]);

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
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
/*! runtime requirements: __webpack_require__.e, __webpack_require__.oe, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

// a chunks with a, b, c
Promise.all(/*! AMD require */[__webpack_require__.e(394), __webpack_require__.e(460)]).then(function() {[__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)];}).catch(__webpack_require__.oe);

// a chunk with a, b, d
Promise.all(/*! require.ensure */[__webpack_require__.e(394), __webpack_require__.e(767)]).then((function(require) {
	__webpack_require__(/*! ./b */ 2);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


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


# dist/394.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[394],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "a";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "b";

/***/ })
]]);
```

# dist/460.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[460],{

/***/ 3:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "c";

/***/ })

}]);
```

# dist/767.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[767],{

/***/ 4:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "d";

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
        Asset       Size  Chunks             Chunk Names
394.output.js  540 bytes   {394}  [emitted]
460.output.js  305 bytes   {460}  [emitted]
767.output.js  305 bytes   {767}  [emitted]
    output.js   8.38 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 164 bytes (javascript) 4.13 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 164 bytes {179} [built]
     [used exports unknown]
     entry ./example.js main
     + 4 hidden chunk modules
chunk {394} 394.output.js 42 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c [0] ./example.js 2:0-30
    > [0] ./example.js 5:0-8:2
 [1] ./a.js 21 bytes {394} [built]
     [used exports unknown]
     amd require ./a [0] ./example.js 2:0-30
     require.ensure item ./a [0] ./example.js 5:0-8:2
 [2] ./b.js 21 bytes {394} [built]
     [used exports unknown]
     amd require ./b [0] ./example.js 2:0-30
     cjs require ./b [0] ./example.js 6:1-15
chunk {460} 460.output.js 21 bytes [rendered]
    > ./a ./b ./c [0] ./example.js 2:0-30
 [3] ./c.js 21 bytes {460} [built]
     [used exports unknown]
     amd require ./c [0] ./example.js 2:0-30
chunk {767} 767.output.js 21 bytes [rendered]
    > [0] ./example.js 5:0-8:2
 [4] ./d.js 21 bytes {767} [built]
     [used exports unknown]
     cjs require ./d [0] ./example.js 7:1-15
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
        Asset       Size  Chunks             Chunk Names
394.output.js  124 bytes   {394}  [emitted]
460.output.js   93 bytes   {460}  [emitted]
767.output.js   93 bytes   {767}  [emitted]
    output.js   1.67 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 164 bytes (javascript) 4.13 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 164 bytes {179} [built]
       entry ./example.js main
     + 4 hidden chunk modules
chunk {394} 394.output.js 42 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c [144] ./example.js 2:0-30
    > [144] ./example.js 5:0-8:2
 [847] ./a.js 21 bytes {394} [built]
       amd require ./a [144] ./example.js 2:0-30
       require.ensure item ./a [144] ./example.js 5:0-8:2
 [996] ./b.js 21 bytes {394} [built]
       amd require ./b [144] ./example.js 2:0-30
       cjs require ./b [144] ./example.js 6:1-15
chunk {460} 460.output.js 21 bytes [rendered]
    > ./a ./b ./c [144] ./example.js 2:0-30
 [460] ./c.js 21 bytes {460} [built]
       amd require ./c [144] ./example.js 2:0-30
chunk {767} 767.output.js 21 bytes [rendered]
    > [144] ./example.js 5:0-8:2
 [767] ./d.js 21 bytes {767} [built]
       cjs require ./d [144] ./example.js 7:1-15
```
