import { Container, Graphics } from "pixi.js";

const BURST_COUNT_ACTIVE = 18;
const BURST_COUNT_PASSIVE = 10;
const BURST_SPEED_ACTIVE = 8;   // px/tick at full speed
const BURST_SPEED_PASSIVE = 5;
const BURST_SPEED_VARIANCE = 0.6;  // minimum speed multiplier (range: VARIANCE → VARIANCE+0.8)
const PARTICLE_LIFE = 25;          // ticks until fully faded
const PARTICLE_SIZE_ACTIVE = 12;   // px diameter
const PARTICLE_SIZE_PASSIVE = 8;
const PARTICLE_DRAG = 0.92;        // velocity multiplier per tick (1 = no drag, 0 = instant stop)

const COLOURS_ACTIVE  = [0xffe066, 0xf0a500, 0xfff4a0, 0xffcc00];
const COLOURS_PASSIVE = [0xaad4ff, 0x6699cc, 0xcceeff, 0xffffff];

export const container = new Container();

let particles = [];

export function burst(originX, originY, toActive) {
  const colours = toActive ? COLOURS_ACTIVE : COLOURS_PASSIVE;
  const burstCount = toActive ? BURST_COUNT_ACTIVE : BURST_COUNT_PASSIVE;
  const burstSpeed = toActive ? BURST_SPEED_ACTIVE : BURST_SPEED_PASSIVE;
  const particleSize = toActive ? PARTICLE_SIZE_ACTIVE : PARTICLE_SIZE_PASSIVE;

  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    const speed = burstSpeed * (BURST_SPEED_VARIANCE + Math.random() * 0.8);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const colour = colours[Math.floor(Math.random() * colours.length)];

    const gfx = new Graphics();
    gfx.circle(0, 0, particleSize / 2).fill(colour);
    gfx.x = originX;
    gfx.y = originY;
    container.addChild(gfx);

    particles.push({
      gfx,
      x: originX,
      y: originY,
      vx,
      vy,
      life: PARTICLE_LIFE,
    });
  }
}

export function update() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= PARTICLE_DRAG;
    p.vy *= PARTICLE_DRAG;
    p.life--;

    const progress = p.life / PARTICLE_LIFE;
    p.gfx.x = p.x;
    p.gfx.y = p.y;
    p.gfx.alpha = progress;
    p.gfx.scale.set(progress);

    if (p.life <= 0) {
      container.removeChild(p.gfx);
      p.gfx.destroy();
      particles.splice(i, 1);
    }
  }
}
