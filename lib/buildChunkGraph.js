/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const { connectChunkGroupParentAndChild } = require("./GraphHelpers");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./logging/Logger").Logger} Logger */

/**
 * @typedef {Object} QueueItem
 * @property {number} action
 * @property {DependenciesBlock} block
 * @property {Module} module
 * @property {Chunk} chunk
 * @property {ChunkGroup} chunkGroup
 */

/**
 * @typedef {Object} ChunkGroupInfo
 * @property {Set<Module>} minAvailableModules current minimal set of modules available at this point
 * @property {boolean} minAvailableModulesOwned true, if minAvailableModules is owned and can be modified
 * @property {Set<Module>[]} availableModulesToBeMerged enqueued updates to the minimal set of available modules
 * @property {QueueItem[]} skippedItems queue items that were skipped because module is already available in parent chunks (need to reconsider when minAvailableModules is shrinking)
 * @property {Set<Module>} resultingAvailableModules set of modules available including modules from this chunk group
 */

/**
 * @typedef {Object} ChunkGroupDep
 * @property {AsyncDependenciesBlock} block referencing block
 * @property {ChunkGroup} chunkGroup referenced chunk group
 */

/**
 * @template T
 * @param {Set<T>} a first set
 * @param {Set<T>} b second set
 * @returns {number} cmp
 */
const bySetSize = (a, b) => {
	return b.size - a.size;
};

/**
 * Extracts simplified info from the modules and their dependencies
 * @param {Compilation} compilation the compilation
 * @returns {Map<DependenciesBlock, { modules: Iterable<Module>, blocks: AsyncDependenciesBlock[]}>} the mapping block to modules and inner blocks
 */
const extraceBlockInfoMap = compilation => {
	/** @type {Map<DependenciesBlock, { modules: Iterable<Module>, blocks: AsyncDependenciesBlock[]}>} */
	const blockInfoMap = new Map();

	/**
	 * @param {Dependency} d dependency to iterate over
	 * @returns {void}
	 */
	const iteratorDependency = d => {
		// We skip Dependencies without Reference
		const ref = compilation.getDependencyReference(d);
		if (!ref) {
			return;
		}
		// We skip Dependencies without Module pointer
		const refModule = ref.module;
		if (!refModule) {
			return;
		}
		// We skip weak Dependencies
		if (ref.weak) {
			return;
		}

		blockInfoModules.add(refModule);
	};

	/**
	 * @param {AsyncDependenciesBlock} b blocks to prepare
	 * @returns {void}
	 */
	const iteratorBlockPrepare = b => {
		blockInfoBlocks.push(b);
		blockQueue.push(b);
	};

	/** @type {DependenciesBlock} */
	let block;
	/** @type {DependenciesBlock[]} */
	let blockQueue;
	/** @type {Set<Module>} */
	let blockInfoModules;
	/** @type {AsyncDependenciesBlock[]} */
	let blockInfoBlocks;

	for (const module of compilation.modules) {
		blockQueue = [module];
		while (blockQueue.length > 0) {
			block = blockQueue.pop();
			blockInfoModules = new Set();
			blockInfoBlocks = [];

			if (block.dependencies) {
				for (const dep of block.dependencies) iteratorDependency(dep);
			}

			if (block.blocks) {
				for (const b of block.blocks) iteratorBlockPrepare(b);
			}

			const blockInfo = {
				modules: blockInfoModules,
				blocks: blockInfoBlocks
			};
			blockInfoMap.set(block, blockInfo);
		}
	}

	return blockInfoMap;
};

/**
 *
 * @param {Logger} logger a logger
 * @param {Compilation} compilation the compilation
 * @param {Entrypoint[]} inputChunkGroups input groups
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 * @param {Map<ChunkGroup, ChunkGroupDep[]>} chunkDependencies dependencies for chunk groups
 * @param {Set<DependenciesBlock>} blocksWithNestedBlocks flag for blocks that have nested blocks
 * @param {Set<ChunkGroup>} allCreatedChunkGroups filled with all chunk groups that are created here
 */
const visitModules = (
	logger,
	compilation,
	inputChunkGroups,
	chunkGroupInfoMap,
	chunkDependencies,
	blocksWithNestedBlocks,
	allCreatedChunkGroups
) => {
	const { moduleGraph, chunkGraph, namedChunkGroups } = compilation;

	logger.time("visitModules: prepare");
	const blockInfoMap = extraceBlockInfoMap(compilation);

	/** @type {Map<ChunkGroup, { preOrderIndex: number, postOrderIndex: number }>} */
	const chunkGroupCounters = new Map();
	for (const chunkGroup of inputChunkGroups) {
		chunkGroupCounters.set(chunkGroup, {
			preOrderIndex: 0,
			postOrderIndex: 0
		});
	}

	let nextFreeModulePreOrderIndex = 0;
	let nextFreeModulePostOrderIndex = 0;

	/** @type {Map<DependenciesBlock, ChunkGroup>} */
	const blockChunkGroups = new Map();

	const ADD_AND_ENTER_MODULE = 0;
	const ENTER_MODULE = 1;
	const PROCESS_BLOCK = 2;
	const LEAVE_MODULE = 3;

	/**
	 * @param {QueueItem[]} queue the queue array (will be mutated)
	 * @param {ChunkGroup} chunkGroup chunk group
	 * @returns {QueueItem[]} the queue array again
	 */
	const reduceChunkGroupToQueueItem = (queue, chunkGroup) => {
		for (const chunk of chunkGroup.chunks) {
			for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
				queue.push({
					action: ENTER_MODULE,
					block: module,
					module,
					chunk,
					chunkGroup
				});
			}
		}
		chunkGroupInfoMap.set(chunkGroup, {
			minAvailableModules: new Set(),
			minAvailableModulesOwned: true,
			availableModulesToBeMerged: [],
			skippedItems: [],
			resultingAvailableModules: undefined
		});
		return queue;
	};

	// Start with the provided modules/chunks
	/** @type {QueueItem[]} */
	let queue = inputChunkGroups
		.reduce(reduceChunkGroupToQueueItem, [])
		.reverse();
	/** @type {Map<ChunkGroup, Set<ChunkGroup>>} */
	const queueConnect = new Map();
	/** @type {Set<ChunkGroupInfo>} */
	const outdatedChunkGroupInfo = new Set();
	/** @type {QueueItem[]} */
	let queueDelayed = [];

	logger.timeEnd("visitModules: prepare");

	/** @type {Module} */
	let module;
	/** @type {Chunk} */
	let chunk;
	/** @type {ChunkGroup} */
	let chunkGroup;
	/** @type {DependenciesBlock} */
	let block;
	/** @type {Set<Module>} */
	let minAvailableModules;
	/** @type {QueueItem[]} */
	let skippedItems;

	// For each async Block in graph
	/**
	 * @param {AsyncDependenciesBlock} b iterating over each Async DepBlock
	 * @returns {void}
	 */
	const iteratorBlock = b => {
		// 1. We create a chunk for this Block
		// but only once (blockChunkGroups map)
		let c = blockChunkGroups.get(b);
		if (c === undefined) {
			c = namedChunkGroups.get(b.chunkName);
			if (c && c.isInitial()) {
				compilation.errors.push(
					new AsyncDependencyToInitialChunkError(b.chunkName, module, b.loc)
				);
				c = chunkGroup;
			} else {
				c = compilation.addChunkInGroup(
					b.groupOptions || b.chunkName,
					module,
					b.loc,
					b.request
				);
				chunkGroupCounters.set(c, { preOrderIndex: 0, postOrderIndex: 0 });
				blockChunkGroups.set(b, c);
				allCreatedChunkGroups.add(c);
			}
		} else {
			c.addOptions(b.groupOptions);
			c.addOrigin(module, b.loc, b.request);
		}

		// 2. We store the Block+Chunk mapping as dependency for the chunk
		let deps = chunkDependencies.get(chunkGroup);
		if (!deps) chunkDependencies.set(chunkGroup, (deps = []));
		deps.push({
			block: b,
			chunkGroup: c
		});

		// 3. We create/update the chunk group info
		let connectList = queueConnect.get(chunkGroup);
		if (connectList === undefined) {
			connectList = new Set();
			queueConnect.set(chunkGroup, connectList);
		}
		connectList.add(c);

		// 4. We enqueue the DependenciesBlock for traversal
		queueDelayed.push({
			action: PROCESS_BLOCK,
			block: b,
			module: module,
			chunk: c.chunks[0],
			chunkGroup: c
		});
	};

	// Iterative traversal of the Module graph
	// Recursive would be simpler to write but could result in Stack Overflows
	while (queue.length) {
		logger.time("visitModules: visiting");
		while (queue.length) {
			const queueItem = queue.pop();
			module = queueItem.module;
			block = queueItem.block;
			chunk = queueItem.chunk;
			if (chunkGroup !== queueItem.chunkGroup) {
				chunkGroup = queueItem.chunkGroup;
				const chunkGroupInfo = chunkGroupInfoMap.get(chunkGroup);
				minAvailableModules = chunkGroupInfo.minAvailableModules;
				skippedItems = chunkGroupInfo.skippedItems;
			}

			switch (queueItem.action) {
				case ADD_AND_ENTER_MODULE: {
					if (minAvailableModules.has(module)) {
						// already in parent chunks
						// skip it for now, but enqueue for rechecking when minAvailableModules shrinks
						skippedItems.push(queueItem);
						break;
					}
					// We connect Module and Chunk when not already done
					if (!chunkGraph.connectChunkAndModule(chunk, module)) {
						// already connected, skip it
						break;
					}
				}
				// fallthrough
				case ENTER_MODULE: {
					if (chunkGroup !== undefined) {
						const index = chunkGroup.getModulePreOrderIndex(module);
						if (index === undefined) {
							chunkGroup.setModulePreOrderIndex(
								module,
								chunkGroupCounters.get(chunkGroup).preOrderIndex++
							);
						}
					}

					if (
						moduleGraph.setPreOrderIndexIfUnset(
							module,
							nextFreeModulePreOrderIndex
						)
					) {
						nextFreeModulePreOrderIndex++;
					}

					queue.push({
						action: LEAVE_MODULE,
						block,
						module,
						chunk,
						chunkGroup
					});
				}
				// fallthrough
				case PROCESS_BLOCK: {
					// get prepared block info
					const blockInfo = blockInfoMap.get(block);

					// Buffer items because order need to be reverse to get indicies correct
					const skipBuffer = [];
					const queueBuffer = [];
					// Traverse all referenced modules
					for (const refModule of blockInfo.modules) {
						if (chunkGraph.isModuleInChunk(refModule, chunk)) {
							// skip early if already connected
							continue;
						}
						if (minAvailableModules.has(refModule)) {
							// already in parent chunks, skip it for now
							skipBuffer.push({
								action: ADD_AND_ENTER_MODULE,
								block: refModule,
								module: refModule,
								chunk,
								chunkGroup
							});
							continue;
						}
						// enqueue the add and enter to enter in the correct order
						// this is relevant with circular dependencies
						queueBuffer.push({
							action: ADD_AND_ENTER_MODULE,
							block: refModule,
							module: refModule,
							chunk,
							chunkGroup
						});
					}
					// Add buffered items in reversed order
					for (let i = skipBuffer.length - 1; i >= 0; i--) {
						skippedItems.push(skipBuffer[i]);
					}
					for (let i = queueBuffer.length - 1; i >= 0; i--) {
						queue.push(queueBuffer[i]);
					}

					// Traverse all Blocks
					for (const block of blockInfo.blocks) iteratorBlock(block);

					if (blockInfo.blocks.length > 0 && module !== block) {
						blocksWithNestedBlocks.add(block);
					}
					break;
				}
				case LEAVE_MODULE: {
					if (chunkGroup !== undefined) {
						const index = chunkGroup.getModulePostOrderIndex(module);
						if (index === undefined) {
							chunkGroup.setModulePostOrderIndex(
								module,
								chunkGroupCounters.get(chunkGroup).postOrderIndex++
							);
						}
					}

					if (
						moduleGraph.setPostOrderIndexIfUnset(
							module,
							nextFreeModulePostOrderIndex
						)
					) {
						nextFreeModulePostOrderIndex++;
					}
					break;
				}
			}
		}
		logger.timeEnd("visitModules: visiting");

		if (queueConnect.size > 0) {
			logger.time("visitModules: calculating available modules");

			// Figure out new parents for chunk groups
			// to get new available modules for these children
			for (const [chunkGroup, targets] of queueConnect) {
				const info = chunkGroupInfoMap.get(chunkGroup);
				let minAvailableModules = info.minAvailableModules;

				// 1. Create a new Set of available modules at this points
				const resultingAvailableModules = new Set(minAvailableModules);
				for (const chunk of chunkGroup.chunks) {
					for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
						resultingAvailableModules.add(m);
					}
				}
				info.resultingAvailableModules = resultingAvailableModules;

				// 2. Update chunk group info
				for (const target of targets) {
					let chunkGroupInfo = chunkGroupInfoMap.get(target);
					if (chunkGroupInfo === undefined) {
						chunkGroupInfo = {
							minAvailableModules: undefined,
							minAvailableModulesOwned: undefined,
							availableModulesToBeMerged: [],
							skippedItems: [],
							resultingAvailableModules: undefined
						};
						chunkGroupInfoMap.set(target, chunkGroupInfo);
					}
					chunkGroupInfo.availableModulesToBeMerged.push(
						resultingAvailableModules
					);
					outdatedChunkGroupInfo.add(chunkGroupInfo);
				}
			}
			queueConnect.clear();
			logger.timeEnd("visitModules: calculating available modules");

			if (outdatedChunkGroupInfo.size > 0) {
				logger.time("visitModules: merging available modules");
				// Execute the merge
				for (const info of outdatedChunkGroupInfo) {
					const availableModulesToBeMerged = info.availableModulesToBeMerged;
					let minAvailableModules = info.minAvailableModules;

					// 1. Get minimal available modules
					// It doesn't make sense to traverse a chunk again with more available modules.
					// This step calculates the minimal available modules and skips traversal when
					// the list didn't shrink.
					if (availableModulesToBeMerged.length > 1) {
						availableModulesToBeMerged.sort(bySetSize);
					}
					let changed = false;
					for (const availableModules of availableModulesToBeMerged) {
						if (minAvailableModules === undefined) {
							minAvailableModules = availableModules;
							info.minAvailableModules = minAvailableModules;
							info.minAvailableModulesOwned = false;
							changed = true;
						} else {
							if (info.minAvailableModulesOwned) {
								// We own it and can modify it
								for (const m of minAvailableModules) {
									if (!availableModules.has(m)) {
										minAvailableModules.delete(m);
										changed = true;
									}
								}
							} else {
								for (const m of minAvailableModules) {
									if (!availableModules.has(m)) {
										// minAvailableModules need to be modified
										// but we don't own it
										// construct a new Set as intersection of minAvailableModules and availableModules
										/** @type {Set<Module>} */
										const newSet = new Set();
										const iterator = minAvailableModules[Symbol.iterator]();
										/** @type {IteratorResult<Module>} */
										let it;
										while (!(it = iterator.next()).done) {
											const module = it.value;
											if (module === m) break;
											newSet.add(module);
										}
										while (!(it = iterator.next()).done) {
											const module = it.value;
											if (availableModules.has(module)) {
												newSet.add(module);
											}
										}
										minAvailableModules = newSet;
										info.minAvailableModulesOwned = true;
										info.minAvailableModules = newSet;
										changed = true;
										break;
									}
								}
							}
						}
					}
					availableModulesToBeMerged.length = 0;
					if (!changed) continue;

					// 2. Reconsider skipped items
					for (const queueItem of info.skippedItems) {
						queue.push(queueItem);
					}
					info.skippedItems.length = 0;
				}
				outdatedChunkGroupInfo.clear();
				logger.timeEnd("visitModules: merging available modules");
			}
		}

		// Run queueDelayed when all items of the queue are processed
		// This is important to get the global indicing correct
		// Async blocks should be processed after all sync blocks are processed
		if (queue.length === 0) {
			const tempQueue = queue;
			queue = queueDelayed.reverse();
			queueDelayed = tempQueue;
		}
	}
};

/**
 *
 * @param {Compilation} compilation the compilation
 * @param {Set<DependenciesBlock>} blocksWithNestedBlocks flag for blocks that have nested blocks
 * @param {Map<ChunkGroup, ChunkGroupDep[]>} chunkDependencies dependencies for chunk groups
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 */
const connectChunkGroups = (
	compilation,
	blocksWithNestedBlocks,
	chunkDependencies,
	chunkGroupInfoMap
) => {
	const { chunkGraph } = compilation;

	/** @type {Set<Module>} */
	let resultingAvailableModules;

	/**
	 * Helper function to check if all modules of a chunk are available
	 *
	 * @param {ChunkGroup} chunkGroup the chunkGroup to scan
	 * @param {Set<Module>} availableModules the comparitor set
	 * @returns {boolean} return true if all modules of a chunk are available
	 */
	const areModulesAvailable = (chunkGroup, availableModules) => {
		for (const chunk of chunkGroup.chunks) {
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				if (!availableModules.has(module)) return false;
			}
		}
		return true;
	};

	// For each edge in the basic chunk graph
	/**
	 * @param {ChunkGroupDep} dep the dependency used for filtering
	 * @returns {boolean} used to filter "edges" (aka Dependencies) that were pointing
	 * to modules that are already available. Also filters circular dependencies in the chunks graph
	 */
	const filterFn = dep => {
		const depChunkGroup = dep.chunkGroup;
		// TODO is this needed?
		if (blocksWithNestedBlocks.has(dep.block)) return true;
		if (areModulesAvailable(depChunkGroup, resultingAvailableModules)) {
			return false; // break all modules are already available
		}
		return true;
	};

	// For all deps, check if chunk groups need to be connected
	for (const [chunkGroup, deps] of chunkDependencies) {
		if (deps.length === 0) continue;

		// 1. Get info from chunk group info map
		const info = chunkGroupInfoMap.get(chunkGroup);
		resultingAvailableModules = info.resultingAvailableModules;

		// 2. Foreach edge
		for (let i = 0; i < deps.length; i++) {
			const dep = deps[i];

			// Filter inline, rather than creating a new array from `.filter()`
			// TODO check if inlining filterFn makes sense here
			if (!filterFn(dep)) {
				continue;
			}
			const depChunkGroup = dep.chunkGroup;
			const depBlock = dep.block;

			// 5. Connect block with chunk
			chunkGraph.connectBlockAndChunkGroup(depBlock, depChunkGroup);

			// 6. Connect chunk with parent
			connectChunkGroupParentAndChild(chunkGroup, depChunkGroup);
		}
	}
};

/**
 * Remove all unconnected chunk groups
 * @param {Compilation} compilation the compilation
 * @param {Iterable<ChunkGroup>} allCreatedChunkGroups all chunk groups that where created before
 */
const cleanupUnconnectedGroups = (compilation, allCreatedChunkGroups) => {
	const { chunkGraph } = compilation;

	for (const chunkGroup of allCreatedChunkGroups) {
		if (chunkGroup.getNumberOfParents() === 0) {
			for (const chunk of chunkGroup.chunks) {
				compilation.chunks.delete(chunk);
				chunkGraph.disconnectChunk(chunk);
			}
			chunkGraph.disconnectChunkGroup(chunkGroup);
			chunkGroup.remove();
		}
	}
};

/**
 * This method creates the Chunk graph from the Module graph
 * @param {Compilation} compilation the compilation
 * @param {Entrypoint[]} inputChunkGroups chunk groups which are processed
 * @returns {void}
 */
const buildChunkGraph = (compilation, inputChunkGroups) => {
	const logger = compilation.getLogger("webpack.buildChunkGraph");

	// SHARED STATE

	/** @type {Map<ChunkGroup, ChunkGroupDep[]>} */
	const chunkDependencies = new Map();

	/** @type {Set<ChunkGroup>} */
	const allCreatedChunkGroups = new Set();

	/** @type {Map<ChunkGroup, ChunkGroupInfo>} */
	const chunkGroupInfoMap = new Map();

	/** @type {Set<DependenciesBlock>} */
	const blocksWithNestedBlocks = new Set();

	// PART ONE

	visitModules(
		logger,
		compilation,
		inputChunkGroups,
		chunkGroupInfoMap,
		chunkDependencies,
		blocksWithNestedBlocks,
		allCreatedChunkGroups
	);

	// PART TWO

	logger.time("connectChunkGroups");
	connectChunkGroups(
		compilation,
		blocksWithNestedBlocks,
		chunkDependencies,
		chunkGroupInfoMap
	);
	logger.timeEnd("connectChunkGroups");

	// Cleaup work

	logger.time("cleanup");
	cleanupUnconnectedGroups(compilation, allCreatedChunkGroups);
	logger.timeEnd("cleanup");
};

module.exports = buildChunkGraph;
