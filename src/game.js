import { Application, Text, TextStyle } from "pixi.js";
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

const GRASS_COLOUR = 0x092815; // rgb(9, 40, 21)
const HINT_FONT_SIZE = 20; // px
const HINT_COLOUR = "rgba(255,255,255,0.5)";
const HINT_PADDING_BOTTOM = 24; // px from bottom edge

(async () => {
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: GRASS_COLOUR,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false,
  });

  document.body.appendChild(app.canvas);

  // Layer order: flowers → cat → star/glow → particles → hint text
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
    updateFlowers(catPos.x, catPos.y);
    updateParticles();
    updateStar(targetX, targetY);
    updateCat(starState.x, starState.y, starState.active);
  });
})();
