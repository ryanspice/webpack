/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	evaluateToString,
	expressionIsUnsupported,
	toConstantDependency
} = require("../JavascriptParserHelpers");
const RuntimeGlobals = require("../RuntimeGlobals");
const WebpackError = require("../WebpackError");
const ConstDependency = require("./ConstDependency");
const SystemRuntimeModule = require("./SystemRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class SystemPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"SystemPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.system)
					.tap("SystemPlugin", (module, set) => {
						set.add(RuntimeGlobals.require);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.system)
					.tap("SystemPlugin", (chunk, set) => {
						compilation.addRuntimeModule(chunk, new SystemRuntimeModule());
					});

				const handler = (parser, parserOptions) => {
					if (parserOptions.system === undefined || !parserOptions.system) {
						return;
					}

					const setNotSupported = name => {
						parser.hooks.evaluateTypeof
							.for(name)
							.tap("SystemPlugin", evaluateToString("undefined"));
						parser.hooks.expression
							.for(name)
							.tap(
								"SystemPlugin",
								expressionIsUnsupported(
									parser,
									name + " is not supported by webpack."
								)
							);
					};

					parser.hooks.typeof
						.for("System.import")
						.tap(
							"SystemPlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("System.import")
						.tap("SystemPlugin", evaluateToString("function"));
					parser.hooks.typeof
						.for("System")
						.tap(
							"SystemPlugin",
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.evaluateTypeof
						.for("System")
						.tap("SystemPlugin", evaluateToString("object"));

					setNotSupported("System.set");
					setNotSupported("System.get");
					setNotSupported("System.register");

					parser.hooks.expression.for("System").tap("SystemPlugin", expr => {
						const dep = new ConstDependency(RuntimeGlobals.system, expr.range, [
							RuntimeGlobals.system
						]);
						dep.loc = expr.loc;
						parser.state.module.addDependency(dep);
						return true;
					});

					parser.hooks.call.for("System.import").tap("SystemPlugin", expr => {
						parser.state.module.warnings.push(
							new SystemImportDeprecationWarning(expr.loc)
						);

						return parser.hooks.importCall.call(expr);
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("SystemPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("SystemPlugin", handler);
			}
		);
	}
}

class SystemImportDeprecationWarning extends WebpackError {
	constructor(loc) {
		super(
			"System.import() is deprecated and will be removed soon. Use import() instead.\n" +
				"For more info visit https://webpack.js.org/guides/code-splitting/"
		);

		this.name = "SystemImportDeprecationWarning";

		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = SystemPlugin;
