import { update as updateCat } from "./cat.js";
import { update as updateStar, x as starX, y as starY, active as starActive } from "./star.js";
import { init as initFlowers, update as updateFlowers } from "./flowers.js";

initFlowers();

let targetX = window.innerWidth / 2;
let targetY = window.innerHeight / 2;

function setTarget(clientX, clientY) {
  targetX = clientX;
  targetY = clientY;
}

function onPointer(e) {
  setTarget(e.clientX, e.clientY);
}

document.addEventListener("mousemove", onPointer, { passive: true });
document.addEventListener("pointermove", onPointer, { passive: true });
document.addEventListener(
  "touchmove",
  function (e) {
    if (e.touches.length) setTarget(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: true },
);

function tick() {
  updateFlowers();
  updateStar(targetX, targetY);
  updateCat(starX, starY, starActive);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
