/**
 * JumpController - Reusable jump physics controller for animated sprites.
 * Manages jump state machine, vertical velocity, and gravity physics.
 */
export class JumpController {
  constructor(config = {}) {
    this.jumpSpeed = config.jumpSpeed ?? 0.75; // Forward momentum during jump
    this.jumpForce = config.jumpForce ?? -5; // Initial upward velocity
    this.gravity = config.gravity ?? 0.25; // Gravity constant
    this.cooldownDuration = config.cooldownDuration ?? 1; // Seconds between jumps
    this.fps = config.fps ?? 60; // Frames per second for cooldown calculation

    // State
    this.state = "none"; // "none" | "jump" | "fall"
    this.verticalVelocity = 0;
    this.jumpDirection = 0; // Horizontal direction when jump started (1 or -1)
    this.groundLevel = 0; // Y position to land at
    this.cooldownTimer = 0; // Time remaining until next jump is allowed
    this.lastCooldownTimer = 0; // Previous frame's cooldown (for detecting transitions)
  }

  /**
   * Returns true if the controller is ready to start a new jump.
   */
  canJump() {
    return this.state === "none" && this.cooldownTimer === 0;
  }

  /**
   * Returns true if currently in the jump or fall state.
   */
  isJumping() {
    return this.state !== "none";
  }

  /**
   * Returns true if the controller is on the ground (not jumping/falling).
   */
  isOnGround() {
    return this.state === "none";
  }

  /**
   * Returns true if the cooldown timer just reached zero this frame.
   */
  cooldownJustExpired() {
    return this.lastCooldownTimer > 0 && this.cooldownTimer === 0;
  }

  /**
   * Starts a new jump with the given direction and target ground level.
   * @param {number} direction - Horizontal direction (-1 for left, 1 for right)
   * @param {number} targetGroundLevel - Y position to land at
   * @param {number} minGroundLevel - Minimum allowed ground level (e.g., grass top)
   * @param {number} currentY - Current Y position (for clamping)
   */
  startJump(direction, targetGroundLevel, minGroundLevel, currentY) {
    if (!this.canJump()) return;

    this.state = "jump";
    this.verticalVelocity = this.jumpForce;
    this.jumpDirection = direction;
    // Clamp ground level between min and current Y
    this.groundLevel = Math.max(
      minGroundLevel,
      Math.min(targetGroundLevel, currentY),
    );
  }

  /**
   * Updates the cooldown timer. Should be called every frame.
   */
  updateCooldown() {
    this.lastCooldownTimer = this.cooldownTimer;
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= 1 / this.fps;
      if (this.cooldownTimer < 0) this.cooldownTimer = 0;
    }
  }

  /**
   * Updates jump physics for one frame.
   * @param {number} depthScale - Scale multiplier for depth perspective
   * @returns {object} - { dx, dy, hasLanded } - position deltas and landing status
   */
  updatePhysics(depthScale) {
    if (this.state === "none") {
      return { dx: 0, dy: 0, hasLanded: false };
    }

    // Apply horizontal momentum during jump/fall
    const scaledJumpSpeed = this.jumpSpeed * depthScale;
    const dx = Math.sign(this.jumpDirection) * scaledJumpSpeed;

    // Apply vertical velocity and gravity
    const dy = this.verticalVelocity;
    this.verticalVelocity += this.gravity;

    // Transition from jump to fall when velocity becomes positive (going down)
    if (this.state === "jump" && this.verticalVelocity >= 0) {
      this.state = "fall";
    }

    return { dx, dy, hasLanded: false };
  }

  /**
   * Checks if the sprite has landed and should transition back to ground state.
   * Call this after updating position with the values from updatePhysics().
   * @param {number} currentY - Current Y position after applying physics
   * @returns {boolean} - True if the sprite has landed
   */
  checkLanding(currentY) {
    if (this.state === "fall" && currentY >= this.groundLevel) {
      return true;
    }
    return false;
  }

  /**
   * Completes the landing sequence and resets to ground state.
   * Call this after the landing animation frame has been displayed.
   */
  completeLanding() {
    this.state = "none";
    this.verticalVelocity = 0;
    this.jumpDirection = 0;
    this.cooldownTimer = this.cooldownDuration;
  }

  /**
   * Gets the current jump direction for sprite flipping.
   */
  getJumpDirection() {
    return this.jumpDirection;
  }

  /**
   * Gets the current ground level.
   */
  getGroundLevel() {
    return this.groundLevel;
  }
}
