import { ManagerOptions } from "../structures/Manager";

/**
 * Checks if the provided ManagerOptions are valid.
 * Throws an error if any of the options are invalid.
 *
 * @param {ManagerOptions} options - The options to check.
 * @throws {TypeError} If any of the options are invalid.
 */
export default function ManagerCheck(options: ManagerOptions): void {
	// Check if options are provided
	if (!options) throw new TypeError("ManagerOptions must not be empty.");

	// Destructure options
	const { autoPlay, clientId, clientName, defaultSearchPlatform, nodes, plugins, send, shards, trackPartial } = options;

	// Check autoPlay option
	if (typeof autoPlay !== "undefined" && typeof autoPlay !== "boolean") {
		throw new TypeError('Manager option "autoPlay" must be a boolean.');
	}

	// Check clientId option
	if (typeof clientId !== "undefined" && !/^\d+$/.test(clientId)) {
		throw new TypeError('Manager option "clientId" must be a non-empty string.');
	}

	// Check clientName option
	if (typeof clientName !== "undefined" && typeof clientName !== "string") {
		throw new TypeError('Manager option "clientName" must be a string.');
	}

	// Check defaultSearchPlatform option
	if (typeof defaultSearchPlatform !== "undefined" && typeof defaultSearchPlatform !== "string") {
		throw new TypeError('Manager option "defaultSearchPlatform" must be a string.');
	}

	// Check nodes option
	if (typeof nodes !== "undefined" && !Array.isArray(nodes)) {
		throw new TypeError('Manager option "nodes" must be an array.');
	}

	// Check plugins option
	if (typeof plugins !== "undefined" && !Array.isArray(plugins)) {
		throw new TypeError('Manager option "plugins" must be a Plugin array.');
	}

	// Check send option
	if (typeof send !== "function") {
		throw new TypeError('Manager option "send" must be present and a function.');
	}

	// Check shards option
	if (typeof shards !== "undefined" && typeof shards !== "number") {
		throw new TypeError('Manager option "shards" must be a number.');
	}

	// Check trackPartial option
	if (typeof trackPartial !== "undefined" && !Array.isArray(trackPartial)) {
		throw new TypeError('Manager option "trackPartial" must be a string array.');
	}
}
