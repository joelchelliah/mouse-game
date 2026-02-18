import { Application, Graphics, Text, TextStyle } from "pixi.js";
import {
  container as catContainer,
  init as initCat,
  update as updateCat,
  pos as catPos,
} from "./cat.js";
import {
  container as starContainer,
  update as updateStar,
  state as starState,
} from "./star.js";
import {
  container as particleContainer,
  update as updateParticles,
} from "./particles.js";
import {
  container as flowerContainer,
  init as initFlowers,
  update as updateFlowers,
} from "./flowers.js";
import {
  container as miniStarContainer,
  init as initMiniStars,
  update as updateMiniStars,
} from "./miniStars.js";
import { SKY_FRACTION } from "./config.js";

// Sky colours (top → horizon)
const SKY_COLOUR_TOP = 0x061045; // deep sky blue
const SKY_COLOUR_BOTTOM = 0x164bc2; // pale horizon blue
// Grass colours (horizon → bottom)
const GRASS_COLOUR_TOP = 0x0e1f0e; // dark, desaturated (far away)
const GRASS_COLOUR_BOTTOM = 0x375c15; // richer green (close up)

// Number of discrete colour bands per section — controls "pixelation" of the gradient
const SKY_BANDS = 7;
const GRASS_BANDS = 14;

const HINT_FONT_SIZE = 20; // px
const HINT_COLOUR = "rgba(255,255,255,0.5)";
const HINT_PADDING_BOTTOM = 24; // px from bottom edge

/** Linear interpolation between two 0xRRGGBB colours. t in [0,1]. */
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bv;
}

/**
 * Draw a pixelated (banded) gradient into a Graphics object.
 * @param {Graphics} gfx
 * @param {number} x, y   top-left of the rectangle
 * @param {number} w, h   size
 * @param {number} colourTop   0xRRGGBB at the top
 * @param {number} colourBottom 0xRRGGBB at the bottom
 * @param {number} bands  number of discrete colour steps
 */
function drawBandedGradient(gfx, x, y, w, h, colourTop, colourBottom, bands) {
  const bandH = h / bands;
  for (let i = 0; i < bands; i++) {
    // Snap each band to whole pixels so edges are crisp
    const by = Math.round(y + i * bandH);
    const bh = Math.round(y + (i + 1) * bandH) - by;
    const t = (i + 0.5) / bands;
    const colour = lerpColor(colourTop, colourBottom, t);
    gfx.rect(x, by, w, bh).fill(colour);
  }
}

(async () => {
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false,
  });

  document.body.appendChild(app.canvas);

  // Background: pixelated sky (top 2/5) + pixelated grass (bottom 3/5)
  const skyH = Math.round(app.screen.height * SKY_FRACTION);
  const grassY = skyH;
  const grassH = app.screen.height - grassY;

  const bg = new Graphics();
  drawBandedGradient(
    bg,
    0,
    0,
    app.screen.width,
    skyH,
    SKY_COLOUR_TOP,
    SKY_COLOUR_BOTTOM,
    SKY_BANDS,
  );
  drawBandedGradient(
    bg,
    0,
    grassY,
    app.screen.width,
    grassH,
    GRASS_COLOUR_TOP,
    GRASS_COLOUR_BOTTOM,
    GRASS_BANDS,
  );
  app.stage.addChild(bg);

  // Layer order: bg → miniStars → flowers → cat → star/glow → particles → hint text
  app.stage.addChild(miniStarContainer);
  app.stage.addChild(flowerContainer);
  app.stage.addChild(catContainer);
  app.stage.addChild(starContainer);
  app.stage.addChild(particleContainer);

  // Hint text
  const hintStyle = new TextStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: HINT_FONT_SIZE,
    fill: HINT_COLOUR,
  });
  const hint = new Text({ text: "Meow?", style: hintStyle });
  hint.anchor.set(0.5, 1);
  hint.x = app.screen.width / 2;
  hint.y = app.screen.height - HINT_PADDING_BOTTOM;
  app.stage.addChild(hint);

  // Initialise async components (loads textures)
  initMiniStars();
  await initFlowers();
  await initCat();

  // Input tracking
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;

  function setTarget(clientX, clientY) {
    targetX = clientX;
    targetY = clientY;
  }

  window.addEventListener("mousemove", (e) => setTarget(e.clientX, e.clientY), {
    passive: true,
  });
  window.addEventListener(
    "pointermove",
    (e) => setTarget(e.clientX, e.clientY),
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length)
        setTarget(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );

  // Game loop driven by Pixi's ticker
  app.ticker.add(() => {
    updateMiniStars();
    updateFlowers(catPos.x, catPos.y, starState.x, starState.y);
    updateParticles();
    updateStar(targetX, targetY);
    updateCat(starState.x, starState.y, starState.active);
  });
})();
