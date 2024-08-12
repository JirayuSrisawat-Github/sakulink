import { Node } from "../Node";
import axios, { AxiosRequestConfig } from "axios";

/**
 * This class handles all the HTTP requests to the Lavalink node.
 */
export class V3RestHandler {
	/**
	 * The Lavalink node that created this instance.
	 */
	private node: Node;

	/**
	 * The session id of the Lavalink node.
	 */
	private sessionId: string;

	/**
	 * The password for the Lavalink node.
	 */
	private readonly password: string;

	/**
	 * The base URL of the Lavalink node.
	 */
	private readonly url: string;

	/**
	 * Constructs a new Rest instance.
	 * @param node - The Lavalink node that created this instance.
	 */
	constructor(node: Node) {
		this.node = node;
		this.url = `http${node.options.secure ? "s" : ""}://${node.options.host}:${node.options.port}`;
		this.sessionId = node.sessionId;
		this.password = node.options.password;
	}

	/**
	 * Sets the session id of the Lavalink node.
	 * @param sessionId - The new session id.
	 * @returns The new session id.
	 */
	public setSessionId(sessionId: string): string {
		this.sessionId = sessionId;
		return this.sessionId;
	}

	/**
	 * Gets all the players of the Lavalink node.
	 * @returns The response of the Lavalink node.
	 */
	public async getAllPlayers(): Promise<unknown> {
		return await this.get(`/v3/sessions/${this.sessionId}/players`);
	}

	/**
	 * Updates a player of the Lavalink node.
	 * @param options - The options to update the player.
	 * @returns The response of the Lavalink node.
	 */
	public async updatePlayer(options: {
		guildId: string;
		data: {
			encodedTrack?: string;
			identifier?: string;
			startTime?: number;
			endTime?: number;
			volume?: number;
			position?: number;
			paused?: boolean;
			filters?: object;
			voice?: {
				token: string;
				sessionId: string;
				endpoint: string;
			};
			noReplace?: boolean;
		};
	}): Promise<unknown> {
		return await this.patch(`/v3/sessions/${this.sessionId}/players/${options.guildId}?noReplace=false`, options.data);
	}

	/**
	 * Destroys a player of the Lavalink node.
	 * @param guildId - The id of the guild to destroy the player of.
	 * @returns The response of the Lavalink node.
	 */
	public async destroyPlayer(guildId: string): Promise<unknown> {
		return await this.delete(`/v3/sessions/${this.sessionId}/players/${guildId}`);
	}

	/**
	 * Makes a request to the Lavalink node.
	 * @param method - The method of the request.
	 * @param endpoint - The endpoint of the request.
	 * @param body - The body of the request.
	 * @returns The response of the Lavalink node.
	 */
	private async request(method: string, endpoint: string, body?: object | unknown): Promise<unknown> {
		try {
			const response = await axios({
				method,
				data: body,
				cache: false,
				url: this.url + endpoint,
				headers: {
					"Content-Type": "application/json",
					Authorization: this.password,
				},
			} as AxiosRequestConfig);

			return response.data;
		} catch (e) {
			if (e?.response?.status === 404) {
				this.node.destroy();
				this.node.manager.createNode(this.node.options).connect();
			}

			return null;
		}
	}

	/**
	 * Makes a GET request to the Lavalink node.
	 * @param endpoint - The endpoint of the request.
	 * @returns The response of the Lavalink node.
	 */
	public async get(endpoint: string): Promise<unknown> {
		return await this.request("GET", endpoint);
	}

	/**
	 * Makes a PATCH request to the Lavalink node.
	 * @param endpoint - The endpoint of the request.
	 * @param body - The body of the request.
	 * @returns The response of the Lavalink node.
	 */
	public async patch(endpoint: string, body: unknown): Promise<unknown> {
		return await this.request("PATCH", endpoint, body);
	}

	/**
	 * Makes a POST request to the Lavalink node.
	 * @param endpoint - The endpoint of the request.
	 * @param body - The body of the request.
	 * @returns The response of the Lavalink node.
	 */
	public async post(endpoint: string, body: unknown): Promise<unknown> {
		return await this.request("POST", endpoint, body);
	}

	/**
	 * Makes a DELETE request to the Lavalink node.
	 * @param endpoint - The endpoint of the request.
	 * @returns The response of the Lavalink node.
	 */
	public async delete(endpoint: string): Promise<unknown> {
		return await this.request("DELETE", endpoint);
	}
}
