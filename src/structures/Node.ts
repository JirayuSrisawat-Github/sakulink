/* eslint-disable no-case-declarations */
import { PlayerEvent, PlayerEvents, Structure, TrackData, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, TrackUtils, WebSocketClosedEvent } from "./Utils";
import { Manager } from "./Manager";
import { Player, Track, UnresolvedTrack } from "./Player";
import { Rest } from "./Rest";
import NodeCheck from "../utils/NodeCheck";
import WebSocket from "ws";

/**
 * Represents a Lavalink node.
 */
export class Node {
	/**
	 * The REST client for the node.
	 */
	public readonly rest: Rest;

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
			playable: true,
			resumeStatus: true,
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
		this.rest = new Rest(this);
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

		const sessionId = this.manager.db.get(`sessionId.${this.options.identifier ?? this.options.host.replace(/\./g, "-")}`);

		if (this.options.resumeStatus && sessionId) headers["Session-Id"] = sessionId;

		// Create a new WebSocket connection
		this.socket = new WebSocket(`ws${this.options.secure ? "s" : ""}://${this.address}/v4/websocket`, { headers });

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
				// Set the session ID and resume the session if necessary
				this.rest.setSessionId(payload.sessionId);
				this.sessionId = payload.sessionId;
				this.manager.db.set(`sessionId.${this.options.identifier ?? this.options.host.replace(/\./g, "-")}`, this.sessionId);

				if (!this.options.resumeStatus) return;
				this.rest.patch(`/v4/sessions/${this.sessionId}`, {
					resuming: this.options.resumeStatus,
					timeout: this.options.resumeTimeout,
				});

				const resumedPlayers = <any[]>await this.rest.getAllPlayers();
				for (const resumedPlayer of resumedPlayers) {
					const previousInfosPlayer: any = this.manager.db.get(`players.${resumedPlayer.guildId}`) || {};
					const player = this.manager.create({
						guild: previousInfosPlayer.guild,
						voiceChannel: previousInfosPlayer.voiceChannel,
						textChannel: previousInfosPlayer.textChannel,
						volume: previousInfosPlayer.volume,
						selfDeafen: previousInfosPlayer.selfDeafen,
						selfMute: previousInfosPlayer.selfMute,
						data: {},
					});

					if (player.state !== "CONNECTED") player.connect();

					const track = await this.manager.decodeTrack(previousInfosPlayer.current.track);
					player.queue.add(TrackUtils.build(track));

					if (!player.playing) await player.play();
					player.seek(resumedPlayer.state.position);

					previousInfosPlayer.queue.map(async (queue: TrackData) => player.queue.add(TrackUtils.build(queue)));
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
	protected trackEnd(player: Player, track: Track, payload: TrackEndEvent): void {
		if (player.state === "MOVING") return;

		if (["loadFailed", "cleanup"].includes(payload.reason)) {
			player.queue.previous = player.queue.current;
			player.queue.current = player.queue.shift();

			if (!player.queue.current) {
				this.queueEnd(player, track, payload);
				return;
			}

			this.manager.emit("trackEnd", player, track, payload);
			if (this.manager.options.autoPlay) player.play();
		} else if (payload.reason === "replaced") {
			this.manager.emit("trackEnd", player, track, payload);
			player.queue.previous = player.queue.current;
		} else if (track && (player.trackRepeat || player.queueRepeat)) {
			const { queue, trackRepeat, queueRepeat } = player;
			const { autoPlay } = this.manager.options;

			if (trackRepeat) queue.unshift(queue.current);
			else if (queueRepeat) queue.add(queue.current);

			queue.previous = queue.current;
			queue.current = queue.shift();

			this.manager.emit("trackEnd", player, track, payload);

			if (payload.reason === "stopped" && !(queue.current = queue.shift())) {
				this.queueEnd(player, track, payload);
				return;
			}

			if (autoPlay) player.play();
		}

		if (!player.queue.length) return this.queueEnd(player, track, payload);

		player.queue.previous = player.queue.current;
		player.queue.current = player.queue.shift();

		this.manager.emit("trackEnd", player, track, payload);
		if (this.manager.options.autoPlay) player.play();
	}

	/**
	 * Handles the queue end event.
	 * @param player - The player for the guild.
	 * @param track - The last track in the queue.
	 * @param payload - The payload of the event.
	 */
	protected queueEnd(player: Player, track: Track, payload: TrackEndEvent): void {
		player.queue.current = null;
		player.playing = false;
		this.manager.emit("queueEnd", player, track, payload);
	}

	/**
	 * Handles the track stuck event.
	 * @param player - The player for the guild.
	 * @param track - The track that got stuck.
	 * @param payload - The payload of the event.
	 */
	protected trackStuck(player: Player, track: Track, payload: TrackStuckEvent): void {
		player.destroy();
		this.manager.emit("trackStuck", player, track, payload);
	}

	/**
	 * Handles the track exception event.
	 * @param player - The player for the guild.
	 * @param track - The track that caused the exception.
	 * @param payload - The payload of the event.
	 */
	protected trackError(player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent): void {
		player.destroy();
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
	 * Whether to send resume status updates to the Node.
	 */
	resumeStatus?: boolean;

	/**
	 * The timeout for resuming sessions.
	 */
	resumeTimeout?: number;

	/**
	 * The timeout for WebSocket requests.
	 */
	requestTimeout?: number;

	/**
	 * Whether to enable the search functionality.
	 */
	search?: boolean;

	/**
	 * Whether to enable the playable check.
	 */
	playable?: boolean;
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
