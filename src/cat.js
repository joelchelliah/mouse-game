import { AnimatedSprite, Assets, Container, Spritesheet, Texture } from "pixi.js";

const CAT_RUN_SPEED = 0.03;
const CAT_WALK_SPEED = 0.015;
const CAT_START_DIST = 200;
const CAT_STOP_DIST = 100;
const CAT_RUN_DIST = 400;
const FRAME_W = 16;  // source pixels per frame
const FRAME_H = 16;
const DISPLAY_SCALE = 8; // scale up to 128px display size
const TICKS_PER_FRAME_RUNNING = 4;
const TICKS_PER_FRAME_WALKING = 6;
const TICKS_PER_FRAME_IDLE = 8;
const IDLE_LICK_THRESHOLD = 20;

const SPRITE_DEFS = {
  walk:  { url: "assets/cat/walk.png",  frames: 8 },
  run:   { url: "assets/cat/run.png",   frames: 8 },
  sit:   { url: "assets/cat/sit.png",   frames: 4 },
  sit2:  { url: "assets/cat/sit2.png",  frames: 4 },
  lick:  { url: "assets/cat/lick.png",  frames: 4 },
  lick2: { url: "assets/cat/lick2.png", frames: 4 },
};

export const container = new Container();

export const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

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
        frame: { x: i * FRAME_W, y: 0, width: FRAME_W, height: FRAME_H },
      })
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

  if (active) {
    if (!moving && dist > CAT_START_DIST) moving = true;
    if (moving && dist < CAT_STOP_DIST) moving = false;
  } else {
    moving = false;
  }

  if (moving) {
    const speed = dist > CAT_RUN_DIST ? CAT_RUN_SPEED : CAT_WALK_SPEED;
    x += dx * speed;
    y += dy * speed;
    pos.x = x;
    pos.y = y;
  }

  container.x = x;
  container.y = y;
  // Flip horizontally based on movement direction (preserve display scale)
  container.scale.x = dx < 0 ? -DISPLAY_SCALE : DISPLAY_SCALE;

  // Detect movement → idle transition and reset idle state
  const wasMoving = currentSpriteName === "walk" || currentSpriteName === "run";
  if (wasMoving && !moving) {
    idleFrames = 0;
    idlePhase = "sit";
    nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
  }

  // Determine desired sprite
  const desiredSprite = moving
    ? dist > CAT_RUN_DIST
      ? "run"
      : "walk"
    : idlePhase === "lick"
      ? currentSpriteName
      : nextSitSprite;

  if (desiredSprite !== currentSpriteName) setSprite(desiredSprite);

  const ticksPerFrame = !moving
    ? TICKS_PER_FRAME_IDLE
    : dist > CAT_RUN_DIST
      ? TICKS_PER_FRAME_RUNNING
      : TICKS_PER_FRAME_WALKING;

  if (++frameTick >= ticksPerFrame) {
    frameTick = 0;
    const totalFrames = SPRITE_DEFS[currentSpriteName].frames;
    const nextFrame = (activeSprite.currentFrame + 1) % totalFrames;
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
        if (idleFrames >= IDLE_LICK_THRESHOLD) {
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
