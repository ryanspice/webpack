/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const { basename, extname } = require("path");
const util = require("util");
const Module = require("./Module");

/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compiler")} Compiler */

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

const prepareId = id => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${
			match[1]
		} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};

const hashLength = (replacer, handler) => {
	const fn = (match, arg, input) => {
		const length = arg && parseInt(arg, 10);

		if (length && handler) {
			return handler(length);
		}

		const hash = replacer(match, arg, input);

		return length ? hash.slice(0, length) : hash;
	};

	return fn;
};

const replacer = (value, allowEmpty) => {
	const fn = (match, arg, input) => {
		if (value === null || value === undefined) {
			if (!allowEmpty) {
				throw new Error(
					`Path variable ${match} not implemented in this context: ${input}`
				);
			}

			return "";
		} else {
			return `${value}`;
		}
	};

	return fn;
};

const deprecationCache = new Map();
const deprecatedFunction = (() => () => {})();
const deprecated = (fn, message) => {
	let d = deprecationCache.get(message);
	if (d === undefined) {
		d = util.deprecate(deprecatedFunction, message);
		deprecationCache.set(message, d);
	}
	return (...args) => {
		d();
		return fn(...args);
	};
};

/**
 * @param {string | function(PathData): string} path the raw path
 * @param {PathData} data context data
 * @returns {string} the interpolated path
 */
const replacePathVariables = (path, data) => {
	const chunkGraph = data.chunkGraph;

	/** @type {Map<string, Function>} */
	const replacements = new Map();

	// Filename context
	//
	// Placeholders
	//
	// for /some/path/file.js?query:
	// [file] - /some/path/file.js
	// [query] - ?query
	// [base] - file.js
	// [path] - /some/path/
	// [name] - file
	// [ext] - .js
	if (data.filename) {
		if (typeof data.filename === "string") {
			const idx = data.filename.indexOf("?");

			let file, query;

			if (idx >= 0) {
				file = data.filename.substr(0, idx);
				query = data.filename.substr(idx);
			} else {
				file = data.filename;
				query = "";
			}

			const ext = extname(file);
			const base = basename(file);
			const name = base.slice(0, base.length - ext.length);
			const path = file.slice(0, file.length - base.length);

			replacements.set("file", replacer(file));
			replacements.set("query", replacer(query, true));
			replacements.set("path", replacer(path, true));
			replacements.set("base", replacer(base));
			replacements.set("name", replacer(name));
			replacements.set("ext", replacer(ext, true));
			// Legacy
			replacements.set(
				"filebase",
				deprecated(replacer(base), "[filebase] is now [base]")
			);
		}
	}

	// Compilation context
	//
	// Placeholders
	//
	// [fullhash] - data.hash (3a4b5c6e7f)
	//
	// Legacy Placeholders
	//
	// [hash] - data.hash (3a4b5c6e7f)
	if (data.hash) {
		const hashReplacer = hashLength(replacer(data.hash), data.hashWithLength);

		replacements.set("fullhash", hashReplacer);

		// Legacy
		replacements.set(
			"hash",
			deprecated(
				hashReplacer,
				"[hash] is now [fullhash] (also consider using [chunkhash] or [contenthash], see documentation for details)"
			)
		);
	}

	// Chunk Context
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [name] - chunk.name (app.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256urzg.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const contentHashType = data.contentHashType;

		const idReplacer = replacer(chunk.id);
		const nameReplacer = replacer(chunk.name || chunk.id);
		const chunkhashReplacer = hashLength(
			replacer(chunk.renderedHash || chunk.hash),
			"hashWithLength" in chunk ? chunk.hashWithLength : undefined
		);
		const contenthashReplacer = hashLength(
			replacer(
				data.contentHash ||
					(contentHashType &&
						chunk.contentHash &&
						chunk.contentHash[contentHashType])
			),
			data.contentHashWithLength ||
				("contentHashWithLength" in chunk && chunk.contentHashWithLength
					? chunk.contentHashWithLength[contentHashType]
					: undefined)
		);

		replacements.set("id", idReplacer);
		replacements.set("name", nameReplacer);
		replacements.set("chunkhash", chunkhashReplacer);
		replacements.set("contenthash", contenthashReplacer);
	}

	// Module Context
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [hash] - module.hash (6237543873.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;

		const idReplacer = replacer(
			prepareId(
				module instanceof Module ? chunkGraph.getModuleId(module) : module.id
			)
		);
		const hashReplacer = hashLength(
			replacer(
				module instanceof Module
					? chunkGraph.getRenderedModuleHash(module)
					: module.renderedHash || module.hash
			),
			"hashWithLength" in module ? module.hashWithLength : undefined
		);

		replacements.set("id", idReplacer);
		replacements.set("hash", hashReplacer);
		// Legacy
		replacements.set(
			"moduleid",
			deprecated(idReplacer, "[moduleid] is now [id]")
		);
		replacements.set(
			"modulehash",
			deprecated(hashReplacer, "[modulehash] is now [hash]")
		);
	}

	// Other things
	if (data.url) {
		replacements.set("url", replacer(data.url));
	}

	if (typeof path === "function") {
		path = path(data);
	}

	path = path.replace(REGEXP, (match, content) => {
		if (content.length + 2 === match.length) {
			const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
			if (!contentMatch) return match;
			const [, kind, arg] = contentMatch;
			const replacer = replacements.get(kind);
			if (replacer !== undefined) {
				return replacer(match, arg, path);
			}
		} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
			return `[${match.slice(2, -2)}]`;
		}
		return match;
	});

	return path;
};

const plugin = "TemplatedPathPlugin";

class TemplatedPathPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, compilation => {
			const mainTemplate = compilation.mainTemplate;

			mainTemplate.hooks.assetPath.tap(plugin, replacePathVariables);
		});
	}
}

module.exports = TemplatedPathPlugin;
