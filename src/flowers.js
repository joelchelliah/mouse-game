import { Assets, Container, Sprite, Spritesheet, Texture } from "pixi.js";
import { FPS } from "./config.js";

const MAX_FLOWER_COUNT = 20;
const FLOWER_SPAWN_INTERVAL = 3 * FPS;
const FLOWER_COLS = 6;
const FLOWER_ROWS = 6;
const FLOWER_SRC_SIZE = 85;
const FLOWER_DRAW_SIZE_RANGE = [60, 110];
const FLOWER_MAX_LIFE = 10 * FPS;
const SHRINK_TICKS_RANGE = [30, 80];
const FLOWER_MAX_ANGLE = 90;
const FLOWER_DECAY_TIME = 3 * FPS;
const CAT_OVERLAP_RADIUS = 40;
const OPACITY_COLLAPSED = 0.6;
const OPACITY_EXPANDED = 0.85;

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
        })
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
  const fx = margin + Math.random() * (window.innerWidth - drawSize - margin * 2);
  const fy = margin + Math.random() * (window.innerHeight - drawSize - margin * 2);

  const sprite = new Sprite(flowerTextures[row][col]);
  sprite.anchor.set(0.5);
  sprite.x = fx + drawSize / 2;
  sprite.y = fy + drawSize / 2;
  // Scale the sprite so FLOWER_SRC_SIZE maps to drawSize
  const s = drawSize / FLOWER_SRC_SIZE;
  sprite.scale.set(0); // start invisible
  sprite.alpha = OPACITY_COLLAPSED;
  container.addChild(sprite);

  const [minShrink, maxShrink] = SHRINK_TICKS_RANGE;
  const phaseTicks = minShrink + Math.floor(Math.random() * (maxShrink - minShrink + 1));

  const collapseStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const expandStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const expandEndAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const collapseEndAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;

  return {
    sprite,
    // Center position for cat overlap detection
    x: fx + drawSize / 2,
    y: fy + drawSize / 2,
    drawSize,
    naturalScale: s, // scale at which sprite is drawn at drawSize
    state: "growing-collapsed",
    scale: 0,
    phaseTick: 0,
    phaseTicks,
    expandedTicks: 0,
    decayTick: 0,
    collapseStartAngle,
    expandStartAngle,
    expandEndAngle,
    collapseEndAngle,
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
      case "growing-collapsed": {
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = t * 0.5;
        const angle = f.collapseStartAngle * (1 - t);
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_COLLAPSED;
        if (t >= 1) {
          f.state = "collapsed";
          f.decayTick = 0;
        }
        break;
      }

      case "collapsed": {
        const dx = catX - f.x;
        const dy = catY - f.y;
        const dist = Math.hypot(dx, dy);
        const threshold = f.drawSize / 2 + CAT_OVERLAP_RADIUS;
        if (dist < threshold) {
          f.state = "growing-expanded";
          f.phaseTick = 0;
        } else {
          f.decayTick++;
          if (f.decayTick >= FLOWER_DECAY_TIME) {
            f.state = "shrinking";
            f.phaseTick = 0;
          }
        }
        break;
      }

      case "growing-expanded": {
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 0.5 + t * 0.5;
        const angle = f.expandStartAngle * (1 - t);
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_COLLAPSED + t * (OPACITY_EXPANDED - OPACITY_COLLAPSED);
        if (t >= 1) {
          f.state = "expanded";
          f.expandedTicks = 0;
        }
        break;
      }

      case "expanded": {
        f.sprite.alpha = OPACITY_EXPANDED;
        f.expandedTicks++;
        if (f.expandedTicks >= FLOWER_MAX_LIFE) {
          f.state = "collapsing";
          f.phaseTick = 0;
        }
        break;
      }

      case "collapsing": {
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 1 - t * 0.5;
        const angle = f.collapseEndAngle * t;
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_EXPANDED - t * (OPACITY_EXPANDED - OPACITY_COLLAPSED);
        if (t >= 1) {
          f.state = "collapsed";
          f.decayTick = 0;
        }
        break;
      }

      case "shrinking": {
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 0.5 * (1 - t);
        const angle = f.expandEndAngle * t;
        f.sprite.scale.set(f.scale * f.naturalScale);
        f.sprite.rotation = (angle * Math.PI) / 180;
        f.sprite.alpha = OPACITY_COLLAPSED;
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
