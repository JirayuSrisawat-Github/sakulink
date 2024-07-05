import { PlayerOptions } from "../structures/Player";

/**
 * Checks the validity of the given PlayerOptions object.
 *
 * @param {PlayerOptions} options - The PlayerOptions object to check.
 *
 * @throws {TypeError} If the PlayerOptions object is empty, or if any of the options are invalid.
 */
export default function playerCheck(options: PlayerOptions): void {
  // Check if the PlayerOptions object is empty
  if (!options) {
    throw new TypeError("PlayerOptions must not be empty.");
  }

  // Destructure the options object
  const {
    guild, // The guild ID
    node, // The node identifier or URL
    selfDeafen, // Whether the player should deafen itself in the voice channel
    selfMute, // Whether the player should mute itself in the voice channel
    textChannel, // The text channel ID
    voiceChannel, // The voice channel ID
    volume, // The volume of the player
  } = options;

  // Check the validity of the guild option
  if (!guild || typeof guild !== "string" || !/^\d+$/.test(guild)) {
    throw new TypeError(
      'Player option "guild" must be present and be a non-empty string.'
    );
  }

  // Check the validity of the node option
  if (node && typeof node !== "string") {
    throw new TypeError('Player option "node" must be a non-empty string.');
  }

  // Check the validity of the selfDeafen option
  if (typeof selfDeafen !== "undefined" && typeof selfDeafen !== "boolean") {
    throw new TypeError('Player option "selfDeafen" must be a boolean.');
  }

  // Check the validity of the selfMute option
  if (typeof selfMute !== "undefined" && typeof selfMute !== "boolean") {
    throw new TypeError('Player option "selfMute" must be a boolean.');
  }

  // Check the validity of the textChannel option
  if (
    textChannel &&
    typeof textChannel !== "string" &&
    !/^\d+$/.test(textChannel)
  ) {
    throw new TypeError(
      'Player option "textChannel" must be a non-empty string.'
    );
  }

  // Check the validity of the voiceChannel option
  if (
    voiceChannel &&
    typeof voiceChannel !== "string" &&
    !/^\d+$/.test(voiceChannel)
  ) {
    throw new TypeError(
      'Player option "voiceChannel" must be a non-empty string.'
    );
  }

  // Check the validity of the volume option
  if (typeof volume !== "undefined" && typeof volume !== "number") {
    throw new TypeError('Player option "volume" must be a number.');
  }
}
