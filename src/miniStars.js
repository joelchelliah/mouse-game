import { Container, Graphics } from "pixi.js";
import { FPS, grassTop } from "./config.js";

// How many mini-stars to keep alive at all times
const MINI_STAR_COUNT = 10;

// Lifetime range in seconds
const LIFETIME_MIN = 2 * FPS;
const LIFETIME_MAX = 5 * FPS;

// Fade duration (ticks) at each end of the lifetime
const FADE_TICKS = 30;

// Star shape — much smaller than the main star
const STAR_OUTER = 3;
const STAR_INNER = 1;
const STAR_POINTS = 5;
const STAR_COLOUR = 0xffe066;
const STAR_STROKE_COLOUR = 0xf0a500;

// Extra margin kept away from the sky/grass horizon so stars don't bleed onto the grass
const BOTTOM_MARGIN = 40; // px

// Rotation: slow, constant, random direction per star
const ROT_SPEED_RANGE = [0.25, 1.75]; // degrees per frame

// Glow
const GLOW_RADIUS = 28;
const GLOW_COLOUR = 0xffe066;
const GLOW_BRIGHTNESS = 0.05;

// Pulse (same formula as main star)
const PULSE_SPEED = (2 * Math.PI) / 60; // one cycle per second at 60 fps
const GLOW_SCALE_MIN = 0.8;
const GLOW_SCALE_RANGE = 0.2;
const GLOW_ALPHA_MIN = 0.5;
const GLOW_ALPHA_RANGE = 0.4;
const GLOW_DRAW_ALPHA_MIN = 0.35;
const GLOW_DRAW_ALPHA_RANGE = 0.2;

// Master opacity for all mini-stars (0 = invisible, 1 = full)
const MINI_STAR_ALPHA = 0.7;

export const container = new Container();
container.alpha = MINI_STAR_ALPHA;

let stars = [];

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildStarGraphics() {
  const gfx = new Graphics();
  const pts = [];
  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const r = i % 2 === 0 ? STAR_OUTER : STAR_INNER;
    const a = (i / (STAR_POINTS * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  gfx
    .poly(pts)
    .fill(STAR_COLOUR)
    .stroke({ color: STAR_STROKE_COLOUR, width: 1, join: "round" });
  return gfx;
}

function buildGlowGraphics() {
  const gfx = new Graphics();
  gfx.blendMode = "screen";
  return gfx;
}

function drawGlow(gfx, radius, alpha) {
  gfx.clear();
  for (let i = 10; i >= 1; i--) {
    const r = (i / 10) * radius;
    const t = i / 10;
    const a = alpha * t * t;
    gfx
      .circle(0, 0, r)
      .fill({ color: GLOW_COLOUR, alpha: a * GLOW_BRIGHTNESS });
  }
}

function spawnStar() {
  // Random position anywhere in the sky region, with a small margin
  const margin = STAR_OUTER * 2;
  const skyH = grassTop();
  const sx = margin + Math.random() * (window.innerWidth - margin * 2);
  const sy = margin + Math.random() * (skyH - margin - BOTTOM_MARGIN);

  const lifetime =
    LIFETIME_MIN +
    Math.floor(Math.random() * (LIFETIME_MAX - LIFETIME_MIN + 1));

  const [minRot, maxRot] = ROT_SPEED_RANGE;
  const rotSpeed =
    (minRot + Math.random() * (maxRot - minRot)) *
    (Math.random() < 0.5 ? 1 : -1);

  // Per-star container so we can position/alpha the whole thing together
  const c = new Container();
  c.x = sx;
  c.y = sy;

  const glowGfx = buildGlowGraphics();
  c.addChild(glowGfx);

  const starGfx = buildStarGraphics();
  c.addChild(starGfx);

  container.addChild(c);

  return {
    c,
    starGfx,
    glowGfx,
    tick: 0,
    lifetime,
    rotSpeed,
    angle: Math.random() * 360,
    pulseT: Math.random() * Math.PI * 2, // stagger pulses between stars
  };
}

// ─── public API ──────────────────────────────────────────────────────────────

export function init() {
  stars = [];
  // Fill initial pool immediately so the sky isn't empty at startup
  for (let i = 0; i < MINI_STAR_COUNT; i++) {
    stars.push(spawnStar());
  }
}

export function update() {
  // Top up destroyed stars
  while (stars.length < MINI_STAR_COUNT) {
    stars.push(spawnStar());
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.tick++;

    // Fade in / out envelope
    const fadeIn = Math.min(1, s.tick / FADE_TICKS);
    const fadeOut = Math.min(1, (s.lifetime - s.tick) / FADE_TICKS);
    const envelope = Math.min(fadeIn, fadeOut);

    // Destroy when lifetime is over
    if (s.tick >= s.lifetime) {
      container.removeChild(s.c);
      s.c.destroy({ children: true });
      stars.splice(i, 1);
      continue;
    }

    // Rotation
    s.angle = (s.angle + s.rotSpeed) % 360;
    s.starGfx.rotation = (s.angle * Math.PI) / 180;

    // Pulse
    s.pulseT += PULSE_SPEED;
    const pulseFactor = 0.5 + 0.5 * Math.sin(s.pulseT); // 0..1

    // Glow
    drawGlow(
      s.glowGfx,
      GLOW_RADIUS,
      GLOW_DRAW_ALPHA_MIN + pulseFactor * GLOW_DRAW_ALPHA_RANGE,
    );
    s.glowGfx.scale.set(GLOW_SCALE_MIN + pulseFactor * GLOW_SCALE_RANGE);
    s.glowGfx.alpha =
      (GLOW_ALPHA_MIN + pulseFactor * GLOW_ALPHA_RANGE) * envelope;

    // Star shape alpha
    s.starGfx.alpha = envelope;
  }
}
