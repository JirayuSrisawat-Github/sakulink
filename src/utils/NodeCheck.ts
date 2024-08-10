import { NodeOptions } from "../structures/Node";

/**
 * Checks the validity of the given NodeOptions object.
 *
 * @param {NodeOptions} options - The NodeOptions object to check.
 *
 * @throws {TypeError} If the NodeOptions object is empty, or if any of the options are invalid.
 */
export default function nodeCheck(options: NodeOptions): void {
	// Check if the NodeOptions object is empty
	if (!options) {
		throw new TypeError("NodeOptions must not be empty.");
	}

	// Destructure the options object
	const { host, identifier, password, port, requestTimeout, retryAmount, retryDelay, secure, playback, search } = options;

	// Check the validity of the host option
	if (typeof host !== "string" || !/.+/.test(host)) {
		throw new TypeError('Node option "host" must be present and be a non-empty string.');
	}

	// Check the validity of the identifier option
	if (typeof identifier !== "undefined" && typeof identifier !== "string") {
		throw new TypeError('Node option "identifier" must be a non-empty string.');
	}

	// Check the validity of the password option
	if (typeof password !== "undefined" && (typeof password !== "string" || !/.+/.test(password))) {
		throw new TypeError('Node option "password" must be a non-empty string.');
	}

	// Check the validity of the port option
	if (typeof port !== "undefined" && typeof port !== "number") {
		throw new TypeError('Node option "port" must be a number.');
	}

	// Check the validity of the requestTimeout option
	if (typeof requestTimeout !== "undefined" && typeof requestTimeout !== "number") {
		throw new TypeError('Node option "requestTimeout" must be a number.');
	}

	// Check the validity of the retryAmount option
	if (typeof retryAmount !== "undefined" && typeof retryAmount !== "number") {
		throw new TypeError('Node option "retryAmount" must be a number.');
	}

	// Check the validity of the retryDelay option
	if (typeof retryDelay !== "undefined" && typeof retryDelay !== "number") {
		throw new TypeError('Node option "retryDelay" must be a number.');
	}

	// Check the validity of the secure option
	if (typeof secure !== "undefined" && typeof secure !== "boolean") {
		throw new TypeError('Node option "secure" must be a boolean.');
	}

	// Check the validity of the search option
	if (typeof search !== "undefined" && typeof search !== "boolean") {
		throw new TypeError('Node option "search" must be a boolean.');
	}

	// Check the validity of the playback option
	if (typeof playback !== "undefined" && typeof playback !== "boolean") {
		throw new TypeError('Node option "playback" must be a boolean.');
	}
}
