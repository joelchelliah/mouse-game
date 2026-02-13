(function () {
  const cat = document.getElementById("cat");
  const star = document.getElementById("star");
  const speed = 0.08;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let x = targetX;
  let y = targetY;
  let prevTargetX = targetX;
  let prevTargetY = targetY;
  let starScale = 1;
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
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      x += dx * speed;
      y += dy * speed;
    }
    cat.style.left = x + "px";
    cat.style.top = y + "px";
    cat.style.transform =
      "translate(-50%, -50%) scaleX(" + (dx < 0 ? -1 : 1) + ")";
    const pointerSpeed = Math.hypot(
      targetX - prevTargetX,
      targetY - prevTargetY,
    );
    prevTargetX = targetX;
    prevTargetY = targetY;
    const targetScale = 0.5 + Math.min(pointerSpeed / 20, 1);
    starScale += (targetScale - starScale) * 0.15;
    star.style.left = targetX + "px";
    star.style.top = targetY + "px";
    star.style.transform =
      "translate(-50%, -50%) scale(" + starScale.toFixed(3) + ")";
    requestAnimationFrame(tick);
  }

  x = targetX;
  y = targetY;
  requestAnimationFrame(tick);
})();
