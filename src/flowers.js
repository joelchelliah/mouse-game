import { Assets, Container, Sprite, Texture } from "pixi.js";
import { FPS } from "./config.js";

const MAX_FLOWER_COUNT = 20;
const FLOWER_SPAWN_INTERVAL = 3 * FPS;

const FLOWER_COLS = 6;
const FLOWER_ROWS = 6;
const FLOWER_SRC_SIZE = 85;

const FLOWER_DRAW_SIZE_RANGE = [30, 50];
const FLOWER_STATE_CHANGE_TICKS_RANGE = [20, 50];
const FLOWER_MAX_ROTATION = 120;
const CAT_OVERLAP_RADIUS = 40;

const OPACITY_BUD = 0.65;
const OPACITY_BLOSSOM = 0.85;

const FLOWER_AGING_TIME = 2 * FPS;
const OPACITY_AGED = 1;
const AGED_GROWTH_PERCENTAGE = 0.5;
const AGED_GROWTH_ROTATION = -90;

// Falling physics
const FALL_GRAVITY = 0.75;
const FALL_JUMP_SPEED_RANGE = [-12, -8];
const FALL_HORIZONTAL_SPEED_RANGE = [1, 4];

const STATES = {
  BUDDING: "budding",
  BUD: "bud",
  BLOOMING: "blooming",
  BLOSSOM: "blossom",
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
  const fy =
    margin + Math.random() * (window.innerHeight - drawSize - margin * 2);

  const sprite = new Sprite(flowerTextures[row][col]);
  sprite.anchor.set(0.5);
  sprite.x = fx + drawSize / 2;
  sprite.y = fy + drawSize / 2;
  // Scale the sprite so FLOWER_SRC_SIZE maps to drawSize
  const s = drawSize / FLOWER_SRC_SIZE;
  sprite.scale.set(0); // start invisible
  sprite.alpha = OPACITY_BUD;
  container.addChild(sprite);

  const [minShrink, maxShrink] = FLOWER_STATE_CHANGE_TICKS_RANGE;
  const phaseTicks =
    minShrink + Math.floor(Math.random() * (maxShrink - minShrink + 1));

  const collapseStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ROTATION;
  const expandStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ROTATION;
  return {
    sprite,
    // Center position for cat overlap detection
    x: fx + drawSize / 2,
    y: fy + drawSize / 2,
    drawSize,
    naturalScale: s, // scale at which sprite is drawn at drawSize
    state: STATES.BUDDING,
    scale: 0,
    phaseTick: 0,
    phaseTicks,
    agingTick: 0,
    collapseStartAngle,
    expandStartAngle,
    // Falling physics state
    velX: 0,
    velY: 0,
  };
}

export function update(catX, catY) {
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
        f.sprite.scale.set(f.scale * f.naturalScale);
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
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_BUD + t * (OPACITY_BLOSSOM - OPACITY_BUD);
        if (t >= 1) {
          f.state = STATES.BLOSSOM;
          f.agingTick = 0;
        }
        break;
      }

      case STATES.BLOSSOM: {
        f.agingTick++;
        const t = Math.min(1, f.agingTick / FLOWER_AGING_TIME);
        f.sprite.alpha = OPACITY_BLOSSOM + t * (OPACITY_AGED - OPACITY_BLOSSOM);
        f.sprite.scale.set((1 + t * AGED_GROWTH_PERCENTAGE) * f.naturalScale);
        f.sprite.rotation = (t * AGED_GROWTH_ROTATION * Math.PI) / 180;

        const dx = catX - f.x;
        const dy = catY - f.y;
        const dist = Math.hypot(dx, dy);
        const threshold = f.drawSize / 2 + CAT_OVERLAP_RADIUS;
        if (t >= 1 && dist < threshold) {
          f.state = STATES.FALLING;
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
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.alpha = OPACITY_AGED * (1 - t);

        if (t >= 1) {
          container.removeChild(f.sprite);
          f.sprite.destroy();
          flowers.splice(i, 1);
          if (flowers.length < MAX_FLOWER_COUNT) {
            flowers.push(spawnFlower());
          }
        }
        break;
      }
    }
  }
}
