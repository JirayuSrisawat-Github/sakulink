/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, @typescript-eslint/no-var-requires*/
import { Manager } from "./Manager";
import { Node, NodeStats } from "./Node";
import { Player, Track, UnresolvedTrack } from "./Player";
import { Queue } from "./Queue";

/**
 * Escapes a string for use in a regular expression.
 *
 * @param {string} str - The string to escape.
 * @return {string} The escaped string.
 */
const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Symbol for representing a track.
 */
export const TRACK_SYMBOL = Symbol("track");

/**
 * Symbol for representing an unresolved track.
 */
export const UNRESOLVED_TRACK_SYMBOL = Symbol("unresolved");

/**
 * An array of sizes for YouTube thumbnails.
 */
export const SIZES = [
  "0",
  "1",
  "2",
  "3",
  "default",
  "mqdefault",
  "hqdefault",
  "maxresdefault",
] as const;

/**
 * A class containing utility methods for working with tracks.
 */
export class TrackUtils {
  /**
   * A partial for the track data.
   * @type {string[] | null}
   */
  static trackPartial: string[] | null = null;

  /**
   * The manager instance.
   * @type {Manager}
   * @private
   */
  private static manager: Manager;

  /**
   * Initializes the TrackUtils with the given manager instance.
   * @param {Manager} manager - The manager instance.
   */
  public static init(manager: Manager): void {
    this.manager = manager;
  }

  /**
   * Sets the partial for the track data.
   * @param {string[]} partial - The partial for the track data.
   */
  static setTrackPartial(partial: string[]): void {
    if (
      !Array.isArray(partial) ||
      !partial.every((str) => typeof str === "string")
    )
      throw new Error(
        "Provided partial is not an array or not a string array."
      );
    if (!partial.includes("track")) partial.unshift("track");

    this.trackPartial = partial;
  }

  /**
   * Validates the given track or tracks.
   * @param {unknown} trackOrTracks - The track or tracks to validate.
   * @return {boolean} Whether the track or tracks are valid.
   */
  static validate(trackOrTracks: unknown): boolean {
    if (typeof trackOrTracks === "undefined")
      throw new RangeError("Provided argument must be present.");

    if (Array.isArray(trackOrTracks) && trackOrTracks.length) {
      for (const track of trackOrTracks) {
        if (!(track[TRACK_SYMBOL] || track[UNRESOLVED_TRACK_SYMBOL]))
          return false;
      }
      return true;
    }

    return (
      (trackOrTracks[TRACK_SYMBOL] ||
        trackOrTracks[UNRESOLVED_TRACK_SYMBOL]) === true
    );
  }

  /**
   * Checks if the given track is a Track.
   * @param {unknown} track - The track to check.
   * @return {boolean} Whether the track is a Track.
   */
  static isTrack(track: unknown): boolean {
    if (typeof track === "undefined")
      throw new RangeError("Provided argument must be present.");
    return track[TRACK_SYMBOL] === true;
  }

  /**
   * Checks if the given track is an UnresolvedTrack.
   * @param {unknown} track - The track to check.
   * @return {boolean} Whether the track is an UnresolvedTrack.
   */
  static isUnresolvedTrack(track: unknown): boolean {
    if (typeof track === "undefined")
      throw new RangeError("Provided argument must be present.");
    return track[UNRESOLVED_TRACK_SYMBOL] === true;
  }

  /**
   * Builds a Track object from a TrackData object.
   * @param data - The TrackData object.
   * @param requester - The requester of the track.
   * @return The built Track object.
   */
  static build(data: TrackData, requester?: unknown): Track {
    if (typeof data === "undefined")
      throw new RangeError("Argument 'data' must be present.");

    try {
      const track: Track = {
        track: data.encoded,
        title: data.info.title,
        identifier: data.info.identifier,
        author: data.info.author,
        duration: data.info.length,
        isSeekable: data.info.isSeekable,
        isStream: data.info.isStream,
        uri: data.info.uri,
        artworkUrl: data.info?.artworkUrl,
        sourceName: data.info?.sourceName,
        thumbnail: data.info.uri.includes("youtube")
          ? `https://img.youtube.com/vi/${data.info.identifier}/default.jpg`
          : null,
        displayThumbnail(size = "default"): string | null {
          const finalSize = SIZES.find((s) => s === size) ?? "default";
          return this.uri.includes("youtube")
            ? `https://img.youtube.com/vi/${data.info.identifier}/${finalSize}.jpg`
            : null;
        },
        requester,
      };

      /**
       * Returns the thumbnail of the track in the given size.
       * @param size - The size of the thumbnail.
       * @return The thumbnail of the track in the given size.
       */
      track.displayThumbnail = function (size = "default"): string | null {
        const finalSize = SIZES.find((s) => s === size) ?? "default";
        return this.uri.includes("youtube")
          ? `https://img.youtube.com/vi/${data.info.identifier}/${finalSize}.jpg`
          : null;
      }.bind(track);

      if (this.trackPartial) {
        for (const key of Object.keys(track)) {
          if (this.trackPartial.includes(key)) continue;
          delete track[key];
        }
      }

      Object.defineProperty(track, TRACK_SYMBOL, {
        configurable: true,
        value: true,
      });

      return track;
    } catch (error) {
      throw new RangeError(
        `Argument "data" is not a valid track: ${error.message}`
      );
    }
  }

  /**
   * Builds a UnresolvedTrack object from a query.
   * @param query - The query string or UnresolvedQuery object.
   * @param requester - The requester of the track.
   * @return The built UnresolvedTrack object.
   */
  static buildUnresolved(
    query: string | UnresolvedQuery,
    requester?: unknown
  ): UnresolvedTrack {
    if (typeof query === "undefined")
      throw new RangeError("Argument 'query' must be present.");

    let unresolvedTrack: Partial<UnresolvedTrack> = {
      requester,
      /**
       * Resolves the UnresolvedTrack into a Track.
       * @return A promise that resolves to void.
       */
      async resolve(): Promise<void> {
        const resolved = await TrackUtils.getClosestTrack(this);
        Object.getOwnPropertyNames(this).forEach((prop) => delete this[prop]);
        Object.assign(this, resolved);
      },
    };

    if (typeof query === "string") unresolvedTrack.title = query;
    else unresolvedTrack = { ...unresolvedTrack, ...query };

    Object.defineProperty(unresolvedTrack, UNRESOLVED_TRACK_SYMBOL, {
      configurable: true,
      value: true,
    });

    return unresolvedTrack as UnresolvedTrack;
  }

  /**
   * Resolves a UnresolvedTrack into a Track. The resolving order is as follows:
   * 1. The track is searched by the author and title.
   * 2. The track is searched by the author and topic title.
   * 3. The track is searched by the duration.
   * If none of the above works, the first track of the search result is returned.
   * @param unresolvedTrack - The UnresolvedTrack object to be resolved.
   * @return A promise that resolves to the resolved Track object.
   */
  static async getClosestTrack(
    unresolvedTrack: UnresolvedTrack
  ): Promise<Track> {
    if (!TrackUtils.manager)
      throw new RangeError("Manager has not been initiated.");

    if (!TrackUtils.isUnresolvedTrack(unresolvedTrack))
      throw new RangeError("Provided track is not a UnresolvedTrack.");

    const query = [unresolvedTrack.author, unresolvedTrack.title]
      .filter((str) => !!str)
      .join(" - ");

    const res = await TrackUtils.manager.search(
      query,
      unresolvedTrack.requester
    );

    // Check if the track is searched by the author and title
    if (unresolvedTrack.author) {
      const channelNames = [
        unresolvedTrack.author,
        `${unresolvedTrack.author} - Topic`,
      ];

      const originalAudio = res.tracks.find((track) => {
        return (
          channelNames.some((name) =>
            new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.author)
          ) ||
          new RegExp(`^${escapeRegExp(unresolvedTrack.title)}$`, "i").test(
            track.title
          )
        );
      });

      if (originalAudio) return originalAudio;
    }

    // Check if the track is searched by the duration
    if (unresolvedTrack.duration) {
      const sameDuration = res.tracks.find(
        (track) =>
          track.duration >= unresolvedTrack.duration - 1500 &&
          track.duration <= unresolvedTrack.duration + 1500
      );

      if (sameDuration) return sameDuration;
    }

    // If none of the above works, return the first track of the search result
    return res.tracks[0];
  }
}

/**
 * The Structure class provides methods to extend and retrieve structures.
 */
export abstract class Structure {
  /**
   * Extends a structure with the given name using the provided extender function.
   *
   * @param {K} name - The name of the structure to extend.
   * @param {(target: Extendable[K]) => T} extender - The extender function that extends the structure.
   * @returns {T} - The extended structure.
   * @throws {TypeError} - If the structure name is invalid.
   */
  public static extend<K extends keyof Extendable, T extends Extendable[K]>(
    name: K,
    extender: (target: Extendable[K]) => T
  ): T {
    if (!structures[name])
      throw new TypeError(`"${name}" is not a valid structure`);
    const extended = extender(structures[name]);
    structures[name] = extended;
    return extended;
  }

  /**
   * Retrieves the structure with the given name.
   *
   * @param {K} name - The name of the structure to retrieve.
   * @returns {Extendable[K]} - The retrieved structure.
   * @throws {TypeError} - If the structure name is invalid.
   */
  public static get<K extends keyof Extendable>(name: K): Extendable[K] {
    const structure = structures[name];
    if (!structure) throw new TypeError('"structure" must be provided.');
    return structure;
  }
}

/**
 * The Plugin class provides methods for loading and unloading plugins.
 */
export class Plugin {
  /**
   * Loads the plugin using the provided manager.
   *
   * @param {Manager} manager - The manager to load the plugin with.
   */
  public load(manager: Manager): void {}

  /**
   * Unloads the plugin using the provided manager.
   *
   * @param {Manager} manager - The manager to unload the plugin with.
   */
  public unload(manager: Manager): void {}
}

const structures = {
  /**
   * The Player structure.
   */
  Player: require("./Player").Player,

  /**
   * The Queue structure.
   */
  Queue: require("./Queue").Queue,

  /**
   * The Node structure.
   */
  Node: require("./Node").Node,
};

/**
 * The interface for an unresolved query.
 */
export interface UnresolvedQuery {
  /**
   * The title of the query.
   */
  title: string;

  /**
   * The author of the query (optional).
   */
  author?: string;

  /**
   * The duration of the query in milliseconds (optional).
   */
  duration?: number;
}

export type Sizes =
  /**
   * The size of the thumbnail, can be 0-3, "default", "mqdefault", "hqdefault", or "maxresdefault".
   */
  | "0"
  | "1"
  | "2"
  | "3"
  | "default"
  | "mqdefault"
  | "hqdefault"
  | "maxresdefault";

export type LoadType = "track" | "playlist" | "search" | "empty" | "error";

export type State =
  /**
   * The node is connected to Discord.
   */
  | "CONNECTED"
  /**
   * The node is connecting to Discord.
   */
  | "CONNECTING"
  /**
   * The node is disconnected from Discord.
   */
  | "DISCONNECTED"
  /**
   * The node is disconnecting from Discord.
   */
  | "DISCONNECTING"
  /**
   * The node is being destroyed.
   */
  | "DESTROYING"
  /**
   * The node is moving.
   */
  | "MOVING"
  ;

export type PlayerEvents =
  | TrackStartEvent
  | TrackEndEvent
  | TrackStuckEvent
  | TrackExceptionEvent
  | WebSocketClosedEvent;

export type PlayerEventType =
  | "TrackStartEvent"
  | "TrackEndEvent"
  | "TrackExceptionEvent"
  | "TrackStuckEvent"
  | "WebSocketClosedEvent";

export type TrackEndReason =
  /**
   * The track finished playing.
   */
  | "finished"
  /**
   * The track failed to load.
   */
  | "loadFailed"
  /**
   * The track was stopped.
   */
  | "stopped"
  /**
   * The track was replaced.
   */
  | "replaced"
  /**
   * The track was removed due to cleanup.
   */
  | "cleanup";

export type Severity = "common" | "suspicious" | "fault";

export interface TrackData {
  /**
   * The encoded track data.
   */
  encoded: string;
  /**
   * The track info.
   */
  info: TrackDataInfo;
  /**
   * The plugin info.
   */
  pluginInfo: object;
}

export interface TrackDataInfo {
  /**
   * The track identifier.
   */
  identifier: string;
  /**
   * Whether the track is seekable.
   */
  isSeekable: boolean;
  /**
   * The author of the track.
   */
  author: string;
  /**
   * The length of the track in milliseconds.
   */
  length: number;
  /**
   * Whether the track is a stream.
   */
  isStream: boolean;
  /**
   * The title of the track.
   */
  title: string;
  /**
   * The URI of the track.
   */
  uri?: string;
  /**
   * The artwork URL of the track.
   */
  artworkUrl?: string;
  /**
   * The source name of the track.
   */
  sourceName?: string;
}

export interface Extendable {
  Player: typeof Player;
  Queue: typeof Queue;
  Node: typeof Node;
}

export interface VoiceState {
  /**
   * The operation type.
   */
  op: "voiceUpdate";
  /**
   * The guild ID.
   */
  guildId: string;
  /**
   * The voice event.
   */
  event: VoiceServer;
  /**
   * The session ID.
   */
  sessionId?: string;
}

export interface VoiceServer {
  /**
   * The voice token.
   */
  token: string;
  /**
   * The guild ID.
   */
  guild_id: string;
  /**
   * The endpoint.
   */
  endpoint: string;
}

export interface VoiceState {
  /**
   * The guild ID.
   */
  guild_id: string;
  /**
   * The user ID.
   */
  user_id: string;
  /**
   * The session ID.
   */
  session_id: string;
  /**
   * The channel ID.
   */
  channel_id: string;
}

export interface VoicePacket {
  /**
   * The type of the packet.
   */
  t?: "VOICE_SERVER_UPDATE" | "VOICE_STATE_UPDATE";
  /**
   * The data of the packet.
   */
  d: VoiceState | VoiceServer;
}

export interface NodeMessage extends NodeStats {
  /**
   * The type of the message.
   */
  type: PlayerEventType;
  /**
   * The operation type.
   */
  op: "stats" | "playerUpdate" | "event";
  /**
   * The guild ID.
   */
  guildId: string;
}

export interface PlayerEvent {
  /**
   * The operation type.
   */
  op: "event";
  /**
   * The type of the event.
   */
  type: PlayerEventType;
  /**
   * The guild ID.
   */
  guildId: string;
}

export interface Exception {
  /**
   * The message of the exception.
   */
  message: string;
  /**
   * The severity of the exception.
   */
  severity: Severity;
  /**
   * The cause of the exception.
   */
  cause: string;
}

export interface TrackStartEvent extends PlayerEvent {
  /**
   * The type of the event.
   */
  type: "TrackStartEvent";
  /**
   * The track data.
   */
  track: TrackData;
}

export interface TrackEndEvent extends PlayerEvent {
  /**
   * The type of the event.
   */
  type: "TrackEndEvent";
  /**
   * The track data.
   */
  track: TrackData;
  /**
   * The reason for the track ending.
   */
  reason: TrackEndReason;
}

export interface TrackExceptionEvent extends PlayerEvent {
  /**
   * The exception data.
   */
  exception?: Exception;
  /**
   * The guild ID.
   */
  guildId: string;
  /**
   * The type of the event.
   */
  type: "TrackExceptionEvent";
}

export interface TrackStuckEvent extends PlayerEvent {
  /**
   * The type of the event.
   */
  type: "TrackStuckEvent";
  /**
   * The threshold time in milliseconds.
   */
  thresholdMs: number;
}

export interface WebSocketClosedEvent extends PlayerEvent {
  /**
   * The type of the event.
   */
  type: "WebSocketClosedEvent";
  /**
   * The close code.
   */
  code: number;
  /**
   * The reason for the close.
   */
  reason: string;
  /**
   * Whether the close was initiated by the remote.
   */
  byRemote: boolean;
}

export interface PlayerUpdate {
  /**
   * The operation type.
   */
  op: "playerUpdate";
  /**
   * The guild ID.
   */
  guildId: string;
  /**
   * The state of the player.
   */
  state: {
    /**
     * The current time in milliseconds.
     */
    time: number;
    /**
     * The current position in milliseconds.
     */
    position: number;
    /**
     * Whether the player is connected.
     */
    connected: boolean;
    /**
     * The ping of the player.
     */
    ping: number;
  };
}
