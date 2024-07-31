import { Band, bassBoostEqualizer, softEqualizer, trebleBassEqualizer, tvEqualizer, vaporwaveEqualizer } from "../utils/FiltersEqualizers";
import { Player } from "./Player";

/**
 * Class representing the filters to be applied to the audio.
 */
export class Filters {
	/**
	 * The distortion options to be applied to the audio.
	 */
	public distortion: distortionOptions | null;

	/**
	 * The equalizer bands to be applied to the audio.
	 */
	public equalizer: Band[];

	/**
	 * The karaoke options to be applied to the audio.
	 */
	public karaoke: karaokeOptions | null;

	/**
	 * The player associated with these filters.
	 */
	public player: Player;

	/**
	 * The rotation options to be applied to the audio.
	 */
	public rotation: rotationOptions | null;

	/**
	 * The timescale options to be applied to the audio.
	 */
	public timescale: timescaleOptions | null;

	/**
	 * The vibrato options to be applied to the audio.
	 */
	public vibrato: vibratoOptions | null;

	/**
	 * The volume of the audio.
	 */
	public volume: number;

	/**
	 * The status of the filters applied to the audio.
	 */
	private filterStatus: {
		[key: string]: boolean;
	};

	/**
	 * Constructs a new instance of the Filters class.
	 * @param player - The player associated with these filters.
	 */
	constructor(player: Player) {
		this.distortion = null;
		this.equalizer = [];
		this.karaoke = null;
		this.player = player;
		this.rotation = null;
		this.timescale = null;
		this.vibrato = null;
		this.volume = 1.0;

		// Initialize filter status
		/**
		 * The status of the filters applied to the audio.
		 */
		this.filterStatus = {
			bassboost: false, // Bass boost filter status
			distort: false, // Distort filter status
			eightD: false, // 8D filter status
			karaoke: false, // Karaoke filter status
			nightcore: false, // Nightcore filter status
			slowmo: false, // Slow motion filter status
			soft: false, // Soft filter status
			trebleBass: false, // Treble bass filter status
			tv: false, // TV filter status
			vaporwave: false, // Vaporwave filter status
		};
	}

	/**
	 * Updates the player's filters with the current filter properties.
	 * @returns The updated Filters instance.
	 */
	public async updateFilters(): Promise<this> {
		const { distortion, equalizer, karaoke, rotation, timescale, vibrato, volume } = this;

		await this.player.node.rest.updatePlayer({
			data: {
				filters: {
					distortion,
					equalizer,
					karaoke,
					rotation,
					timescale,
					vibrato,
					volume,
				},
			},
			guildId: this.player.guild,
		});

		return this;
	}

	/**
	 * Applies a filter to the player's filters.
	 * @param filter - The filter to apply.
	 * @param updateFilters - Whether to update the filters. Defaults to true.
	 * @returns The updated Filters instance.
	 */
	private applyFilter<T extends keyof Filters>(filter: { property: T; value: Filters[T] }, updateFilters: boolean = true): this {
		this[filter.property] = filter.value as this[T];
		if (updateFilters) {
			this.updateFilters();
		}
		return this;
	}

	/**
	 * Sets the status of a filter.
	 * @param filter - The filter to set the status of.
	 * @param status - The status to set.
	 * @returns The updated Filters instance.
	 */
	private setFilterStatus(filter: keyof availableFilters, status: boolean): this {
		this.filterStatus[filter] = status;
		return this;
	}

	/**
	 * Sets the equalizer bands.
	 * @param bands - The equalizer bands to set.
	 * @returns The updated Filters instance.
	 */
	public setEqualizer(bands?: Band[]): this {
		return this.applyFilter({ property: "equalizer", value: bands });
	}

	/**
	 * Applies the 8D audio effect.
	 * @returns The updated Filters instance.
	 */
	public eightD(): this {
		return this.setRotation({ rotationHz: 0.2 }).setFilterStatus("eightD", true);
	}

	/**
	 * Applies the bass boost audio effect.
	 * @returns The updated Filters instance.
	 */
	public bassBoost(): this {
		return this.setEqualizer(bassBoostEqualizer).setFilterStatus("bassboost", true);
	}

	/**
	 * Applies the nightcore audio effect.
	 * @returns The updated Filters instance.
	 */
	public nightcore(): this {
		return this.setTimescale({
			speed: 1.1,
			pitch: 1.125,
			rate: 1.05,
		}).setFilterStatus("nightcore", true);
	}

	/**
	 * Applies the slow motion audio effect.
	 * @returns The updated Filters instance.
	 */
	public slowmo(): this {
		return this.setTimescale({
			speed: 0.7,
			pitch: 1.0,
			rate: 0.8,
		}).setFilterStatus("slowmo", true);
	}

	/**
	 * Applies the soft audio effect.
	 * @returns The updated Filters instance.
	 */
	public soft(): this {
		return this.setEqualizer(softEqualizer).setFilterStatus("soft", true);
	}

	/**
	 * Applies the TV audio effect.
	 * @returns The updated Filters instance.
	 */
	public tv(): this {
		return this.setEqualizer(tvEqualizer).setFilterStatus("tv", true);
	}

	/**
	 * Applies the treble bass audio effect.
	 * @returns The updated Filters instance.
	 */
	public trebleBass(): this {
		return this.setEqualizer(trebleBassEqualizer).setFilterStatus("trebleBass", true);
	}

	/**
	 * Applies the vaporwave audio effect.
	 * @returns The updated Filters instance.
	 */
	public vaporwave(): this {
		return this.setEqualizer(vaporwaveEqualizer).setTimescale({ pitch: 0.55 }).setFilterStatus("vaporwave", true);
	}

	/**
	 * Applies the distortion audio effect.
	 * @returns The updated Filters instance.
	 */
	public distort(): this {
		return this.setDistortion({
			sinOffset: 0,
			sinScale: 0.2,
			cosOffset: 0,
			cosScale: 0.2,
			tanOffset: 0,
			tanScale: 0.2,
			offset: 0,
			scale: 1.2,
		}).setFilterStatus("distort", true);
	}

	/**
	 * Sets the karaoke options.
	 * @param karaoke - The karaoke options to set.
	 * @returns The updated Filters instance.
	 */
	public setKaraoke(karaoke?: karaokeOptions): this {
		return this.applyFilter({
			property: "karaoke",
			value: karaoke,
		}).setFilterStatus("karaoke", true);
	}

	/**
	 * Sets the timescale options.
	 * @param timescale - The timescale options to set.
	 * @returns The updated Filters instance.
	 */
	public setTimescale(timescale?: timescaleOptions): this {
		return this.applyFilter({ property: "timescale", value: timescale });
	}

	/**
	 * Sets the vibrato options.
	 * @param vibrato - The vibrato options to set.
	 * @returns The updated Filters instance.
	 */
	public setVibrato(vibrato?: vibratoOptions): this {
		return this.applyFilter({ property: "vibrato", value: vibrato });
	}

	/**
	 * Sets the rotation options.
	 * @param rotation - The rotation options to set.
	 * @returns The updated Filters instance.
	 */
	public setRotation(rotation?: rotationOptions): this {
		return this.applyFilter({ property: "rotation", value: rotation });
	}

	/**
	 * Sets the distortion options.
	 * @param distortion - The distortion options to set.
	 * @returns The updated Filters instance.
	 */
	public setDistortion(distortion?: distortionOptions): this {
		return this.applyFilter({ property: "distortion", value: distortion });
	}

	/**
	 * Clears all filters.
	 * @returns The updated Filters instance.
	 */
	public async clearFilters(): Promise<this> {
		this.filterStatus = {
			bassboost: false,
			distort: false,
			eightD: false,
			karaoke: false,
			nightcore: false,
			slowmo: false,
			soft: false,
			trebleBass: false,
			tv: false,
			vaporwave: false,
		};

		this.player.filters = new Filters(this.player);
		this.setEqualizer([]);
		this.setDistortion(null);
		this.setKaraoke(null);
		this.setRotation(null);
		this.setTimescale(null);
		this.setVibrato(null);

		await this.updateFilters();
		return this;
	}

	/**
	 * Returns the status of the specified filter.
	 * @param filter - The filter to get the status of.
	 * @returns The status of the filter.
	 */
	public getFilterStatus(filter: keyof availableFilters): boolean {
		// Return the status of the specified filter.
		return this.filterStatus[filter];
	}
}

/**
 * The options for the timescale filter.
 */
interface timescaleOptions {
	/**
	 * The speed of the audio.
	 */
	speed?: number;
	/**
	 * The pitch of the audio.
	 */
	pitch?: number;
	/**
	 * The rate of the audio.
	 */
	rate?: number;
}

/**
 * The options for the vibrato filter.
 */
interface vibratoOptions {
	/**
	 * The frequency of the vibrato.
	 */
	frequency: number;
	/**
	 * The depth of the vibrato.
	 */
	depth: number;
}

/**
 * The options for the rotation filter.
 */
interface rotationOptions {
	/**
	 * The rotation of the audio in Hz.
	 */
	rotationHz: number;
}

/**
 * The options for the karaoke filter.
 */
interface karaokeOptions {
	/**
	 * The level of the karaoke filter.
	 */
	level?: number;
	/**
	 * The mono level of the karaoke filter.
	 */
	monoLevel?: number;
	/**
	 * The filter band of the karaoke filter.
	 */
	filterBand?: number;
	/**
	 * The filter width of the karaoke filter.
	 */
	filterWidth?: number;
}

/**
 * The options for the distortion filter.
 */
interface distortionOptions {
	/**
	 * The sin offset of the distortion.
	 */
	sinOffset?: number;
	/**
	 * The sin scale of the distortion.
	 */
	sinScale?: number;
	/**
	 * The cos offset of the distortion.
	 */
	cosOffset?: number;
	/**
	 * The cos scale of the distortion.
	 */
	cosScale?: number;
	/**
	 * The tan offset of the distortion.
	 */
	tanOffset?: number;
	/**
	 * The tan scale of the distortion.
	 */
	tanScale?: number;
	/**
	 * The offset of the distortion.
	 */
	offset?: number;
	/**
	 * The scale of the distortion.
	 */
	scale?: number;
}

/**
 * An interface to represent the status of the filters.
 */
interface availableFilters {
	/**
	 * The bass boost filter status.
	 */
	bassboost: boolean;
	/**
	 * The distortion filter status.
	 */
	distort: boolean;
	/**
	 * The 8D filter status.
	 */
	eightD: boolean;
	/**
	 * The karaoke filter status.
	 */
	karaoke: boolean;
	/**
	 * The nightcore filter status.
	 */
	nightcore: boolean;
	/**
	 * The slow motion filter status.
	 */
	slowmo: boolean;
	/**
	 * The soft filter status.
	 */
	soft: boolean;
	/**
	 * The treble bass filter status.
	 */
	trebleBass: boolean;
	/**
	 * The TV filter status.
	 */
	tv: boolean;
	/**
	 * The vaporwave filter status.
	 */
	vaporwave: boolean;
}
