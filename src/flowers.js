import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ringBurst } from "./particles.js";
import {
  FPS,
  getDepthScale,
  DEPTH_SCALE_TOP,
  DEPTH_SCALE_BOTTOM,
  grassTop,
} from "./config.js";

const MAX_FLOWER_COUNT = 50;
const FLOWER_SPAWN_INTERVAL = 2 * FPS;

const FLOWER_COLS = 6;
const FLOWER_ROWS = 6;
const FLOWER_SRC_SIZE = 85;

const FLOWER_DRAW_SIZE_RANGE = [25, 40];
const FLOWER_STATE_CHANGE_TICKS_RANGE = [20, 50];
const FLOWER_MAX_ROTATION = 120;
const CAT_OVERLAP_RADIUS = 40;

const OPACITY_BUD = 0.65;
const OPACITY_BLOOMED = 0.85;

const FLOWER_AGING_TIME = 1 * FPS;
const OPACITY_AGED = 1;
const AGED_GROWTH_PERCENTAGE = 0.5;
const AGED_ROTATION_SPEED_RANGE = [-1, 1];

// Depth tinting: flowers further away (low depth scale) appear darker
const DEPTH_TINT_MIN = 0.75; // darkest brightness at top of screen
const DEPTH_TINT_MAX = 1.0; // full brightness at bottom of screen

function depthTint(y) {
  const depthT =
    (getDepthScale(y) - DEPTH_SCALE_TOP) /
    (DEPTH_SCALE_BOTTOM - DEPTH_SCALE_TOP);
  const brightness =
    DEPTH_TINT_MIN + depthT * (DEPTH_TINT_MAX - DEPTH_TINT_MIN);
  const c = Math.round(brightness * 255);
  return (c << 16) | (c << 8) | c;
}

// Drop shadow (shown when close to the star)
const SHADOW_COLOUR = 0x000000;
const SHADOW_MAX_ALPHA = 0.3;
const SHADOW_PROXIMITY_THRESHOLD = 200;

// Falling physics
const FALL_GRAVITY = 0.75;
const FALL_JUMP_SPEED_RANGE = [-12, -8];
const FALL_HORIZONTAL_SPEED_RANGE = [1, 4];

const STATES = {
  BUDDING: "budding",
  BUD: "bud",
  BLOOMING: "blooming",
  BLOOMED: "bloomed",
  FALLING: "falling",
};

export const container = new Container();

let flowerTextures = []; // 2D array [row][col] of Texture
let flowers = [];
let spawnTick = 0;

export async function init() {
  const baseTexture = await Assets.load("assets/flowers.png");

  // Slice the spritesheet into individual cell textures
  flowerTextures = [];
  for (let row = 0; row < FLOWER_ROWS; row++) {
    const rowArr = [];
    for (let col = 0; col < FLOWER_COLS; col++) {
      rowArr.push(
        new Texture({
          source: baseTexture.source,
          frame: {
            x: col * FLOWER_SRC_SIZE,
            y: row * FLOWER_SRC_SIZE,
            width: FLOWER_SRC_SIZE,
            height: FLOWER_SRC_SIZE,
          },
        }),
      );
    }
    flowerTextures.push(rowArr);
  }

  flowers = [];
  spawnTick = FLOWER_SPAWN_INTERVAL;
}

function spawnFlower() {
  const col = Math.floor(Math.random() * FLOWER_COLS);
  const row = Math.floor(Math.random() * FLOWER_ROWS);
  const [minSize, maxSize] = FLOWER_DRAW_SIZE_RANGE;
  const drawSize = minSize + Math.random() * (maxSize - minSize);
  const margin = maxSize;
  const fx =
    margin + Math.random() * (window.innerWidth - drawSize - margin * 2);
  // Flowers only spawn on the grass — keep them below the sky/grass boundary
  const grassY = grassTop();
  const fy =
    grassY +
    margin +
    Math.random() * (window.innerHeight - grassY - drawSize - margin * 2);

  const cx = fx + drawSize / 2;
  const cy = fy + drawSize / 2;

  // Shadow ellipse — added before the sprite so it renders behind it
  const shadowGfx = new Graphics();
  shadowGfx.alpha = 0;
  container.addChild(shadowGfx);

  const sprite = new Sprite(flowerTextures[row][col]);
  sprite.anchor.set(0.5);
  sprite.x = cx;
  sprite.y = cy;
  // Scale the sprite so FLOWER_SRC_SIZE maps to drawSize
  const s = drawSize / FLOWER_SRC_SIZE;
  sprite.scale.set(0); // start invisible
  sprite.alpha = OPACITY_BUD;
  sprite.tint = depthTint(cy);
  container.addChild(sprite);

  const [minShrink, maxShrink] = FLOWER_STATE_CHANGE_TICKS_RANGE;
  const phaseTicks =
    minShrink + Math.floor(Math.random() * (maxShrink - minShrink + 1));

  const collapseStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ROTATION;
  const expandStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ROTATION;
  return {
    sprite,
    shadowGfx,
    // Center position for cat overlap detection
    x: cx,
    y: cy,
    drawSize,
    naturalScale: s, // scale at which sprite is drawn at drawSize
    state: STATES.BUDDING,
    scale: 0,
    phaseTick: 0,
    phaseTicks,
    agingTick: 0,
    rotation: 0,
    rotationSpeed:
      AGED_ROTATION_SPEED_RANGE[0] +
      Math.random() *
        (AGED_ROTATION_SPEED_RANGE[1] - AGED_ROTATION_SPEED_RANGE[0]),
    collapseStartAngle,
    expandStartAngle,
    // Falling physics state
    velX: 0,
    velY: 0,
  };
}

export function update(catX, catY, starX, starY) {
  if (flowers.length < MAX_FLOWER_COUNT) {
    spawnTick++;
    if (spawnTick >= FLOWER_SPAWN_INTERVAL) {
      flowers.push(spawnFlower());
      spawnTick = 0;
    }
  }

  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];

    switch (f.state) {
      case STATES.BUDDING: {
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = t * 0.5;
        const angle = f.collapseStartAngle * (1 - t);
        f.sprite.scale.set(f.scale * f.naturalScale * getDepthScale(f.y));
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_BUD;
        if (t >= 1) {
          f.state = STATES.BUD;
        }
        break;
      }

      case STATES.BUD: {
        const dx = catX - f.x;
        const dy = catY - f.y;
        const dist = Math.hypot(dx, dy);
        const threshold = f.drawSize / 2 + CAT_OVERLAP_RADIUS;
        if (dist < threshold) {
          f.state = STATES.BLOOMING;
          f.phaseTick = 0;
        }
        break;
      }

      case STATES.BLOOMING: {
        // No cat overlap reactions while blooming
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 0.5 + t * 0.5;
        const angle = f.expandStartAngle * (1 - t);
        f.sprite.scale.set(f.scale * f.naturalScale * getDepthScale(f.y));
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_BUD + t * (OPACITY_BLOOMED - OPACITY_BUD);
        if (t >= 1) {
          f.state = STATES.BLOOMED;
          f.agingTick = 0;
        }
        break;
      }

      case STATES.BLOOMED: {
        f.agingTick++;
        const t = Math.min(1, f.agingTick / FLOWER_AGING_TIME);
        f.sprite.alpha = OPACITY_BLOOMED + t * (OPACITY_AGED - OPACITY_BLOOMED);
        f.sprite.scale.set(
          (1 + t * AGED_GROWTH_PERCENTAGE) *
            f.naturalScale *
            getDepthScale(f.y),
        );
        f.rotation += f.rotationSpeed;
        f.sprite.rotation = (f.rotation * Math.PI) / 180;

        const dx = catX - f.x;
        const dy = catY - f.y;
        const dist = Math.hypot(dx, dy);
        const threshold = f.drawSize / 2 + CAT_OVERLAP_RADIUS;
        if (t >= 1 && dist < threshold) {
          f.state = STATES.FALLING;
          ringBurst(f.x, f.y);
          const [minH, maxH] = FALL_HORIZONTAL_SPEED_RANGE;
          const hSpeed = minH + Math.random() * (maxH - minH);
          f.velX = (Math.random() < 0.5 ? -1 : 1) * hSpeed;
          const [minJ, maxJ] = FALL_JUMP_SPEED_RANGE;
          f.velY = minJ + Math.random() * (maxJ - minJ);
          f.phaseTick = 0;
        }
        break;
      }

      case STATES.FALLING: {
        // Physics: apply gravity, move sprite
        f.velY += FALL_GRAVITY;
        f.sprite.x += f.velX;
        f.sprite.y += f.velY;
        f.x = f.sprite.x;
        f.y = f.sprite.y;

        // Shrink and fade over time
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 1 - t;
        f.sprite.scale.set(f.scale * f.naturalScale * getDepthScale(f.y));
        f.sprite.alpha = OPACITY_AGED * (1 - t);
        f.sprite.tint = depthTint(f.y);

        if (t >= 1) {
          container.removeChild(f.shadowGfx);
          f.shadowGfx.destroy();
          container.removeChild(f.sprite);
          f.sprite.destroy();
          flowers.splice(i, 1);
          continue;
        }
        break;
      }
    }

    // Update shadow (only reached if the flower was not removed above)
    {
      const sdx = starX - f.x;
      const sdy = starY - f.y;
      const starDist = Math.hypot(sdx, sdy);
      const shadowT = Math.max(0, 1 - starDist / SHADOW_PROXIMITY_THRESHOLD);
      const targetAlpha = shadowT * SHADOW_MAX_ALPHA * f.scale;
      f.shadowGfx.alpha += (targetAlpha - f.shadowGfx.alpha) * 0.1;

      if (f.shadowGfx.alpha > 0.001) {
        // drawSize is the displayed width in screen pixels; scale shadow relative to that
        const depthScale = getDepthScale(f.y);
        const displaySize = f.drawSize * f.scale * depthScale;
        const hw = displaySize * 0.5;
        const hh = displaySize * 0.14;
        const offsetY = displaySize * 0.45;
        f.shadowGfx.clear();
        f.shadowGfx
          .ellipse(f.sprite.x, f.sprite.y + offsetY, hw, hh)
          .fill({ color: SHADOW_COLOUR, alpha: 1 });
      }
    }
  }
}
