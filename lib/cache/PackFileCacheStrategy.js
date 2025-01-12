/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FileSystemInfo = require("../FileSystemInfo");
const LazySet = require("../util/LazySet");
const makeSerializable = require("../util/makeSerializable");
const {
	createFileSerializer,
	NOT_SERIALIZABLE,
	MEASURE_START_OPERATION,
	MEASURE_END_OPERATION
} = require("../util/serialization");

const MAX_INLINE_SIZE = 20000;

class DataWithBuildSnapshot {
	constructor(data, buildSnapshot, buildDependencies) {
		this.data = data;
		this.buildSnapshot = buildSnapshot;
		this.buildDependencies = buildDependencies;
	}

	serialize({ write }) {
		write(this.buildSnapshot);
		write(this.buildDependencies);
		write(this.data);
	}

	deserialize({ read }) {
		this.buildSnapshot = read();
		this.buildDependencies = read();
		this.data = read();
	}
}

makeSerializable(
	DataWithBuildSnapshot,
	"webpack/lib/cache/PackFileCacheStrategy",
	"DataWithBuildSnapshot"
);

class Pack {
	constructor(version, logger) {
		this.version = version;
		this.etags = new Map();
		/** @type {Map<string, any | (() => Promise<PackEntry>)>} */
		this.content = new Map();
		this.lastAccess = new Map();
		this.lastSizes = new Map();
		this.unserializable = new Set();
		this.used = new Set();
		this.invalid = false;
		this.logger = logger;
	}

	get(identifier, etag) {
		const etagInCache = this.etags.get(identifier);
		if (etagInCache === undefined) return undefined;
		if (etagInCache !== etag) return undefined;
		this.used.add(identifier);
		const content = this.content.get(identifier);
		if (typeof content === "function") {
			return Promise.resolve(content()).then(entry =>
				this._unpack(identifier, entry, false)
			);
		} else {
			return content;
		}
	}

	set(identifier, etag, data) {
		if (this.unserializable.has(identifier)) return;
		this.used.add(identifier);
		if (!this.invalid) {
			if (
				this.content.get(identifier) === data &&
				this.etags.get(identifier) === etag
			) {
				return;
			}
			this.invalid = true;
			this.logger.debug(`Pack got invalid because of ${identifier}`);
		}
		this.etags.set(identifier, etag);
		return this.content.set(identifier, data);
	}

	collectGarbage(maxAge) {
		this._updateLastAccess();
		const now = Date.now();
		for (const [identifier, lastAccess] of this.lastAccess) {
			if (now - lastAccess > maxAge) {
				this.lastAccess.delete(identifier);
				this.etags.delete(identifier);
				this.content.delete(identifier);
			}
		}
	}

	_updateLastAccess() {
		const now = Date.now();
		for (const identifier of this.used) {
			this.lastAccess.set(identifier, now);
		}
		this.used.clear();
	}

	serialize({ write }) {
		this._updateLastAccess();
		write(this.version);
		write(this.etags);
		write(this.unserializable);
		write(this.lastAccess);
		for (const [identifier, data] of this.content) {
			write(identifier);
			if (typeof data === "function") {
				write(data);
			} else {
				const packEntry = new PackEntry(data, identifier);
				const lastSize = this.lastSizes.get(identifier);
				if (lastSize > MAX_INLINE_SIZE) {
					write(() => packEntry);
				} else {
					write(packEntry);
				}
			}
		}
		write(null);
	}

	deserialize({ read, logger }) {
		this.logger = logger;
		this.version = read();
		this.etags = read();
		this.unserializable = read();
		this.lastAccess = read();
		this.content = new Map();
		let identifier = read();
		while (identifier !== null) {
			const entry = read();
			if (typeof entry === "function") {
				this.content.set(identifier, entry);
			} else {
				this.content.set(identifier, this._unpack(identifier, entry, true));
			}
			identifier = read();
		}
	}

	_unpack(identifier, entry, currentlyInline) {
		const { data, size } = entry;
		if (data === undefined) {
			this.unserializable.add(identifier);
			this.lastSizes.delete(identifier);
			return undefined;
		} else {
			this.lastSizes.set(identifier, size);
			if (currentlyInline) {
				if (size > MAX_INLINE_SIZE) {
					this.invalid = true;
					this.logger.log(
						`Moved ${identifier} from inline to lazy section for better performance.`
					);
				}
			} else {
				if (size <= MAX_INLINE_SIZE) {
					this.content.set(identifier, data);
					this.invalid = true;
					this.logger.log(
						`Moved ${identifier} from lazy to inline section for better performance.`
					);
				}
			}
			return data;
		}
	}
}

makeSerializable(Pack, "webpack/lib/cache/PackFileCacheStrategy", "Pack");

class PackEntry {
	constructor(data, identifier) {
		this.data = data;
		this.size = undefined;
		this.identifier = identifier;
	}

	serialize({ write, snapshot, rollback, logger }) {
		const s = snapshot();
		try {
			write(true);
			if (this.size === undefined) {
				write(MEASURE_START_OPERATION);
				write(this.data);
				write(MEASURE_END_OPERATION);
			} else {
				write(this.data);
				write(this.size);
			}
		} catch (err) {
			if (err !== NOT_SERIALIZABLE) {
				logger.warn(
					`Caching failed for ${this.identifier}: ${err}\nWe will not try to cache this entry again until the cache file is deleted.`
				);
				logger.debug(err.stack);
			}
			rollback(s);
			write(false);
		}
	}

	deserialize({ read }) {
		if (read()) {
			this.data = read();
			this.size = read();
		}
	}
}

makeSerializable(
	PackEntry,
	"webpack/lib/cache/PackFileCacheStrategy",
	"PackEntry"
);

class PackFileCacheStrategy {
	constructor({ fs, context, cacheLocation, version, logger, managedPaths }) {
		this.fileSerializer = createFileSerializer(fs);
		this.fileSystemInfo = new FileSystemInfo(fs, { managedPaths });
		this.context = context;
		this.cacheLocation = cacheLocation;
		this.logger = logger;
		this.buildSnapshot = undefined;
		this.oldBuildDependencies = new Set();
		this.buildDependencies = new LazySet();
		let buildSnapshot;
		let buildDependencies;
		logger.time("restore pack");
		this.packPromise = this.fileSerializer
			.deserialize({ filename: `${cacheLocation}.pack`, logger })
			.then(cacheEntry => {
				if (cacheEntry instanceof DataWithBuildSnapshot) {
					logger.timeEnd("restore pack");
					return new Promise((resolve, reject) => {
						logger.time("check build dependencies");
						this.fileSystemInfo.checkSnapshotValid(
							cacheEntry.buildSnapshot,
							(err, valid) => {
								if (err) return reject(err);
								logger.timeEnd("check build dependencies");
								if (!valid) {
									logger.log(
										`Restored pack from ${cacheLocation}.pack, but build dependencies have changed.`
									);
									return resolve(undefined);
								}
								buildSnapshot = cacheEntry.buildSnapshot;
								buildDependencies = cacheEntry.buildDependencies;
								logger.time("restore pack content");
								return resolve(
									cacheEntry.data().then(d => {
										logger.timeEnd("restore pack content");
										return d;
									})
								);
							}
						);
					});
				}
				return cacheEntry;
			})
			.then(cacheEntry => {
				if (cacheEntry) {
					if (!(cacheEntry instanceof Pack)) {
						logger.warn(
							`Restored from ${cacheLocation}.pack, but is not a Pack.`
						);
						return new Pack(version, logger);
					}
					if (cacheEntry.version !== version) {
						logger.log(
							`Restored pack from ${cacheLocation}.pack, but version doesn't match.`
						);
						return new Pack(version, logger);
					}
					this.buildSnapshot = buildSnapshot;
					this.oldBuildDependencies = buildDependencies;
					return cacheEntry;
				}
				return new Pack(version, logger);
			})
			.catch(err => {
				if (err && err.code !== "ENOENT") {
					logger.warn(
						`Restoring pack failed from ${cacheLocation}.pack: ${err}`
					);
					logger.debug(err.stack);
				}
				return new Pack(version, logger);
			});
	}

	store(identifier, etag, data, idleTasks) {
		return this.packPromise.then(pack => {
			this.logger.debug(`Cached ${identifier} to pack.`);
			pack.set(identifier, etag, data);
		});
	}

	restore(identifier, etag) {
		return this.packPromise
			.then(pack => pack.get(identifier, etag))
			.catch(err => {
				if (err && err.code !== "ENOENT") {
					this.logger.warn(
						`Restoring failed for ${identifier} from pack: ${err}`
					);
					this.logger.debug(err.stack);
				}
			});
	}

	storeBuildDependencies(dependencies) {
		this.buildDependencies.addAll(dependencies);
	}

	afterAllStored() {
		return this.packPromise.then(pack => {
			if (!pack.invalid) return;
			let promise;
			const newBuildDependencies = new Set();
			for (const dep of this.buildDependencies) {
				if (!this.oldBuildDependencies.has(dep)) {
					newBuildDependencies.add(dep);
					this.oldBuildDependencies.add(dep);
				}
			}
			this.buildDependencies.clear();
			if (newBuildDependencies.size > 0) {
				this.logger.debug(
					`Capturing build dependencies... (${Array.from(
						newBuildDependencies
					).join(", ")})`
				);
				promise = new Promise((resolve, reject) => {
					this.logger.time("resolve build dependencies");
					this.fileSystemInfo.resolveBuildDependencies(
						this.context,
						newBuildDependencies,
						(err, result) => {
							if (err) return reject(err);
							this.logger.timeEnd("resolve build dependencies");

							this.logger.time("snapshot build dependencies");
							const { files, directories, missing } = result;
							this.fileSystemInfo.createSnapshot(
								undefined,
								files,
								directories,
								missing,
								{ hash: true },
								(err, snapshot) => {
									if (err) return reject(err);
									this.logger.timeEnd("snapshot build dependencies");
									this.logger.debug("Captured build dependencies");

									if (this.buildSnapshot) {
										this.buildSnapshot = this.fileSystemInfo.mergeSnapshots(
											this.buildSnapshot,
											snapshot
										);
									} else {
										this.buildSnapshot = snapshot;
									}

									resolve();
								}
							);
						}
					);
				});
			} else {
				promise = Promise.resolve();
			}
			return promise.then(() => {
				this.logger.log(`Storing pack...`);
				this.logger.time(`store pack`);
				pack.collectGarbage(1000 * 60 * 60 * 24 * 2);
				const content = this.buildSnapshot
					? new DataWithBuildSnapshot(
							() => pack,
							this.buildSnapshot,
							this.oldBuildDependencies
					  )
					: pack;
				// You might think this breaks all access to the existing pack
				// which are still referenced, but serializing the pack memorizes
				// all data in the pack and makes it no longer need the backing file
				// So it's safe to replace the pack file
				return this.fileSerializer
					.serialize(content, {
						filename: `${this.cacheLocation}.pack`,
						logger: this.logger
					})
					.then(() => {
						this.logger.timeEnd(`store pack`);
						this.logger.log(`Stored pack`);
					})
					.catch(err => {
						this.logger.timeEnd(`store pack`);
						this.logger.warn(`Caching failed for pack: ${err}`);
						this.logger.debug(err.stack);
					});
			});
		});
	}
}

module.exports = PackFileCacheStrategy;
