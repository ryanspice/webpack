/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class GetFullHashRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 */
	constructor(compilation) {
		super("getFullHash");
		this.compilation = compilation;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${
			RuntimeGlobals.getFullHash
		} = function() { return ${JSON.stringify(
			this.compilation.hash || "XXXX"
		)}; }`;
	}
}

module.exports = GetFullHashRuntimeModule;
