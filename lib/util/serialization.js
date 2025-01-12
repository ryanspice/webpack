/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const BinaryMiddleware = require("../serialization/BinaryMiddleware");
const FileMiddleware = require("../serialization/FileMiddleware");
const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const Serializer = require("../serialization/Serializer");
const SingleItemMiddleware = require("../serialization/SingleItemMiddleware");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const { register, registerLoader, registerNotSerializable } = ObjectMiddleware;

// Expose serialization API
exports.register = register;
exports.registerLoader = registerLoader;
exports.registerNotSerializable = registerNotSerializable;
exports.NOT_SERIALIZABLE = ObjectMiddleware.NOT_SERIALIZABLE;
exports.MEASURE_START_OPERATION = BinaryMiddleware.MEASURE_START_OPERATION;
exports.MEASURE_END_OPERATION = BinaryMiddleware.MEASURE_END_OPERATION;
exports.createFileSerializer = fs =>
	new Serializer([
		new SingleItemMiddleware(),
		new ObjectMiddleware(),
		new BinaryMiddleware(),
		new FileMiddleware(fs)
	]);
exports.buffersSerializer = new Serializer([
	new SingleItemMiddleware(),
	new ObjectMiddleware(),
	new BinaryMiddleware()
]);

require("./registerExternalSerializer");

// Load internal paths with a relative require
// This allows bundling all internal serializers
registerLoader(/^webpack\/lib\//, req =>
	require("../" + req.slice("webpack/lib/".length))
);
