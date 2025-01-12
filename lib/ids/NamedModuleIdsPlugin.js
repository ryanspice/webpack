/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareModulesByIdentifier } = require("../util/comparators");
const {
	getShortModuleName,
	getLongModuleName,
	assignNames,
	getUsedModuleIds,
	assignAscendingModuleIds
} = require("./IdHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NamedModuleIdsPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NamedModuleIdsPlugin", compilation => {
			compilation.hooks.moduleIds.tap("NamedModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context
					? this.options.context
					: compiler.context;

				const unnamedModules = assignNames(
					Array.from(modules).filter(module => {
						if (chunkGraph.getNumberOfModuleChunks(module) === 0) return false;
						return chunkGraph.getModuleId(module) === null;
					}),
					m => getShortModuleName(m, context, compiler.root),
					(m, shortName) =>
						getLongModuleName(shortName, m, context, compiler.root),
					compareModulesByIdentifier,
					getUsedModuleIds(compilation),
					(m, name) => chunkGraph.setModuleId(m, name)
				);
				if (unnamedModules.length > 0) {
					assignAscendingModuleIds(unnamedModules, compilation);
				}
			});
		});
	}
}

module.exports = NamedModuleIdsPlugin;
