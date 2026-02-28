/**
 * MovementController - Manages approach movement toward a target position.
 * Handles distance-based speed thresholds, depth scaling, and movement state.
 */
export class MovementController {
  constructor(config = {}) {
    this.runSpeed = config.runSpeed ?? 0.03;
    this.walkSpeed = config.walkSpeed ?? 0.015;
    this.runThreshold = config.runThreshold ?? 200; // Distance to start running
    this.walkThreshold = config.walkThreshold ?? 100; // Distance to start walking
    this.stopThreshold = config.stopThreshold ?? 50; // Distance to stop while walking

    // State
    this.isMoving = false;
  }

  /**
   * Calculates effective distance for movement decisions.
   * When at ceiling with target above, uses only horizontal distance.
   * @param {object} current - { x, y } current position
   * @param {object} target - { x, y } target position
   * @param {number} ceilingY - Y position of movement ceiling (e.g., grass top)
   * @returns {number} - Effective distance for threshold comparisons
   */
  calculateEffectiveDistance(current, target, ceilingY) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.hypot(dx, dy);

    // When at ceiling and target is above it, use only horizontal distance
    const atCeiling = current.y <= ceilingY + 1 && target.y < ceilingY;
    return atCeiling ? Math.abs(dx) : dist;
  }

  /**
   * Updates movement state based on distance thresholds.
   * @param {number} effectiveDistance - Distance to target
   * @param {boolean} active - Whether movement is enabled
   * @param {number} depthScale - Scale multiplier for distance thresholds
   */
  updateMovementState(effectiveDistance, active, depthScale) {
    const scaledRunThreshold = this.runThreshold * depthScale;
    const scaledWalkThreshold = this.walkThreshold * depthScale;
    const scaledStopThreshold = this.stopThreshold * depthScale;

    if (active) {
      // Start moving if far enough away
      if (!this.isMoving && effectiveDistance > scaledWalkThreshold) {
        this.isMoving = true;
      }
      // Stop moving if close enough
      if (this.isMoving && effectiveDistance < scaledStopThreshold) {
        this.isMoving = false;
      }
    } else {
      this.isMoving = false;
    }
  }

  /**
   * Calculates the position delta for this frame.
   * @param {object} current - { x, y } current position
   * @param {object} target - { x, y } target position
   * @param {number} effectiveDistance - Distance to target
   * @param {number} depthScale - Scale multiplier for distance thresholds
   * @param {number} depthSpeedScale - Scale multiplier for vertical movement speed
   * @returns {object} - { dx, dy, speed } - Position deltas and movement type
   */
  calculateMovement(
    current,
    target,
    effectiveDistance,
    depthScale,
    depthSpeedScale,
  ) {
    if (!this.isMoving) {
      return { dx: 0, dy: 0, speed: "idle" };
    }

    const scaledRunThreshold = this.runThreshold * depthScale;
    const isRunning = effectiveDistance > scaledRunThreshold;
    const speed = isRunning ? this.runSpeed : this.walkSpeed;

    const dx = (target.x - current.x) * speed;
    const dy = (target.y - current.y) * speed * depthSpeedScale;

    return {
      dx,
      dy,
      speed: isRunning ? "run" : "walk",
    };
  }

  /**
   * Clamps Y position to allowed bounds.
   * @param {number} y - Y position to clamp
   * @param {number} minY - Minimum Y (e.g., grass top)
   * @param {number} maxY - Maximum Y (e.g., screen height)
   * @returns {number} - Clamped Y position
   */
  clampY(y, minY, maxY) {
    return Math.max(minY, Math.min(maxY, y));
  }

  /**
   * Returns true if currently moving.
   */
  getIsMoving() {
    return this.isMoving;
  }

  /**
   * Manually set movement state (e.g., to stop during jumps).
   */
  setMoving(value) {
    this.isMoving = value;
  }
}
