export const FPS = 60;

// --- Sky / grass split ---
// The top SKY_FRACTION of the screen is sky; the rest is grass.
// All depth and flower/cat logic is relative to the grass region.
export const SKY_FRACTION = 1 / 5;

/** Returns the y pixel where the grass begins (sky/grass horizon). */
export function grassTop() {
  return window.innerHeight * SKY_FRACTION;
}

// --- Depth / perspective scaling ---
// The screen is divided into DEPTH_ROWS rows. Objects in the top rows (far away)
// appear smaller; objects in the bottom rows (close) appear larger.
// Tweak DEPTH_SCALE_TOP and DEPTH_SCALE_BOTTOM to taste.
export const DEPTH_ROWS = 10;
export const DEPTH_SCALE_TOP = 0.5; // scale multiplier at y = grassTop() (far away)
export const DEPTH_SCALE_BOTTOM = 2.25; // scale multiplier at y = screen height (close)

/**
 * Returns a depth-based scale multiplier for a given y position.
 * Linearly interpolates between DEPTH_SCALE_TOP (y=grassTop()) and
 * DEPTH_SCALE_BOTTOM (y=screenHeight). For y above the horizon the scale
 * is clamped to DEPTH_SCALE_TOP — objects don't shrink further in the sky.
 */
export function getDepthScale(y) {
  const grassH = window.innerHeight - grassTop();
  const t = Math.max(0, Math.min(1, (y - grassTop()) / grassH));
  return DEPTH_SCALE_TOP + t * (DEPTH_SCALE_BOTTOM - DEPTH_SCALE_TOP);
}

// --- Depth / perspective speed scaling ---
// Independent from the visual scale so you can make vertical movement
// feel much slower at the top without changing how things look.
export const DEPTH_SPEED_SCALE_TOP = 0.2; // vertical speed multiplier at y = grassTop() (far away)
export const DEPTH_SPEED_SCALE_BOTTOM = 1.0; // vertical speed multiplier at y = screen height (close)

/**
 * Returns a depth-based vertical speed multiplier for a given y position.
 * Objects further away (top of grass) move slower vertically.
 * Clamped to DEPTH_SPEED_SCALE_TOP for y above the horizon.
 */
export function getDepthSpeedScale(y) {
  const grassH = window.innerHeight - grassTop();
  const t = Math.max(0, Math.min(1, (y - grassTop()) / grassH));
  return (
    DEPTH_SPEED_SCALE_TOP +
    t * (DEPTH_SPEED_SCALE_BOTTOM - DEPTH_SPEED_SCALE_TOP)
  );
}
