/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class GlobalRuntimeModule extends RuntimeModule {
	constructor() {
		super("global");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.global} = (function() {`,
			Template.indent([
				// This works in non-strict mode
				"var g = (function() { return this; })();",
				"try {",
				Template.indent(
					// This works if eval is allowed (see CSP)
					"g = g || new Function('return this')();"
				),
				"} catch (e) {",
				Template.indent(
					// This works if the window reference is available
					"if (typeof window === 'object') g = window;"
				),
				"}",
				// g can still be `undefined`, but nothing to do about it...
				// We return `undefined`, instead of nothing here, so it's
				// easier to handle this case:
				//   if (!global) { … }
				"return g;"
			]),
			"})();"
		]);
	}
}

module.exports = GlobalRuntimeModule;
