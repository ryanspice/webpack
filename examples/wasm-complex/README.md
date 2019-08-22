# example.js

```javascript
import await { get, set, getNumber } from "./magic.js";

// accessing memory
console.log(get());
set(42);
console.log(get());
set(123);
console.log(get());

// random numbers
console.log(getNumber());
console.log(getNumber());
console.log(getNumber());
```

# magic.js

```javascript
// reexporting
export await * from "./magic.wat";
```

# magic.wat

```wat
(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32)))
  (import "./memory.js" "memory" (memory 1))
  (import "./magic-number.js" "getRandomNumber" (func $getRandomNumber (type $t0)))
  (func $get (export "get") (type $t0) (result i32)
    (i32.load
      (i32.const 0)))
  (func $set (export "set") (type $t1) (param $p i32)
    (i32.store
      (i32.const 0)
      (get_local $p)))
  (func $get (export "getNumber") (type $t0) (result i32)
    (call $getRandomNumber))
)
```

# magic-number.js

```javascript
export function getNumber() {
	return 42;
}

export function getRandomNumber() {
	return Math.floor(Math.random() * 256);
}
```

# memory.js

```javascript
async function getMemoryFromParentInWorker() {
	await new Promise(r => setTimeout(r, 200));
	// fake
	return new WebAssembly.Memory({ initial: 1 });
}

export const memory = await getMemoryFromParentInWorker();
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
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__ */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _magic_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.js */ 1);
_magic_js__WEBPACK_IMPORTED_MODULE_0__ = await Promise.resolve(_magic_js__WEBPACK_IMPORTED_MODULE_0__);


// accessing memory
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());
Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.set)(42);
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());
Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.set)(123);
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());

// random numbers
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());
console.log(Object(_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());

return __webpack_exports__;
})();

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./magic.js ***!
  \******************/
/*! export get [provided] [no usage info] [missing usage info prevents renaming] */
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! export set [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__, __webpack_require__.d */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "get", function() { return _magic_wat__WEBPACK_IMPORTED_MODULE_0__[["get"]]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "getNumber", function() { return _magic_wat__WEBPACK_IMPORTED_MODULE_0__[["getNumber"]]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "set", function() { return _magic_wat__WEBPACK_IMPORTED_MODULE_0__[["set"]]; });
/* harmony import */ var _magic_wat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.wat */ 2);
_magic_wat__WEBPACK_IMPORTED_MODULE_0__ = await Promise.resolve(_magic_wat__WEBPACK_IMPORTED_MODULE_0__);
// reexporting


return __webpack_exports__;
})();

/***/ }),
/* 2 */
/*!*******************!*\
  !*** ./magic.wat ***!
  \*******************/
/*! export get [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export getNumber [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export set [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_exports__, __webpack_require__.v, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

/* harmony import */ var WEBPACK_IMPORTED_MODULE_0 = __webpack_require__(/*! ./memory.js */ 3);

/* harmony import */ var WEBPACK_IMPORTED_MODULE_1 = __webpack_require__(/*! ./magic-number.js */ 4);

module.exports = Promise.resolve(WEBPACK_IMPORTED_MODULE_0).then(function(WEBPACK_IMPORTED_MODULE_0) { return __webpack_require__.v(exports, module.i, {
	"./memory.js": {
		"memory": WEBPACK_IMPORTED_MODULE_0.memory
	},
	"./magic-number.js": {
		"getRandomNumber": WEBPACK_IMPORTED_MODULE_1.getRandomNumber
	}
}); })

/***/ }),
/* 3 */
/*!*******************!*\
  !*** ./memory.js ***!
  \*******************/
/*! export memory [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__.d, __webpack_require__ */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "memory", function() { return memory; });
async function getMemoryFromParentInWorker() {
	await new Promise(r => setTimeout(r, 200));
	// fake
	return new WebAssembly.Memory({ initial: 1 });
}

const memory = await getMemoryFromParentInWorker();

return __webpack_exports__;
})();

/***/ }),
/* 4 */
/*!*************************!*\
  !*** ./magic-number.js ***!
  \*************************/
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! export getRandomNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getNumber", function() { return getNumber; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getRandomNumber", function() { return getRandomNumber; });
function getNumber() {
	return 42;
}

function getRandomNumber() {
	return Math.floor(Math.random() * 256);
}


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/wasm chunk loading */
/******/ 	!function() {
/******/ 		__webpack_require__.v = function(exports, wasmModuleId, importsObj) {
/******/ 			var req = fetch(__webpack_require__.p + "" + {"2":"594f5a209057602bfc3f"}[wasmModuleId] + ".module.wasm");
/******/ 			if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then(function(res) { return Object.assign(exports, res.instance.exports); });
/******/ 			}
/******/ 			return req
/******/ 				.then(function(x) { return x.arrayBuffer(); })
/******/ 				.then(function(bytes) { return WebAssembly.instantiate(bytes, importsObj); })
/******/ 				.then(function(res) { return Object.assign(exports, res.instance.exports); });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
                           Asset       Size   Chunks             Chunk Names
594f5a209057602bfc3f.module.wasm  139 bytes  ({179})  [emitted]  (main)
                       output.js   8.75 KiB    {179}  [emitted]  main
Entrypoint main = output.js (594f5a209057602bfc3f.module.wasm)
chunk {179} output.js (main) 708 bytes (javascript) 139 bytes (webassembly) 1.17 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 253 bytes {179} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./magic.js 50 bytes {179} [built]
     [exports: get, getNumber, set]
     [used exports unknown]
     harmony side effect evaluation ./magic.js [0] ./example.js 1:0-55
     harmony import specifier ./magic.js [0] ./example.js 4:12-15
     harmony import specifier ./magic.js [0] ./example.js 5:0-3
     harmony import specifier ./magic.js [0] ./example.js 6:12-15
     harmony import specifier ./magic.js [0] ./example.js 7:0-3
     harmony import specifier ./magic.js [0] ./example.js 8:12-15
     harmony import specifier ./magic.js [0] ./example.js 11:12-21
     harmony import specifier ./magic.js [0] ./example.js 12:12-21
     harmony import specifier ./magic.js [0] ./example.js 13:12-21
 [2] ./magic.wat 70 bytes (javascript) 139 bytes (webassembly) {179} [built]
     [exports: get, getNumber, set]
     [used exports unknown]
     harmony side effect evaluation ./magic.wat [1] ./magic.js 2:0-34
     harmony export imported specifier ./magic.wat [1] ./magic.js 2:0-34
 [3] ./memory.js 211 bytes {179} [built]
     [exports: memory]
     [used exports unknown]
     wasm import ./memory.js [2] ./magic.wat
 [4] ./magic-number.js 124 bytes {179} [built]
     [exports: getNumber, getRandomNumber]
     [used exports unknown]
     wasm import ./magic-number.js [2] ./magic.wat
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
                           Asset       Size   Chunks             Chunk Names
4636ea8e62e0734a195f.module.wasm  139 bytes  ({179})  [emitted]  (main)
                       output.js   1.93 KiB    {179}  [emitted]  main
Entrypoint main = output.js (4636ea8e62e0734a195f.module.wasm)
chunk {179} output.js (main) 708 bytes (javascript) 139 bytes (webassembly) 1.17 KiB (runtime) [entry] [rendered]
    > ./example.js main
  [69] ./magic.wat 70 bytes (javascript) 139 bytes (webassembly) {179} [built]
       [exports: get, getNumber, set]
       [all exports used]
       harmony side effect evaluation ./magic.wat [555] ./magic.js 2:0-34
       harmony export imported specifier ./magic.wat [555] ./magic.js 2:0-34
 [115] ./memory.js 211 bytes {179} [built]
       [exports: memory]
       [all exports used]
       wasm import ./memory.js [69] ./magic.wat
 [144] ./example.js 253 bytes {179} [built]
       [no exports]
       entry ./example.js main
 [555] ./magic.js 50 bytes {179} [built]
       [exports: get, getNumber, set]
       [all exports used]
       harmony side effect evaluation ./magic.js [144] ./example.js 1:0-55
       harmony import specifier ./magic.js [144] ./example.js 4:12-15
       harmony import specifier ./magic.js [144] ./example.js 5:0-3
       harmony import specifier ./magic.js [144] ./example.js 6:12-15
       harmony import specifier ./magic.js [144] ./example.js 7:0-3
       harmony import specifier ./magic.js [144] ./example.js 8:12-15
       harmony import specifier ./magic.js [144] ./example.js 11:12-21
       harmony import specifier ./magic.js [144] ./example.js 12:12-21
       harmony import specifier ./magic.js [144] ./example.js 13:12-21
 [575] ./magic-number.js 124 bytes {179} [built]
       [exports: getNumber, getRandomNumber]
       [only some exports used: getRandomNumber]
       wasm import ./magic-number.js [69] ./magic.wat
     + 4 hidden chunk modules
```
