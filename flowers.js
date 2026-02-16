import { FPS } from "./config.js";

const MAX_FLOWER_COUNT = 20;
const FLOWER_SPAWN_INTERVAL = 3 * FPS;
const FLOWER_COLS = 6;
const FLOWER_ROWS = 6;
const FLOWER_SRC_SIZE = 85; // px per cell in source image
const FLOWER_DRAW_SIZE_RANGE = [60, 110]; // display px range
const FLOWER_MAX_LIFE = 10 * FPS; // ticks in expanded state before collapsing
const SHRINK_TICKS_RANGE = [30, 80]; // ticks for each grow/shrink phase
const FLOWER_MAX_ANGLE = 90; // max rotation in degrees during grow/shrink
const FLOWER_DECAY_TIME = 3 * FPS; // ticks in collapsed state before dying
const CAT_OVERLAP_RADIUS = 40; // px from flower center to trigger expand
const OPACITY_COLLAPSED = 0.6;
const OPACITY_EXPANDED = 0.85;

const img = new Image();
img.src = "assets/flowers.png";

let flowers = [];
let spawnTick = 0;

function spawnFlower() {
  const col = Math.floor(Math.random() * FLOWER_COLS);
  const row = Math.floor(Math.random() * FLOWER_ROWS);
  const [minSize, maxSize] = FLOWER_DRAW_SIZE_RANGE;
  const drawSize = minSize + Math.random() * (maxSize - minSize);
  const margin = maxSize;
  const x =
    margin + Math.random() * (window.innerWidth - drawSize - margin * 2);
  const y =
    margin + Math.random() * (window.innerHeight - drawSize - margin * 2);

  const el = document.createElement("div");
  el.className = "flower";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.width = drawSize + "px";
  el.style.height = drawSize + "px";
  const bgScale = drawSize / FLOWER_SRC_SIZE;
  const bgSize = FLOWER_SRC_SIZE * FLOWER_COLS * bgScale;
  el.style.backgroundSize = bgSize + "px " + bgSize + "px";
  el.style.backgroundPosition =
    -(col * FLOWER_SRC_SIZE * bgScale) +
    "px " +
    -(row * FLOWER_SRC_SIZE * bgScale) +
    "px";
  el.style.transform = "scale(0)";
  document.body.appendChild(el);

  const [minShrink, maxShrink] = SHRINK_TICKS_RANGE;
  const phaseTicks =
    minShrink + Math.floor(Math.random() * (maxShrink - minShrink + 1));

  // Each grow/shrink phase gets its own pair of angles
  const collapseStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const expandStartAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const expandEndAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const collapseEndAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;

  return {
    el,
    x: x + drawSize / 2, // center for overlap detection
    y: y + drawSize / 2,
    drawSize,
    // state: "growing-collapsed" | "collapsed" | "growing-expanded" | "expanded" | "collapsing" | "shrinking"
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

function removeFlower(flower) {
  flower.el.remove();
}

export function init() {
  flowers = [];
  spawnTick = FLOWER_SPAWN_INTERVAL;
}

export function update(catX, catY) {
  // Gradually spawn flowers up to MAX_FLOWER_COUNT, one every 10 seconds
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
        // Grow from 0 → 0.5, with rotation from collapseStartAngle → 0
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = t * 0.5;
        const angle = f.collapseStartAngle * (1 - t);
        f.el.style.transform =
          "scale(" +
          f.scale.toFixed(3) +
          ") rotate(" +
          angle.toFixed(2) +
          "deg)";
        f.el.style.opacity = OPACITY_COLLAPSED;
        if (t >= 1) {
          f.state = "collapsed";
          f.decayTick = 0;
        }
        break;
      }

      case "collapsed": {
        // Check cat overlap → expand; otherwise decay
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
        // Grow from 0.5 → 1, with rotation from expandStartAngle → 0
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 0.5 + t * 0.5;
        const angle = f.expandStartAngle * (1 - t);
        f.el.style.transform =
          "scale(" +
          f.scale.toFixed(3) +
          ") rotate(" +
          angle.toFixed(2) +
          "deg)";
        f.el.style.opacity = (
          OPACITY_COLLAPSED +
          t * (OPACITY_EXPANDED - OPACITY_COLLAPSED)
        ).toFixed(3);
        if (t >= 1) {
          f.state = "expanded";
          f.expandedTicks = 0;
        }
        break;
      }

      case "expanded": {
        f.el.style.opacity = OPACITY_EXPANDED;
        f.expandedTicks++;
        if (f.expandedTicks >= FLOWER_MAX_LIFE) {
          f.state = "collapsing";
          f.phaseTick = 0;
        }
        break;
      }

      case "collapsing": {
        // Shrink from 1 → 0.5, with rotation from 0 → collapseEndAngle
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 1 - t * 0.5;
        const angle = f.collapseEndAngle * t;
        f.el.style.transform =
          "scale(" +
          f.scale.toFixed(3) +
          ") rotate(" +
          angle.toFixed(2) +
          "deg)";
        f.el.style.opacity = (
          OPACITY_EXPANDED -
          t * (OPACITY_EXPANDED - OPACITY_COLLAPSED)
        ).toFixed(3);
        if (t >= 1) {
          f.state = "collapsed";
          f.decayTick = 0;
        }
        break;
      }

      case "shrinking": {
        // Shrink from 0.5 → 0, with rotation from 0 → expandEndAngle
        f.phaseTick++;
        const t = Math.min(1, f.phaseTick / f.phaseTicks);
        f.scale = 0.5 * (1 - t);
        const angle = f.expandEndAngle * t;
        f.el.style.transform =
          "scale(" +
          f.scale.toFixed(3) +
          ") rotate(" +
          angle.toFixed(2) +
          "deg)";
        f.el.style.opacity = OPACITY_COLLAPSED;
        if (t >= 1) {
          removeFlower(f);
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
