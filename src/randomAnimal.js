import { AnimatedSprite, Container, Texture } from "pixi.js";
import { getDepthScale, grassTop } from "./config.js";
import { JumpController } from "./jumpController.js";

const FRAME_WIDTH = 16;
const FRAME_HEIGHT = 16;
const DISPLAY_SCALE = 3;

const WALK_SPEED_RANGE = [1, 3]; // Pixels per frame
const RUN_SPEED_MULTIPLIER = 3; // How much faster running is than walking
const TICKS_PER_FRAME_WALK = 6; // Animation speed for walking
const TICKS_PER_FRAME_RUN = 4; // Animation speed for running
const TICKS_PER_FRAME_HURT = 4; // Animation speed for hurt (initial playthrough)
const OVERLAP_RADIUS = 60; // Collision detection radius with cat

// Hurt jump physics (small backwards jump)
const HURT_JUMP_FORCE = -3; // Small upward force
const HURT_JUMP_SPEED = 0.3; // Slow backwards horizontal speed
const HURT_GRAVITY = 0.2; // Lighter gravity for floaty feel

/**
 * RandomAnimal - A single animal that walks across the screen.
 * Interacts with the cat: walk → hurt (on collision) → run away.
 */
export class RandomAnimal {
  constructor(spriteDefs, startX, y, direction) {
    this.container = new Container();
    this.x = startX;
    this.y = y;
    this.direction = direction; // -1 for left, 1 for right
    this.frameTick = 0;
    this.active = true;

    // State machine: "walk" → "hurt" → "run"
    this.state = "walk";
    this.currentSpriteName = "walk";
    this.hurtAnimationCompleted = false; // Has the hurt animation played through once?

    // Random walk speed from range
    this.walkSpeed =
      WALK_SPEED_RANGE[0] +
      Math.random() * (WALK_SPEED_RANGE[1] - WALK_SPEED_RANGE[0]);
    this.runSpeed = this.walkSpeed * RUN_SPEED_MULTIPLIER;

    // Jump controller for hurt jump (small backwards hop)
    this.jumpController = new JumpController({
      jumpSpeed: HURT_JUMP_SPEED,
      jumpForce: HURT_JUMP_FORCE,
      gravity: HURT_GRAVITY,
      cooldownDuration: 0, // No cooldown needed
    });

    // Build all animated sprites
    this.sprites = {};
    for (const [name, def] of Object.entries(spriteDefs)) {
      const sprite = this.buildAnimatedSprite(def.texture, def.frames);
      sprite.visible = false;
      this.sprites[name] = sprite;
      this.container.addChild(sprite);
    }

    // Apply depth scaling
    const depthScale = getDepthScale(y);
    this.depthScale = depthScale;
    this.container.scale.set(
      direction < 0 ? -DISPLAY_SCALE * depthScale : DISPLAY_SCALE * depthScale,
      DISPLAY_SCALE * depthScale,
    );

    this.container.x = this.x;
    this.container.y = this.y;

    // Start with walk sprite
    this.activeSprite = this.sprites["walk"];
    this.activeSprite.visible = true;
    this.activeSprite.gotoAndStop(0);
  }

  /**
   * Build a Pixi AnimatedSprite from a horizontal spritesheet texture.
   */
  buildAnimatedSprite(texture, frameCount) {
    const textures = [];
    for (let i = 0; i < frameCount; i++) {
      textures.push(
        new Texture({
          source: texture.source,
          frame: {
            x: i * FRAME_WIDTH,
            y: 0,
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
          },
        }),
      );
    }
    const anim = new AnimatedSprite(textures);
    anim.anchor.set(0.5);
    anim.animationSpeed = 0; // Manual frame advancement
    anim.autoUpdate = false;
    anim.loop = true;
    return anim;
  }

  /**
   * Switch to a different sprite animation.
   */
  setSprite(name) {
    if (this.activeSprite) {
      this.activeSprite.visible = false;
      this.activeSprite.gotoAndStop(0);
    }
    this.currentSpriteName = name;
    this.frameTick = 0;
    this.activeSprite = this.sprites[name];
    this.activeSprite.visible = true;
    this.activeSprite.gotoAndStop(0);
  }

  /**
   * Check if this animal overlaps with the cat.
   */
  checkCatCollision(catX, catY) {
    const dx = catX - this.x;
    const dy = catY - this.y;
    const dist = Math.hypot(dx, dy);
    const scaledRadius = OVERLAP_RADIUS * this.depthScale;
    return dist < scaledRadius;
  }

  /**
   * Update the animal's position and animation.
   * Returns false when the animal has left the screen and should be removed.
   */
  update(catX, catY) {
    if (!this.active) return false;

    // State machine logic
    if (this.state === "walk") {
      // Check for collision with cat
      if (this.checkCatCollision(catX, catY)) {
        this.state = "hurt";
        this.setSprite("hurt");
        this.hurtAnimationCompleted = false;

        // Start a small backwards jump
        const backwardsDirection = -this.direction; // Opposite of walking direction
        this.jumpController.startJump(
          backwardsDirection,
          this.y, // Land at same level
          grassTop(),
          this.y,
        );
      } else {
        // Move horizontally while walking
        this.x += this.direction * this.walkSpeed;
        this.container.x = this.x;
      }
    } else if (this.state === "hurt") {
      // Apply hurt jump physics
      const physics = this.jumpController.updatePhysics(this.depthScale);
      this.x += physics.dx;
      this.y += physics.dy;

      // Check if landed and clamp position
      if (this.jumpController.checkLanding(this.y)) {
        this.y = this.jumpController.getGroundLevel();
        // Complete the landing in the jump controller so isOnGround() returns true
        this.jumpController.completeLanding();
      }

      this.container.x = this.x;
      this.container.y = this.y;
    } else if (this.state === "run") {
      // Run in opposite direction
      this.x -= this.direction * this.runSpeed;
      this.container.x = this.x;
    }

    // Determine ticks per frame based on state
    let ticksPerFrame = TICKS_PER_FRAME_WALK;
    if (this.state === "hurt") {
      ticksPerFrame = TICKS_PER_FRAME_HURT;
    } else if (this.state === "run") {
      ticksPerFrame = TICKS_PER_FRAME_RUN;
    }

    // Advance animation
    if (++this.frameTick >= ticksPerFrame) {
      this.frameTick = 0;
      const currentFrame = this.activeSprite.currentFrame;
      const totalFrames = this.activeSprite.textures.length;

      if (this.state === "hurt") {
        if (!this.hurtAnimationCompleted) {
          // First playthrough: advance normally
          const nextFrame = (currentFrame + 1) % totalFrames;
          this.activeSprite.gotoAndStop(nextFrame);

          // Check if we completed the first playthrough
          if (nextFrame === 0) {
            this.hurtAnimationCompleted = true;
            // Jump to second-to-last frame to start looping last 2 frames
            this.activeSprite.gotoAndStop(totalFrames - 2);
          }
        } else {
          // After first playthrough: loop between last 2 frames
          const isOnSecondToLast = currentFrame === totalFrames - 2;
          const nextFrame = isOnSecondToLast
            ? totalFrames - 1
            : totalFrames - 2;
          this.activeSprite.gotoAndStop(nextFrame);

          // Check if landed - if so, transition to run
          if (this.jumpController.isOnGround()) {
            this.state = "run";
            this.setSprite("run");
            // Flip direction for running
            this.container.scale.x = -this.container.scale.x;
          }
        }
      } else {
        // Normal animation for walk and run states
        const nextFrame = (currentFrame + 1) % totalFrames;
        this.activeSprite.gotoAndStop(nextFrame);
      }
    }

    // Check if off-screen
    const margin = 100; // Extra margin to ensure fully off-screen
    if (this.x > window.innerWidth + margin || this.x < -margin) {
      this.active = false;
      return false;
    }

    return true;
  }

  /**
   * Remove this animal from the scene.
   */
  destroy() {
    this.active = false;
    for (const sprite of Object.values(this.sprites)) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
  }
}
