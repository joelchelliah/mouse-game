(function () {
  const cat = document.getElementById("cat");
  const star = document.getElementById("star");
  // --- Tuning constants ---
  const CAT_MAX_SPEED = 0.025; // lerp factor when chasing (higher = faster)
  const CAT_START_DIST = 200; // px from star before cat begins moving
  const CAT_STOP_DIST = 100; // px from star before cat stops moving

  const STAR_MIN_SIZE = 1.0; // scale when pointer is still
  const STAR_MAX_SIZE = 2.5; // scale when pointer is moving fast
  const STAR_ROT_MIN_SPEED = 0.75; // degrees per frame when pointer is still
  const STAR_ROT_MAX_SPEED = 7.5; // degrees per frame when pointer is moving fast
  const STAR_LERP = 0.25; // how quickly star catches pointer (0=never, 1=instant)
  // -------------------------

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let starX = targetX;
  let starY = targetY;
  let x = targetX;
  let y = targetY;
  let prevTargetX = targetX;
  let prevTargetY = targetY;
  let starScale = 1;
  let starAngle = 0;
  let moving = false;
  let frameTick = 0;
  let frame = 0;
  const FRAME_W = 128; // display px per frame
  const TICKS_PER_FRAME = 6; // ~10fps at 60fps
  const SPRITES = {
    walk: { url: "assets/walk.png", frames: 8 },
    sit: { url: "assets/sit.png", frames: 4 },
  };
  let currentSprite = "walk";

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
      if (e.touches.length)
        setTarget(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );

  function tick() {
    const dx = starX - x;
    const dy = starY - y;
    const dist = Math.hypot(dx, dy);
    if (!moving && dist > CAT_START_DIST) moving = true;
    if (moving && dist < CAT_STOP_DIST) moving = false;
    if (moving) {
      x += dx * CAT_MAX_SPEED;
      y += dy * CAT_MAX_SPEED;
    }
    cat.style.left = x + "px";
    cat.style.top = y + "px";
    cat.style.transform =
      "translate(-50%, -50%) scaleX(" + (dx < 0 ? -1 : 1) + ")";
    const sprite = moving ? "walk" : "sit";
    if (sprite !== currentSprite) {
      currentSprite = sprite;
      frame = 0;
      frameTick = 0;
      const s = SPRITES[sprite];
      cat.style.backgroundImage = "url('" + s.url + "')";
      cat.style.backgroundSize = s.frames * FRAME_W + "px " + FRAME_W + "px";
      cat.style.backgroundPosition = "0 0";
    }
    if (++frameTick >= TICKS_PER_FRAME) {
      frameTick = 0;
      frame = (frame + 1) % SPRITES[currentSprite].frames;
      cat.style.backgroundPosition = -frame * FRAME_W + "px 0";
    }
    // lerp star position toward raw pointer
    starX += (targetX - starX) * STAR_LERP;
    starY += (targetY - starY) * STAR_LERP;

    const pointerSpeed = Math.hypot(
      targetX - prevTargetX,
      targetY - prevTargetY,
    );
    prevTargetX = targetX;
    prevTargetY = targetY;
    const targetScale =
      STAR_MIN_SIZE +
      Math.min(pointerSpeed / 20, 1) * (STAR_MAX_SIZE - STAR_MIN_SIZE);
    starScale += (targetScale - starScale) * 0.15;
    const rotSpeed =
      STAR_ROT_MIN_SPEED +
      Math.min(pointerSpeed / 20, 1) *
        (STAR_ROT_MAX_SPEED - STAR_ROT_MIN_SPEED);
    starAngle = (starAngle + rotSpeed) % 360;

    star.style.left = starX + "px";
    star.style.top = starY + "px";
    star.style.transform =
      "translate(-50%, -50%) scale(" +
      starScale.toFixed(3) +
      ") rotate(" +
      starAngle.toFixed(1) +
      "deg)";
    requestAnimationFrame(tick);
  }

  x = targetX;
  y = targetY;
  requestAnimationFrame(tick);
})();
