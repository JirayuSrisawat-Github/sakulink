/* eslint-disable no-case-declarations */
import { PlayerEvent, PlayerEvents, Structure, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, TrackUtils, WebSocketClosedEvent } from "./Utils";
import { Manager, SearchResult } from "./Manager";
import { Player, Track, UnresolvedTrack } from "./Player";
import NodeCheck from "../utils/NodeCheck";
import WebSocket from "ws";
import { V4RestHandler } from "./rest/V4RestHandler";
import { V3RestHandler } from "./rest/V3RestHandler";

/**
 * Represents a Lavalink node.
 */
export class Node {
	/**
	 * The REST client for the node.
	 */
	public readonly rest: V4RestHandler | V3RestHandler;

	/**
	 * The manager instance of the node.
	 */
	private static _manager: Manager;

	/**
	 * The WebSocket connection to the node.
	 */
	public socket: WebSocket | null = null;

	/**
	 * The number of calls made to the node.
	 */
	public calls = 0;

	/**
	 * The stats of the node.
	 */
	public stats: NodeStats;

	/**
	 * The manager instance.
	 */
	public manager: Manager;

	/**
	 * The session ID of the node.
	 */
	public sessionId: string | null;

	/**
	 * The timeout for reconnecting to the node.
	 */
	private reconnectTimeout?: NodeJS.Timeout;

	/**
	 * The number of reconnect attempts made to the node.
	 */
	private reconnectAttempts = 1;

	/**
	 * Indicates whether the node is connected.
	 */
	public get connected(): boolean {
		if (!this.socket) return false;
		return this.socket.readyState === WebSocket.OPEN;
	}

	/**
	 * The address of the node.
	 */
	public get address(): string {
		return `${this.options.host}:${this.options.port}`;
	}

	/**
	 * Initializes the manager instance for the node.
	 * @param manager The manager instance.
	 */
	public static init(manager: Manager): void {
		this._manager = manager;
	}

	/**
	 * Creates a new Node instance.
	 * @param options The options for the node.
	 */
	constructor(public options: NodeOptions) {
		if (!this.manager) this.manager = Structure.get("Node")._manager;
		if (!this.manager) throw new RangeError("Manager has not been initiated.");

		// Check if a node with the same identifier or host already exists
		if (this.manager.nodes.has(options.identifier || options.host)) return this.manager.nodes.get(options.identifier || options.host);

		// Validate the options
		NodeCheck(options);

		// Set default values for the options
		this.options = {
			port: 2333,
			password: "youshallnotpass",
			secure: false,
			retryAmount: Infinity,
			retryDelay: 50,
			search: true,
			playback: true,
			version: "v4",
			...options,
		};

		// Set the port to 443 if secure is true
		if (this.options.secure) this.options.port = 443;

		// Set the identifier to the host if it is not provided
		this.options.identifier = options.identifier || options.host;

		// Initialize the stats object
		this.stats = {
			players: 0,
			playingPlayers: 0,
			uptime: 0,
			memory: { free: 0, used: 0, allocated: 0, reservable: 0 },
			cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
			frameStats: { sent: 0, nulled: 0, deficit: 0 },
		};

		// Add the node to the manager's nodes collection and emit the nodeCreate event
		this.manager.nodes.set(this.options.identifier, this);
		this.manager.emit("nodeCreate", this);

		// Create a new REST client for the node
		if (this.options.version === "v4") this.rest = new V4RestHandler(this);
		else this.rest = new V3RestHandler(this);
	}

	/**
	 * Connects to the Lavalink node.
	 */
	public connect(): void {
		// If already connected, return
		if (this.connected) return;

		// Set up the headers for the WebSocket connection
		const headers = Object.assign({
			Authorization: this.options.password,
			"Num-Shards": String(this.manager.options.shards),
			"User-Id": this.manager.options.clientId,
			"Client-Name": this.manager.options.clientName,
		});

		// If resume status is enabled, set the session ID in the headers
		const sessionId = this.manager.db.get(`sessionId.${this.options.identifier ?? this.options.host.replace(/\./g, "-")}`);
		if (this.manager.options.autoResume && sessionId) headers["Session-Id"] = sessionId;

		// Create a new WebSocket connection
		this.socket = new WebSocket(`ws${this.options.secure ? "s" : ""}://${this.address}/${this.options.version}/websocket`, { headers });

		// Set up event listeners for the WebSocket connection
		this.socket.on("open", this.open.bind(this));
		this.socket.on("close", this.close.bind(this));
		this.socket.on("message", this.message.bind(this));
		this.socket.on("error", this.error.bind(this));
	}

	/**
	 * Destroys the Lavalink node.
	 */
	public destroy(): void {
		// If not connected, return
		if (!this.connected) return;

		// Get all players connected to this node
		const players = this.manager.players.filter((p) => p.node == this);

		// Destroy all players connected to this node
		if (players.size) players.forEach((p) => p.destroy());

		// Close the WebSocket connection
		this.socket?.close(1000, "destroy");

		// Remove all event listeners from the WebSocket connection
		this.socket?.removeAllListeners();

		// Set the WebSocket connection to null
		this.socket = null;

		// Reset the reconnect attempts
		this.reconnectAttempts = 1;

		// Clear the reconnect timeout
		clearTimeout(this.reconnectTimeout);

		// Emit events and remove the node from the manager's nodes collection
		this.manager.emit("nodeDestroy", this);
		this.manager.destroyNode(this.options.identifier);
	}

	/**
	 * Reconnects to the Lavalink node after a delay.
	 */
	private reconnect(): void {
		// Set a timeout to reconnect after the specified delay
		this.reconnectTimeout = setTimeout(() => {
			// If the maximum number of reconnect attempts has been reached, emit an error and destroy the node
			if (this.reconnectAttempts >= this.options.retryAmount) {
				const error = new Error(`Unable to connect after ${this.options.retryAmount} attempts.`);
				this.manager.emit("nodeError", this, error);
				return this.destroy();
			}

			// Remove all event listeners from the WebSocket connection
			this.socket?.removeAllListeners();

			// Set the WebSocket connection to null
			this.socket = null;

			// Emit an event and attempt to reconnect
			this.manager.emit("nodeReconnect", this);
			this.connect();

			// Increment the reconnect attempts
			this.reconnectAttempts++;
		}, this.options.retryDelay);
	}

	/**
	 * Event handler for the WebSocket "open" event.
	 */
	protected open(): void {
		// If a reconnect timeout is set, clear it
		if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

		// Emit an event
		this.manager.emit("nodeConnect", this);
	}

	/**
	 * Event handler for the WebSocket "close" event.
	 * @param code - The WebSocket close code.
	 * @param reason - The WebSocket close reason.
	 */
	protected close(code: number, reason: string): void {
		// Emit an event
		this.manager.emit("nodeDisconnect", this, { code, reason });

		// If the close code is not 1000 (normal closure) or the reason is not "destroy", attempt to reconnect
		if (code !== 1000 || reason !== "destroy") this.reconnect();

		// Move all players connected to this node to another node
		this.manager.players
			.filter((p) => p.node.options.identifier === this.options.identifier)
			.forEach((p) => {
				if (!this.manager.options.autoMove) return (p.playing = false);
				p.moveNode();
			});
	}

	/**
	 * Event handler for the WebSocket "error" event.
	 * @param error - The error that occurred.
	 */
	protected error(error: Error): void {
		// If no error occurred, return
		if (!error) return;

		// Emit an event
		this.manager.emit("nodeError", this, error);
	}
	/**
	 * Event handler for incoming WebSocket messages.
	 * @param d - The message data.
	 */
	protected async message(d: Buffer | string): Promise<void> {
		// Convert the data to a Buffer if necessary
		if (Array.isArray(d)) d = Buffer.concat(d);
		else if (d instanceof ArrayBuffer) d = Buffer.from(d);

		// Parse the payload
		const payload = JSON.parse(d.toString());

		// If the payload is missing an operation code, return
		if (!payload.op) return;

		// Emit the "nodeRaw" event
		this.manager.emit("nodeRaw", payload);

		switch (payload.op) {
			case "stats":
				// Update the Node's stats
				delete payload.op;
				this.stats = { ...payload } as unknown as NodeStats;
				break;
			case "playerUpdate":
				// Update the player's position
				const player = this.manager.players.get(payload.guildId);
				if (player) player.position = payload.state.position || 0;
				break;
			case "event":
				// Handle the event
				this.handleEvent(payload);
				break;
			case "ready":
				// Set the session ID
				this.rest.setSessionId(payload.sessionId);
				this.sessionId = payload.sessionId;

				// Store the session ID in the database
				const identifier = this.options.identifier ?? this.options.host.replace(/\./g, "-");
				this.manager.db.set(`sessionId.${identifier}`, this.sessionId);

				if (!this.manager.options.autoResume) return;

				// Resume the session
				await this.rest.patch(`/${this.options.version}/sessions/${this.sessionId}`, {
					resuming: true,
					timeout: 360,
				});

				// Get all players that were resumed
				const resumedPlayers = <any[]>await this.rest.getAllPlayers();

				// Resume each player
				for (const resumedPlayer of resumedPlayers) {
					// If the player is already active, skip it
					if (this.manager.players["get"](resumedPlayer.guildId)) return;

					// Get previous player information from the database
					const previousInfosPlayer: any = this.manager.db.get(`players.${resumedPlayer.guildId}`) || {};

					// If the previous player information is missing required data, delete it from the database and skip it
					if (!previousInfosPlayer.guild || !previousInfosPlayer.voiceChannel || !previousInfosPlayer.textChannel) {
						this.manager.db.delete(`players.${resumedPlayer.guildId}`);
						return;
					}

					// Create a new player with the previous player information
					const player = this.manager.create({
						guild: previousInfosPlayer.guild,
						voiceChannel: previousInfosPlayer.voiceChannel,
						textChannel: previousInfosPlayer.textChannel,
						volume: previousInfosPlayer.volume,
						selfDeafen: previousInfosPlayer.selfDeafen,
						selfMute: previousInfosPlayer.selfMute,
						data: previousInfosPlayer.data ?? {},
						node: this.options.identifier,
					});

					// If the player was not playing anything, skip it
					if (!previousInfosPlayer.current) return;

					// Set the player's state to resuming
					player.state = "RESUMING";

					// Decode the tracks that were previously in the player's queue
					let decoded = await this.manager.decodeTracks(previousInfosPlayer.queue.map((e: string) => e).concat(previousInfosPlayer.current));

					// Add the current track to the player's queue
					player.queue.add(TrackUtils.build(decoded.find((t) => t.encoded === previousInfosPlayer.current)));

					// Add the remaining tracks to the player's queue
					if (previousInfosPlayer.queue.length > 0) {
						player.queue.add(decoded.filter((t) => t.encoded !== previousInfosPlayer.current).map((trackData) => TrackUtils.build(trackData)));
					}

					// Set the player's filters to the resumed player's filters
					player.filters.distortion = resumedPlayer.filters.distortion;
					player.filters.equalizer = resumedPlayer.filters.equalizer;
					player.filters.karaoke = resumedPlayer.filters.karaoke;
					player.filters.rotation = resumedPlayer.filters.rotation;
					player.filters.timescale = resumedPlayer.filters.timescale;
					player.filters.vibrato = resumedPlayer.filters.vibrato;
					player.filters.volume = resumedPlayer.filters.volume;

					// Set the player's volume to the resumed player's volume
					player.volume = resumedPlayer.volume;

					// Set the player's position to the resumed player's position
					player.position = resumedPlayer.state.position;

					// Connect the player to the voice channel
					player.connect();

					// Update the player on the Lavalink node with the resumed player's information
					await player.node.rest.updatePlayer({
						guildId: player.guild,
						data: {
							encodedTrack: player.queue.current?.track,
							volume: player.volume,
							position: resumedPlayer.state.position,
							paused: player.paused,
							filters: {
								distortion: player.filters.distortion,
								equalizer: player.filters.equalizer,
								karaoke: player.filters.karaoke,
								rotation: player.filters.rotation,
								timescale: player.filters.timescale,
								vibrato: player.filters.vibrato,
								volume: player.filters.volume,
							},
						},
					});
				}
				break;
			default:
				// Emit an error if the payload has an unknown operation code
				this.manager.emit("nodeError", this, new Error(`Unexpected op "${payload.op}" with data: ${payload.message}`));
				return;
		}
	}

	/**
	 * Event handler for player events.
	 * @param payload - The event payload.
	 */
	protected handleEvent(payload: PlayerEvent & PlayerEvents): void {
		// If the guild ID is missing, return
		if (!payload.guildId) return;

		// Get the player for the guild
		const player = this.manager.players.get(payload.guildId);
		if (!player) return;

		const track = player.queue.current;
		const type = payload.type;
		switch (type) {
			case "TrackStartEvent":
				// Handle the track start event
				this.trackStart(player, track as Track, payload);
				break;
			case "TrackEndEvent":
				// Handle the track end event
				if (player?.nowPlayingMessage && !player?.nowPlayingMessage?.deleted) {
					player.nowPlayingMessage.delete().catch(() => {});
				}

				player.save();
				this.trackEnd(player, track as Track, payload);
				break;
			case "TrackStuckEvent":
				// Handle the track stuck event
				this.trackStuck(player, track as Track, payload);
				break;
			case "TrackExceptionEvent":
				// Handle the track exception event
				this.trackError(player, track, payload);
				break;
			case "WebSocketClosedEvent":
				// Handle the WebSocket closed event
				this.socketClosed(player, payload);
				break;
			default:
				// Emit an error if the event type is unknown
				const error = new Error(`Node#event unknown event '${type}'.`);
				this.manager.emit("nodeError", this, error);
				break;
		}
	}

	/**
	 * Handles the track start event.
	 * @param player - The player for the guild.
	 * @param track - The track that started.
	 * @param payload - The payload of the event.
	 */
	protected trackStart(player: Player, track: Track, payload: TrackStartEvent): void {
		player.playing = true;
		player.paused = false;
		this.manager.emit("trackStart", player, track, payload);
	}

	/**
	 * Handles the track end event.
	 * @param player - The player for the guild.
	 * @param track - The track that ended.
	 * @param payload - The payload of the event.
	 */
	protected trackEnd(player: Player, track: Track, payload: TrackEndEvent): Promise<void> {
		if (player.state === "MOVING" || player.state === "RESUMING") return;

		const { reason } = payload;

		if (["loadFailed", "cleanup"].includes(reason)) {
			player.queue.previous = player.queue.current;
			player.queue.current = player.queue.shift();

			if (!player.queue.current) {
				this.queueEnd(player, track, payload);
				return;
			}

			this.manager.emit("trackEnd", player, track, payload);
			if (this.manager.options.autoPlay) player.play();
		} else if (reason === "replaced") {
			this.manager.emit("trackEnd", player, track, payload);
			player.queue.previous = player.queue.current;
		} else if (track && (player.trackRepeat || player.queueRepeat)) {
			const { queue, trackRepeat, queueRepeat } = player;
			const { autoPlay } = this.manager.options;

			if (trackRepeat) {
				queue.unshift(queue.current);
			} else if (queueRepeat) {
				queue.add(queue.current);
			}

			queue.previous = queue.current;
			queue.current = queue.shift();

			this.manager.emit("trackEnd", player, track, payload);

			if (payload.reason === "stopped" && !(queue.current = queue.shift())) {
				this.queueEnd(player, track, payload);
				return;
			}

			if (autoPlay) player.play();
		} else if (player.queue.length) {
			player.queue.previous = player.queue.current;
			player.queue.current = player.queue.shift();

			this.manager.emit("trackEnd", player, track, payload);
			if (this.manager.options.autoPlay) player.play();
		} else this.queueEnd(player, track, payload);
	}

	/**
	 * Handles the queue end event.
	 * @param player - The player for the guild.
	 * @param track - The last track in the queue.
	 * @param payload - The payload of the event.
	 */
	protected async queueEnd(player: Player, track: Track, payload: TrackEndEvent): Promise<void> {
		player.queue.current = null;
		player.playing = player.isAutoplay;

		if (player.isAutoplay) return await this.handleAutoplay(player, track);

		this.manager.emit("queueEnd", player, track, payload);
	}

	/**
	 * Handles the track stuck event.
	 * @param player - The player for the guild.
	 * @param track - The track that got stuck.
	 * @param payload - The payload of the event.
	 */
	protected trackStuck(player: Player, track: Track, payload: TrackStuckEvent): void {
		this.manager.emit("trackStuck", player, track, payload);
	}

	/**
	 * Handles the track exception event.
	 * @param player - The player for the guild.
	 * @param track - The track that caused the exception.
	 * @param payload - The payload of the event.
	 */
	protected trackError(player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent): void {
		this.manager.emit("trackError", player, track, payload);
	}

	/**
	 * Handles the WebSocket closed event.
	 * @param player - The player for the guild.
	 * @param payload - The payload of the event.
	 */
	protected socketClosed(player: Player, payload: WebSocketClosedEvent): void {
		this.manager.emit("socketClosed", player, payload);
	}

	/**
	 * Handles autoplay for a given player by searching for a mix of the previous track and adding it to the player's queue.
	 * If the mix search fails, a default mix will be used.
	 *
	 * @param {Player} player - The player to handle autoplay for.
	 * @return {Promise<void>} A promise that resolves when the autoplay is handled.
	 */
	private async handleAutoplay(player: Player, track: Track | UnresolvedTrack): Promise<void> {
		const base = "https://www.youtube.com/watch?v=ArXS-FI3ADo";
		const getMixUrl = (identifier: string) => `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`;
		const findMix = async (): Promise<SearchResult> => {
			let mixUrl: string;
			let response: SearchResult;
			let base_response: SearchResult;

			const previousTrack = player.queue.previous || track;

			base_response = await player.search(
				{
					query: `${previousTrack.title} - ${previousTrack.author}`,
					source: "youtube",
				},
				previousTrack.requester
			);

			mixUrl = getMixUrl(previousTrack.sourceName! === "youtube" ? previousTrack.identifier! : base_response.tracks[0].identifier);

			response = await player.search(mixUrl, previousTrack.requester);

			if (response.loadType === "error" || response.loadType === "empty") {
				base_response = await player.search(base, previousTrack.requester);
				mixUrl = getMixUrl(base_response.tracks[0].identifier);
				response = await player.search(mixUrl, previousTrack.requester);
			}

			return response;
		};

		const response = await findMix();
		player.queue.add(response.playlist!.tracks.filter((t) => t.uri !== track.uri)[Math.floor(Math.random() * response.playlist!.tracks.length - 1)]);
		player.play();
	}
}

/**
 * The options for a Node.
 */
export interface NodeOptions {
	/**
	 * The host of the Node.
	 */
	host: string;

	/**
	 * The port of the Node.
	 */
	port?: number;

	/**
	 * The password of the Node.
	 */
	password?: string;

	/**
	 * Whether to use SSL for the WebSocket connection.
	 */
	secure?: boolean;

	/**
	 * The identifier of the Node.
	 */
	identifier?: string;

	/**
	 * The number of times to retry connecting to the Node.
	 */
	retryAmount?: number;

	/**
	 * The delay between retrying connections to the Node.
	 */
	retryDelay?: number;

	/**
	 * The timeout for WebSocket requests.
	 */
	requestTimeout?: number;

	/**
	 * Whether to enable the search functionality.
	 */
	search?: boolean;

	/**
	 * Whether to enable the playback.
	 */
	playback?: boolean;

	/**
	 * The version of the Node.
	 */
	version?: "v4" | "v3";
}

/**
 * The statistics of a Node.
 */
export interface NodeStats {
	/**
	 * The number of players on the Node.
	 */
	players: number;

	/**
	 * The number of playing players on the Node.
	 */
	playingPlayers: number;

	/**
	 * The uptime of the Node.
	 */
	uptime: number;

	/**
	 * The memory statistics of the Node.
	 */
	memory: MemoryStats;

	/**
	 * The CPU statistics of the Node.
	 */
	cpu: CPUStats;

	/**
	 * The frame statistics of the Node.
	 */
	frameStats: FrameStats;
}

/**
 * The memory statistics of a Node.
 */
export interface MemoryStats {
	/**
	 * The free memory of the Node.
	 */
	free: number;

	/**
	 * The used memory of the Node.
	 */
	used: number;

	/**
	 * The allocated memory of the Node.
	 */
	allocated: number;

	/**
	 * The reservable memory of the Node.
	 */
	reservable: number;
}

/**
 * The CPU statistics of a Node.
 */
export interface CPUStats {
	/**
	 * The number of CPU cores of the Node.
	 */
	cores: number;

	/**
	 * The system load of the Node.
	 */
	systemLoad: number;

	/**
	 * The Lavalink load of the Node.
	 */
	lavalinkLoad: number;
}

/**
 * The frame statistics of a Node.
 */
export interface FrameStats {
	/**
	 * The number of sent frames.
	 */
	sent?: number;

	/**
	 * The number of null frames.
	 */
	nulled?: number;

	/**
	 * The deficit of frames.
	 */
	deficit?: number;
}
