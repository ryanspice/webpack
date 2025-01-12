/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("./AsyncDependenciesBlock");
const Module = require("./Module");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const WebpackError = require("./WebpackError");
const {
	compareLocations,
	concatComparators,
	compareSelect,
	keepOriginalOrder
} = require("./util/comparators");
const { compareModulesById } = require("./util/comparators");
const { contextify } = require("./util/identifier");
const { registerNotSerializable } = require("./util/serialization");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./dependencies/ContextElementDependency")} ContextElementDependency */

/** @typedef {"sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once"} ContextMode Context mode */

/**
 * @typedef {Object} ContextOptions
 * @property {ContextMode} mode
 * @property {boolean} recursive
 * @property {RegExp} regExp
 * @property {"strict"|boolean=} namespaceObject
 * @property {string=} addon
 * @property {string=} chunkName
 * @property {RegExp=} include
 * @property {RegExp=} exclude
 * @property {RawChunkGroupOptions=} groupOptions
 */

/**
 * @typedef {Object} ContextModuleOptionsExtras
 * @property {string} resource
 * @property {string=} resourceQuery
 * @property {TODO} resolveOptions
 */

/** @typedef {ContextOptions & ContextModuleOptionsExtras} ContextModuleOptions */

/**
 * @callback ResolveDependenciesCallback
 * @param {Error=} err
 * @param {ContextElementDependency[]} dependencies
 */

/**
 * @callback ResolveDependencies
 * @param {TODO} fs
 * @param {TODO} options
 * @param {ResolveDependenciesCallback} callback
 */

class ContextModule extends Module {
	/**
	 * @param {ResolveDependencies} resolveDependencies function to get dependencies in this context
	 * @param {ContextModuleOptions} options options object
	 */
	constructor(resolveDependencies, options) {
		let resource;
		let resourceQuery;
		const queryIdx = options.resource.indexOf("?");
		if (queryIdx >= 0) {
			resource = options.resource.substr(0, queryIdx);
			resourceQuery = options.resource.substr(queryIdx);
		} else {
			resource = options.resource;
			resourceQuery = "";
		}

		super("javascript/dynamic", resource);

		// Info from Factory
		this.resolveDependencies = resolveDependencies;
		/** @type {ContextModuleOptions} */
		this.options = ({
			...options,
			resource: resource,
			resourceQuery: resourceQuery
		});
		if (options.resolveOptions !== undefined) {
			this.resolveOptions = options.resolveOptions;
		}

		// Info from Build
		this._contextDependencies = new Set([this.context]);

		if (typeof options.mode !== "string") {
			throw new Error("options.mode is a required option");
		}

		this._identifier = this._createIdentifier();
		this._forceBuild = true;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		const m = /** @type {ContextModule} */ (module);
		this.resolveDependencies = m.resolveDependencies;
		this.options = m.options;
		this.resolveOptions = m.resolveOptions;
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString.substring(1, regexString.length - 1);
	}

	_createIdentifier() {
		let identifier = this.context;
		if (this.options.resourceQuery) {
			identifier += `|${this.options.resourceQuery}`;
		}
		if (this.options.mode) {
			identifier += `|${this.options.mode}`;
		}
		if (!this.options.recursive) {
			identifier += "|nonrecursive";
		}
		if (this.options.addon) {
			identifier += `|${this.options.addon}`;
		}
		if (this.options.regExp) {
			identifier += `|${this.options.regExp}`;
		}
		if (this.options.include) {
			identifier += `|include: ${this.options.include}`;
		}
		if (this.options.exclude) {
			identifier += `|exclude: ${this.options.exclude}`;
		}
		if (this.options.groupOptions) {
			identifier += `|groupOptions: ${JSON.stringify(
				this.options.groupOptions
			)}`;
		}
		if (this.options.namespaceObject === "strict") {
			identifier += "|strict namespace object";
		} else if (this.options.namespaceObject) {
			identifier += "|namespace object";
		}

		return identifier;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		let identifier = requestShortener.shorten(this.context);
		if (this.options.resourceQuery) {
			identifier += ` ${this.options.resourceQuery}`;
		}
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (!this.options.recursive) {
			identifier += " nonrecursive";
		}
		if (this.options.addon) {
			identifier += ` ${requestShortener.shorten(this.options.addon)}`;
		}
		if (this.options.regExp) {
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		}
		if (this.options.include) {
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		}
		if (this.options.exclude) {
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;
		}
		if (this.options.groupOptions) {
			const groupOptions = this.options.groupOptions;
			for (const key of Object.keys(groupOptions)) {
				identifier += ` ${key}: ${groupOptions[key]}`;
			}
		}
		if (this.options.namespaceObject === "strict") {
			identifier += " strict namespace object";
		} else if (this.options.namespaceObject) {
			identifier += " namespace object";
		}

		return identifier;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		let identifier = contextify(
			options.context,
			this.context,
			options.associatedObjectForCache
		);
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (this.options.recursive) {
			identifier += " recursive";
		}
		if (this.options.addon) {
			identifier += ` ${contextify(
				options.context,
				this.options.addon,
				options.associatedObjectForCache
			)}`;
		}
		if (this.options.regExp) {
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		}
		if (this.options.include) {
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		}
		if (this.options.exclude) {
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;
		}

		return identifier;
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		this._forceBuild = true;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild({ fileSystemInfo }, callback) {
		if (this._forceBuild) return callback(null, true);
		fileSystemInfo.getContextTimestamp(this.context, (err, info) => {
			if (err || !info) return callback(null, true);

			return callback(null, info.safeTime >= this.buildInfo.builtTime);
		});
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this._forceBuild = false;
		this.buildMeta = {};
		this.buildInfo = {
			builtTime: Date.now(),
			contextDependencies: this._contextDependencies
		};
		this.dependencies.length = 0;
		this.blocks.length = 0;
		this.resolveDependencies(fs, this.options, (err, dependencies) => {
			if (err) return callback(err);

			// abort if something failed
			// this will create an empty context
			if (!dependencies) {
				callback();
				return;
			}

			// enhance dependencies with meta info
			for (const dep of dependencies) {
				dep.loc = {
					name: dep.userRequest
				};
				dep.request = this.options.addon + dep.request;
			}
			dependencies.sort(
				concatComparators(
					compareSelect(a => a.loc, compareLocations),
					keepOriginalOrder(this.dependencies)
				)
			);

			if (this.options.mode === "sync" || this.options.mode === "eager") {
				// if we have an sync or eager context
				// just add all dependencies and continue
				this.dependencies = dependencies;
			} else if (this.options.mode === "lazy-once") {
				// for the lazy-once mode create a new async dependency block
				// and add that block to this context
				if (dependencies.length > 0) {
					const block = new AsyncDependenciesBlock({
						...this.options.groupOptions,
						name: this.options.chunkName
					});
					for (const dep of dependencies) {
						block.addDependency(dep);
					}
					this.addBlock(block);
				}
			} else if (
				this.options.mode === "weak" ||
				this.options.mode === "async-weak"
			) {
				// we mark all dependencies as weak
				for (const dep of dependencies) {
					dep.weak = true;
				}
				this.dependencies = dependencies;
			} else if (this.options.mode === "lazy") {
				// if we are lazy create a new async dependency block per dependency
				// and add all blocks to this context
				let index = 0;
				for (const dep of dependencies) {
					let chunkName = this.options.chunkName;
					if (chunkName) {
						if (!/\[(index|request)\]/.test(chunkName)) {
							chunkName += "[index]";
						}
						chunkName = chunkName.replace(/\[index\]/g, `${index++}`);
						chunkName = chunkName.replace(
							/\[request\]/g,
							Template.toPath(dep.userRequest)
						);
					}
					const block = new AsyncDependenciesBlock(
						{
							...this.options.groupOptions,
							name: chunkName
						},
						dep.loc,
						dep.userRequest
					);
					block.addDependency(dep);
					this.addBlock(block);
				}
			} else {
				callback(
					new WebpackError(`Unsupported mode "${this.options.mode}" in context`)
				);
				return;
			}
			callback();
		});
	}

	/**
	 * @param {ContextElementDependency[]} dependencies all dependencies
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {TODO} TODO
	 */
	getUserRequestMap(dependencies, chunkGraph) {
		const moduleGraph = chunkGraph.moduleGraph;
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		return dependencies
			.filter(dependency => moduleGraph.getModule(dependency))
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) {
					return 0;
				}
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, dep) => {
				const module = moduleGraph.getModule(dep);
				map[dep.userRequest] = chunkGraph.getModuleId(module);
				return map;
			}, Object.create(null));
	}

	/**
	 * @param {ContextElementDependency[]} dependencies all dependencies
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {TODO} TODO
	 */
	getFakeMap(dependencies, chunkGraph) {
		if (!this.options.namespaceObject) {
			return 9;
		}
		const moduleGraph = chunkGraph.moduleGraph;
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		let hasNonHarmony = false;
		let hasNamespace = false;
		let hasNamed = false;
		const comparator = compareModulesById(chunkGraph);
		const fakeMap = dependencies
			.map(dependency => ({
				module: moduleGraph.getModule(dependency),
				dependency
			}))
			.filter(item => item.module)
			.sort((a, b) => comparator(a.module, b.module))
			.reduce((map, { dependency: dep, module }) => {
				const exportsType = module.buildMeta && module.buildMeta.exportsType;
				const id = chunkGraph.getModuleId(module);
				if (!exportsType) {
					map[id] = this.options.namespaceObject === "strict" ? 1 : 7;
					hasNonHarmony = true;
				} else if (exportsType === "namespace") {
					map[id] = 9;
					hasNamespace = true;
				} else if (exportsType === "named") {
					map[id] = 3;
					hasNamed = true;
				}
				return map;
			}, Object.create(null));
		if (!hasNamespace && hasNonHarmony && !hasNamed) {
			return this.options.namespaceObject === "strict" ? 1 : 7;
		}
		if (hasNamespace && !hasNonHarmony && !hasNamed) {
			return 9;
		}
		if (!hasNamespace && !hasNonHarmony && hasNamed) {
			return 3;
		}
		if (!hasNamespace && !hasNonHarmony && !hasNamed) {
			return 9;
		}
		return fakeMap;
	}

	getFakeMapInitStatement(fakeMap) {
		return typeof fakeMap === "object"
			? `var fakeMap = ${JSON.stringify(fakeMap, null, "\t")};`
			: "";
	}

	getReturn(type) {
		if (type === 9) {
			return "__webpack_require__(id)";
		}
		return `${RuntimeGlobals.createFakeNamespaceObject}(id, ${type})`;
	}

	getReturnModuleObjectSource(fakeMap, fakeMapDataExpression = "fakeMap[id]") {
		if (typeof fakeMap === "number") {
			return `return ${this.getReturn(fakeMap)};`;
		}
		return `return ${RuntimeGlobals.createFakeNamespaceObject}(id, ${fakeMapDataExpression})`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getSyncSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackContext(req) {
	var id = webpackContextResolve(req);
	${returnModuleObject}
}
function webpackContextResolve(req) {
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = ${JSON.stringify(id)};`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getWeakSyncSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackContext(req) {
	var id = webpackContextResolve(req);
	if(!${RuntimeGlobals.moduleFactories}[id]) {
		var e = new Error("Module '" + req + "' ('" + id + "') is not available (weak dependency)");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	${returnModuleObject}
}
function webpackContextResolve(req) {
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
webpackContext.id = ${JSON.stringify(id)};
module.exports = webpackContext;`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getAsyncWeakSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(function(id) {
		if(!${RuntimeGlobals.moduleFactories}[id]) {
			var e = new Error("Module '" + req + "' ('" + id + "') is not available (weak dependency)");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		${returnModuleObject}
	});
}
function webpackAsyncContextResolve(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		if(!Object.prototype.hasOwnProperty.call(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getEagerSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `function(id) {
		${this.getReturnModuleObjectSource(fakeMap)}
	}`
				: "__webpack_require__";
		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${thenFunction});
}
function webpackAsyncContextResolve(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		if(!Object.prototype.hasOwnProperty.call(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	/**
	 * @param {TODO} block TODO
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {Object} options options object
	 * @param {RuntimeTemplate} options.runtimeTemplate the runtime template
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getLazyOnceSource(block, dependencies, id, { runtimeTemplate, chunkGraph }) {
		const promise = runtimeTemplate.blockPromise({
			chunkGraph,
			block,
			message: "lazy-once context",
			runtimeRequirements: new Set()
		});
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `function(id) {
		${this.getReturnModuleObjectSource(fakeMap)};
	}`
				: "__webpack_require__";

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${thenFunction});
}
function webpackAsyncContextResolve(req) {
	return ${promise}.then(function() {
		if(!Object.prototype.hasOwnProperty.call(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	/**
	 * @param {TODO} blocks TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getLazySource(blocks, id, chunkGraph) {
		const moduleGraph = chunkGraph.moduleGraph;
		let hasMultipleOrNoChunks = false;
		let hasNoChunk = true;
		const fakeMap = this.getFakeMap(
			blocks.map(b => b.dependencies[0]),
			chunkGraph
		);
		const hasFakeMap = typeof fakeMap === "object";
		const items = blocks
			.map(block => {
				const dependency = block.dependencies[0];
				return {
					dependency: dependency,
					module: moduleGraph.getModule(dependency),
					block: block,
					userRequest: dependency.userRequest,
					chunks: undefined
				};
			})
			.filter(item => item.module);
		for (const item of items) {
			const chunkGroup = chunkGraph.getBlockChunkGroup(item.block);
			const chunks = (chunkGroup && chunkGroup.chunks) || [];
			item.chunks = chunks;
			if (chunks.length > 0) {
				hasNoChunk = false;
			}
			if (chunks.length !== 1) {
				hasMultipleOrNoChunks = true;
			}
		}
		const shortMode = hasNoChunk && !hasFakeMap;
		const map = items
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) return 0;
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, item) => {
				const moduleId = chunkGraph.getModuleId(item.module);
				if (shortMode) {
					map[item.userRequest] = moduleId;
				} else {
					const arrayStart = [moduleId];
					if (hasFakeMap) {
						arrayStart.push(fakeMap[moduleId]);
					}
					map[item.userRequest] = arrayStart.concat(
						item.chunks.map(chunk => chunk.id)
					);
				}
				return map;
			}, Object.create(null));

		const chunksStartPosition = hasFakeMap ? 2 : 1;
		const requestPrefix = hasNoChunk
			? "Promise.resolve()"
			: hasMultipleOrNoChunks
			? `Promise.all(ids.slice(${chunksStartPosition}).map(${RuntimeGlobals.ensureChunk}))`
			: `${RuntimeGlobals.ensureChunk}(ids[${chunksStartPosition}])`;
		const returnModuleObject = this.getReturnModuleObjectSource(
			fakeMap,
			shortMode ? "invalid" : "ids[1]"
		);

		const webpackAsyncContext =
			requestPrefix === "Promise.resolve()"
				? `${shortMode ? "" : ""}
function webpackAsyncContext(req) {
	return Promise.resolve().then(function() {
		if(!Object.prototype.hasOwnProperty.call(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}

		${shortMode ? "var id = map[req];" : "var ids = map[req], id = ids[0];"}
		${returnModuleObject}
	});
}`
				: `function webpackAsyncContext(req) {
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
		return Promise.resolve().then(function() {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return ${requestPrefix}.then(function() {
		${returnModuleObject}
	});
}`;

		return `var map = ${JSON.stringify(map, null, "\t")};
${webpackAsyncContext}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getSourceForEmptyContext(id) {
		return `function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = ${JSON.stringify(id)};`;
	}

	getSourceForEmptyAsyncContext(id) {
		return `function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = ${JSON.stringify(id)};`;
	}

	/**
	 * @param {string} asyncMode module mode
	 * @param {SourceContext} sourceContext context info
	 * @returns {string} the source code
	 */
	getSourceString(asyncMode, { runtimeTemplate, chunkGraph }) {
		const id = chunkGraph.getModuleId(this);
		if (asyncMode === "lazy") {
			if (this.blocks && this.blocks.length > 0) {
				return this.getLazySource(this.blocks, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "eager") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getEagerSource(this.dependencies, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "lazy-once") {
			const block = this.blocks[0];
			if (block) {
				return this.getLazyOnceSource(block, block.dependencies, id, {
					runtimeTemplate,
					chunkGraph
				});
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "async-weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getAsyncWeakSource(this.dependencies, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getWeakSyncSource(this.dependencies, id, chunkGraph);
			}
		}
		if (this.dependencies && this.dependencies.length > 0) {
			return this.getSyncSource(this.dependencies, id, chunkGraph);
		}
		return this.getSourceForEmptyContext(id);
	}

	getSource(sourceString) {
		if (this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}
		return new RawSource(sourceString);
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		return this.getSource(
			this.getSourceString(this.options.mode, sourceContext)
		);
	}

	/**
	 * Get a list of runtime requirements
	 * @param {SourceContext} context context for code generation
	 * @returns {Iterable<string> | null} required runtime modules
	 */
	getRuntimeRequirements({ chunkGraph }) {
		const set = [];
		const allDeps = /** @type {ContextElementDependency[]} */ (this.dependencies.concat(
			this.blocks.map(b => b.dependencies[0])
		));
		set.push(RuntimeGlobals.module);
		if (allDeps.length > 0) {
			const asyncMode = this.options.mode;
			set.push(RuntimeGlobals.require);
			if (asyncMode === "weak") {
				set.push(RuntimeGlobals.moduleFactories);
			} else if (asyncMode === "async-weak") {
				set.push(RuntimeGlobals.moduleFactories);
				set.push(RuntimeGlobals.ensureChunk);
			} else if (asyncMode === "lazy" || asyncMode === "lazy-once") {
				set.push(RuntimeGlobals.ensureChunk);
			}
			if (this.getFakeMap(allDeps, chunkGraph) !== 9) {
				set.push(RuntimeGlobals.createFakeNamespaceObject);
			}
		}
		return set;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		// base penalty
		const initialSize = 160;

		// if we dont have dependencies we stop here.
		return this.dependencies.reduce((size, dependency) => {
			const element = /** @type {ContextElementDependency} */ (dependency);
			return size + 5 + element.userRequest.length;
		}, initialSize);
	}
}

registerNotSerializable(ContextModule);

module.exports = ContextModule;
