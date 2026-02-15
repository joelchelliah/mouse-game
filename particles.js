const BURST_COUNT_ACTIVE = 18; // particles per burst
const BURST_COUNT_PASSIVE = 10; // particles per burst
const BURST_SPEED_ACTIVE = 8; // px per tick at full speed
const BURST_SPEED_PASSIVE = 5; // px per tick at full speed
const PARTICLE_LIFE = 25; // ticks until fully faded
const PARTICLE_SIZE_ACTIVE = 12; // px
const PARTICLE_SIZE_PASSIVE = 8; // px

// Colour palettes per state transition
const COLOURS_ACTIVE = ["#ffe066", "#f0a500", "#fff4a0", "#ffcc00"];
const COLOURS_PASSIVE = ["#aad4ff", "#6699cc", "#cceeff", "#ffffff"];

let particles = [];

export function burst(originX, originY, toActive) {
  const colours = toActive ? COLOURS_ACTIVE : COLOURS_PASSIVE;
  const burstCount = toActive ? BURST_COUNT_ACTIVE : BURST_COUNT_PASSIVE;
  const burstSpeed = toActive ? BURST_SPEED_ACTIVE : BURST_SPEED_PASSIVE;
  const particleSize = toActive ? PARTICLE_SIZE_ACTIVE : PARTICLE_SIZE_PASSIVE;

  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    const speed = burstSpeed * (0.6 + Math.random() * 0.8);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const colour = colours[Math.floor(Math.random() * colours.length)];

    const el = document.createElement("div");
    el.className = "particle";
    el.style.width = particleSize + "px";
    el.style.height = particleSize + "px";
    el.style.background = colour;
    el.style.left = originX + "px";
    el.style.top = originY + "px";
    document.body.appendChild(el);

    particles.push({ el, x: originX, y: originY, vx, vy, life: PARTICLE_LIFE });
  }
}

export function update() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92; // drag
    p.vy *= 0.92;
    p.life--;

    const progress = p.life / PARTICLE_LIFE;
    p.el.style.left = p.x + "px";
    p.el.style.top = p.y + "px";
    p.el.style.opacity = progress.toFixed(3);
    p.el.style.transform =
      "translate(-50%, -50%) scale(" + progress.toFixed(3) + ")";

    if (p.life <= 0) {
      p.el.remove();
      particles.splice(i, 1);
    }
  }
}
