import { burst } from "./particles.js";

const STAR_MIN_SIZE = 1.0; // scale when pointer is still
const STAR_MAX_SIZE = 2.0; // scale when pointer is moving fast
const STAR_ROT_MIN_SPEED = 0.75; // degrees per frame when pointer is still
const STAR_ROT_MAX_SPEED = 7.5; // degrees per frame when pointer is moving fast
const STAR_LERP = 0.1; // how quickly star catches pointer (0=never, 1=instant)

const el = document.getElementById("star");
const lightEl = document.getElementById("star-light");

export let x = window.innerWidth / 2;
export let y = window.innerHeight / 2;
export let active = true;

let prevTargetX = x;
let prevTargetY = y;
let scale = 1;
let angle = 0;

function setActive(value) {
  active = value;
  el.classList.toggle("star--passive", !active);
  lightEl.classList.toggle("star--passive", !active);
  burst(x, y, active);
}

document.addEventListener("click", function () {
  setActive(!active);
});

export function update(targetX, targetY) {
  // lerp star position toward raw pointer
  x += (targetX - x) * STAR_LERP;
  y += (targetY - y) * STAR_LERP;

  const pointerSpeed = Math.hypot(targetX - prevTargetX, targetY - prevTargetY);
  prevTargetX = targetX;
  prevTargetY = targetY;

  const targetScale = active
    ? STAR_MIN_SIZE +
      Math.min(pointerSpeed / 20, 1) * (STAR_MAX_SIZE - STAR_MIN_SIZE)
    : STAR_MIN_SIZE;
  scale += (targetScale - scale) * 0.15;

  const rotSpeed =
    STAR_ROT_MIN_SPEED +
    Math.min(pointerSpeed / 20, 1) * (STAR_ROT_MAX_SPEED - STAR_ROT_MIN_SPEED);
  angle = (angle + rotSpeed) % 360;

  el.style.left = x + "px";
  el.style.top = y + "px";
  lightEl.style.left = x + "px";
  lightEl.style.top = y + "px";
  el.style.transform =
    "translate(-50%, -50%) scale(" +
    scale.toFixed(3) +
    ") rotate(" +
    angle.toFixed(1) +
    "deg)";
}
