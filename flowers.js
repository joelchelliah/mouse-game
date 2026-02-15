const FLOWER_COUNT = 20;
const FLOWER_COLS = 6;
const FLOWER_ROWS = 6;
const FLOWER_SRC_SIZE = 85; // px per cell in source image
const FLOWER_DRAW_SIZE_RANGE = [20, 80]; // display px range
const FLOWER_MIN_LIFE = 4 * 60; // 3 seconds at 60fps
const FLOWER_MAX_LIFE = 12 * 60; // 8 seconds at 60fps
const SHRINK_TICKS = 45; // ticks to shrink out before removal
const FLOWER_MAX_ANGLE = 90; // max rotation in degrees during grow/shrink

const img = new Image();
img.src = "assets/flowers.png";

let flowers = [];

function randomLife() {
  return (
    FLOWER_MIN_LIFE +
    Math.floor(Math.random() * (FLOWER_MAX_LIFE - FLOWER_MIN_LIFE + 1))
  );
}

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

  const startAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;
  const endAngle = (Math.random() - 0.5) * 2 * FLOWER_MAX_ANGLE;

  return {
    el,
    ticksLeft: randomLife(),
    shrinking: false,
    shrinkTick: 0,
    scale: 0,
    growing: true,
    startAngle,
    endAngle,
  };
}

function removeFlower(flower) {
  flower.el.remove();
}

export function init() {
  // Wait for image so background-image is valid before spawning
  img.onload = function () {
    for (let i = 0; i < FLOWER_COUNT; i++) {
      flowers.push(spawnFlower());
    }
  };
  // If already loaded (cached)
  if (img.complete) img.onload();
}

export function update() {
  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];

    if (f.growing) {
      f.scale = Math.min(1, f.scale + 1 / SHRINK_TICKS);
      const angle = f.startAngle * (1 - f.scale);
      f.el.style.transform =
        "scale(" + f.scale.toFixed(3) + ") rotate(" + angle.toFixed(2) + "deg)";
      if (f.scale >= 1) f.growing = false;
      continue;
    }

    if (f.shrinking) {
      f.shrinkTick++;
      const s = Math.max(0, 1 - f.shrinkTick / SHRINK_TICKS);
      const angle = f.endAngle * (1 - s);
      f.el.style.transform =
        "scale(" + s.toFixed(3) + ") rotate(" + angle.toFixed(2) + "deg)";
      if (f.shrinkTick >= SHRINK_TICKS) {
        removeFlower(f);
        flowers.splice(i, 1);
        flowers.push(spawnFlower());
      }
      continue;
    }

    f.ticksLeft--;
    if (f.ticksLeft <= 0) {
      f.shrinking = true;
    }
  }
}
