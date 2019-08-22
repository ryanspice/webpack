This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server, otherwise there is an overhead for the increased number of requests.

AggressiveSplittingPlugin splits every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. It groups modules together by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

AggressiveSplittingPlugin records its splitting in the webpack records. When it is next run, it tries to use the last recorded splitting. Since changes to application code between one run and the next are usually in only a few modules (or just one), re-using the old splittings (and chunks, which are probably still in the client's cache), is highly advantageous.

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating many records of small chunks for every change.

If a module changes, its chunks are declared to be invalid, and are put back into the module pool. New chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

```js
var path = require("path");
var webpack = require("../../");
module.exports = {
	// mode: "development || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
                  Asset      Size  Chunks             Chunk Names
5ff7a3e4f848f0634d54.js  18.4 KiB     {0}  [emitted]  main
726ef31e8b1aba719f83.js   106 KiB     {2}  [emitted]
cfe118d1dec4334ad964.js  7.12 KiB     {1}  [emitted]
Entrypoint main = 5ff7a3e4f848f0634d54.js
chunk {0} 5ff7a3e4f848f0634d54.js (main) 8.96 KiB (javascript) 4.38 KiB (runtime) [entry] [rendered]
    > ./example main
 [0] ./example.js 42 bytes {0} [built]
 [1] (webpack)/node_modules/react/index.js 190 bytes {0} [built]
 [2] (webpack)/node_modules/react/cjs/react.production.min.js 6.67 KiB {0} [built]
 [3] (webpack)/node_modules/object-assign/index.js 2.06 KiB {0} [built]
     + 5 hidden chunk modules
chunk {1} cfe118d1dec4334ad964.js 6.41 KiB [rendered]
    > react-dom [0] ./example.js 2:0-22
 [4] (webpack)/node_modules/react-dom/index.js 1.33 KiB {1} [built]
 [6] (webpack)/node_modules/scheduler/index.js 198 bytes {1} [built]
 [7] (webpack)/node_modules/scheduler/cjs/scheduler.production.min.js 4.88 KiB {1} [built]
chunk {2} 726ef31e8b1aba719f83.js 106 KiB [rendered] split chunk (cache group: defaultVendors)
    > react-dom [0] ./example.js 2:0-22
 [5] (webpack)/node_modules/react-dom/cjs/react-dom.production.min.js 106 KiB {2} [built]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
                  Asset      Size  Chunks             Chunk Names
0381e14174ddaf92da4a.js   104 KiB   {967}  [emitted]
9f03047e1c9bcf26cb2f.js  5.06 KiB   {834}  [emitted]
a77c83093408bc779a1e.js  9.33 KiB   {179}  [emitted]  main
Entrypoint main = a77c83093408bc779a1e.js
chunk {179} a77c83093408bc779a1e.js (main) 8.96 KiB (javascript) 4.38 KiB (runtime) [entry] [rendered]
    > ./example main
 [144] ./example.js 42 bytes {179} [built]
 [320] (webpack)/node_modules/object-assign/index.js 2.06 KiB {179} [built]
 [426] (webpack)/node_modules/react/cjs/react.production.min.js 6.67 KiB {179} [built]
 [784] (webpack)/node_modules/react/index.js 190 bytes {179} [built]
     + 5 hidden chunk modules
chunk {834} 9f03047e1c9bcf26cb2f.js 6.41 KiB [rendered]
    > react-dom [144] ./example.js 2:0-22
 [316] (webpack)/node_modules/react-dom/index.js 1.33 KiB {834} [built]
 [475] (webpack)/node_modules/scheduler/cjs/scheduler.production.min.js 4.88 KiB {834} [built]
 [616] (webpack)/node_modules/scheduler/index.js 198 bytes {834} [built]
chunk {967} 0381e14174ddaf92da4a.js 106 KiB [rendered] split chunk (cache group: defaultVendors)
    > react-dom [144] ./example.js 2:0-22
 [967] (webpack)/node_modules/react-dom/cjs/react-dom.production.min.js 106 KiB {967} [built]
```

## Records

```
{
  "aggressiveSplits": [],
  "chunks": {
    "byName": {
      "main": 0
    },
    "bySource": {
      "0 ./example.js react-dom": 2,
      "1 ./example.js react-dom": 1
    },
    "usedIds": [
      0,
      1,
      2
    ]
  },
  "modules": {
    "byIdentifier": {
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/react-dom/cjs/react-dom.production.min.js": 5,
      "../../node_modules/react-dom/index.js": 4,
      "../../node_modules/react/cjs/react.production.min.js": 2,
      "../../node_modules/react/index.js": 1,
      "../../node_modules/scheduler/cjs/scheduler.production.min.js": 7,
      "../../node_modules/scheduler/index.js": 6,
      "./example.js": 0
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]
  }
}
```
