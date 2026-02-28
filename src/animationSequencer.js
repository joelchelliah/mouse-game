/**
 * AnimationSequencer - Manages cycling between different idle animation states.
 * Handles state transitions, cycle counting, and probabilistic animation selection.
 */
export class AnimationSequencer {
  constructor(config = {}) {
    this.alternateThreshold = config.alternateThreshold ?? 20; // Frames before playing alternates
    this.alternatePlayCount = config.alternatePlayCount ?? 2; // How many times to play alternate

    // Animation state
    this.phase = "sit"; // Current phase: "sit" | "lick" (or custom phases)
    this.frameCount = 0; // Total frames played in current phase
    this.playsLeft = 0; // How many times left to play the current alternate animation
    this.nextIdleSprite = "sit"; // Which idle sprite to show next
  }

  /**
   * Reset to initial idle state (e.g., after jumping or moving).
   * @param {string} initialSprite - Name of the sprite to start with (default: random sit)
   */
  reset(initialSprite = null) {
    this.phase = "sit";
    this.frameCount = 0;
    this.playsLeft = 0;
    this.nextIdleSprite =
      initialSprite ?? (Math.random() < 0.5 ? "sit" : "sit2");
  }

  /**
   * Called when an animation cycle completes (loops back to frame 0).
   * Returns the sprite name to transition to, or null if no change.
   * @param {number} totalFrames - How many frames were in the completed animation
   * @returns {string|null} - New sprite name to switch to, or null to keep current
   */
  onCycleComplete(totalFrames) {
    this.frameCount += totalFrames;

    // If in alternate animation phase (e.g., licking)
    if (this.phase === "lick") {
      this.playsLeft--;
      if (this.playsLeft <= 0) {
        // Done with alternate animation, return to idle
        this.phase = "sit";
        this.frameCount = 0;
        this.nextIdleSprite = Math.random() < 0.5 ? "sit" : "sit2";
        return this.nextIdleSprite;
      }
      // Continue with current alternate animation
      return null;
    }

    // In sit phase - check if should transition to alternate
    if (this.frameCount >= this.alternateThreshold) {
      this.phase = "lick";
      this.playsLeft = this.alternatePlayCount;
      // Return a random lick animation
      return Math.random() < 0.5 ? "lick" : "lick2";
    }

    // Otherwise, randomly pick next sit sprite but don't switch yet
    this.nextIdleSprite = Math.random() < 0.5 ? "sit" : "sit2";
    return null;
  }

  /**
   * Gets the current desired idle sprite name.
   * Call this when determining which sprite to show while idle.
   */
  getCurrentIdleSprite() {
    if (this.phase === "lick") {
      // During lick phase, keep showing whatever lick sprite is active
      return null; // Caller should keep current sprite
    }
    return this.nextIdleSprite;
  }

  /**
   * Returns true if currently in the alternate animation phase.
   */
  isPlayingAlternate() {
    return this.phase === "lick";
  }

  /**
   * Gets the current phase name.
   */
  getPhase() {
    return this.phase;
  }
}
