import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  memories,
  museumConfig,
  photoURL,
  fallbackURL,
} from "../config/museumConfig.js";

const PI = Math.PI;
export const room = { x: 6, z: 10 };
export const benches = [{ x: -2.65, z: -3.2, w: 1.16, d: 3.2 }];
const matte = (color, roughness = 0.85) =>
  new T.MeshStandardMaterial({ color, roughness });
function box(parent, w, h, d, x, y, z, material) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function surface(parent, w, h, x, y, z, rotation, material) {
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotation;
  parent.add(mesh);
  mesh.receiveShadow = true;
  return mesh;
}
function texture(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function wallPaper(length, positions) {
  return texture(1024, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    [
      [0, "#aeaaa4"],
      [0.12, "#c2bdb5"],
      [0.4, "#d4cfc7"],
      [0.86, "#d3cec6"],
      [1, "#aaa397"],
    ].forEach(([at, col]) => g.addColorStop(at, col));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    for (const u of positions) {
      // A soft edge around the cone leaves a warmer pool below each track head.
      c.save();
      c.translate((u / length + 0.5) * w, h * 0.44);
      c.scale((w / length) * 2.15, h * 0.61);
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, "rgba(255,244,215,.94)");
      glow.addColorStop(0.55, "rgba(255,242,218,.62)");
      glow.addColorStop(1, "rgba(255,245,232,0)");
      c.fillStyle = glow;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    }
  });
}
function stoneFloor() {
  let seed = 31;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const tex = texture(768, 768, (c, w, h) => {
    c.fillStyle = "#bfbab1";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 42000; i++) {
      c.fillStyle =
        random() > 0.52 ? "rgba(255,255,246,.14)" : "rgba(88,80,73,.09)";
      c.fillRect(random() * w, random() * h, 1 + random() * 2, 0.9);
    }
    c.strokeStyle = "rgba(80,72,63,.27)";
    c.lineWidth = 1.25;
    c.strokeRect(0.5, 0.5, w - 1, h - 1);
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(6, 10);
  return tex;
}
function lettering(
  parent,
  text,
  w,
  h,
  x,
  y,
  z,
  size,
  italic = false,
  light = false,
) {
  const tw = 1536,
    th = Math.round((tw * h) / w);
  const tex = texture(tw, th, (c, width, height) => {
    c.fillStyle = light ? "#ede4d5" : "#4e4841";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font =
      (italic ? "italic " : "") +
      Math.round(height * size) +
      "px Georgia, serif";
    c.fillText(text, width / 2, height * 0.51, width * 0.97);
  });
  const mat = new T.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  return surface(parent, w, h, x, y, z, 0, mat);
}
export async function loadPictures(report) {
  const loader = new T.TextureLoader();
  let done = 0;
  const failed = () =>
    texture(512, 384, (c, w, h) => {
      c.fillStyle = "#e5d9c9";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#67564c";
      c.font = "italic 24px Georgia";
      c.textAlign = "center";
      c.fillText("A memory to come", w / 2, h / 2);
    });
  return Promise.all(
    memories.map(async (memory) => {
      let map;
      try {
        map = await loader.loadAsync(photoURL(memory));
      } catch {
        try {
          map = await loader.loadAsync(fallbackURL);
        } catch {
          map = failed();
        }
      }
      map.colorSpace = T.SRGBColorSpace;
      report(++done / memories.length);
      return map;
    }),
  );
}
function consolidate(parent) {
  parent.updateMatrixWorld(true);
  const batches = new Map();
  parent.traverse((mesh) => {
    if (!mesh.isMesh || mesh.material.transparent) return;
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(mesh);
  });
  for (const [mat, list] of batches) {
    if (list.length < 2) continue;
    const copy = list.map((m) =>
      m.geometry.clone().applyMatrix4(m.matrixWorld),
    );
    const geometry = mergeGeometries(copy, false);
    copy.forEach((g) => g.dispose());
    if (!geometry) continue;
    list.forEach((m) => {
      m.removeFromParent();
      m.geometry.dispose();
    });
    const mesh = new T.Mesh(geometry, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
}
export function buildGallery(renderer, pictures, low) {
  const scene = new T.Scene();
  scene.background = new T.Color("#d8d4ca");
  const architecture = new T.Group();
  scene.add(architecture);
  if (!renderer.isCPU) {
    const pmrem = new T.PMREMGenerator(renderer),
      studio = new RoomEnvironment();
    const env = pmrem.fromScene(studio, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.29;
    studio.dispose();
    pmrem.dispose();
  }
  const iron = matte("#292725", 0.55),
    edge = matte("#706b65"),
    white = matte("#f5f0e7"),
    gold = matte("#9c8261", 0.4),
    wood = matte("#7c583e", 0.46),
    black = matte("#211e1b", 0.45);
  const floor = new T.Mesh(
    new T.PlaneGeometry(12, 20),
    new T.MeshStandardMaterial({
      map: stoneFloor(),
      roughness: 0.32,
      metalness: 0.07,
    }),
  );
  floor.rotation.x = -PI / 2;
  floor.receiveShadow = true;
  architecture.add(floor);
  const walls = [
    [12, 0, -10, 0],
    [12, 0, 10, PI],
    [20, 6, 0, -PI / 2],
    [20, -6, 0, PI / 2],
  ];
  for (const [len, x, z, yaw] of walls) {
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = yaw;
    architecture.add(holder);
    const aligned = memories.filter(
      (m) => Math.abs(m.rotation * T.MathUtils.DEG2RAD - yaw) < 0.001,
    );
    const coords = aligned.map(
      (m) =>
        (m.position[0] - x) * Math.cos(yaw) -
        (m.position[2] - z) * Math.sin(yaw),
    );
    surface(
      holder,
      len,
      4.5,
      0,
      2.25,
      0,
      0,
      new T.MeshStandardMaterial({
        map: wallPaper(len, coords),
        roughness: 0.95,
      }),
    );
    box(holder, len, 0.045, 0.03, 0, 0.032, 0.019, edge);
    box(holder, len, 0.1, 0.045, 0, 0.12, 0.027, white);
    box(holder, len, 0.085, 0.08, 0, 4.4, 0.04, edge);
    box(
      holder,
      len,
      0.018,
      0.04,
      0,
      4.33,
      0.027,
      new T.MeshBasicMaterial({ color: "#eadcc2" }),
    );
  }
  box(architecture, 12, 0.12, 20, 0, 4.56, 0, matte("#373633"));
  for (let z = -9.5; z <= 10; z += 1.15) {
    box(architecture, 12, 0.1, 0.055, 0, 4.45, z, iron);
  }
  for (const x of [-4.65, 0, 4.65]) {
    box(architecture, 0.072, 0.075, 19.7, x, 4.28, 0, iron);
    for (const z of [-8, -5, -2, 1, 4, 7, 9]) {
      box(architecture, 0.045, 0.18, 0.045, x, 4.36, z, iron);
    }
  }
  const diffuser = new T.MeshBasicMaterial({ color: "#ece9de" });
  for (const x of [-2.65, 2.65]) {
    for (let z = -8.9; z < 9; z += 3.1) {
      box(architecture, 0.34, 0.045, 2.74, x, 4.405, z, iron);
      box(architecture, 0.235, 0.015, 2.62, x, 4.373, z, diffuser);
    }
  }
  const lens = new T.MeshBasicMaterial({ color: "#fff0cf" });
  const frameList = [],
    hitMeshes = [];
  for (const [i, m] of memories.entries()) {
    const favorite = m.id === museumConfig.favoriteId,
      finale = m.id === museumConfig.finaleId;
    const g = new T.Group();
    g.position.fromArray(m.position);
    g.rotation.y = T.MathUtils.degToRad(m.rotation);
    scene.add(g);
    const portrait = pictures[i].image.height > pictures[i].image.width;
    const fw = favorite ? 3.35 : finale ? 3.05 : portrait ? 1.52 : 2.32,
      fh = favorite ? 1.94 : finale ? 1.85 : portrait ? 1.85 : 1.68;
    const outer = box(g, fw, fh, 0.095, 0, 0, 0.051, finale ? gold : black);
    const inner = box(g, fw - 0.066, fh - 0.066, 0.045, 0, 0, 0.113, white);
    const t = pictures[i];
    t.anisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      low ? 2 : 6,
    );
    const aspect = t.image.width / t.image.height,
      maxW = fw - 0.27,
      maxH = fh - 0.26;
    const iw = Math.min(maxW, maxH * aspect),
      ih = iw / aspect;
    const art = surface(
      g,
      iw,
      ih,
      0,
      0,
      0.139,
      0,
      new T.MeshBasicMaterial({ map: t, toneMapped: false }),
    );
    [art, outer, inner].forEach((o) => {
      o.userData.frame = i;
      hitMeshes.push(o);
    });
    box(g, 0.78, 0.2, 0.018, fw / 2 - 0.39, -fh / 2 - 0.2, 0.014, white);
    lettering(
      g,
      m.title,
      0.73,
      0.16,
      fw / 2 - 0.39,
      -fh / 2 - 0.2,
      0.025,
      0.55,
    );
    if (favorite || finale) {
      lettering(
        g,
        favorite
          ? "Our Story, Our Memories"
          : "Every moment with you is my favorite memory.",
        favorite ? 5.8 : 8,
        0.67,
        0,
        1.58,
        0.04,
        0.71,
        true,
      );
      if (favorite)
        lettering(
          g,
          museumConfig.couple.map((c) => c.name).join("  &  "),
          4,
          0.35,
          0,
          1.08,
          0.04,
          0.65,
        );
    }
    const normal = new T.Vector3(0, 0, 1).applyAxisAngle(
      new T.Vector3(0, 1, 0),
      g.rotation.y,
    );
    const source = g.position.clone().addScaledVector(normal, 1.32);
    source.y = 4.06;
    const aim = g.position.clone().sub(source).normalize();
    const bulb = new T.Mesh(
      new T.CylinderGeometry(0.093, 0.108, 0.31, 14),
      iron,
    );
    bulb.position.copy(source);
    bulb.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), aim);
    architecture.add(bulb);
    const end = new T.Mesh(new T.CircleGeometry(0.084, 14), lens);
    end.position.copy(source).addScaledVector(aim, 0.159);
    end.lookAt(end.position.clone().add(aim));
    architecture.add(end);
    box(architecture, 0.045, 0.22, 0.045, source.x, 4.24, source.z, iron);
    if (Math.abs(normal.z) > 0.5)
      box(architecture, 8, 0.06, 0.07, 0, 4.28, source.z, iron);
    if (favorite || finale) {
      const spot = new T.SpotLight(0xffe2b3, 10, 7, 0.84, 0.85, 2);
      spot.position.copy(source);
      spot.target.position.copy(g.position);
      scene.add(spot, spot.target);
    }
    frameList.push({ group: g, normal, center: g.position.clone() });
  }
  // An olive tree provides a scale cue in the far corner.
  const tree = new T.Group();
  tree.position.set(4.55, 0, -8.05);
  architecture.add(tree);
  const bark = matte("#675847"),
    leafMats = ["#586048", "#637153", "#49533e", "#798064"].map((c) =>
      matte(c),
    );
  const pot = new T.Mesh(
    new T.CylinderGeometry(0.4, 0.29, 0.66, 28),
    matte("#b8aa98"),
  );
  pot.position.y = 0.33;
  tree.add(pot);
  const soil = new T.Mesh(
    new T.CylinderGeometry(0.366, 0.366, 0.018, 24),
    matte("#54483b"),
  );
  soil.position.y = 0.662;
  tree.add(soil);
  function stem(from, to, base, tip) {
    const line = to.clone().sub(from),
      m = new T.Mesh(new T.CylinderGeometry(tip, base, line.length(), 7), bark);
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), line.normalize());
    tree.add(m);
  }
  const v = (x, y, z) => new T.Vector3(x, y, z);
  stem(v(0, 0.65, 0), v(-0.08, 1.64, 0.015), 0.056, 0.028);
  for (let j = 0; j < 13; j++) {
    const a = j * 2.4,
      rad = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(4.2 * j)),
      tip = v(rad * Math.cos(a), 1.85 + (j % 5) * 0.16, rad * Math.sin(a));
    stem(v(-0.08, 1.28 + (j % 4) * 0.11, 0.01), tip, 0.024, 0.006);
    for (let k = 0; k < 16; k++) {
      const o = k * 2.399 + j,
        size = 0.045 + 0.012 * (k % 4);
      const leaf = new T.Mesh(
        new T.IcosahedronGeometry(1, 0),
        leafMats[(j + k) % 4],
      );
      leaf.position.copy(tip);
      leaf.position.x += Math.sin(o) * (0.09 + 0.018 * (k % 7));
      leaf.position.z += Math.cos(o) * (0.1 + 0.021 * (k % 6));
      leaf.position.y += 0.04 * (k % 7) - 0.1;
      leaf.scale.set(size * 0.68, size * 1.49, size * 0.3);
      leaf.rotation.set(Math.sin(o) * 0.8, o, Math.cos(o) * 0.95);
      tree.add(leaf);
    }
  }
  for (const b of benches) {
    for (const z of [-1.05, 1.05])
      box(architecture, 0.7, 0.43, 0.24, b.x, 0.22, b.z + z, iron);
    for (let i = 0; i < 8; i++)
      box(
        architecture,
        0.131,
        0.12,
        b.d,
        b.x - 0.5 + i * 0.142,
        0.48,
        b.z,
        wood,
      );
  }
  const hemi = new T.HemisphereLight(0xfff8ee, 0xd3c6bd, 1.48);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xffedcf, 1.45);
  sun.position.set(-3.9, 4.15, 5.8);
  sun.target.position.set(0.5, 0, 0);
  sun.castShadow = !low;
  Object.assign(sun.shadow.camera, {
    left: -11,
    right: 11,
    top: 13,
    bottom: -13,
    near: 0.1,
    far: 30,
  });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);
  const dust = new Float32Array((low ? 20 : 48) * 3);
  for (let i = 0; i < dust.length; i += 3) {
    dust[i] = (Math.random() - 0.5) * 11;
    dust[i + 1] = Math.random() * 4;
    dust[i + 2] = (Math.random() - 0.5) * 17;
  }
  const dots = new T.BufferGeometry();
  dots.setAttribute("position", new T.BufferAttribute(dust, 3));
  const particles = new T.Points(
    dots,
    new T.PointsMaterial({
      color: 0xffebd2,
      size: 0.014,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  scene.add(particles);
  consolidate(architecture);
  return { scene, frames: frameList, hits: hitMeshes, particles };
}
