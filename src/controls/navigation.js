import { MathUtils, Vector2 } from "three";
import { room, benches } from "../scenes/gallery.js";

const keysForWalk = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
];
export function constrain(point, radius = 0.24) {
  point.x = MathUtils.clamp(point.x, -room.x + radius, room.x - radius);
  point.z = MathUtils.clamp(point.z, -room.z + radius, room.z - radius);
  for (const b of benches) {
    const dx = point.x - b.x,
      dz = point.z - b.z;
    const px = b.w / 2 + radius - Math.abs(dx),
      pz = b.d / 2 + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) point.x += Math.sign(dx || 1) * px;
      else point.z += Math.sign(dz || 1) * pz;
    }
  }
  const dx = point.x - 4.55,
    dz = point.z + 8.05;
  const distance = Math.hypot(dx, dz),
    clearance = 0.4 + radius;
  if (distance < clearance) {
    point.x = 4.55 + (distance ? dx / distance : 1) * clearance;
    point.z = -8.05 + (distance ? dz / distance : 0) * clearance;
  }
  return point;
}
export function bindNavigation(canvas, actions) {
  const keys = new Set(),
    pointers = new Map(),
    stick = new Vector2();
  let dragging = false,
    lastPinch = 0,
    stickPointer = null;
  const joy = document.querySelector("#joystick"),
    thumb = joy.firstElementChild;
  const reset = () => {
    keys.clear();
    pointers.clear();
    stick.set(0, 0);
    stickPointer = null;
    thumb.style.transform = "";
    dragging = false;
  };
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
  window.addEventListener("keydown", (e) => {
    if (!actions.active() || e.altKey || e.metaKey || e.ctrlKey) return;
    if (keysForWalk.includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyE" && !e.repeat) actions.interact();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  const gap = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (!actions.active() || e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    if (!pointers.size) dragging = false;
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
    });
    if (pointers.size === 2) {
      dragging = true;
      lastPinch = gap();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (actions.active() && e.pointerType === "mouse") actions.hover(e);
      return;
    }
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.ox, p.y - p.oy) > 4) dragging = true;
    if (pointers.size === 2) {
      const dist = gap();
      actions.zoom((lastPinch - dist) * 0.014);
      lastPinch = dist;
    } else if (dragging) actions.rotate(dx * 0.006, dy * 0.004);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (pointers.has(e.pointerId) && !dragging && actions.active())
      actions.tap(e);
    pointers.delete(e.pointerId);
  });
  canvas.addEventListener("pointercancel", reset);
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (actions.active()) {
        e.preventDefault();
        actions.zoom(e.deltaY * 0.005);
      }
    },
    { passive: false },
  );
  function joystick(e) {
    const rect = joy.getBoundingClientRect();
    stick
      .set(
        (e.clientX - rect.left - rect.width / 2) / 30,
        (e.clientY - rect.top - rect.height / 2) / 30,
      )
      .clampLength(0, 1);
    thumb.style.transform =
      "translate(" + stick.x * 25 + "px," + stick.y * 25 + "px)";
  }
  joy.addEventListener("pointerdown", (e) => {
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    joystick(e);
  });
  joy.addEventListener("pointermove", (e) => {
    if (e.pointerId === stickPointer) joystick(e);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    joy.addEventListener(type, (e) => {
      if (e.pointerId === stickPointer) {
        stick.set(0, 0);
        stickPointer = null;
        thumb.style.transform = "";
      }
    });
  const axis = new Vector2();
  return {
    reset,
    axis: () =>
      axis
        .set(
          stick.x +
            Number(keys.has("KeyD") || keys.has("ArrowRight")) -
            Number(keys.has("KeyA") || keys.has("ArrowLeft")),
          stick.y +
            Number(keys.has("KeyS") || keys.has("ArrowDown")) -
            Number(keys.has("KeyW") || keys.has("ArrowUp")),
        )
        .clampLength(0, 1),
  };
}
