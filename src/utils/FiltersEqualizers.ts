/**
 * Interface representing a band in an equalizer.
 */
export interface Band {
	/** The band number. */
	band: number;
	/** The gain to be applied to the band. */
	gain: number;
}

/**
 * Array of equalizer bands and gains for bass boost effect.
 */
export const bassBoostEqualizer: Band[] = [
	// Preamp
	{ band: 0, gain: 0.2 },
	// Low mids
	{ band: 1, gain: 0.15 },
	{ band: 2, gain: 0.1 },
	// Mids
	{ band: 3, gain: 0.05 },
	// High mids
	{ band: 4, gain: 0.0 },
	// Treble
	{ band: 5, gain: -0.05 },
	{ band: 6, gain: -0.1 },
	// Additional treble
	{ band: 7, gain: -0.1 },
	{ band: 8, gain: -0.1 },
	{ band: 9, gain: -0.1 },
	{ band: 10, gain: -0.1 },
	{ band: 11, gain: -0.1 },
	{ band: 12, gain: -0.1 },
	// Additional high treble
	{ band: 13, gain: -0.1 },
	{ band: 14, gain: -0.1 },
];

/**
 * Array of equalizer bands and gains for soft effect.
 */
export const softEqualizer: Band[] = [
	// Preamp
	{ band: 0, gain: 0 },
	// Low mids
	{ band: 1, gain: 0 },
	{ band: 2, gain: 0 },
	// Mids
	{ band: 3, gain: 0 },
	// High mids
	{ band: 4, gain: 0 },
	// Treble
	{ band: 5, gain: 0 },
	// Additional treble
	{ band: 6, gain: 0 },
	// Additional high treble
	{ band: 7, gain: 0 },
	{ band: 8, gain: -0.25 },
	{ band: 9, gain: -0.25 },
	{ band: 10, gain: -0.25 },
	{ band: 11, gain: -0.25 },
	{ band: 12, gain: -0.25 },
	{ band: 13, gain: -0.25 },
];

/**
 * Array of equalizer bands and gains for TV effect.
 */
export const tvEqualizer: Band[] = [
	// Preamp
	{ band: 0, gain: 0 },
	// Low mids
	{ band: 1, gain: 0 },
	{ band: 2, gain: 0 },
	// Mids
	{ band: 3, gain: 0 },
	// High mids
	{ band: 4, gain: 0 },
	// Treble
	{ band: 5, gain: 0 },
	// Additional treble
	{ band: 6, gain: 0 },
	// High treble
	{ band: 7, gain: 0.65 },
	{ band: 8, gain: 0.65 },
	{ band: 9, gain: 0.65 },
	{ band: 10, gain: 0.65 },
	{ band: 11, gain: 0.65 },
	{ band: 12, gain: 0.65 },
	{ band: 13, gain: 0.65 },
];

/**
 * Array of equalizer bands and gains for treble boost and bass cut effect.
 */
export const trebleBassEqualizer: Band[] = [
	// Preamp
	{ band: 0, gain: 0.6 },
	// Low mids
	{ band: 1, gain: 0.67 },
	{ band: 2, gain: 0.67 },
	// Mids
	{ band: 3, gain: 0 },
	// Bass
	{ band: 4, gain: -0.5 },
	{ band: 5, gain: 0.15 },
	{ band: 6, gain: -0.45 },
	// Additional bass
	{ band: 7, gain: 0.23 },
	{ band: 8, gain: 0.35 },
	{ band: 9, gain: 0.45 },
	{ band: 10, gain: 0.55 },
	{ band: 11, gain: 0.6 },
	// Additional midrange
	{ band: 12, gain: 0.55 },
	// High mids
	{ band: 13, gain: 0 },
];

/**
 * Array of equalizer bands and gains for vaporwave effect.
 */
export const vaporwaveEqualizer: Band[] = [
	// Preamp
	{ band: 0, gain: 0 },
	// Low mids
	{ band: 1, gain: 0 },
	{ band: 2, gain: 0 },
	// Mids
	{ band: 3, gain: 0 },
	// High mids
	{ band: 4, gain: 0 },
	// Treble
	{ band: 5, gain: 0 },
	// Additional treble
	{ band: 6, gain: 0 },
	// Additional high treble
	{ band: 7, gain: 0 },
	{ band: 8, gain: 0.15 },
	{ band: 9, gain: 0.15 },
	{ band: 10, gain: 0.15 },
	{ band: 11, gain: 0.15 },
	{ band: 12, gain: 0.15 },
	{ band: 13, gain: 0.15 },
];
