import * as T from "three";
import { buildGallery, loadPictures } from "./gallery.js";
import { compatibilityRenderer } from "./compatibilityRenderer.js";
import { createAvatar } from "../characters/avatars.js";
import { museumConfig, memories } from "../config/museumConfig.js";
import { bindNavigation, constrain } from "../controls/navigation.js";
const clamp = T.MathUtils.clamp;
const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const smooth = (rate, dt) => 1 - Math.exp(-rate * dt);
const angle = (from, to, f) =>
  from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * f;
function softShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const d = c.getContext("2d"),
    g = d.createRadialGradient(48, 48, 2, 48, 48, 48);
  g.addColorStop(0, "rgba(50,40,32,.48)");
  g.addColorStop(0.45, "rgba(50,40,32,.21)");
  g.addColorStop(1, "rgba(50,40,32,0)");
  d.fillStyle = g;
  d.fillRect(0, 0, 96, 96);
  return new T.MeshBasicMaterial({
    map: new T.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  });
}
export async function createTour(ui) {
  const host = document.querySelector("#world"),
    stage = document.querySelector("#stage");
  const low =
    matchMedia("(pointer:coarse)").matches ||
    navigator.hardwareConcurrency <= 4;
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      antialias: !low,
      alpha: false,
      powerPreference: low ? "low-power" : "high-performance",
    });
  } catch {
    renderer = compatibilityRenderer();
    ui.compatible();
  }
  host.append(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.3 : 1.65));
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    renderer.setAnimationLoop(null);
    ui.lost();
  });
  const pics = await loadPictures((p) => ui.progress(10 + p * 67));
  const { scene, frames, hits, particles } = buildGallery(renderer, pics, low);
  const camera = new T.PerspectiveCamera(50, 1, 0.055, 55);
  const avatars = museumConfig.couple.map(createAvatar),
    [player, mate] = avatars.map((a) => a.group);
  const labels = avatars.map((a, i) => {
    scene.add(a.group);
    const label = document.createElement("span");
    label.className = "name-tag";
    label.textContent = museumConfig.couple[i].name;
    document.querySelector("#labels").append(label);
    return label;
  });
  const shadow = softShadow(),
    feet = avatars.map(() => {
      const m = new T.Mesh(new T.PlaneGeometry(0.94, 0.64), shadow);
      m.rotation.x = -Math.PI / 2;
      scene.add(m);
      return m;
    });
  const shape = new T.Shape();
  shape.moveTo(0, -0.55);
  shape.bezierCurveTo(-1, 0.08, -0.56, 0.91, 0, 0.36);
  shape.bezierCurveTo(0.56, 0.91, 1, 0.08, 0, -0.55);
  const heartGeo = new T.ShapeGeometry(shape, 8),
    hearts = [];
  const look = v(),
    desired = v(),
    goal = v(),
    dir = v(),
    offset = v(),
    project = v(),
    delta = v();
  const ray = new T.Raycaster(),
    ndc = new T.Vector2();
  let mode = "welcome",
    prior = "welcome",
    nearest = -1,
    focusIndex = 0,
    holding = false,
    time = 0,
    last = 0;
  let yaw = -0.23,
    pitch = 0.29,
    distance = 3.9,
    prevWidth = 0,
    transition = 0;
  function entrance() {
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    if (aspect < 1.2) {
      desired.set(-3.8, 1.85, 8.4);
      goal.set(1.48, 1.97, 0.45);
    } else {
      desired.set(-4.6, 1.88, 8.9);
      goal.set(0.55, 1.99, -3.25);
    }
  }
  function reset() {
    nav?.reset();
    mode = "welcome";
    prior = "welcome";
    holding = false;
    ui.hands(false);
    player.position.set(0.8, 0, 3.1);
    mate.position.set(1.52, 0, 3.15);
    player.rotation.y = 2.63;
    mate.rotation.y = 2.9;
    yaw = -0.23;
    pitch = 0.29;
    distance = 3.9;
    nearest = -1;
    ui.near(-1);
    entrance();
    transition = 0.7;
  }
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2,
    );
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(hits, false)[0]?.object.userData.frame ?? -1;
  }
  const nav = bindNavigation(renderer.domElement, {
    active: () => mode === "walking" && ui.active(),
    rotate: (x, y) => {
      yaw -= x;
      pitch = clamp(pitch + y, 0.06, 0.82);
    },
    zoom: (n) => (distance = clamp(distance + n, 1.65, 5.9)),
    tap: (e) => {
      const i = pick(e);
      if (i >= 0) ui.open(i);
    },
    hover: (e) => {
      renderer.domElement.style.cursor = pick(e) >= 0 ? "pointer" : "grab";
    },
    interact: () => {
      if (nearest >= 0) ui.open(nearest);
    },
  });
  function burst(p) {
    if (reduce) return;
    for (let i = 0; i < 7; i++) {
      const mesh = new T.Mesh(
        heartGeo,
        new T.MeshBasicMaterial({
          color: i % 2 ? "#d28b87" : "#eac4af",
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      );
      mesh.position.copy(p);
      mesh.position.x += (Math.random() - 0.5) * 0.36;
      mesh.position.y += 1.2 + Math.random() * 0.3;
      const scale = 0.045 + Math.random() * 0.05;
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      hearts.push({
        mesh,
        born: time,
        vx: (Math.random() - 0.5) * 0.28,
        vz: (Math.random() - 0.5) * 0.2,
      });
    }
  }
  function setFocus(index) {
    if (mode !== "focus") prior = mode;
    mode = "focus";
    focusIndex = index;
    nav.reset();
    transition = 0.8;
    if (memories[index].id === museumConfig.finaleId)
      burst(
        frames[index].center
          .clone()
          .addScaledVector(frames[index].normal, 0.8)
          .add(v(0, -1, 0)),
      );
  }
  function follow(dt) {
    const input = nav.axis();
    dir.set(
      input.x * Math.cos(yaw) + input.y * Math.sin(yaw),
      0,
      -input.x * Math.sin(yaw) + input.y * Math.cos(yaw),
    );
    player.position.addScaledVector(dir, dt * 2.7);
    constrain(player.position, 0.31);
    if (dir.lengthSq() > 0.002)
      player.rotation.y = angle(
        player.rotation.y,
        Math.atan2(dir.x, dir.z),
        smooth(11, dt),
      );
    const rot = player.rotation.y;
    offset
      .set(Math.cos(rot), 0, -Math.sin(rot))
      .multiplyScalar(holding ? -0.83 : -0.84);
    if (!holding) {
      offset.x -= 0.32 * Math.sin(rot);
      offset.z -= 0.32 * Math.cos(rot);
    }
    goal.copy(player.position).add(offset);
    constrain(goal, 0.27);
    delta.copy(goal).sub(mate.position);
    const dist = delta.length();
    const speed = Math.min(3.6, dist * (holding ? 6 : 4));
    mate.position.addScaledVector(delta, (speed * dt) / (dist || 1));
    constrain(mate.position, 0.27);
    const turn = !holding && dist > 0.85 ? Math.atan2(delta.x, delta.z) : rot;
    mate.rotation.y = angle(mate.rotation.y, turn, smooth(8, dt));
    avatars[0].animate(dt, time, dir.length(), holding, -1);
    avatars[1].animate(dt, time, speed / 2.7, holding, 1);
    let near = -1,
      min = 3.0;
    frames.forEach((f, i) => {
      const d = Math.hypot(
        f.center.x - player.position.x,
        f.center.z - player.position.z,
      );
      if (d < min) {
        near = i;
        min = d;
      }
    });
    if (near !== nearest) {
      nearest = near;
      ui.near(near);
    }
  }
  function cameraTarget() {
    if (mode === "welcome") {
      entrance();
      return;
    }
    if (mode === "focus") {
      const f = frames[focusIndex];
      goal.copy(f.center);
      desired
        .copy(goal)
        .addScaledVector(f.normal, host.clientWidth < 600 ? 4.8 : 3.2);
      return;
    }
    goal.copy(player.position).add(v(0, 1.1, 0));
    const flat = distance * Math.cos(pitch);
    offset.set(
      Math.sin(yaw) * flat,
      0.35 + distance * Math.sin(pitch),
      Math.cos(yaw) * flat,
    );
    let fraction = 1;
    for (const [k, b] of [
      ["x", 5.83],
      ["z", 9.83],
    ])
      if (Math.abs(offset[k]) > 0.0001) {
        fraction = Math.min(
          fraction,
          ((offset[k] > 0 ? b : -b) - goal[k]) / offset[k],
        );
      }
    desired.copy(goal).addScaledVector(offset, Math.max(0.065, fraction));
    desired.y = clamp(desired.y, 1.18, 4.29);
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (mode === "welcome" && w !== prevWidth) {
      entrance();
      camera.position.copy(desired);
      look.copy(goal);
    }
    prevWidth = w;
  }
  new ResizeObserver(resize).observe(stage);
  reset();
  resize();
  entrance();
  camera.position.copy(desired);
  look.copy(goal);
  function tick(now) {
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    if (document.hidden || !host.clientWidth || !host.clientHeight) return;
    time += dt;
    if (mode === "walking" && ui.active()) follow(dt);
    else
      avatars.forEach((a, i) =>
        a.animate(dt, time, 0, holding, i === 0 ? -1 : 1),
      );
    cameraTarget();
    transition = Math.max(0, transition - dt);
    const factor = reduce ? 1 : smooth(transition > 0 ? 5 : 9, dt);
    camera.position.lerp(desired, factor);
    look.lerp(goal, factor);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    feet.forEach((s, i) => {
      const p = avatars[i].group.position;
      s.position.set(p.x, 0.008, p.z);
    });
    for (const [i, a] of avatars.entries()) {
      project.copy(a.group.position);
      project.y += i === 0 ? 1.9 : 1.82;
      project.project(camera);
      labels[i].hidden =
        mode === "focus" ||
        Math.abs(project.x) > 0.96 ||
        Math.abs(project.y) > 0.96 ||
        project.z > 1 ||
        project.z < 0;
      labels[i].style.transform =
        "translate(" +
        (project.x * 0.5 + 0.5) * host.clientWidth +
        "px," +
        (0.5 - project.y * 0.5) * host.clientHeight +
        "px) translate(-50%,-100%)";
    }
    if (!reduce) particles.position.y = Math.sin(time * 0.17) * 0.045;
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i],
        age = time - h.born;
      h.mesh.position.x += h.vx * dt;
      h.mesh.position.z += h.vz * dt;
      h.mesh.position.y += dt * 0.38;
      h.mesh.quaternion.copy(camera.quaternion);
      h.mesh.material.opacity = Math.max(0, 1 - age / 2.3);
      if (age > 2.3) {
        h.mesh.removeFromParent();
        h.mesh.material.dispose();
        hearts.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
  }
  tick(performance.now());
  renderer.setAnimationLoop(tick);
  ui.progress(100);
  return {
    start() {
      mode = "walking";
      prior = "walking";
      transition = 1;
      nav.reset();
    },
    reset,
    focus: setFocus,
    unfocus() {
      if (mode === "focus") {
        mode = prior;
        transition = 0.8;
      }
    },
    pause() {
      nav.reset();
    },
    affection() {
      holding = !holding;
      ui.hands(holding);
      if (holding) burst(player.position.clone().lerp(mate.position, 0.5));
    },
    interact() {
      if (nearest >= 0) ui.open(nearest);
    },
  };
}
