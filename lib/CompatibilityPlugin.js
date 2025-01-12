/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./JavascriptParser")} JavascriptParser */

class CompatibilityPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"CompatibilityPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CompatibilityPlugin", (parser, parserOptions) => {
						if (
							parserOptions.browserify !== undefined &&
							!parserOptions.browserify
						)
							return;

						parser.hooks.call
							.for("require")
							.tap("CompatibilityPlugin", expr => {
								// support for browserify style require delegator: "require(o, !0)"
								if (expr.arguments.length !== 2) return;
								const second = parser.evaluateExpression(expr.arguments[1]);
								if (!second.isBoolean()) return;
								if (second.asBool() !== true) return;
								const dep = new ConstDependency("require", expr.callee.range);
								dep.loc = expr.loc;
								if (parser.state.current.dependencies.length > 1) {
									const last =
										parser.state.current.dependencies[
											parser.state.current.dependencies.length - 1
										];
									if (
										last.critical &&
										last.options &&
										last.options.request === "." &&
										last.userRequest === "." &&
										last.options.recursive
									)
										parser.state.current.dependencies.pop();
								}
								parser.state.current.addDependency(dep);
								return true;
							});
					});

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const nestedWebpackRequireHandler = parser => {
					parser.hooks.pattern
						.for("__webpack_require__")
						.tap("CompatibilityPlugin", pattern => {
							const newName = `__nested_webpack_require_${pattern.range[0]}__`;
							const dep = new ConstDependency(newName, pattern.range);
							dep.loc = pattern.loc;
							parser.state.current.addDependency(dep);
							parser.scope.renames.set(
								pattern.name,
								"nested __webpack_require__"
							);
							parser.scope.renames.set(
								"nested __webpack_require__ name",
								newName
							);
							parser.scope.definitions.delete(pattern.name);
							return true;
						});
					parser.hooks.expression
						.for("nested __webpack_require__")
						.tap("CompatibilityPlugin", expr => {
							const newName = parser.scope.renames.get(
								"nested __webpack_require__ name"
							);
							const dep = new ConstDependency(newName, expr.range);
							dep.loc = expr.loc;
							parser.state.current.addDependency(dep);
							return true;
						});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CompatibilityPlugin", nestedWebpackRequireHandler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("CompatibilityPlugin", nestedWebpackRequireHandler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("CompatibilityPlugin", nestedWebpackRequireHandler);
			}
		);
	}
}
module.exports = CompatibilityPlugin;
