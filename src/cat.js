import { AnimatedSprite, Assets, Container, Graphics, Texture } from "pixi.js";
import { getDepthScale, getDepthSpeedScale, grassTop } from "./config.js";

const CAT_RUN_SPEED = 0.03;
const CAT_WALK_SPEED = 0.015;
const CAT_JUMP_SPEED = 0.75; // Forward momentum during jump
const CAT_JUMP_FORCE = -5; // Initial upward velocity
const CAT_GRAVITY = 0.25; // Gravity constant for fall
const CAT_JUMP_COOLDOWN = 1; // Seconds between jumps
const CAT_RUN_THRESHOLD = 200; // When to start running
const CAT_WALK_THRESHOLD = 100; // When to start walking
const CAT_STOP_THRESHOLD = 50; // When to stop, while already walking

const FRAME_WIDTH = 16;
const FRAME_HEIGHT = 16;
const DISPLAY_SCALE = 4;

const TICKS_PER_FRAME_RUNNING = 4;
const TICKS_PER_FRAME_WALKING = 6;
const TICKS_PER_FRAME_IDLE = 8;
const TICKS_PER_FRAME_JUMP = 5;
const TICKS_PER_FRAME_FALL = 5;

// Drop shadow (shown when close to the star)
const SHADOW_COLOUR = 0x000000;
const SHADOW_MAX_ALPHA = 0.35;
const SHADOW_PROXIMITY_THRESHOLD = 200; // px — star distance at which shadow starts appearing
const SHADOW_ELLIPSE_W = 7; // half-width in source (16px) space — gets multiplied by DISPLAY_SCALE * depthScale
const SHADOW_ELLIPSE_H = 2; // half-height
const SHADOW_OFFSET_Y = 8; // how far below the cat centre the shadow sits (source px) — sprite is 16px tall so feet are at +8
// How many idle frames to wait before playing alternate animations
const IDLE_ALTERNATE_ANIMATIONS_THRESHOLD = 20;

const SPRITE_DEFS = {
  walk: { url: "assets/cat/walk.png", frames: 8 },
  run: { url: "assets/cat/run.png", frames: 8 },
  sit: { url: "assets/cat/sit.png", frames: 4 },
  sit2: { url: "assets/cat/sit2.png", frames: 4 },
  lick: { url: "assets/cat/lick.png", frames: 4 },
  lick2: { url: "assets/cat/lick2.png", frames: 4 },
  jump: { url: "assets/cat/jump.png", frames: 3 },
  fall: { url: "assets/cat/fall.png", frames: 4 },
};

export const container = new Container();

export const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Shadow ellipse — added first so it renders behind the cat sprites
const shadowGfx = new Graphics();
shadowGfx.alpha = 0;
container.addChild(shadowGfx);

function drawShadow() {
  shadowGfx.clear();
  shadowGfx
    .ellipse(0, SHADOW_OFFSET_Y, SHADOW_ELLIPSE_W, SHADOW_ELLIPSE_H)
    .fill({ color: SHADOW_COLOUR, alpha: 1 });
}

// local aliases for convenience
let x = pos.x;
let y = pos.y;
let moving = false;
let frameTick = 0;
let currentSpriteName = "walk";

// Idle animation state machine
let idleFrames = 0;
let lickPlaysLeft = 0;
let idlePhase = "sit";
let nextSitSprite = "sit";

// Jump state machine
let jumpState = "none"; // "none" | "jump" | "fall"
let verticalVelocity = 0;
let jumpDirection = 0; // Horizontal direction when jump started
let groundLevel = 0; // Y position before jumping
let jumpCooldownTimer = 0; // Time remaining until next jump is allowed
let lastCooldownTimer = 0; // Previous frame's cooldown value for detecting transition

// Map of name → AnimatedSprite (populated during init)
const sprites = {};
let activeSprite = null;

/**
 * Build a Pixi AnimatedSprite from a horizontal spritesheet texture.
 * The source image is one row of `frameCount` frames each FRAME_W × FRAME_H.
 */
function buildAnimatedSprite(texture, frameCount) {
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
  anim.animationSpeed = 0; // We drive frame advancement manually
  anim.autoUpdate = false;
  anim.loop = true;
  anim.visible = false;
  return anim;
}

export async function init() {
  for (const [name, def] of Object.entries(SPRITE_DEFS)) {
    const texture = await Assets.load(def.url);
    // Nearest-neighbour filtering keeps pixel art sharp when scaled up
    texture.source.scaleMode = "nearest";
    const anim = buildAnimatedSprite(texture, def.frames);
    sprites[name] = anim;
    container.addChild(anim);
  }

  // Scale up from 16px source to 128px display, pixel-perfect
  container.scale.set(DISPLAY_SCALE);

  container.x = x;
  container.y = y;

  activeSprite = sprites["walk"];
  activeSprite.visible = true;
  activeSprite.gotoAndStop(0);
}

function setSprite(name) {
  if (activeSprite) {
    activeSprite.visible = false;
    activeSprite.gotoAndStop(0);
  }
  currentSpriteName = name;
  frameTick = 0;
  activeSprite = sprites[name];
  activeSprite.visible = true;
  activeSprite.gotoAndStop(0);
}

export function update(starX, starY, active) {
  const dx = starX - x;
  const dy = starY - y;
  const dist = Math.hypot(dx, dy);

  // Update jump cooldown timer (assuming 60fps, decrement in seconds)
  lastCooldownTimer = jumpCooldownTimer;
  if (jumpCooldownTimer > 0) {
    jumpCooldownTimer -= 1 / 60;
    if (jumpCooldownTimer < 0) jumpCooldownTimer = 0;
  }

  const depthScale = getDepthScale(y);
  const runThreshold = CAT_RUN_THRESHOLD * depthScale;
  const walkThreshold = CAT_WALK_THRESHOLD * depthScale;
  const stopThreshold = CAT_STOP_THRESHOLD * depthScale;

  // When the cat is pinned at the grass ceiling and the star is above it,
  // the vertical gap inflates dist even though the cat can't close it.
  // Use only |dx| for threshold decisions in that situation.
  const atGrassCeiling = y <= grassTop() + 1 && starY < grassTop();
  const effectiveDist = atGrassCeiling ? Math.abs(dx) : dist;

  // Only allow movement when not jumping/falling
  if (jumpState === "none") {
    if (active) {
      if (!moving && effectiveDist > walkThreshold) moving = true;
      if (moving && effectiveDist < stopThreshold) moving = false;
    } else {
      moving = false;
    }

    if (moving) {
      const speed =
        effectiveDist > runThreshold ? CAT_RUN_SPEED : CAT_WALK_SPEED;
      x += dx * speed;
      y += dy * speed * getDepthSpeedScale(y);
      // Clamp cat to the grass area — cannot go into the sky
      y = Math.max(grassTop(), Math.min(window.innerHeight, y));
      pos.x = x;
      pos.y = y;
    }
  }
  container.x = x;
  container.y = y;

  // Detect jump triggers (only when star is active)
  const wasMoving = currentSpriteName === "walk" || currentSpriteName === "run";
  const isStopped = !moving && jumpState === "none";
  const cooldownJustExpired =
    lastCooldownTimer > 0 && jumpCooldownTimer === 0 && isStopped;

  // Jump when: (1) transitioning from walk->stop, OR (2) cooldown just expired while stopped
  if (
    active &&
    jumpState === "none" &&
    ((wasMoving && !moving) || cooldownJustExpired)
  ) {
    // Start jump
    jumpState = "jump";
    verticalVelocity = CAT_JUMP_FORCE;
    // Store the direction based on which way the sprite is facing
    jumpDirection = container.scale.x < 0 ? -1 : 1;
    // Set landing position, but don't allow jumping into the sky
    const targetGroundLevel = starY - 15;
    groundLevel = Math.max(grassTop(), Math.min(targetGroundLevel, y));
  }

  // Flip horizontally based on movement direction (preserve display scale)
  // Only update facing direction when not jumping (preserve jump direction)
  if (jumpState === "none") {
    container.scale.x =
      dx < 0 ? -DISPLAY_SCALE * depthScale : DISPLAY_SCALE * depthScale;
  } else {
    // Maintain facing direction during jump
    container.scale.x =
      jumpDirection < 0
        ? -DISPLAY_SCALE * depthScale
        : DISPLAY_SCALE * depthScale;
  }
  container.scale.y = DISPLAY_SCALE * depthScale;

  // Handle jump/fall physics
  if (jumpState !== "none") {
    // Apply horizontal momentum during jump/fall
    const jumpSpeed = CAT_JUMP_SPEED * depthScale;
    if (jumpDirection !== 0) {
      x += Math.sign(jumpDirection) * jumpSpeed;
    }

    // Apply vertical velocity and gravity (gravity applies during jump too)
    y += verticalVelocity;
    verticalVelocity += CAT_GRAVITY;

    // Transition from jump to fall when velocity becomes positive (going down)
    if (jumpState === "jump" && verticalVelocity >= 0) {
      jumpState = "fall";
    }

    // Check if landed (back at or below starting ground level)
    if (jumpState === "fall" && y >= groundLevel) {
      y = groundLevel;
      // Don't reset jumpState yet - we need to play the landing frame first
    }

    pos.x = x;
    pos.y = y;
  }

  // Determine desired sprite
  const desiredSprite =
    jumpState === "jump"
      ? "jump"
      : jumpState === "fall"
        ? "fall"
        : moving
          ? effectiveDist > runThreshold
            ? "run"
            : "walk"
          : idlePhase === "lick"
            ? currentSpriteName
            : nextSitSprite;

  if (desiredSprite !== currentSpriteName) setSprite(desiredSprite);

  // Special handling: immediately show landing frame when cat touches ground during fall
  if (
    jumpState === "fall" &&
    y >= groundLevel &&
    activeSprite.currentFrame < SPRITE_DEFS["fall"].frames - 1
  ) {
    activeSprite.gotoAndStop(SPRITE_DEFS["fall"].frames - 1);
    frameTick = 0; // Reset frame tick so landing frame displays for full duration
  }

  const ticksPerFrame =
    jumpState === "jump"
      ? TICKS_PER_FRAME_JUMP
      : jumpState === "fall"
        ? TICKS_PER_FRAME_FALL
        : !moving
          ? TICKS_PER_FRAME_IDLE
          : effectiveDist > runThreshold
            ? TICKS_PER_FRAME_RUNNING
            : TICKS_PER_FRAME_WALKING;

  if (++frameTick >= ticksPerFrame) {
    frameTick = 0;
    const totalFrames = SPRITE_DEFS[currentSpriteName].frames;
    const currentFrame = activeSprite.currentFrame;

    // Handle jump animation: hold on last frame until transitioning to fall
    if (jumpState === "jump") {
      if (currentFrame < totalFrames - 1) {
        activeSprite.gotoAndStop(currentFrame + 1);
      }
      // Stay on last frame until jumpState changes to "fall"
    }
    // Handle fall animation: hold on second-last frame until landing
    else if (jumpState === "fall") {
      const hasLanded = y >= groundLevel;
      if (!hasLanded && currentFrame < totalFrames - 2) {
        // Play up to second-last frame
        activeSprite.gotoAndStop(currentFrame + 1);
      } else if (hasLanded && currentFrame === totalFrames - 2) {
        // Play last frame when landing
        activeSprite.gotoAndStop(totalFrames - 1);
      } else if (hasLanded && currentFrame === totalFrames - 1) {
        // After landing frame, transition to idle and start cooldown
        jumpState = "none";
        verticalVelocity = 0;
        jumpDirection = 0;
        jumpCooldownTimer = CAT_JUMP_COOLDOWN;
        idleFrames = 0;
        idlePhase = "sit";
        nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
      }
    }
    // Normal animation advancement for other states
    else {
      const nextFrame = (currentFrame + 1) % totalFrames;
      activeSprite.gotoAndStop(nextFrame);

      // On completing a full animation cycle (looped back to frame 0)
      if (!moving && nextFrame === 0) {
        idleFrames += totalFrames;

        if (idlePhase === "lick") {
          lickPlaysLeft--;
          if (lickPlaysLeft <= 0) {
            idlePhase = "sit";
            idleFrames = 0;
            nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
          }
        } else {
          if (idleFrames >= IDLE_ALTERNATE_ANIMATIONS_THRESHOLD) {
            idlePhase = "lick";
            lickPlaysLeft = 2;
            setSprite(Math.random() < 0.5 ? "lick" : "lick2");
          } else {
            nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
          }
        }
      }
    }
  }

  // Drop shadow: fades in as the cat gets close to the star
  const shadowT = Math.max(0, 1 - dist / SHADOW_PROXIMITY_THRESHOLD);
  const targetShadowAlpha = active ? shadowT * SHADOW_MAX_ALPHA : 0;
  shadowGfx.alpha += (targetShadowAlpha - shadowGfx.alpha) * 0.1;
  if (shadowGfx.alpha > 0.001) {
    drawShadow();
  }
}
