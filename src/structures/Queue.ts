import { Track, UnresolvedTrack } from "./Player";
import { TrackUtils } from "./Utils";

/**
 * Represents a queue of tracks.
 * @extends Array<Track | UnresolvedTrack>
 */
export class Queue extends Array<Track | UnresolvedTrack> {
	/**
	 * The current playing track.
	 * @type {Track | UnresolvedTrack | null}
	 */
	public current: Track | UnresolvedTrack | null = null;

	/**
	 * The previous playing track.
	 * @type {Track | UnresolvedTrack | null}
	 */
	public previous: Track | UnresolvedTrack | null = null;

	/**
	 * The total size of the queue, including the current track.
	 * @type {number}
	 * @readonly
	 */
	public get totalSize(): number {
		return this.length + (this.current ? 1 : 0);
	}

	/**
	 * Alias for totalSize.
	 * @type {number}
	 * @readonly
	 */
	public get size(): number {
		return this.totalSize;
	}

	/**
	 * The total duration of the queue.
	 * @type {number}
	 * @readonly
	 */
	public get duration(): number {
		const current = this.current?.duration ?? 0;
		return this.reduce((acc, cur) => acc + (cur.duration || 0), current);
	}

	/**
	 * Adds tracks to the queue.
	 * @param {(Track | UnresolvedTrack) | (Track | UnresolvedTrack)[]} track - The track(s) to add.
	 * @param {number} [offset] - The position to add the track(s).
	 * @throws {RangeError} If the track is not valid.
	 * @throws {RangeError} If the offset is not a number or is out of range.
	 */
	public add(track: (Track | UnresolvedTrack) | (Track | UnresolvedTrack)[], offset?: number): void {
		if (!TrackUtils.validate(track)) {
			throw new RangeError('Track must be a "Track" or "Track[]".');
		}

		if (!this.current) {
			if (Array.isArray(track)) {
				this.current = track.shift() || null;
				this.push(...track);
			} else {
				this.current = track;
			}
		} else {
			if (typeof offset !== "undefined" && typeof offset === "number") {
				if (isNaN(offset)) {
					throw new RangeError("Offset must be a number.");
				}

				if (offset < 0 || offset > this.length) {
					throw new RangeError(`Offset must be between 0 and ${this.length}.`);
				}

				if (Array.isArray(track)) {
					this.splice(offset, 0, ...track);
				} else {
					this.splice(offset, 0, track);
				}
			} else {
				if (Array.isArray(track)) {
					this.push(...track);
				} else {
					this.push(track);
				}
			}
		}
	}

	/**
	 * Removes tracks from the queue.
	 * @param {number} [position] - The position to remove the tracks.
	 * @param {number} [end] - The end position of the tracks to remove.
	 * @returns {(Track | UnresolvedTrack)[]} The removed tracks.
	 * @throws {RangeError} If the parameters are missing.
	 * @throws {RangeError} If the start or end values are invalid.
	 */
	public remove(position?: number): (Track | UnresolvedTrack)[];
	public remove(start: number, end: number): (Track | UnresolvedTrack)[];
	public remove(startOrPosition = 0, end?: number): (Track | UnresolvedTrack)[] {
		if (typeof end !== "undefined") {
			if (isNaN(Number(startOrPosition)) || isNaN(Number(end))) {
				throw new RangeError(`Missing "start" or "end" parameter.`);
			}

			if (startOrPosition >= end || startOrPosition >= this.length) {
				throw new RangeError("Invalid start or end values.");
			}

			return this.splice(startOrPosition, end - startOrPosition);
		}

		return this.splice(startOrPosition, 1);
	}

	/**
	 * Clears the queue.
	 */
	public clear(): void {
		this.splice(0);
	}

	/**
	 * Shuffles the queue.
	 */
	public shuffle(): void {
		for (let i = this.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this[i], this[j]] = [this[j], this[i]];
		}
	}
}
