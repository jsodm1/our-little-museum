import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Each articulated section is one vertex-colored mesh. The silhouettes are built
// from elliptical tailoring profiles, so cuffs, hems and shoes retain their shape.
const cloth = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.84,
});
const TAU = Math.PI * 2;
const mix = (a, b, amount) =>
  new THREE.Color(a).lerp(new THREE.Color(b), amount);

function profile(rows, sides = 18) {
  const positions = [];
  const indices = [];
  for (const [y, rx, rz, cz = 0, cx = 0] of rows) {
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * TAU;
      positions.push(cx + rx * Math.sin(angle), y, cz + rz * Math.cos(angle));
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + ((j + 1) % sides);
      indices.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  const last = (rows.length - 1) * sides;
  for (let j = 1; j < sides - 1; j++) {
    indices.push(0, j + 1, j, last, last + j, last + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function artist(parent) {
  const pieces = [];
  function add(
    geometry,
    color,
    pos = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  ) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.deleteAttribute("uv");
    g.scale(...scale);
    g.rotateX(rotation[0]);
    g.rotateY(rotation[1]);
    g.rotateZ(rotation[2]);
    g.translate(...pos);
    const tint = new THREE.Color(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    pieces.push(g);
  }
  function oval(pos, scale, color, rotation) {
    add(new THREE.SphereGeometry(1, 16, 12), color, pos, rotation, scale);
  }
  function seam(points, radius, color) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    add(
      new THREE.TubeGeometry(
        curve,
        Math.max(5, points.length * 3),
        radius,
        5,
        false,
      ),
      color,
    );
  }
  function finish() {
    const merged = mergeGeometries(pieces);
    const mesh = new THREE.Mesh(merged, cloth);
    mesh.castShadow = true;
    parent.add(mesh);
    pieces.forEach((g) => g.dispose());
    return mesh;
  }
  return { add, oval, seam, finish };
}

function joint(parent, x, y, z = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  return pivot;
}

// An asymmetric hairline rises over the forehead and dips behind the ears.
function hairCap(long) {
  const rings = 13,
    segments = 40,
    points = [],
    idx = [];
  for (let ring = 0; ring <= rings; ring++) {
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * TAU;
      const front = (1 + Math.cos(a)) * 0.5;
      const fringe = long ? 0.12 : 0.23;
      const edge =
        2.37 - 1.44 * front ** 2.8 + fringe * Math.sin(a * 2.4) * front ** 4;
      const phi = 0.012 + ((edge - 0.012) * ring) / rings;
      const fullness = 1 + 0.014 * Math.sin(7 * a + phi) * Math.sin(phi);
      points.push(
        0.117 * Math.sin(phi) * Math.sin(a) * fullness,
        0.17 + 0.151 * Math.cos(phi),
        -0.004 + 0.114 * Math.sin(phi) * Math.cos(a) * fullness,
      );
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j,
        b = i * segments + ((j + 1) % segments);
      idx.push(a, b + segments, b, a, a + segments, b + segments);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function addGlasses(parent) {
  const glasses = artist(parent);
  const color = "#625147";
  for (const side of [-1, 1]) {
    glasses.add(new THREE.TorusGeometry(0.03, 0.0022, 6, 32), color,
      [side * 0.042, 0.170, 0.120], [0, side * 0.1, 0], [1, 0.72, 1]);
    glasses.seam([[side * 0.071, 0.174, 0.118], [side * 0.105, 0.175, 0.068],
      [side * 0.111, 0.163, 0.003]], 0.0025, color);
  }
  glasses.seam([[-0.012, 0.174, 0.122], [0, 0.179, 0.132],
    [0.012, 0.174, 0.122]], 0.0021, color);
  glasses.finish();
}

function faceSurface(soft, eyeSize) {
  const sections = [
    [0.059, 0.032, 0.047, 0.035], [0.072, soft ? 0.06 : 0.071, 0.073, 0.02],
    [0.103, 0.086, 0.092, 0.011], [0.147, 0.104, 0.105, 0.002],
    [0.182, 0.106, 0.105, -0.001], [0.223, 0.101, 0.102, -0.001],
    [0.262, 0.086, 0.09, -0.006], [0.288, 0.056, 0.061, -0.01],
    [0.299, 0.015, 0.021, -0.01],
  ];
  const columns = 40, rows = 48;
  const positions = [], uvs = [], indices = [];
  let sectionIndex = 0;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const y = 0.059 + v * 0.24;
    while (sectionIndex < sections.length - 2 && y > sections[sectionIndex + 1][0]) sectionIndex++;
    const lower = sections[sectionIndex], upper = sections[sectionIndex + 1];
    const amount = (y - lower[0]) / (upper[0] - lower[0]);
    const rx = THREE.MathUtils.lerp(lower[1], upper[1], amount);
    const rz = THREE.MathUtils.lerp(lower[2], upper[2], amount);
    const cz = THREE.MathUtils.lerp(lower[3], upper[3], amount);
    for (let col = 0; col <= columns; col++) {
      const fraction = (col / columns * 2 - 1) * 0.97;
      const x = fraction * rx;
      const nose = 0.025 * Math.exp(-((x / 0.018) ** 2 + ((y - 0.140) / 0.024) ** 2));
      const lips = 0.007 * Math.exp(-((x / 0.028) ** 2 + ((y - 0.110) / 0.012) ** 2));
      const z = cz + rz * Math.sqrt(1 - fraction * fraction) + 0.002 + nose + lips;
      positions.push(x, y, z);
      const u = 0.5 + x / 0.212;
      let textureU = u, textureV = v;
      for (const eyeU of [0.315, 0.685]) {
        const dx = u - eyeU, dy = v - 0.47;
        const influence = Math.exp(-((dx / 0.10) ** 2 + (dy / 0.045) ** 2));
        const adjustment = (1 / eyeSize - 1) * influence;
        textureU += dx * adjustment;
        textureV += dy * adjustment;
      }
      uvs.push(textureU, textureV);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addFaceTexture(parent, features, url, soft, eyeSize) {
  const geometry = faceSurface(soft, eyeSize);
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    alphaTest: 0.025,
    roughness: 0.92,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const surface = new THREE.Mesh(geometry, material);
  surface.name = "Portrait fitted to curved head";
  surface.visible = false;
  parent.add(surface);
  const texture = new THREE.TextureLoader().load(url, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = 2;
    material.map = loaded;
    material.needsUpdate = true;
    surface.visible = true;
    features.visible = false;
  }, undefined, () => {
    parent.userData.faceLoadFailed = true;
    surface.visible = false;
    features.visible = true;
  });
  // Assign before loading completes so callers can dispose an avatar immediately.
  material.map = texture;
}

function sculptHead(pivot, palette, soft, hairstyle, config) {
  const { skin, hair } = palette;
  const long = hairstyle === "long" || hairstyle === "bob";
  const h = artist(pivot);
  const features = new THREE.Group();
  pivot.add(features);
  const f = artist(features);
  const eyeSize = THREE.MathUtils.clamp(Number(config.eyeSize) || 1, 0.8, 1.2);
  // Jaw, cheekbones and brow are separate levels on one continuous face.
  h.add(
    profile(
      [
        [0.059, 0.032, 0.047, 0.035],
        [0.072, soft ? 0.06 : 0.071, 0.073, 0.02],
        [0.103, 0.086, 0.092, 0.011],
        [0.147, 0.104, 0.105, 0.002],
        [0.182, 0.106, 0.105, -0.001],
        [0.223, 0.101, 0.102, -0.001],
        [0.262, 0.086, 0.09, -0.006],
        [0.288, 0.056, 0.061, -0.01],
        [0.299, 0.015, 0.021, -0.01],
      ],
      32,
    ),
    skin,
  );
  const lid = mix(skin, "#a26a52", 0.3);
  for (const s of [-1, 1]) {
    h.oval([s * 0.101, 0.15, -0.001], [0.018, 0.027, 0.015], skin);
    f.oval([s * 0.039, 0.166, 0.098], [0.018 * eyeSize, 0.007 * eyeSize, 0.004], "#ede3d8", [
      0,
      s * 0.25,
      0,
    ]);
    f.oval([s * 0.039, 0.167, 0.103], [0.0075 * eyeSize, 0.0075 * eyeSize, 0.003], "#342a28");
    f.oval([s * 0.037, 0.169, 0.106], [0.002 * eyeSize, 0.002 * eyeSize, 0.001], "#fff5de");
    f.seam(
      [
        [s * 0.022, 0.169, 0.104],
        [s * 0.04, 0.174, 0.102],
        [s * 0.057, 0.17, 0.093],
      ],
      0.0018,
      lid,
    );
    f.seam(
      [
        [s * 0.02, 0.189, 0.104],
        [s * 0.04, 0.194, 0.098],
        [s * 0.061, 0.191, 0.089],
      ],
      0.0031,
      mix(hair, skin, 0.22),
    );
    if (soft)
      h.oval([s * 0.105, 0.126, 0.004], [0.0055, 0.006, 0.005], "#c7a36c");
  }
  f.oval([0, 0.148, 0.106], [0.012, 0.021, 0.015], skin);
  f.oval([0, 0.133, 0.117], [0.014, 0.009, 0.011], mix(skin, "#c0876d", 0.13));
  f.seam(
    [
      [-0.025, 0.108, 0.102],
      [-0.011, 0.104, 0.109],
      [0, 0.104, 0.11],
      [0.014, 0.106, 0.108],
      [0.024, 0.109, 0.102],
    ],
    0.0022,
    mix(skin, "#8a4540", 0.56),
  );
  h.add(hairCap(long), hair);
  const hairLight = mix(hair, "#957052", 0.13);
  if (long) {
    const end = hairstyle === "bob" ? -0.014 : -0.168;
    h.add(
      profile(
        [
          [end, 0.072, 0.03, -0.068],
          [end + 0.037, 0.11, 0.043, -0.065],
          [0.101, 0.119, 0.065, -0.056],
          [0.182, 0.115, 0.08, -0.03],
          [0.24, 0.102, 0.089, -0.022],
          [0.272, 0.081, 0.071, -0.024],
        ],
        28,
      ),
      hair,
    );
    for (const s of [-1, 1]) {
      h.oval([s * 0.1, 0.083, 0.01], [0.02, 0.099, 0.035], hair, [
        0,
        0,
        s * 0.06,
      ]);
      h.seam(
        [
          [s * 0.04, 0.297, 0.022],
          [s * 0.093, 0.238, 0.05],
          [s * 0.112, 0.169, 0.025],
          [s * 0.113, 0.087, 0.006],
          [s * 0.105, 0.017, -0.012],
        ],
        0.0028,
        hairLight,
      );
    }
    // Shorter face-framing section on the parted side.
    h.oval(
      [-0.073, 0.239, 0.065],
      [0.022, 0.069, 0.025],
      hair,
      [0.05, 0, -0.72],
    );
  } else {
    h.oval(
      [-0.024, 0.262, 0.061],
      [0.091, 0.046, 0.051],
      hair,
      [0.14, -0.13, -0.19],
    );
    h.oval([0.051, 0.257, 0.052], [0.053, 0.038, 0.043], hair, [0.12, 0, 0.3]);
    for (const s of [-1, 1])
      h.oval([s * 0.103, 0.179, 0.022], [0.009, 0.025, 0.017], hair);
    h.seam(
      [
        [-0.095, 0.237, 0.051],
        [-0.068, 0.275, 0.089],
        [-0.015, 0.287, 0.096],
        [0.034, 0.287, 0.078],
      ],
      0.0028,
      hairLight,
    );
  }
  h.finish();
  f.finish();
  if (config.glasses) addGlasses(pivot);
  if (typeof config.faceTexture === "string" && /^(data:image\/|blob:|https:\/\/)/.test(config.faceTexture)) {
    addFaceTexture(pivot, features, config.faceTexture, soft, eyeSize);
  }
}

function sculptTorso(torso, p, soft) {
  const t = artist(torso);
  const width = soft ? 0.161 : 0.188;
  const shadow = mix(p.top, "#14131b", 0.24);
  t.add(
    profile([
      [-0.013, 0.144, 0.107],
      [0.049, 0.155, 0.115],
      [0.108, soft ? 0.13 : 0.153, 0.094],
      [0.197, soft ? 0.131 : 0.152, 0.1],
      [0.291, width * 0.96, 0.118, 0.006],
      [0.35, width, 0.108],
      [0.389, width * 0.8, 0.088],
      [0.413, 0.08, 0.066],
    ]),
    p.top,
  );
  t.add(
    profile([
      [0.398, 0.066, 0.057],
      [0.435, 0.053, 0.054],
      [0.5, 0.052, 0.053],
      [0.518, 0.062, 0.056],
    ]),
    p.skin,
  );
  if (soft && !p.dress) {
    t.add(
      profile([
        [0.39, 0.07, 0.06],
        [0.436, 0.06, 0.058],
        [0.442, 0.057, 0.055],
      ]),
      p.top,
    );
    t.add(
      profile([
        [-0.017, 0.151, 0.113],
        [0.046, 0.158, 0.119],
        [0.062, 0.148, 0.113],
        [0.081, 0.143, 0.106],
      ]),
      p.pants,
    );
    t.seam(
      [
        [-0.125, 0.064, 0.061],
        [0, 0.069, 0.111],
        [0.125, 0.064, 0.061],
      ],
      0.0028,
      mix(p.pants, "#755f4f", 0.26),
    );
  } else if (!soft && p.garment === "shirt") {
    // An open camp-collar overshirt frames a light cotton T-shirt.
    const white = "#f5f0e4";
    t.add(
      profile(
        [
          [0.0, 0.057, 0.018, 0.104],
          [0.145, 0.045, 0.013, 0.093],
          [0.286, 0.053, 0.019, 0.111],
          [0.365, 0.064, 0.015, 0.09],
          [0.393, 0.04, 0.01, 0.077],
        ],
        16,
      ),
      white,
    );
    for (const s of [-1, 1]) {
      t.seam(
        [
          [s * 0.062, 0.386, 0.065],
          [s * 0.088, 0.351, 0.093],
          [s * 0.057, 0.307, 0.122],
          [s * 0.046, 0.218, 0.105],
          [s * 0.049, 0.131, 0.104],
          [s * 0.061, 0.012, 0.108],
        ],
        0.0045,
        shadow,
      );
      t.oval([s * 0.067, 0.366, 0.088], [0.025, 0.042, 0.011], shadow, [
        0.28,
        0,
        s * -0.54,
      ]);
    }
    t.seam(
      [
        [0.09, 0.291, 0.112],
        [0.124, 0.286, 0.098],
        [0.142, 0.289, 0.083],
      ],
      0.0028,
      shadow,
    );
    t.add(
      profile([
        [-0.014, 0.144, 0.107],
        [0.002, 0.147, 0.11],
        [0.01, 0.145, 0.107],
      ]),
      shadow,
    );
  }
  t.finish();
}

function sculptLeg(parent, s, p, soft) {
  if(p.dress||p.garment==='shorts')p={...p,pants:p.skin};
  const x = s * (soft ? 0.085 : 0.091);
  const hip = joint(parent, x, 0.845);
  const knee = joint(hip, 0, -0.393);
  const foot = joint(knee, 0, -0.377);
  const a = artist(hip),
    b = artist(knee),
    c = artist(foot);
  a.add(
    profile([
      [-0.414, 0.068, 0.076],
      [-0.378, soft ? 0.079 : 0.067, 0.079],
      [-0.271, 0.083, 0.087],
      [-0.073, 0.094, 0.105],
      [0.002, 0.089, 0.106],
      [0.055, 0.078, 0.095],
    ]),
    p.pants,
  );
  b.add(
    profile([
      [-0.365, soft ? 0.086 : 0.061, soft ? 0.088 : 0.068, -0.004],
      [-0.341, soft ? 0.087 : 0.066, 0.074, 0.003],
      [-0.313, soft ? 0.083 : 0.062, 0.075, -0.004],
      [-0.208, soft ? 0.083 : 0.069, 0.084, -0.008],
      [-0.11, soft ? 0.079 : 0.077, 0.085, -0.008],
      [-0.031, soft ? 0.08 : 0.07, 0.078],
      [0.009, 0.067, 0.075],
    ]),
    p.pants,
  );
  const stitch = mix(p.pants, "#463b34", soft ? 0.12 : 0.25);
  b.seam(
    [
      [s * 0.062, -0.015, 0.024],
      [s * 0.073, -0.155, 0.015],
      [s * (soft ? 0.082 : 0.062), -0.335, 0.012],
    ],
    0.0021,
    stitch,
  );
  c.add(
    profile(
      [
        [-0.073, 0.067, 0.121, 0.045],
        [-0.061, 0.071, 0.13, 0.042],
        [-0.048, 0.071, 0.127, 0.042],
      ],
      20,
    ),
    soft ? "#b69e85" : "#d4cabb",
  );
  c.add(
    profile([
      [-0.049, 0.069, 0.126, 0.043],
      [-0.027, 0.068, 0.124, 0.041],
      [-0.007, 0.065, 0.108, 0.027],
      [0.025, 0.061, 0.071, 0.005],
      [0.043, 0.057, 0.058, -0.006],
    ]),
    p.shoes,
  );
  if (!soft) {
    for (const z of [0.065, 0.084, 0.102]) {
      c.seam(
        [
          [-0.029, 0.006 - (z - 0.065) * 0.35, z],
          [0, 0.01 - (z - 0.065) * 0.35, z + 0.004],
          [0.029, 0.006 - (z - 0.065) * 0.35, z],
        ],
        0.0025,
        "#d4cbbb",
      );
    }
  }
  a.finish();
  b.finish();
  c.finish();
  return { hip, knee, foot, s };
}

function sculptArm(parent, s, p, soft) {
 const bare=p.dress||p.garment==='sleeveless';const short=bare||p.garment==='tee'||p.garment==='shorts';
  const shoulder = joint(parent, s * (soft ? 0.158 : 0.182), 0.335);
  const elbow = joint(shoulder, 0, -0.251);
  const a = artist(shoulder),
    b = artist(elbow);
  a.add(
    profile([
      [-0.265, 0.043, 0.047],
      [-0.184, soft ? 0.046 : 0.057, 0.053],
      [-0.051, soft ? 0.054 : 0.064, 0.066],
      [0.008, soft ? 0.054 : 0.062, 0.059],
      [0.035, 0.043, 0.045],
      [0.048, 0.021, 0.029],
    ]),
    bare?p.skin:p.top,
  );
  b.add(
    profile([
      [-0.219, 0.034, 0.037],
      [-0.198, soft ? 0.037 : 0.045, 0.042],
      [-0.16, soft ? 0.041 : 0.048, 0.047],
      [-0.073, soft ? 0.047 : 0.051, 0.052],
      [0.009, 0.043, 0.047],
    ]),
    short?p.skin:p.top,
  );
  b.add(
    profile([
      [-0.224, 0.035, 0.037],
      [-0.21, 0.037, 0.039],
      [-0.199, 0.036, 0.038],
    ]),
    short?p.skin:mix(p.top, "#262329", 0.25),
  );
  b.add(
    profile([
      [-0.32, 0.02, 0.022, 0.006],
      [-0.308, 0.03, 0.028, 0.007],
      [-0.263, 0.038, 0.036, 0.003],
      [-0.237, 0.03, 0.029],
      [-0.211, 0.027, 0.029],
    ]),
    p.skin,
  );
  b.oval([-s * 0.03, -0.266, 0.016], [0.014, 0.03, 0.016], p.skin, [
    -0.24,
    0,
    -s * 0.19,
  ]);
  a.finish();
  b.finish();
  return { shoulder, elbow, s };
}

export function createAvatar(config = {}) {
  const soft = config.style === "feminine";
  const p = {
    skin: config.skin || (soft ? "#c98f72" : "#bd876b"),
    hair: config.hair || (soft ? "#53372d" : "#302b29"),
    top: config.top || (soft ? "#2c262a" : "#363438"),
    pants: config.pants || (soft ? "#e6dacc" : "#393b41"),
    shoes: config.shoes || (soft ? "#b59778" : "#444044"),
  };
  p.garment=config.garment||"shirt";p.dress=["dress","maxi","knit"].includes(p.garment);
  const group = new THREE.Group();
  group.name = config.name || "Visitor";
  const body = joint(group, 0, 0);
  const torso = joint(body, 0, 0.873);
  const head = joint(torso, 0, 0.448);
  sculptTorso(torso, p, soft);
  sculptHead(head, p, soft, config.hairStyle || (soft ? "long" : "short"), config);
  head.scale.set(
    THREE.MathUtils.clamp(Number(config.faceWidth) || 1, 0.8, 1.2),
    THREE.MathUtils.clamp(Number(config.faceHeight) || 1, 0.85, 1.15),
    1,
  );
  const hips = artist(body);
  hips.add(
    profile([
      [0.815, 0.142, 0.1],
      [0.855, 0.171, 0.115],
      [0.911, 0.151, 0.109],
      [0.939, 0.142, 0.104],
    ]),
    p.pants,
  );
  hips.finish().visible=!p.dress;
  if(p.dress){const skirt=artist(body);const hem=p.garment==="maxi"?.17:p.garment==="knit"?.38:.4;skirt.add(profile([[hem,.24,.17],[hem+.035,.245,.17],[.68,.205,.14],[.87,.155,.117],[.96,.145,.11]]),p.top);skirt.finish();}
  const legs = [-1, 1].map((s) => sculptLeg(body, s, p, soft));
  const arms = [-1, 1].map((s) => sculptArm(torso, s, p, soft));
  group.scale.setScalar((soft ? 0.984 : 1.03)*THREE.MathUtils.clamp(Number(config.height)||1,.88,1.12));
  const accessory=artist(torso);
  if(config.bag){accessory.add(new THREE.BoxGeometry(.13,.18,.08),'#53463b',[.19,-.04,.04]);accessory.seam([[-.13,.37,.105],[.04,.19,.13],[.19,-.01,.09]],.013,'#53463b');}
  if(config.watch)accessory.add(new THREE.TorusGeometry(.04,.009,6,12),'#74766e',[-.24,-.10,0],[Math.PI/2,0,0]);
  if(config.bag||config.watch)accessory.finish();
  if(config.cap){const hat=artist(head);hat.add(new THREE.SphereGeometry(.13,16,8,0,Math.PI*2,0,Math.PI/2),'#d1c09e',[0,.25,0]);hat.oval([0,.254,.10],[.14,.013,.12],'#d1c09e');hat.finish();}
  if(config.sunglasses){addGlasses(head);const lens=artist(head);for(const side of [-1,1])lens.oval([side*.042,.17,.125],[.032,.023,.005],'#292c2e');lens.finish();}
  let phase = soft ? 1.4 : 0,
    stride = 0,
    affection = 0;
  function animate(dt, time, walkingSpeed = 0, affectionate = false, side = 1) {
    const v = Math.min(Math.abs(walkingSpeed), 1);
    const smooth = 1 - Math.exp(-10 * Math.min(dt, 0.1));
    stride = THREE.MathUtils.lerp(stride, v, smooth);
    affection = THREE.MathUtils.lerp(affection, affectionate ? 1 : 0, smooth);
    phase += dt * (5 + 3 * stride);
    const step = Math.sin(phase),
      breath = Math.sin(time * 1.8 + (soft ? 0.7 : 0));
    body.position.y = Math.abs(Math.cos(phase)) * 0.017 * stride;
    torso.position.y = 0.873 + 0.0025 * breath;
    torso.rotation.y = step * 0.068 * stride;
    torso.rotation.z = 0.009 * breath * (1 - stride) + 0.016 * step * stride;
    head.rotation.y =
      0.027 * Math.sin(time * 0.59) * (1 - stride) + side * 0.22 * affection;
    head.rotation.z = -0.017 * breath * (1 - stride) - side * 0.055 * affection;
    for (const { hip, knee, foot, s } of legs) {
      const swing = step * s;
      hip.rotation.x = swing * 0.47 * stride - 0.025;
      knee.rotation.x =
        (0.08 + Math.max(0, -Math.cos(phase) * s) * 0.61) * stride + 0.035;
      foot.rotation.x = -hip.rotation.x * 0.6 - knee.rotation.x * 0.48;
    }
    for (const { shoulder, elbow, s } of arms) {
      const reach = s === Math.sign(side) ? affection : 0;
      shoulder.rotation.x =
        -0.035 - s * step * 0.32 * stride * (1 - reach) - reach * 0.12;
      shoulder.rotation.z = s * (0.095 + reach * 0.43 + 0.012 * breath);
      elbow.rotation.x =
        -0.095 - (0.07 + s * step * 0.06) * stride - 0.11 * reach;
      elbow.rotation.z = s * 0.09 * reach;
    }
    const action=group.userData.action||'idle';
    if(action==='sit'){body.position.y=-.39;legs.forEach(({hip,knee,foot})=>{hip.rotation.x=-1.5;knee.rotation.x=1.5;foot.rotation.x=0;});arms.forEach(({shoulder,elbow})=>{shoulder.rotation.x=-.55;elbow.rotation.x=-.4;});}
    if(action==='hug'){arms.forEach(({shoulder,elbow,s})=>{shoulder.rotation.x=-1.25;shoulder.rotation.z=s*.35;elbow.rotation.x=-.6;});head.rotation.z=side*.12;}
    if(action==='dance'){torso.rotation.z=Math.sin(time*2)*.08;torso.rotation.y=Math.sin(time)*.12;body.position.y=.025*Math.sin(time*4);arms.forEach(({shoulder,elbow,s})=>{shoulder.rotation.z=s*(.55+.15*Math.sin(time*2));elbow.rotation.x=-.8;});}
    if(action==='pose'){arms[0].shoulder.rotation.z=-1.4;arms[0].elbow.rotation.x=-.8;head.rotation.z=.08;}
  }
  animate(0, 0);
  return { group, animate };
}
