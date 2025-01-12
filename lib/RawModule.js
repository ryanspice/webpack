/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const Module = require("./Module");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */

class RawModule extends Module {
	constructor(source, identifier, readableIdentifier) {
		super("javascript/dynamic", null);
		/** @type {string} */
		this.sourceStr = source;
		/** @type {string} */
		this.identifierStr = identifier || this.sourceStr;
		/** @type {string} */
		this.readableIdentifierStr = readableIdentifier || this.identifierStr;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this.identifierStr;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return Math.max(1, this.sourceStr.length);
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.readableIdentifierStr);
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, !this.buildMeta);
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
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: true
		};
		callback();
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		if (this.useSourceMap) {
			return new OriginalSource(this.sourceStr, this.identifier());
		} else {
			return new RawSource(this.sourceStr);
		}
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.sourceStr);
		super.updateHash(hash, chunkGraph);
	}

	serialize(context) {
		const { write } = context;

		write(this.sourceStr);
		write(this.identifierStr);
		write(this.readableIdentifierStr);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.sourceStr = read();
		this.identifierStr = read();
		this.readableIdentifierStr = read();

		super.deserialize(context);
	}
}

makeSerializable(RawModule, "webpack/lib/RawModule");

module.exports = RawModule;
