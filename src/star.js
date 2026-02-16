import { Container, Graphics } from "pixi.js";
import { burst } from "./particles.js";

const STAR_MIN_SIZE = 1.0;
const STAR_MAX_SIZE = 2.0;
const STAR_ROT_MIN_SPEED = 0.75; // degrees per frame when pointer is still
const STAR_ROT_MAX_SPEED = 7.5; // degrees per frame when pointer is moving fast
const STAR_LERP = 0.1;

// Star polygon points (10-point star, outer r=20, inner r=8)
const STAR_OUTER = 20;
const STAR_INNER = 8;
const STAR_POINTS = 5;

const GLOW_RADIUS = 100;
const BRIGHTNESS_MULTIPLIER = 0.04;
const COLOUR = 0xffe066;

export const container = new Container();

// --- Glow light ---
const lightGfx = new Graphics();
// Drawn as a filled circle; we use a radial-ish approach with a simple alpha circle.
// mix-blend-mode: screen is replicated via Pixi blendMode.
lightGfx.blendMode = "screen";
container.addChild(lightGfx);

function drawLight(radius, alpha) {
  lightGfx.clear();
  // Approximate the CSS radial-gradient with concentric fills
  for (let i = 10; i >= 1; i--) {
    const r = (i / 10) * radius;
    const t = i / 10; // 1 at center, 0.1 at edge
    // Inner colour: warm golden (matches oklch 90% warm)
    // Outer colour: more transparent golden
    const a = alpha * t * t;
    lightGfx
      .circle(0, 0, r)
      .fill({ color: COLOUR, alpha: a * BRIGHTNESS_MULTIPLIER });
  }
}

// --- Star shape ---
const starGfx = new Graphics();
container.addChild(starGfx);

function drawStar() {
  starGfx.clear();
  const pts = [];
  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const r = i % 2 === 0 ? STAR_OUTER : STAR_INNER;
    const a = (i / (STAR_POINTS * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  starGfx
    .poly(pts)
    .fill(0xffe066)
    .stroke({ color: 0xf0a500, width: 1.5, join: "round" });
}
drawStar();

// Pulsing animation state (replicates the CSS star-radiate keyframe)
let pulseT = 0;
const PULSE_SPEED = (2 * Math.PI) / 60; // one cycle per second at 60fps

export const state = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  active: true,
};

let x = state.x;
let y = state.y;
let prevTargetX = x;
let prevTargetY = y;
let scale = 1;
let angle = 0;

function setActive(value) {
  state.active = value;
  burst(x, y, state.active);
}

document.addEventListener("click", () => setActive(!state.active));

export function update(targetX, targetY) {
  x += (targetX - x) * STAR_LERP;
  y += (targetY - y) * STAR_LERP;

  const pointerSpeed = Math.hypot(targetX - prevTargetX, targetY - prevTargetY);
  prevTargetX = targetX;
  prevTargetY = targetY;

  state.x = x;
  state.y = y;

  const targetScale = state.active
    ? STAR_MIN_SIZE +
      Math.min(pointerSpeed / 20, 1) * (STAR_MAX_SIZE - STAR_MIN_SIZE)
    : STAR_MIN_SIZE;
  scale += (targetScale - scale) * 0.15;

  const rotSpeed =
    STAR_ROT_MIN_SPEED +
    Math.min(pointerSpeed / 20, 1) * (STAR_ROT_MAX_SPEED - STAR_ROT_MIN_SPEED);
  angle = (angle + rotSpeed) % 360;

  // Pulsing brightness (replicates star-radiate CSS animation)
  pulseT += PULSE_SPEED;
  const pulseFactor = 0.5 + 0.5 * Math.sin(pulseT); // 0..1

  container.x = x;
  container.y = y;

  if (state.active) {
    starGfx.scale.set(scale);
    starGfx.rotation = (angle * Math.PI) / 180;
    starGfx.alpha = 1;
    lightGfx.visible = true;
    drawLight(GLOW_RADIUS, 0.4 + pulseFactor * 0.2);
    lightGfx.scale.set(0.8 + pulseFactor * 0.2);
    lightGfx.alpha = Math.min(0.6 + pulseFactor * 0.5, 1);
  } else {
    starGfx.scale.set(STAR_MIN_SIZE);
    starGfx.rotation = (angle * Math.PI) / 180;
    starGfx.alpha = 0.4;
    lightGfx.visible = false;
  }
}
