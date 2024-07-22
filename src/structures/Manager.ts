import { LoadType, Plugin, Structure, TrackData, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, TrackUtils, VoicePacket, VoiceServer, WebSocketClosedEvent } from "./Utils";
import { Collection } from "@discordjs/collection";
import { EventEmitter } from "events";
import { Node, NodeOptions } from "./Node";
import { Player, PlayerOptions, Track, UnresolvedTrack } from "./Player";
import { version, VoiceState } from "..";
import ManagerCheck from "../utils/ManagerCheck";
import { Database } from "../utils/Database";

/**
 * The list of keys that are required in all events.
 */
export const REQUIRED_KEYS = ["event", "guild_id", "op", "sessionId"];

/**
 * The list of keys that are required in all events.
 * This is used to validate the payload of all events.
 */
export const REQUIRED_PAYLOAD_KEYS = REQUIRED_KEYS;

/**
 * The interface for the Manager class.
 *
 * This interface defines the methods and properties that are used to interact with the Manager class.
 *
 * @interface Manager
 */
export interface Manager {
	/**
	 * Adds an event listener for the "nodeCreate" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeCreate", listener: (node: Node) => void): this;

	/**
	 * Adds an event listener for the "nodeDestroy" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeDestroy", listener: (node: Node) => void): this;

	/**
	 * Adds an event listener for the "nodeConnect" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeConnect", listener: (node: Node) => void): this;

	/**
	 * Adds an event listener for the "nodeReconnect" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeReconnect", listener: (node: Node) => void): this;

	/**
	 * Adds an event listener for the "nodeDisconnect" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node, reason: { code?: number; reason?: string }) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeDisconnect", listener: (node: Node, reason: { code?: number; reason?: string }) => void): this;

	/**
	 * Adds an event listener for the "nodeError" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(node: Node, error: Error) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeError", listener: (node: Node, error: Error) => void): this;

	/**
	 * Adds an event listener for the "nodeRaw" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(payload: unknown) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "nodeRaw", listener: (payload: unknown) => void): this;

	/**
	 * Adds an event listener for the "playerCreate" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "playerCreate", listener: (player: Player) => void): this;

	/**
	 * Adds an event listener for the "playerDestroy" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "playerDestroy", listener: (player: Player) => void): this;

	/**
	 * Adds an event listener for the "queueEnd" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, track: Track | UnresolvedTrack, payload: TrackEndEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "queueEnd", listener: (player: Player, track: Track | UnresolvedTrack, payload: TrackEndEvent) => void): this;

	/**
	 * Adds an event listener for the "playerMove" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, initChannel: string, newChannel: string) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "playerMove", listener: (player: Player, initChannel: string, newChannel: string) => void): this;

	/**
	 * Adds an event listener for the "playerDisconnect" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, oldChannel: string) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "playerDisconnect", listener: (player: Player, oldChannel: string) => void): this;

	/**
	 * Adds an event listener for the "trackStart" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, track: Track, payload: TrackStartEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "trackStart", listener: (player: Player, track: Track, payload: TrackStartEvent) => void): this;

	/**
	 * Adds an event listener for the "trackEnd" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, track: Track, payload: TrackEndEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "trackEnd", listener: (player: Player, track: Track, payload: TrackEndEvent) => void): this;

	/**
	 * Adds an event listener for the "trackStuck" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, track: Track, payload: TrackStuckEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "trackStuck", listener: (player: Player, track: Track, payload: TrackStuckEvent) => void): this;

	/**
	 * Adds an event listener for the "trackError" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "trackError", listener: (player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent) => void): this;

	/**
	 * Adds an event listener for the "socketClosed" event.
	 *
	 * @param {string} event - The name of the event.
	 * @param {(player: Player, payload: WebSocketClosedEvent) => void} listener - The function to be called when the event is emitted.
	 * @return {this} The Manager instance.
	 */
	on(event: "socketClosed", listener: (player: Player, payload: WebSocketClosedEvent) => void): this;
}

/**
 * Represents the manager of the Lavalink client.
 */
export class Manager extends EventEmitter {
	/**
	 * The default sources for the search platforms.
	 */
	public static readonly DEFAULT_SOURCES: Record<SearchPlatform, string> = {
		"youtube music": "ytmsearch",
		youtube: "ytsearch",
		soundcloud: "scsearch",
		deezer: "dzsearch",
	};

	/**
	 * The collection of players.
	 */
	public readonly players: Collection<string, Player> = new Collection<string, Player>();

	/**
	 * The collection of nodes.
	 */
	public readonly nodes: Collection<string, Node> = new Collection<string, Node>();

	/**
	 * The options of the manager.
	 */
	public readonly options: ManagerOptions;

	/**
	 * Datastore instance
	 */
	public db: Database = null;

	/**
	 * Indicates whether the manager is initiated or not.
	 */
	private initiated: boolean = false;

	/**
	 * Returns the nodes with the least playing players.
	 *
	 * @return {Collection<string, Node>} The collection of nodes.
	 */
	public get leastUsedNodes(): Collection<string, Node> {
		return this.nodes.filter((node) => node.connected).sort((a, b) => a.stats.playingPlayers - b.stats.playingPlayers);
	}

	/**
	 * Returns the nodes with the least load.
	 *
	 * @return {Collection<string, Node>} The collection of nodes.
	 */
	public get leastLoadNodes(): Collection<string, Node> {
		return this.nodes
			.filter((node) => node.connected)
			.sort((a, b) => {
				const aload = a.stats.cpu ? (a.stats.cpu.lavalinkLoad / a.stats.cpu.cores) * 100 : 0;
				const bload = b.stats.cpu ? (b.stats.cpu.lavalinkLoad / b.stats.cpu.cores) * 100 : 0;
				return aload - bload;
			});
	}

	/**
	 * Constructs a new Manager instance.
	 *
	 * @param {ManagerOptions} options - The options of the manager.
	 */
	constructor(options: ManagerOptions) {
		super();

		ManagerCheck(options);

		Structure.get("Player").init(this);
		Structure.get("Node").init(this);
		TrackUtils.init(this);

		if (options.trackPartial) {
			TrackUtils.setTrackPartial(options.trackPartial);
			delete options.trackPartial;
		}

		this.options = {
			plugins: [],
			nodes: [],
			autoPlay: true,
			clientName: `Sakulink/${version} (https://github.com/JirayuSrisawat-Github/sakulink)`,
			defaultSearchPlatform: "youtube music",
			autoMove: true,
			autoResume: true,
			...options,
		};

		if (this.options.plugins) {
			for (const [index, plugin] of this.options.plugins.entries()) {
				if (!(plugin instanceof Plugin)) throw new RangeError(`Plugin at index ${index} does not extend Plugin.`);
				plugin.load(this);
			}
		}

		if (this.options.nodes) {
			for (const nodeOptions of this.options.nodes) new (Structure.get("Node"))(nodeOptions);
		}
	}

	/**
	 * Initiates the manager.
	 *
	 * @param {string} [clientId] - The client ID.
	 * @return {this} The manager instance.
	 */
	public init(clientId?: string): this {
		if (this.initiated) return this;

		if (typeof clientId !== "undefined") this.options.clientId = clientId;

		if (typeof this.options.clientId !== "string") throw new Error('"clientId" set is not type of "string"');

		if (!this.options.clientId) throw new Error('"clientId" is not set. Pass it in Manager#init() or as a option in the constructor.');

		this.db = new Database(this.options.clientId);

		for (const node of this.nodes.values()) {
			try {
				node.connect();
			} catch (err) {
				this.emit("nodeError", node, err);
			}
		}

		this.initiated = true;
		return this;
	}

	/**
	 * Searches for tracks based on the given query.
	 *
	 * @param {string | SearchQuery} query - The search query.
	 * @param {unknown} [requester] - The requester of the search.
	 * @return {Promise<SearchResult>} A promise that resolves to the search result.
	 * @throws {Error} If no available nodes are found.
	 */
	public async search(query: string | SearchQuery, requester?: unknown): Promise<SearchResult> {
		// Get the first available node with search enabled
		const node = this.nodes.filter((node) => node.connected && node.options.search).size > 0 ? this.nodes.filter((node) => node.connected && node.options.search).first() : this.leastLoadNodes.first();

		if (!node) throw new Error("No available nodes.");

		// Construct the search query
		const _query: SearchQuery = typeof query === "string" ? { query } : query;
		const _source = Manager.DEFAULT_SOURCES[_query.source ?? this.options.defaultSearchPlatform] ?? _query.source;

		let search = _query.query;

		// Prepend the search source to the query if it is not a URL
		if (!/^https?:\/\//.test(search)) search = `${_source}:${search}`;

		try {
			// Send a GET request to the node's REST API to search for tracks
			const res = (await node.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(search)}`)) as LavalinkResponse;

			if (!res) {
				throw new Error("Query not found.");
			}

			let searchData = [];
			let playlistData: PlaylistRawData | undefined;

			switch (res.loadType) {
				case "search":
					searchData = res.data as TrackData[];
					break;

				case "track":
					searchData = [res.data as TrackData[]];
					break;

				case "playlist":
					playlistData = res.data as PlaylistRawData;
					break;
			}

			// Build the tracks from the search data
			const tracks = searchData.map((track) => TrackUtils.build(track, requester));

			// Build the playlist from the playlist data
			const playlist =
				res.loadType === "playlist"
					? {
							name: playlistData!.info.name,
							tracks: playlistData!.tracks.map((track) => TrackUtils.build(track, requester)),
							duration: playlistData!.tracks.reduce((acc, cur) => acc + (cur.info.length || 0), 0),

							url: playlistData!.pluginInfo.url,
						}
					: null;

			// Construct the search result
			const result: SearchResult = {
				loadType: res.loadType,
				tracks: tracks || playlistData!.tracks.map((track) => TrackUtils.build(track, requester)),
				playlist,
			};

			return result;
		} catch (err) {
			throw new Error(err);
		}
	}

	/**
	 * Decodes multiple tracks.
	 *
	 * @param {string[]} tracks - The tracks to decode.
	 * @return {Promise<TrackData[]>} A promise that resolves to the decoded tracks.
	 * @throws {Error} If no available nodes are found.
	 */
	public decodeTracks(tracks: string[]): Promise<TrackData[]> {
		return new Promise(async (resolve, reject) => {
			// Get the first available node
			const node =
				this.nodes.filter((node) => node.connected && node.options.search).size > 0 ? this.nodes.filter((node) => node.connected && node.options.search).first() : this.leastLoadNodes.first();

			if (!node) throw new Error("No available nodes.");

			// Send a POST request to the node's REST API to decode the tracks
			const res = (await node.rest.post("/v4/decodetracks", JSON.stringify(tracks)).catch((err) => reject(err))) as TrackData[];

			if (!res) {
				return reject(new Error("No data returned from query."));
			}

			return resolve(res);
		});
	}

	/**
	 * Decodes a single track.
	 *
	 * @param {string} track - The track to decode.
	 * @return {Promise<TrackData>} A promise that resolves to the decoded track.
	 * @throws {Error} If no available nodes are found.
	 */
	public async decodeTrack(track: string): Promise<TrackData> {
		const res = await this.decodeTracks([track]);
		return res[0];
	}

	/**
	 * Creates a new player for the given guild.
	 *
	 * @param {PlayerOptions} options - The player options.
	 * @return {Player} The created player.
	 */
	public create(options: PlayerOptions): Player {
		if (this.players.has(options.guild)) return this.players.get(options.guild);

		return new (Structure.get("Player"))(options);
	}

	/**
	 * Retrieves the player for the given guild.
	 *
	 * @param {string} guild - The guild ID.
	 * @return {Player | undefined} The player or undefined.
	 */
	public get(guild: string): Player | undefined {
		return this.players.get(guild);
	}

	/**
	 * Destroys the player for the given guild.
	 *
	 * @param {string} guild - The guild ID.
	 */
	public destroy(guild: string): void {
		this.players.delete(guild);
	}

	/**
	 * Creates a new node.
	 *
	 * @param {NodeOptions} options - The node options.
	 * @return {Node} The created node.
	 */
	public createNode(options: NodeOptions): Node {
		if (this.nodes.has(options.identifier || options.host)) {
			return this.nodes.get(options.identifier || options.host);
		}

		return new (Structure.get("Node"))(options);
	}

	/**
	 * Destroys the node with the given identifier.
	 *
	 * @param {string} identifier - The node identifier.
	 */
	public destroyNode(identifier: string): void {
		const node = this.nodes.get(identifier);
		if (!node) return;
		node.destroy();
		this.nodes.delete(identifier);
	}

	/**
	 * Updates the voice state for the given data.
	 *
	 * @param {VoicePacket | VoiceServer | VoiceState} data - The voice state data.
	 * @return {Promise<void>} A promise that resolves when the voice state is updated.
	 */
	public async updateVoiceState(data: VoicePacket | VoiceServer | VoiceState): Promise<void> {
		if ("t" in data && !["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(data.t)) return;
		const voiceState = "d" in data ? data.d : data;
		if (!voiceState || (!("token" in voiceState) && !("session_id" in voiceState))) return;

		const player = this.players.get(voiceState.guild_id);
		if (!player) return;

		if ("token" in voiceState) {
			player.voiceState.event = voiceState;

			await player.node.rest.updatePlayer({
				guildId: player.guild,
				data: {
					voice: {
						token: voiceState.token,
						endpoint: voiceState.endpoint,
						sessionId: player.voiceState.sessionId,
					},
				},
			});
		} else {
			if (voiceState.user_id !== this.options.clientId) return;

			if (voiceState.channel_id) {
				if (player.voiceChannel !== voiceState.channel_id) this.emit("playerMove", player, player.voiceChannel, voiceState.channel_id);

				player.voiceState.sessionId = voiceState.session_id;
				player.voiceChannel = voiceState.channel_id;
			} else {
				this.emit("playerDisconnect", player, player.voiceChannel);
				player.voiceChannel = null;
				player.voiceState = Object.assign({});
				player.destroy();
			}
		}
	}
}

/**
 * Payload object for the Lavalink API.
 */
export interface Payload {
	/**
	 * The operation code.
	 */
	op: number;
	/**
	 * The data payload.
	 */
	d: {
		/**
		 * The ID of the guild.
		 */
		guild_id: string;
		/**
		 * The ID of the channel.
		 */
		channel_id: string | null;
		/**
		 * Indicates if the user is muted.
		 */
		self_mute: boolean;
		/**
		 * Indicates if the user is deafened.
		 */
		self_deaf: boolean;
	};
}

/**
 * Options for the Manager.
 */
export interface ManagerOptions {
	/**
	 * The list of NodeOptions.
	 */
	nodes?: NodeOptions[];
	/**
	 * The ID of the client.
	 */
	clientId?: string;
	/**
	 * The name of the client.
	 */
	clientName?: string;
	/**
	 * The number of shards.
	 */
	shards?: number;
	/**
	 * The list of plugins.
	 */
	plugins?: Plugin[];
	/**
	 * Indicates if songs should automatically play.
	 */
	autoPlay?: boolean;
	/**
	 * The list of partial tracks.
	 */
	trackPartial?: string[];
	/**
	 * The default search platform.
	 */
	defaultSearchPlatform?: SearchPlatform;
	/**
	 * Move players to other node if node going down.
	 */
	autoMove?: boolean;
	/**
	 * Automatically resume players.
	 */
	autoResume?: boolean;
	/**
	 * The function to send payloads to the Lavalink server.
	 * @param id - The ID of the server.
	 * @param payload - The payload to send.
	 */
	send(id: string, payload: Payload): void;
}

/**
 * The available search platforms.
 */
export type SearchPlatform = "deezer" | "soundcloud" | "youtube music" | "youtube";

/**
 * The query for searching tracks.
 */
export interface SearchQuery {
	/**
	 * The source of the tracks.
	 */
	source?: SearchPlatform | string;
	/**
	 * The query to search for.
	 */
	query: string;
}

/**
 * The response from the Lavalink API.
 */
export interface LavalinkResponse {
	/**
	 * The load type of the data.
	 */
	loadType: LoadType;
	/**
	 * The data payload.
	 */
	data: TrackData[] | PlaylistRawData;
}

/**
 * The result of a search.
 */
export interface SearchResult {
	/**
	 * The load type of the data.
	 */
	loadType: LoadType;
	/**
	 * The list of tracks.
	 */
	tracks: Track[];
	/**
	 * The playlist data, if available.
	 */
	playlist?: PlaylistData;
}

/**
 * The raw data of a playlist.
 */
export interface PlaylistRawData {
	/**
	 * The information about the playlist.
	 */
	info: {
		/**
		 * The name of the playlist.
		 */
		name: string;
	};
	/**
	 * The plugin information.
	 */
	pluginInfo: {
		/**
		 * The URL of the plugin.
		 */
		url: string;
	};
	/**
	 * The list of tracks in the playlist.
	 */
	tracks: TrackData[];
}

/**
 * The data of a playlist.
 */
export interface PlaylistData {
	/**
	 * The name of the playlist.
	 */
	name: string;
	/**
	 * The total duration of the playlist.
	 */
	duration: number;
	/**
	 * The list of tracks in the playlist.
	 */
	tracks: Track[];
	/**
	 * The URL of the playlist.
	 */
	url: string;
}
