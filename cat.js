const CAT_RUN_SPEED = 0.025;
const CAT_WALK_SPEED = 0.015;
const CAT_START_DIST = 200; // px from star before cat begins moving
const CAT_STOP_DIST = 100; // px from star before cat stops moving
const CAT_RUN_DIST = 400; // px from star before cat runs instead of walks
const FRAME_W = 128; // display px per frame
const TICKS_PER_FRAME_RUNNING = 4;
const TICKS_PER_FRAME_WALKING = 6;
const TICKS_PER_FRAME_IDLE = 8;
const IDLE_LICK_THRESHOLD = 20; // animation frames before lick triggers
const SPRITES = {
  walk: { url: "assets/cat/walk.png", frames: 8 },
  run: { url: "assets/cat/run.png", frames: 8 },
  sit: { url: "assets/cat/sit.png", frames: 4 },
  sit2: { url: "assets/cat/sit2.png", frames: 4 },
  lick: { url: "assets/cat/lick.png", frames: 4 },
  lick2: { url: "assets/cat/lick2.png", frames: 4 },
};

const el = document.getElementById("cat");

export let x = window.innerWidth / 2;
export let y = window.innerHeight / 2;
let moving = false;
let frameTick = 0;
let frame = 0;
let currentSprite = "walk";

// Idle animation state machine
let idleFrames = 0; // counts completed animation frames while idle
let lickPlaysLeft = 0; // how many full lick cycles remain
let idlePhase = "sit"; // "sit" | "lick"
let nextSitSprite = "sit"; // which sit variant plays next

function setSprite(name) {
  currentSprite = name;
  frame = 0;
  frameTick = 0;
  const s = SPRITES[name];
  el.style.backgroundImage = "url('" + s.url + "')";
  el.style.backgroundSize = s.frames * FRAME_W + "px " + FRAME_W + "px";
  el.style.backgroundPosition = "0 0";
}

export function update(starX, starY, active) {
  const dx = starX - x;
  const dy = starY - y;
  const dist = Math.hypot(dx, dy);

  if (active) {
    if (!moving && dist > CAT_START_DIST) moving = true;
    if (moving && dist < CAT_STOP_DIST) moving = false;
  } else {
    moving = false;
  }

  if (moving) {
    const speed = dist > CAT_RUN_DIST ? CAT_RUN_SPEED : CAT_WALK_SPEED;
    x += dx * speed;
    y += dy * speed;
  }

  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.transform =
    "translate(-50%, -50%) scaleX(" + (dx < 0 ? -1 : 1) + ")";

  // Detect movement → idle transition and reset idle state
  const wasMoving = currentSprite === "walk" || currentSprite === "run";
  if (wasMoving && !moving) {
    idleFrames = 0;
    idlePhase = "sit";
    nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
  }

  // Determine desired sprite
  const desiredSprite = moving
    ? dist > CAT_RUN_DIST
      ? "run"
      : "walk"
    : idlePhase === "lick"
      ? currentSprite
      : nextSitSprite;

  if (desiredSprite !== currentSprite) setSprite(desiredSprite);

  const ticksPerFrame = !moving
    ? TICKS_PER_FRAME_IDLE
    : dist > CAT_RUN_DIST
      ? TICKS_PER_FRAME_RUNNING
      : TICKS_PER_FRAME_WALKING;

  if (++frameTick >= ticksPerFrame) {
    frameTick = 0;
    frame = (frame + 1) % SPRITES[currentSprite].frames;
    el.style.backgroundPosition = -frame * FRAME_W + "px 0";

    // On completing a full animation cycle (looped back to frame 0)
    if (!moving && frame === 0) {
      idleFrames += SPRITES[currentSprite].frames;

      if (idlePhase === "lick") {
        lickPlaysLeft--;
        if (lickPlaysLeft <= 0) {
          // Done licking — return to sit
          idlePhase = "sit";
          idleFrames = 0;
          nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
        }
        // else keep playing the same lick sprite again
      } else {
        // idlePhase === "sit"
        if (idleFrames >= IDLE_LICK_THRESHOLD) {
          // Trigger lick sequence
          idlePhase = "lick";
          lickPlaysLeft = 2;
          setSprite(Math.random() < 0.5 ? "lick" : "lick2");
        } else {
          // Pick next sit variant randomly
          nextSitSprite = Math.random() < 0.5 ? "sit" : "sit2";
        }
      }
    }
  }
}
