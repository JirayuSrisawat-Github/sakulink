import { Filters } from "./Filters";
import { Manager, SearchQuery, SearchResult } from "./Manager";
import { Node } from "./Node";
import { Queue } from "./Queue";
import { Sizes, State, Structure, TrackUtils, VoiceState } from "./Utils";
import _ from "lodash";
import playerCheck from "../utils/PlayerCheck";

/**
 * Represents a player for a guild.
 */
export class Player {
	/**
	 * The queue for the player.
	 */
	public readonly queue = new (Structure.get("Queue"))() as Queue;
	/**
	 * The filters for the player.
	 */
	public filters: Filters;
	/**
	 * Whether the player is in track repeat mode.
	 */
	public trackRepeat = false;
	/**
	 * Whether the player is in queue repeat mode.
	 */
	public queueRepeat = false;
	/**
	 * Whether the player is in dynamic repeat mode.
	 */
	public dynamicRepeat = false;
	/**
	 * The current position of the player.
	 */
	public position = 0;
	/**
	 * Whether the player is currently playing.
	 */
	public playing = false;
	/**
	 * Whether the player is currently paused.
	 */
	public paused = false;
	/**
	 * The current volume of the player.
	 */
	public volume: number;
	/**
	 * Whether the player is in autoplay mode.
	 */
	public isAutoplay: boolean = false;
	/**
	 * The node the player is connected to.
	 */
	public node: Node;
	/**
	 * The ID of the guild the player is connected to.
	 */
	public guild: string;
	/**
	 * The ID of the voice channel the player is connected to.
	 */
	public voiceChannel: string | null = null;
	/**
	 * The ID of the text channel the player is connected to.
	 */
	public textChannel: string | null = null;
	/**
	 * The now playing message for the player.
	 */
	public nowPlayingMessage?: NowPlayingMessage;
	/**
	 * The state of the player.
	 */
	public state: State = "DISCONNECTED";
	/**
	 * The equalizer bands for the player.
	 */
	public bands = new Array<number>(15).fill(0.0);
	/**
	 * The voice state of the player.
	 */
	public voiceState: VoiceState;
	/**
	 * The manager of the player.
	 */
	public manager: Manager;
	/**
	 * Custom data for the player.
	 */
	public readonly data: Record<string, unknown> = {};
	private static _manager: Manager;
	private dynamicLoopInterval: NodeJS.Timeout;

	/**
	 * Sets a custom data value for the player.
	 * @param key The key of the data.
	 * @param value The value of the data.
	 */
	public set(key: string, value: unknown): void {
		this.data[key] = value;
	}

	/**
	 * Gets a custom data value from the player.
	 * @param key The key of the data.
	 * @returns The value of the data.
	 */
	public get<T>(key: string): T {
		return this.data[key] as T;
	}

	/**
	 * Initializes the player with the manager.
	 * @param manager The manager to initialize with.
	 */
	public static init(manager: Manager): void {
		this._manager = manager as Manager;
	}

	/**
	 * Creates a new player instance.
	 * @param options The options for the player.
	 */
	constructor(public options: PlayerOptions) {
		if (!this.manager) this.manager = Structure.get("Player")._manager;
		if (!this.manager) throw new RangeError("Manager has not been initiated.");
		if (this.manager.players.has(options.guild)) return this.manager.players.get(options.guild);

		playerCheck(options);
		this.guild = options.guild;
		this.data = options.data ?? {};
		this.voiceState = Object.assign({
			op: "voiceUpdate",
			guild_id: options.guild,
		});
		if (options.voiceChannel) this.voiceChannel = options.voiceChannel;
		if (options.textChannel) this.textChannel = options.textChannel;
		const node = this.manager.nodes.get(options.node);
		this.node = node || this.manager.leastLoadNodes.filter((node) => node.options.playback).first();
		if (!this.node) throw new RangeError("No available nodes.");
		this.manager.players.set(options.guild, this);
		this.manager.emit("playerCreate", this);
		this.volume = options.volume ?? 80;
		this.filters = new Filters(this);
	}

	/**
	 * Searches for tracks using the specified query.
	 *
	 * @param {string | SearchQuery} query - The query to search for.
	 * @param {unknown} [requester] - The requester of the search.
	 * @returns {Promise<SearchResult>} - A promise that resolves with the search result.
	 */
	public search(query: string | SearchQuery, requester?: unknown): Promise<SearchResult> {
		return this.manager.search(query, requester);
	}

	/**
	 * Connects the player to the specified voice channel.
	 *
	 * @returns {this} - The current player instance.
	 * @throws {RangeError} - If no voice channel has been set.
	 */
	public connect(): this {
		if (!this.voiceChannel) throw new RangeError("No voice channel has been set.");
		this.state = "CONNECTING";

		this.manager.options.send(this.guild, {
			op: 4,
			d: {
				guild_id: this.guild,
				channel_id: this.voiceChannel,
				self_mute: this.options.selfMute || false,
				self_deaf: this.options.selfDeafen || false,
			},
		});

		this.state = "CONNECTED";
		return this;
	}

	/**
	 * Disconnects the player from the voice channel.
	 *
	 * @returns {this} - The current player instance.
	 */
	public disconnect(): this {
		if (this.voiceChannel === null) return this;
		this.state = "DISCONNECTING";

		this.manager.options.send(this.guild, {
			op: 4,
			d: {
				guild_id: this.guild,
				channel_id: null,
				self_mute: false,
				self_deaf: false,
			},
		});

		this.voiceChannel = null;
		this.state = "DISCONNECTED";
		return this;
	}

	/**
	 * Destroys the player and optionally disconnects it from the voice channel.
	 *
	 * @param {boolean} [disconnect=true] - Whether to disconnect the player from the voice channel.
	 * @returns {void}
	 */
	public destroy(disconnect: boolean = true): void {
		this.state = "DESTROYING";

		if (disconnect) this.disconnect();

		this.node.rest.destroyPlayer(this.guild);
		this.manager.emit("playerDestroy", this);
		this.manager.players.delete(this.guild);
		this.manager.db.delete(`players.${this.guild}`);
	}

	/**
	 * Sets the voice channel for the player.
	 *
	 * @param {string} channel - The ID of the voice channel.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} If the channel is not a non-empty string.
	 */
	public setVoiceChannel(channel: string): this {
		if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");

		this.voiceChannel = channel;
		this.connect();
		return this;
	}

	/**
	 * Sets the text channel for the player.
	 *
	 * @param {string} channel - The ID of the text channel.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} If the channel is not a non-empty string.
	 */
	public setTextChannel(channel: string): this {
		if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");

		this.textChannel = channel;
		return this;
	}

	/**
	 * Moves the player to a different node.
	 *
	 * @param {string} [node] - The ID of the node to move to.
	 * @returns {this} - The player instance.
	 */
	public async moveNode(node?: string): Promise<this> {
		node = node || this.manager.leastLoadNodes.first().options.identifier || this.manager.nodes.filter((n) => n.connected).first().options.identifier;
		if (!this.manager.nodes.has(node)) throw new RangeError("No nodes available.");
		if (this.node.options.identifier === node) return this;

		const destroyOldNode = async (node: Node) => {
			this.state = "MOVING";

			if (this.manager.nodes.get(node.options.identifier) && this.manager.nodes.get(node.options.identifier).connected) await node.rest.destroyPlayer(this.guild);

			setTimeout(() => (this.state = "CONNECTED"), 5000);
		};

		const currentNode = this.node;
		const destinationNode = this.manager.nodes.get(node);
		let position = this.position;

		if (currentNode.connected) {
			const fetchedPlayer: any = await currentNode.rest.get(`/${currentNode.options.version}/sessions/${currentNode.sessionId}/players/${this.guild}`);
			position = fetchedPlayer.track.info.position;
		}

		await destinationNode.rest.updatePlayer({
			guildId: this.guild,
			data: {
				encodedTrack: this.queue.current?.track,
				position: position,
				volume: this.volume,
				paused: this.paused,
				filters: {
					distortion: this.filters.distortion,
					equalizer: this.filters.equalizer,
					karaoke: this.filters.karaoke,
					rotation: this.filters.rotation,
					timescale: this.filters.timescale,
					vibrato: this.filters.vibrato,
					volume: this.filters.volume,
				},
			},
		});

		await destinationNode.rest.updatePlayer({
			guildId: this.guild,
			data: {
				voice: {
					token: this.voiceState.event.token,
					endpoint: this.voiceState.event.endpoint,
					sessionId: this!.voiceState?.sessionId!,
				},
			},
		});

		this.node = destinationNode;
		destroyOldNode(currentNode);

		return this;
	}

	/**
	 * Sets the message for the now playing message.
	 *
	 * @param {NowPlayingMessage} message - The message for the now playing message.
	 * @returns {NowPlayingMessage} - The set now playing message.
	 * @throws {TypeError} If the message is not provided.
	 */
	public setNowPlayingMessage(message: NowPlayingMessage): NowPlayingMessage {
		if (!message) {
			throw new TypeError("You must provide the message of the now playing message.");
		}
		return (this.nowPlayingMessage = message);
	}

	/**
	 * Play a track or an array of tracks.
	 * @param optionsOrTrack The options or the track.
	 * @param playOptions The play options.
	 */
	/**
	 * Play a track or an array of tracks.
	 *
	 * @param {PlayOptions | Track | UnresolvedTrack} optionsOrTrack - The options or the track.
	 * @param {PlayOptions} playOptions - The play options.
	 * @returns {Promise<void>} A promise that resolves when the track is played.
	 */
	public async play(optionsOrTrack?: PlayOptions | Track | UnresolvedTrack, playOptions?: PlayOptions): Promise<void> {
		// If a track is provided, set it as the current track in the queue.
		if (typeof optionsOrTrack !== "undefined" && TrackUtils.validate(optionsOrTrack)) {
			if (this.queue.current) this.queue.previous = this.queue.current;
			this.queue.current = optionsOrTrack as Track;
		}

		// Throw an error if there is no current track.
		if (!this.queue.current) throw new RangeError("No current track.");

		// Determine the final play options.
		const finalOptions = playOptions ? playOptions : ["startTime", "endTime", "noReplace"].every((v) => Object.keys(optionsOrTrack || {}).includes(v)) ? (optionsOrTrack as PlayOptions) : {};

		// Resolve the current track if it is an unresolved track.
		if (TrackUtils.isUnresolvedTrack(this.queue.current)) {
			try {
				this.queue.current = await TrackUtils.getClosestTrack(this.queue.current as UnresolvedTrack);
			} catch (error) {
				// Emit an error event and play the next track if there is one.
				this.manager.emit("trackError", this, this.queue.current, error);
				if (this.queue[0]) return this.play(this.queue[0]);
				return;
			}
		}

		// Update the player with the new track and play options.
		await this.node.rest.updatePlayer({
			guildId: this.guild,
			data: {
				encodedTrack: this.queue.current?.track,
				volume: this.volume,
				...finalOptions,
			},
		});

		// Update the player's state and volume.
		Object.assign(this, { position: 0, playing: true });
		this.save();
	}

	/**
	 * Set the volume of the player.
	 *
	 * @param {number} volume - The volume level.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} - If the volume is not a number.
	 */
	public setVolume(volume: number): this {
		if (isNaN(volume)) throw new TypeError("Volume must be a number.");

		// Update the player's volume and send a REST request to the Lavalink node.
		this.node.rest.updatePlayer({
			guildId: this.options.guild,
			data: {
				volume,
			},
		});

		// Update the player's volume property.
		this.volume = volume;

		return this;
	}

	/**
	 * Sets the autoplay state.
	 *
	 * @param {boolean} state - The autoplay state.
	 * @returns {this} - The player instance.
	 */
	public setAutoplay(state: boolean): this {
		if (typeof state !== "boolean") {
			throw new TypeError('state must be a "true" or "false".');
		}

		this.isAutoplay = state;

		return this;
	}

	/**
	 * Sets the track repeat mode.
	 *
	 * @param {boolean} repeat - Whether to repeat the track.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} - If the repeat argument is not a boolean.
	 */
	public setTrackRepeat(repeat: boolean): this {
		if (typeof repeat !== "boolean") throw new TypeError('Repeat can only be "true" or "false".');

		if (repeat) {
			this.trackRepeat = true;
			this.queueRepeat = false;
			this.dynamicRepeat = false;
		} else {
			this.trackRepeat = false;
			this.queueRepeat = false;
			this.dynamicRepeat = false;
		}

		return this;
	}

	/**
	 * Sets the queue repeat mode.
	 *
	 * @param {boolean} repeat - Whether to repeat the queue.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} - If the repeat argument is not a boolean.
	 */
	public setQueueRepeat(repeat: boolean): this {
		if (typeof repeat !== "boolean") throw new TypeError('Repeat can only be "true" or "false".');

		if (repeat) {
			this.trackRepeat = false;
			this.queueRepeat = true;
			this.dynamicRepeat = false;
		} else {
			this.trackRepeat = false;
			this.queueRepeat = false;
			this.dynamicRepeat = false;
		}

		return this;
	}

	/**
	 * Sets the dynamic repeat mode.
	 *
	 * @param {boolean} repeat - Whether to repeat the queue in a shuffled order.
	 * @param {number} ms - The interval in milliseconds to shuffle the queue.
	 * @returns {this} - The player instance.
	 * @throws {TypeError} - If the repeat argument is not a boolean.
	 * @throws {RangeError} - If the queue size is less than or equal to 1.
	 */
	public setDynamicRepeat(repeat: boolean, ms: number): this {
		if (typeof repeat !== "boolean") {
			throw new TypeError('Repeat can only be "true" or "false".');
		}

		if (this.queue.size <= 1) {
			throw new RangeError("The queue size must be greater than 1.");
		}

		if (repeat) {
			this.trackRepeat = false;
			this.queueRepeat = false;
			this.dynamicRepeat = true;

			this.dynamicLoopInterval = setInterval(() => {
				if (!this.dynamicRepeat) return;
				let shuffled = _.shuffle(this.queue);
				this.queue.clear();
				shuffled.forEach((track) => {
					this.queue.add(track);
				});
			}, ms);
		} else {
			clearInterval(this.dynamicLoopInterval);
			this.trackRepeat = false;
			this.queueRepeat = false;
			this.dynamicRepeat = false;
		}

		return this;
	}

	/**
	 * Restarts the current track.
	 * If the current track is not defined, it will play the next track in the queue.
	 */
	public restart(): void {
		if (!this.queue.current?.track) {
			if (this.queue.length) this.play();
			return;
		}

		this.node.rest.updatePlayer({
			guildId: this.guild,
			data: {
				position: 0, // Start from the beginning
				encodedTrack: this.queue.current?.track, // Use the current track
			},
		});
	}

	/**
	 * Stops the playback and optionally skip a certain amount of tracks.
	 *
	 * @param {number} amount - The number of tracks to skip. Default is 1.
	 * @throws {RangeError} - If the amount is greater than the queue length.
	 * @returns {this} - The player instance.
	 */
	public stop(amount?: number): this {
		if (typeof amount === "number" && amount > 1) {
			if (amount > this.queue.length) throw new RangeError("Cannot skip more than the queue length.");
			this.queue.splice(0, amount - 1);
		}

		this.node.rest.updatePlayer({
			guildId: this.guild,
			data: {
				encodedTrack: null, // Stop playing
			},
		});

		return this;
	}

	/**
	 * Pauses or resumes the playback.
	 *
	 * @param {boolean} pause - Whether to pause or resume the playback.
	 * @throws {RangeError} - If the pause argument is not a boolean.
	 * @throws {RangeError} - If the queue is empty.
	 * @returns {this} - The player instance.
	 */
	public pause(pause: boolean): this {
		if (typeof pause !== "boolean") throw new RangeError('Pause can only be "true" or "false".');

		if (this.paused === pause || !this.queue.totalSize) return this;

		this.playing = !pause;
		this.paused = pause;

		this.node.rest.updatePlayer({
			guildId: this.guild,
			data: {
				paused: pause,
			},
		});

		return this;
	}

	/**
	 * Plays the previous track in the queue.
	 *
	 * @returns {this} - The player instance.
	 */
	public previous(): this {
		this.queue.unshift(this.queue.previous);
		this.stop();

		return this;
	}

	/**
	 * Seeks to a specific position in the current track.
	 *
	 * @param {number} position - The position in milliseconds.
	 * @throws {RangeError} - If the position is not a number.
	 * @throws {RangeError} - If the position is out of range.
	 * @returns {this} - The player instance.
	 */
	public seek(position: number): this {
		if (!this.queue.current) return undefined;
		position = Number(position);

		if (isNaN(position)) {
			throw new RangeError("Position must be a number.");
		}

		if (position < 0 || position > this.queue.current.duration) position = Math.max(Math.min(position, this.queue.current.duration), 0);

		this.position = position;
		this.node.rest.updatePlayer({
			guildId: this.guild,
			data: {
				position: position,
			},
		});

		return this;
	}

	/**
	 * Saves the player data to the database.
	 */
	public save() {
		if (!this.manager.options.autoResume) return;

		this.manager.db.set(`players.${this.guild}`, {
			guild: this.guild,
			voiceChannel: this.voiceChannel,
			textChannel: this.textChannel,
			volume: this.volume,
			data: this.data,
			selfDeafen: this.options.selfDeafen,
			selfMute: this.options.selfMute,
			isAutoplay: this.isAutoplay,
			current: this.queue.current ? this.queue.current.track : null,
			queue: this.queue.map((track) => track.track),
		});
	}
}
/**
 * Options for creating a new player.
 */
export interface PlayerOptions {
	/**
	 * The guild ID of the player.
	 */
	guild: string;

	/**
	 * The ID of the text channel the player will send messages to.
	 */
	textChannel: string;

	/**
	 * The ID of the voice channel the player will join.
	 */
	voiceChannel?: string;

	/**
	 * The ID of the Lavalink node to use.
	 */
	node?: string;

	/**
	 * The initial volume of the player.
	 */
	volume?: number;

	/**
	 * Whether the player should self-mute.
	 */
	selfMute?: boolean;

	/**
	 * Whether the player should self-deafen.
	 */
	selfDeafen?: boolean;

	/**
	 * Additional data for the player.
	 */
	data?: { [k: string]: any };
}

/**
 * Represents a track.
 */
export interface Track {
	/**
	 * The track URL.
	 */
	track: string;

	/**
	 * The URL of the track's artwork.
	 */
	artworkUrl: string;

	/**
	 * The name of the source that the track was from.
	 */
	sourceName: string;

	/**
	 * The title of the track.
	 */
	title: string;

	/**
	 * The unique identifier of the track.
	 */
	identifier: string;

	/**
	 * The author of the track.
	 */
	author: string;

	/**
	 * The duration of the track in milliseconds.
	 */
	duration: number;

	/**
	 * Whether the track is seekable.
	 */
	isSeekable: boolean;

	/**
	 * Whether the track is a stream.
	 */
	isStream: boolean;

	/**
	 * The URI of the track.
	 */
	uri: string;

	/**
	 * The URL of the track's thumbnail.
	 */
	thumbnail: string | null;

	/**
	 * The user who requested the track.
	 */
	requester: unknown | null;

	/**
	 * Displays the track's thumbnail.
	 * @param {Sizes} size - The size of the thumbnail.
	 * @returns {string} The URL of the thumbnail.
	 */
	displayThumbnail(size?: Sizes): string;
}

/**
 * Represents an unresolved track.
 */
export interface UnresolvedTrack extends Partial<Track> {
	/**
	 * The title of the track.
	 */
	title: string;

	/**
	 * The author of the track.
	 */
	author?: string;

	/**
	 * The duration of the track in milliseconds.
	 */
	duration?: number;

	/**
	 * Resolves the track.
	 * @returns {Promise<void>}
	 */
	resolve(): Promise<void>;
}

/**
 * Options for playing a track.
 */
export interface PlayOptions {
	/**
	 * The time in milliseconds to start playing the track.
	 */
	startTime?: number;

	/**
	 * The time in milliseconds to stop playing the track.
	 */
	endTime?: number;

	/**
	 * Whether to replace the current track.
	 */
	noReplace?: boolean;
}

/**
 * Represents a band in an equalizer.
 */
export interface EqualizerBand {
	/**
	 * The band number.
	 */
	band: number;

	/**
	 * The gain of the band.
	 */
	gain: number;
}

/**
 * Represents a now playing message.
 */
export interface NowPlayingMessage {
	/**
	 * The ID of the channel the message was sent to.
	 */
	channelId: string;

	/**
	 * Whether the message was deleted.
	 */
	deleted?: boolean;

	/**
	 * Deletes the message.
	 * @returns {Promise<any>}
	 */
	delete(): Promise<any>;
}
