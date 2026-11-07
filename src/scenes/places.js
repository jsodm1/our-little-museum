import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
const zone = (name, x, z, description) => ({ name, position: [x, z], description });
export const placeCatalog = [
  { id: 'museum', name: 'Memory Museum', subtitle: 'Every picture, a little piece of us', description: 'A warm gallery for the photographs you return to.', color: '#c9b6a1', icon: 'museum', zones: [zone('The collection', 0, 2, 'Photographs and small stories.'), zone('Our story', 0, -8, 'Your favorite memory, together.'), zone('A letter for you', 0, 8, 'One more thing I wanted to say.')] },
  { id: 'park', name: 'Garden Park', subtitle: 'Take the long way home', description: 'Flower paths, a little bridge, and afternoons by the water.', color: '#98ad8b', icon: 'leaf', zones: [zone('Rose walk', -8, 5, 'A garden made for slow walks.'), zone('The little bridge', 5, -3, 'Pause over the pond.'), zone('Picnic lawn', -7, -9, 'An afternoon with nowhere to be.'), zone('Lantern grove', 9, 10, 'Leave a wish under the trees.')] },
  { id: 'beach', name: 'Sunset Beach', subtitle: 'Somewhere between sea and sky', description: 'Barefoot walks, a lighthouse, and the last light on the water.', color: '#d9ad87', icon: 'sun', zones: [zone('The shoreline', 0, -3, 'Walk beside the water.'), zone('Boardwalk', -9, 9, 'Wooden paths and sea air.'), zone('Lighthouse', 12, -1, 'A message overlooking the coast.'), zone('Bonfire cove', -10, 0, 'Stay until the stars come out.'), zone('Picnic by the sea', 6, 8, 'A quiet place for two.')] },
  { id: 'cafe', name: 'Our Little Café', subtitle: 'One table. All the time in the world.', description: 'A sunlit café, a record corner, and a balcony for two.', color: '#b9997c', icon: 'coffee', zones: [zone('Window table', -8, -5, 'Remember the first conversation.'), zone('Coffee counter', 6, -8, 'Your usual, made with love.'), zone('Record corner', -9, 5, 'Choose a soundtrack for the afternoon.'), zone('Garden terrace', 7, 9, 'Coffee under the pergola.')] },
  { id: 'rooftop', name: 'Starlight Rooftop', subtitle: 'The city can wait', description: 'A velvet sky, warm lanterns, and a place above the city.', color: '#777c9a', icon: 'moon', zones: [zone('City overlook', 0, -12, 'A thousand lights below us.'), zone('Stargazing corner', -10, -7, 'Pick a star and make a wish.'), zone('The pergola', 7, 3, 'Sit close beneath the lights.'), zone('A letter at midnight', -7, 9, 'Words that sound different under the stars.')] },
  { id: 'forest', name: 'Forest Retreat', subtitle: 'A little further from everything', description: 'A winding woodland trail, a cabin, and a hidden waterfall.', color: '#718776', icon: 'tree', zones: [zone('Woodland trail', 0, 9, 'Follow the dappled path.'), zone('Little cabin', -9, -6, 'A warm place among the trees.'), zone('Hidden waterfall', 9, -10, 'Listen to the water.'), zone('Campfire clearing', 7, 6, 'Stories told around a fire.')] },
  { id: 'home', name: 'Our Cozy Home', subtitle: 'My favorite place is with you', description: 'A living room, a kitchen, and a balcony filled with light.', color: '#c7ac98', icon: 'home', zones: [zone('Living room', -6, 4, 'Stay in a little longer.'), zone('Our kitchen', -7, -8, 'The everyday memories.'), zone('Quiet room', 8, -7, 'A letter on the bedside table.'), zone('Green balcony', 9, 10, 'Plants, sunshine, and two chairs.')] },
  { id: 'winter', name: 'Winter Village', subtitle: 'Warm hearts, cold hands', description: 'Snow-dusted cottages, a frozen pond, and a tree full of wishes.', color: '#bcccd0', icon: 'snow', zones: [zone('Village square', 0, 3, 'Warm lights on a snowy evening.'), zone('Frozen pond', 8, -8, 'A little winter magic.'), zone('Cabin porch', -9, -7, 'Come in from the cold.'), zone('Wishing tree', -7, 9, 'Leave something for the next season.')] },
  { id: 'celebration', name: 'Celebration Garden', subtitle: 'A day worth keeping', description: 'A flower arch, dinner under lights, and a dance floor for two.', color: '#d5b2ac', icon: 'sparkle', zones: [zone('Flower arch', 0, 10, 'Every celebration starts here.'), zone('Dinner for two', -7, 1, 'A table set just for you.'), zone('The dance floor', 5, -5, 'One more song.'), zone('Surprise pavilion', -5, -11, 'The moment you were waiting for.')] },
];

function canvasMap(draw, repeat = 1) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  draw(canvas.getContext('2d'), 512);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(repeat, repeat); return map;
}
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function groundMap(color, lines = false) {
  return canvasMap((c, size) => {
    c.fillStyle = color; c.fillRect(0, 0, size, size);
    for (let i = 0; i < 12000; i++) { c.fillStyle = i % 2 ? '#ffffff0a' : '#28251d08'; c.fillRect(hash(i) * size, hash(i + 92) * size, 1.5, 1); }
    if (lines) { c.strokeStyle = '#42372a2c'; c.lineWidth = 2; c.strokeRect(1, 1, size - 2, size - 2); }
  }, lines ? 13 : 6);
}
function makeBuilder(scene) {
  const architecture = new T.Group(); scene.add(architecture);
  const cache = new Map(), obstacles = [], hotspots = [], updates = [];
  function material(color, basic = false) {
    const key = color + basic;
    if (!cache.has(key)) cache.set(key, basic ? new T.MeshBasicMaterial({ color }) : new T.MeshStandardMaterial({ color, roughness: .8 }));
    return cache.get(key);
  }
  function mesh(geo, color, x = 0, y = 0, z = 0, parent = architecture, basic = false) {
    const object = new T.Mesh(geo, typeof color === 'string' ? material(color, basic) : color);
    object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  }
  function box(w, h, d, x, y, z, color, parent = architecture) { return mesh(new T.BoxGeometry(w, h, d), color, x, y, z, parent); }
  function cylinder(top, bottom, height, x, y, z, color, parent = architecture, segments = 12) { return mesh(new T.CylinderGeometry(top, bottom, height, segments), color, x, y, z, parent); }
  function ball(radius, x, y, z, color, parent = architecture, detail = 1) { return mesh(new T.IcosahedronGeometry(radius, detail), color, x, y, z, parent); }
  function bar(a, b, radius, color, parent = architecture) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.clone().sub(start);
    const o = cylinder(radius, radius, direction.length(), 0, 0, 0, color, parent, 8);
    o.position.copy(start).lerp(end, .5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()); return o;
  }
  function floor(w, d, x, z, color, tiles = false, y = -.035) {
    const map = groundMap(color, tiles), mat = new T.MeshStandardMaterial({ color: map ? '#ffffff' : color, map, roughness: tiles ? .52 : .95 });
    const m = mesh(new T.PlaneGeometry(w, d), mat, x, y, z); m.rotation.x = -PI / 2; m.castShadow = false; return m;
  }
  const shadowMap = canvasMap((c, size) => {
    const g = c.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#26221a70'); g.addColorStop(.45, '#302a202d'); g.addColorStop(1, '#302a2000');
    c.fillStyle = g; c.fillRect(0, 0, size, size);
  });
  const shadowMat = new T.MeshBasicMaterial({ color: '#514739', map: shadowMap, transparent: true, opacity: .42, depthWrite: false });
  function shadow(x, z, w = 2, d = w, y = .006) { const m = mesh(new T.PlaneGeometry(w, d), shadowMat, x, y, z); m.rotation.x = -PI / 2; m.castShadow = false; return m; }
  function obstacle(x, z, w, d) { obstacles.push({ x, z, w, d }); }
  function bench(x, z, yaw = 0, color = '#9b7350', back = true) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; architecture.add(g);
    for (const xx of [-.83, .83]) { box(.09, .48, .57, xx, .25, 0, '#363c35', g); if (back) bar([xx, .35, -.25], [xx, 1.05, -.36], .035, '#363c35', g); }
    for (let i = 0; i < 4; i++) box(2.1, .075, .13, 0, .51, -.23 + i * .15, color, g);
    if (back) for (let i = 0; i < 3; i++) box(2.1, .14, .055, 0, .76 + i * .16, -.33, color, g);
    obstacle(x, z, Math.abs(Math.cos(yaw)) * 2.1 + .3, Math.abs(Math.sin(yaw)) * 2.1 + .65); shadow(x, z, 2.5, 1.5); return g;
  }
  function planter(x, z, scale = 1, flowers = false) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); architecture.add(g);
    cylinder(.33, .24, .55, 0, .275, 0, '#ba9272', g, 18); cylinder(.31, .31, .025, 0, .56, 0, '#4a4635', g, 16);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399, h = .82 + hash(i + x * 11) * .45;
      bar([0, .55, 0], [Math.sin(a) * .27, h, Math.cos(a) * .27], .012, '#677252', g);
      const leaf = ball(.18, Math.sin(a) * .25, h - .03, Math.cos(a) * .25, flowers ? ['#d6a5a0', '#e7c7a4', '#a990a4'][i % 3] : ['#687652', '#566b4a', '#7f8d64'][i % 3], g, 0);
      leaf.scale.set(flowers ? .9 : .6, flowers ? .7 : 1.45, .48); leaf.rotation.z = Math.sin(a) * .8;
    }
    shadow(x, z, 1.3 * scale); return g;
  }
  function tree(x, z, scale = 1, type = 'olive') {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); architecture.add(g);
    const bark = type === 'snow' ? '#62584c' : '#73634b';
    cylinder(.085, .19, 2.8, 0, 1.4, 0, bark, g, 9);
    if (type === 'pine' || type === 'snow') {
      for (let i = 0; i < 4; i++) cylinder(0, 1.20 - i * .22, 1.65, 0, 1.65 + i * .66, 0, type === 'snow' ? ['#cbd8d5', '#d9e4e0', '#e8eeeb', '#f5f6ed'][i] : ['#465d48', '#506a4b', '#5a7451', '#6b805a'][i], g, 9);
    } else {
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399, r = .42 + .35 * hash(i + x), y = 2.6 + hash(i + z * 9) * 1.2;
        bar([0, 1.8 + .11 * i, 0], [Math.cos(a) * r, y, Math.sin(a) * r], .045, bark, g);
        const colors = type === 'blossom' ? ['#d4aaa7', '#e4c1ba', '#f1d6ca', '#c99597'] : ['#687951', '#78895d', '#8d9a68', '#5c7250'];
        const crown = ball(.79, Math.cos(a) * r, y, Math.sin(a) * r, colors[i % colors.length], g, 1);
        crown.scale.set(1.1, .88, 1.08);
      }
    }
    obstacle(x, z, .48 * scale, .48 * scale); shadow(x + .4 * scale, z + .2 * scale, 4 * scale, 3 * scale); return g;
  }
  function palm(x, z, scale = 1, yaw = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.scale.setScalar(scale); architecture.add(g);
    for (let i = 0; i < 6; i++) {
      const a = [i * .075, i * .68, 0], b = [(i + 1) * .075, (i + 1) * .68, 0];
      bar(a, b, .14 - i * .009, '#a28a68', g);
      const ring = cylinder(.143 - i * .009, .145 - i * .009, .045, b[0], b[1] - .12, 0, '#8c7457', g, 10); ring.rotation.z = -.11;
    }
    for (let i = 0; i < 9; i++) {
      const a = i * PI * 2 / 9, positions = [], indices = [];
      for (let j = 0; j <= 7; j++) {
        const f = j / 7, r = f * 2.15, y = 4.1 + Math.sin(f * PI) * .45 - f * f * .85;
        const w = Math.sin(f * PI) * .27;
        for (const side of [-1, 1]) positions.push(.45 + Math.cos(a) * r - Math.sin(a) * w * side, y - Math.abs(side) * .05, Math.sin(a) * r + Math.cos(a) * w * side);
        if (j < 7) { const k = j * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
      const mat = material(i % 2 ? '#637847' : '#7d8f58'); mat.side = T.DoubleSide; mesh(geo, mat, 0, 0, 0, g);
      bar([.45, 4.05, 0], [.45 + Math.cos(a) * 1.3, 4.1, Math.sin(a) * 1.3], .016, '#8b975a', g);
    }
    obstacle(x, z, .5 * scale, .5 * scale); shadow(x + 1, z, 4 * scale, 3 * scale); return g;
  }
  function lamp(x, z, h = 2.8) {
    cylinder(.045, .07, h, x, h / 2, z, '#3b433d'); cylinder(.22, .12, .22, x, h + .24, z, '#3b433d');
    cylinder(.12, .12, .26, x, h + .04, z, material('#fff0c7', true)); cylinder(.15, .20, .07, x, h - .12, z, '#3b433d');
    if (!scene.userData.low) { const light = new T.PointLight('#ffe0a9', 2.4, 5, 2); light.position.set(x, h, z); scene.add(light); }
  }
  function stringLights(a, b, count = 12) {
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1), x = a[0] + (b[0] - a[0]) * f, z = a[2] + (b[2] - a[2]) * f;
      const y = a[1] + (b[1] - a[1]) * f - Math.sin(f * PI) * .38;
      ball(.055, x, y, z, material('#ffedbb', true), architecture, 0);
      if (i) { const prev = (i - 1) / (count - 1), py = a[1] + (b[1] - a[1]) * prev - Math.sin(prev * PI) * .38; bar([a[0] + (b[0] - a[0]) * prev, py, a[2] + (b[2] - a[2]) * prev], [x, y, z], .012, '#494239'); }
    }
  }
  function pergola(x, z, w = 5, d = 4, white = false) {
    const color = white ? '#e7e0d2' : '#a28c6d';
    for (const xx of [-w / 2, w / 2]) for (const zz of [-d / 2, d / 2]) { box(.17, 3.1, .17, x + xx, 1.55, z + zz, color); obstacle(x + xx, z + zz, .24, .24); }
    box(w + .4, .2, .16, x, 3.05, z - d / 2, color); box(w + .4, .2, .16, x, 3.05, z + d / 2, color);
    for (let i = 0; i <= 8; i++) box(.10, .14, d + .5, x - w / 2 + i * w / 8, 3.22, z, color);
    stringLights([x - w / 2, 2.94, z - d / 2], [x + w / 2, 2.94, z + d / 2], 12);
  }
  function chair(x, z, yaw = 0, color = '#9a7e60') {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; architecture.add(g);
    for (const xx of [-.25, .25]) for (const zz of [-.23, .23]) box(.045, .49, .045, xx, .245, zz, '#49483e', g);
    box(.60, .09, .57, 0, .5, 0, color, g); box(.60, .5, .075, 0, .82, -.25, color, g);
    obstacle(x, z, .65, .65); shadow(x, z, 1); return g;
  }
  function table(x, z, radius = .65, color = '#b69a73') {
    cylinder(radius, radius, .08, x, .79, z, color, architecture, 24); cylinder(.065, .09, .70, x, .40, z, '#49483e'); cylinder(.32, .32, .045, x, .045, z, '#49483e');
    obstacle(x, z, radius * 2, radius * 2); shadow(x, z, radius * 3); return .83;
  }
  function cup(x, y, z) {
    cylinder(.075, .062, .105, x, y + .055, z, '#f6eddb', architecture, 12); cylinder(.064, .064, .007, x, y + .110, z, '#66472b', architecture, 12);
    const h = mesh(new T.TorusGeometry(.038, .012, 5, 12), '#eee4d0', x + .078, y + .06, z); h.rotation.y = PI / 2;
    cylinder(.105, .105, .012, x, y + .007, z, '#e3d5c0', architecture, 16);
  }
  function cushion(x, y, z, color, scale = 1) { const o = ball(.5, x, y, z, color, architecture, 2); o.scale.set(scale, .32 * scale, .8 * scale); return o; }
  function rock(x, z, size = 1, color = '#8a8c7c') { const o = ball(size, x, size * .32, z, color, architecture, 1); o.scale.set(1, .62, .78); o.rotation.y = x + z; return o; }
  function sign(text, x, y, z, width = 2, yaw = 0, color = '#4e5147') {
    const map = canvasMap((c, n) => { c.fillStyle = '#f4eee1'; c.fillRect(0, 0, n, n); c.fillStyle = color; c.textAlign = 'center'; c.font = 'italic 54px Georgia'; c.fillText(text, n / 2, 278, n - 35); });
    const m = mesh(new T.PlaneGeometry(width, width / 2.7), new T.MeshBasicMaterial({ color: '#ffffff', map, side: T.DoubleSide }), x, y, z); m.rotation.y = yaw; return m;
  }
  function hotspot(id, title, kind, x, z, y = .90) {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    const stand = box(.48, y - .1, .36, 0, (y - .1) / 2, 0, '#d2c3a8', g);
    const letter = box(.38, .035, .25, 0, y, 0, '#faf0db', g); letter.rotation.x = .13;
    const seal = cylinder(.038, .038, .008, 0, y + .025, -.01, '#b67f76', g, 12);
    hotspots.push({ id, title, kind, position: [x, y, z], mesh: stand, meshes: [stand, letter, seal] });
    stand.userData.hotspot = id; letter.userData.hotspot = id; seal.userData.hotspot = id;
    obstacle(x, z, .52, .4); shadow(x, z, .9); return stand;
  }
  function sit(id, title, x, z, yaw = 0) {
    const g = bench(x, z, yaw); const seats = [];
    g.traverse(m => { if (m.isMesh) { m.userData.hotspot = id; seats.push(m); } });
    hotspots.push({ id, title, kind: 'sit', position: [x, .55, z], mesh: seats[0], meshes: seats });
  }
  function water(x, z, w, d, color = '#83a6a1', y = -.025) {
    const mat = new T.MeshStandardMaterial({ color, roughness: .2, metalness: .16 }); floor(w, d, x, z, color, false, y).material = mat;
    const streaks = [];
    for (let i = 0; i < 14; i++) {
      const xx = x + (hash(i + 64) - .5) * w * .9, zz = z + (hash(i + 92) - .5) * d * .92;
      const line = box(.35 + hash(i) * 1.4, .004, .025, xx, y + .012, zz, '#c0d2bd'); line.castShadow = false; streaks.push(line);
    }
    updates.push(time => streaks.forEach((m, i) => { m.scale.x = .8 + Math.sin(time * .45 + i) * .2; }));
  }
  function cabin(x, z, snow = false, w = 5.4, d = 4.4) {
    const g = new T.Group(); g.position.set(x, 0, z); architecture.add(g);
    box(w, 2.8, d, 0, 1.4, 0, snow ? '#827668' : '#9f8461', g);
    for (let i = 0; i < 12; i++) box(w + .035, .025, d + .035, 0, .12 + i * .23, 0, snow ? '#635e53' : '#806d52', g);
    const roof = cylinder(0, w * .76, 1.6, 0, 3.2, 0, snow ? '#e2e8df' : '#535b4c', g, 4); roof.rotation.y = PI / 4; roof.scale.z = d / w;
    box(.85, 2.05, .08, 0, 1.025, d / 2 + .045, '#4d5147', g);
    for (const xx of [-1.6, 1.6]) {
      box(.98, 1.05, .10, xx, 1.6, d / 2 + .06, '#e9d9bb', g); box(.8, .87, .025, xx, 1.6, d / 2 + .12, material('#f3ce8c', true), g);
      box(.04, .9, .035, xx, 1.6, d / 2 + .14, '#8b7960', g); box(.85, .045, .035, xx, 1.6, d / 2 + .14, '#8b7960', g);
    }
    box(w + .6, .12, 1.2, 0, .06, d / 2 + .65, '#a7977e', g);
    box(.6, 1.2, .6, w * .25, 3.8, 0, '#8a7e70', g); obstacle(x, z, w + .2, d + .15); shadow(x, z, w * 1.8, d * 1.6); return g;
  }
  function fire(x, z) {
    for (let i = 0; i < 10; i++) rock(x + Math.cos(i * PI / 5) * .76, z + Math.sin(i * PI / 5) * .76, .18, '#7c7665');
    bar([x - .5, .14, z - .25], [x + .5, .14, z + .25], .12, '#66513d'); bar([x - .5, .18, z + .3], [x + .5, .18, z - .3], .11, '#776047');
    const flames = [];
    for (let i = 0; i < 5; i++) { const f = mesh(new T.ConeGeometry(.16, .65 + .12 * (i % 2), 6), material(i % 2 ? '#edac63' : '#f2ce7d', true), x + (hash(i) - .5) * .45, .42, z + (hash(i + 4) - .5) * .35, scene); flames.push(f); }
    updates.push(time => flames.forEach((f, i) => { f.scale.y = .85 + Math.sin(time * 5 + i * 2) * .15; })); obstacle(x, z, 1.65, 1.65);
  }
  function finish() {
    architecture.updateMatrixWorld(true); const batches = new Map();
    architecture.traverse(m => { if (!m.isMesh || m.material.transparent || m.userData.hotspot) return; if (!batches.has(m.material)) batches.set(m.material, []); batches.get(m.material).push(m); });
    for (const [mat, list] of batches) {
      if (list.length < 2) continue;
      const geos = list.map(m => {
        let g = m.geometry.clone().applyMatrix4(m.matrixWorld); if (g.index) { const old = g; g = g.toNonIndexed(); old.dispose(); }
        g.deleteAttribute('uv'); if (!g.attributes.normal) g.computeVertexNormals(); return g;
      });
      const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
      if (!merged) continue;
      for (const m of list) { m.removeFromParent(); m.geometry.dispose(); }
      const m = new T.Mesh(merged, mat); m.castShadow = m.receiveShadow = true; scene.add(m);
    }
  }
  return { architecture, material, mesh, box, cylinder, ball, bar, floor, shadow, obstacle, bench, planter, tree, palm, lamp, stringLights, pergola, chair, table, cup, cushion, rock, sign, hotspot, sit, water, cabin, fire, finish, obstacles, hotspots, updates };
}

function beach(b) {
  b.floor(130, 100, 0, 15, '#dfc8a7'); b.water(0, -36, 160, 62, '#779d9c', -.09); b.obstacle(0, -21, 80, 31.3);
  for (let i = 0; i < 5; i++) { const wave = b.box(96, .012, .05 + i * .025, 0, -.035 + i * .006, -5.3 - i * 1.75, i % 2 ? '#c5c9b3' : '#e7dfc6'); wave.castShadow = false; }
  for (let i = 0; i < 9; i++) { const island = b.ball(4 + hash(i) * 4, -44 + i * 11, .6, -66 - hash(i) * 12, '#708b87', b.architecture, 1); island.scale.set(1.7, .35, 1); }
  for (const [x, z, s, a] of [[-14, 7, 1.2, .3], [-11, 10, 1.05, 2], [12, 10, 1.15, 1], [14, 6, 1, -.7], [-15, -1, .88, 0]]) b.palm(x, z, s, a);
  for (let i = 0; i < 54; i++) b.box(3.4, .055, .29, -9, .025, 15 - i * .31, i % 3 ? '#a69074' : '#b8a082');
  for (const x of [-10.9, -7.1]) { for (let z = 14; z >= -1; z -= 3) b.cylinder(.05, .065, .68, x, .34, z, '#b5a387'); b.bar([x, .58, -1], [x, .58, 14], .018, '#e2d1ac'); }
  b.pergola(6.2, 7.5, 4.8, 3.7, true); b.floor(4.5, 3.4, 6.2, 7.5, '#d9c1aa', false, .007);
  b.cushion(5.4, .15, 8, '#eee1c9', 1.05); b.cushion(6.6, .15, 8.3, '#bc8d7b', 1.05);
  b.box(1.15, .28, .68, 6.15, .14, 7.1, '#b29472'); b.cup(5.9, .29, 7.1); b.cup(6.4, .29, 7.1);
  b.cylinder(.34, .38, .32, 7.4, .16, 7.1, '#a08055', b.architecture, 12);
  b.fire(-12, 1); b.sit('beach-fire', 'Sit by the bonfire', -11.6, 3, .15); b.sit('beach-sea', 'Watch the sunset together', 1, -2.8, PI);
  b.cylinder(.65, 1.03, 6.8, 13, 3.4, -1.9, '#e5e1cf', b.architecture, 20);
  b.cylinder(.80, .80, .35, 13, 5.6, -1.9, '#a87864', b.architecture, 20);
  b.cylinder(1.04, 1.04, .18, 13, 6.85, -1.9, '#666c60', b.architecture, 20);
  b.cylinder(.55, .55, .86, 13, 7.35, -1.9, b.material('#f4e8bb', true), b.architecture, 16);
  b.cylinder(0, .95, .7, 13, 8.13, -1.9, '#5a6459', b.architecture, 16);
  for (let i = 0; i < 8; i++) { const a = i * PI / 4; b.cylinder(.035, .035, 1.0, 13 + Math.cos(a) * .61, 7.36, -1.9 + Math.sin(a) * .61, '#677060'); }
  b.obstacle(13, -1.9, 2.1, 2.1); b.shadow(13, -1.9, 4);
  b.hotspot('beach-letter', 'A message from the sea', 'letter', 10.8, -.6); b.hotspot('beach-memory', 'Our seaside memory', 'memory', 4.3, 6.3);
  for (let i = 0; i < 14; i++) b.rock(14 + hash(i) * 3, -3 + hash(i + 4) * 3, .15 + hash(i + 8) * .48, '#b8b5a0');
  b.sign('Stay a little longer', -8.9, 1.45, 11.8, 1.65); b.hotspot('beach-wish', 'Leave a wish by the lighthouse', 'wish', 11, 1.5);
}
function park(b) {
  b.floor(100, 100, 0, 0, '#92a079'); b.floor(3, 36, 0, 0, '#d2c5ac', false, -.005); b.floor(28, 2.5, 0, 2, '#d2c5ac', false, -.003);
  b.water(6, -6.8, 10, 7.5, '#71928b', -.08); b.obstacle(6, -8.5, 10, 4.1); b.obstacle(3, -4, 4, 3.3); b.obstacle(9.3, -4, 3.6, 3.3);
  for (let i = 0; i < 23; i++) b.box(1.8, .065, .23, 6, .025, -1.25 - i * .24, '#ad9876');
  for (const x of [5.05, 6.95]) { for (const z of [-1.2, -3.8, -6.5]) b.box(.08, .9, .08, x, .45, z, '#8a805f'); b.bar([x, .82, -1.2], [x, .82, -6.5], .045, '#a4966f'); }
  for (let i = 0; i < 16; i++) b.tree(-15 + hash(i) * 30, -15 + hash(i + 17) * 4, .85 + hash(i + 9) * .45, i % 3 ? 'olive' : 'blossom');
  for (const [x, z, s] of [[-10, 9, 1.15], [-12, 2, 1], [10, 12, 1.15], [14, 4, .95], [-7, -10, 1.08]]) b.tree(x, z, s, 'blossom');
  for (let i = 0; i < 8; i++) { b.planter(-9, 7 - i * 1.5, .95, true); b.planter(-5.8, 7 - i * 1.5, .8, true); }
  b.floor(3.8, 14, -7.4, .7, '#d5c9af', false, -.004);
  b.pergola(-7.2, -8.3, 4.4, 4, true); b.sit('park-picnic', 'Sit beneath the blossoms', -7.3, -8.1, PI);
  b.sit('park-pond', 'Watch the water', 1.1, -5.8, -PI / 2); b.sit('park-grove', 'Sit in the lantern grove', 9, 9, -.4);
  for (const [x, z] of [[2.2, 11], [2.2, 5], [-2.2, -3], [-2.2, -10], [11, 7], [7, 11]]) b.lamp(x, z);
  b.stringLights([7, 3.5, 7], [12, 3.5, 12], 12); b.hotspot('park-memory', 'A little garden memory', 'memory', -5.1, 4.2); b.hotspot('park-letter', 'A letter by the pond', 'letter', 11.8, -3); b.hotspot('park-wish', 'A wish under the lanterns', 'wish', 8, 11.7);
}
function cafe(b) {
  b.floor(32, 32, 0, 0, '#d3c5ad', true); b.box(30, 4.5, .2, 0, 2.25, -13.7, '#e4d8bf'); b.box(.2, 4.5, 27.5, -15, 2.25, 0, '#ded0b6'); b.box(.2, 4.5, 18, 15, 2.25, -4.8, '#e2d5bd');
  b.obstacle(0, -13.6, 30, .4); b.obstacle(-14.9, 0, .4, 28); b.obstacle(14.9, -4.8, .4, 18);
  for (const x of [-11, -6, -1, 4, 9]) { b.box(3.7, 3.0, .10, x, 2.15, -13.53, '#67847d'); b.box(3.4, 2.7, .05, x, 2.15, -13.46, b.material('#bccbc1', true)); b.box(.09, 2.9, .1, x, 2.15, -13.39, '#e9ddc5'); b.box(3.6, .08, .1, x, 2.15, -13.38, '#e9ddc5'); }
  for (let i = 0; i < 6; i++) b.box(.13, .17, 27, -13 + i * 5, 4.5, -1, '#b09674');
  b.box(7.2, 1.1, 1.5, 7.7, .55, -8.8, '#647366'); b.box(7.4, .11, 1.65, 7.7, 1.15, -8.8, '#ddd0b3'); b.obstacle(7.7, -8.8, 7.5, 1.7);
  for (let i = 0; i < 15; i++) b.box(.035, 1, .04, 4.35 + i * .48, .55, -8.02, '#9aab91');
  b.box(.8, .65, .55, 7.7, 1.53, -8.8, '#474c46'); b.cylinder(.23, .23, .13, 7.7, 1.90, -8.8, '#9f9b8c');
  for (let i = 0; i < 3; i++) { b.box(4.5, .08, .4, 7.8, 1.7 + i * .62, -13.22, '#a58d69'); for (let k = 0; k < 7; k++) b.cup(6 + k * .58, 1.75 + i * .62, -13.1); }
  for (const [x, z] of [[-8, -6], [-8, -.5], [-2.3, -5], [3, -.3]]) {
    const y = b.table(x, z, .88); b.chair(x, z + 1.25, 0); b.chair(x, z - 1.25, PI); b.cup(x - .33, y, z); b.cup(x + .33, y, z);
    b.cylinder(.07, .09, .22, x, y + .11, z + .35, '#a8aa8c'); b.ball(.12, x, y + .36, z + .35, '#cfaca1', b.architecture, 1);
  }
  b.pergola(8, 8, 7, 5, true); b.floor(8, 7, 8, 8, '#c4b397', true, .006); b.sit('cafe-terrace', 'Sit on the garden terrace', 8, 8, PI);
  for (const [x, z] of [[-12, -11], [12, -11], [3.6, 11], [12.4, 11], [-12, 6]]) b.planter(x, z, 1.7);
  b.box(2.2, .85, .65, -9.5, .425, 5.4, '#997b58'); b.box(.85, .09, .55, -9.8, .90, 5.4, '#49463f'); b.cylinder(.20, .20, .018, -9.8, .96, 5.4, '#272c28', b.architecture, 24); b.obstacle(-9.5, 5.4, 2.3, .8);
  b.sign('Our little café', 0, 3.3, -13.40, 3.2); b.hotspot('cafe-memory', 'Remember our first date', 'memory', -5.9, -4.5); b.hotspot('cafe-letter', 'A note with your coffee', 'letter', 4, -6.5); b.hotspot('cafe-wish', 'An idea for our next date', 'wish', -7.4, 5.4);
}
function rooftop(b) {
  b.floor(32, 36, 0, 0, '#777a78', true); const rail = '#687378';
  for (const x of [-15.8, 15.8]) { b.box(.22, .38, 36, x, .19, 0, '#8c9390'); b.box(.06, .06, 36, x, 1.1, 0, rail); for (let z = -17; z <= 17; z += 1.4) b.box(.035, 1, .035, x, .65, z, rail); }
  for (const z of [-17.8, 17.8]) { b.box(32, .38, .22, 0, .19, z, '#8c9390'); b.box(32, .06, .06, 0, 1.1, z, rail); for (let x = -15; x <= 15; x += 1.4) b.box(.035, 1, .035, x, .65, z, rail); }
  for (let i = 0; i < 30; i++) {
    const x = -60 + i * 4.2, h = 3 + hash(i + 4) * 14, z = -33 - hash(i + 7) * 15;
    b.box(2.8 + hash(i) * 2, h, 4, x, h / 2 - 4, z, ['#59616c', '#626b76', '#747983'][i % 3]);
    for (let j = 0; j < 3; j++) for (let k = 0; k < Math.floor(h / 1.6); k++) if (hash(j * 91 + k * 37 + i) > .37) b.box(.35, .48, .015, x - .8 + j * .8, -.8 + k * 1.3, z + 2.02, b.material(k % 2 ? '#d8c5a0' : '#a2b3b0', true));
  }
  b.pergola(7, 3, 6, 5); b.floor(6.1, 5.3, 7, 3, '#a49d8c', false, .008); b.sit('roof-seat', 'Sit beneath the lights', 7, 4, 0, '#a99a84');
  for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13], [3.6, .3], [10.4, 5.7]]) b.planter(x, z, 1.6);
  const telescope = new T.Group(); telescope.position.set(-10, 0, -7); b.architecture.add(telescope);
  for (let i = 0; i < 3; i++) { const a = i * PI * 2 / 3; b.bar([Math.cos(a) * .6, 0, Math.sin(a) * .6], [0, 1.2, 0], .035, '#b7afa1', telescope); }
  b.bar([0, 1.25, .4], [0, 1.65, -.5], .17, '#d4cbbb', telescope); b.obstacle(-10, -7, 1.3, 1.3);
  b.cushion(-6, .21, -8.6, '#b7a39a', 1.7); b.cushion(-4.4, .21, -8, '#7c8b89', 1.7);
  b.stringLights([-13, 3, -13], [13, 3, -13], 23); b.stringLights([-13, 3, 12], [13, 3, 12], 23);
  b.lamp(-12, 10, 2.3); b.lamp(12, -10, 2.3); b.hotspot('roof-stars', 'Make a wish on a star', 'wish', -8.3, -5.8); b.hotspot('roof-letter', 'A letter at midnight', 'letter', -7, 9); b.hotspot('roof-memory', 'The view from here', 'memory', 0, -13.7);
  for (let i = 0; i < 60; i++) b.ball(.04 + hash(i) * .025, (hash(i + 91) - .5) * 90, 15 + hash(i + 23) * 24, -48 - hash(i + 64) * 15, b.material('#e8e7d5', true), b.architecture, 0);
}
function forest(b) {
  b.floor(100, 100, 0, 0, '#818e70');
  for (let i = 0; i < 19; i++) b.floor(4.5, 2.2, Math.sin(i * .30) * 2, 17 - i * 1.8, '#c0b395', false, -.006 + i * .0001);
  for (let i = 0; i < 23; i++) {
    const side = i % 2 ? -1 : 1, x = side * (10 + hash(i) * 9), z = -21 + hash(i + 8) * 42;
    b.tree(x, z, 1.0 + hash(i + 5) * .65, i % 3 ? 'pine' : 'olive');
  }
  b.cabin(-9, -7); b.sit('forest-cabin', 'Sit outside the cabin', -8.5, -3.2, PI);
  b.water(8.5, -10, 6.5, 6, '#7c9b91', -.08); b.obstacle(8.5, -10, 6.5, 6);
  for (let i = 0; i < 9; i++) b.rock(5.5 + hash(i) * 7, -13.5 + hash(i + 4) * 2.7, .8 + hash(i + 6) * 1.9, ['#848a78', '#969b85', '#737f70'][i % 3]);
  const falls = b.box(1.1, 3.1, .045, 8.9, 1.6, -12.4, b.material('#c0d0c5', true));
  for (let i = 0; i < 9; i++) b.box(.035, 2.8, .025, 8.43 + i * .12, 1.55, -12.35, i % 2 ? '#dbe2d5' : '#9bb8ad');
  b.updates.push(t => { falls.scale.x = .97 + Math.sin(t * 1.3) * .03; });
  b.fire(7, 6); b.sit('forest-fire', 'Sit around the campfire', 7, 8.3, 0); b.bench(4.6, 5.8, PI / 2);
  for (let i = 0; i < 15; i++) b.rock(-7 + hash(i) * 14, -10 + hash(i + 9) * 24, .2 + hash(i + 3) * .4, '#87927b');
  b.hotspot('forest-memory', 'A memory from the trail', 'memory', -3.5, 7); b.hotspot('forest-letter', 'A letter near the waterfall', 'letter', 6, -5.8); b.hotspot('forest-wish', 'Plan our next adventure', 'wish', -5.6, -2);
}
function home(b) {
  b.floor(30, 31, 0, 0, '#c0a689', true); b.box(30, 3.6, .2, 0, 1.8, -14.5, '#e1d7c2'); b.box(.2, 3.6, 29, -14.9, 1.8, 0, '#dbd3bf'); b.box(.2, 3.6, 20, 14.9, 1.8, -4.5, '#dce0ce');
  b.obstacle(0, -14.4, 30, .4); b.obstacle(-14.8, 0, .4, 29); b.obstacle(14.8, -4.5, .4, 20);
  for (const [x, w] of [[-10, 10], [10, 10]]) { b.box(w, 3.4, .16, x, 1.7, -2.3, '#e8dfcc'); b.obstacle(x, -2.3, w, .25); }
  b.box(.18, 3.6, 11.8, 1, 1.8, -8.4, '#d8cfba'); b.obstacle(1, -8.4, .3, 11.8);
  for (const x of [-10, -5, 6, 11]) { b.box(3.4, 2.3, .08, x, 2.0, -14.36, '#9baf9b'); b.box(3.15, 2.05, .04, x, 2.0, -14.30, b.material('#d6dfc4', true)); b.box(.06, 2.1, .05, x, 2, -14.26, '#ebe6d6'); }
  b.floor(7, 5, -6, 4.7, '#d2c6af', false, .009);
  b.box(4.4, .42, 1.4, -6, .35, 6.5, '#c0b49f'); b.box(4.4, .8, .28, -6, .7, 7.1, '#c0b49f');
  b.box(.3, .75, 1.4, -8.15, .62, 6.5, '#b5aa95'); b.box(.3, .75, 1.4, -3.85, .62, 6.5, '#b5aa95'); b.obstacle(-6, 6.5, 4.5, 1.5);
  b.cushion(-7.3, .68, 6.6, '#a0a788', .75); b.cushion(-4.6, .68, 6.6, '#be9381', .75);
  b.box(2.4, .12, 1.15, -6, .48, 3.5, '#a88d6b'); for (const x of [-7, -5]) b.box(.08, .43, .9, x, .22, 3.5, '#7d6f57'); b.obstacle(-6, 3.5, 2.5, 1.2); b.cup(-6.4, .55, 3.5); b.cup(-5.6, .55, 3.5);
  b.box(8.5, .95, 1.05, -8.1, .475, -12.7, '#8f9f89'); b.box(8.7, .08, 1.15, -8.1, .99, -12.7, '#ede3cc'); b.obstacle(-8.1, -12.7, 8.8, 1.2);
  for (let i = 0; i < 6; i++) { b.box(1.25, .74, .035, -11.6 + i * 1.4, .5, -12.15, '#a6b09a'); b.box(.25, .025, .045, -11.6 + i * 1.4, .7, -12.11, '#797e6e'); }
  b.table(-7, -7.4, 1.15); b.chair(-8.6, -7.4, PI / 2); b.chair(-5.4, -7.4, -PI / 2);
  b.box(3.6, .38, 4.6, 8.2, .3, -9, '#998b74'); b.box(3.55, .38, 4.2, 8.2, .64, -8.8, '#e8e0cc'); b.box(3.6, 1.2, .18, 8.2, .6, -11.35, '#a28c73'); b.box(3.58, .035, 2.4, 8.2, .85, -7.7, '#aeb8a0'); b.cushion(7.3, .89, -10, '#f1ebda', .9); b.cushion(9, .89, -10, '#f1ebda', .9); b.obstacle(8.2, -9, 3.8, 4.8);
  b.floor(7, 6, 9.5, 10, '#b19e82', true, .005); b.sit('home-balcony', 'Sit on our balcony', 9.5, 11, 0);
  for (const [x, z] of [[6.4, 12], [12.7, 12], [12.7, 8], [-12.5, 8], [-12.5, -1]]) b.planter(x, z, 1.6);
  b.hotspot('home-memory', 'Our everyday memories', 'memory', -2.6, 4); b.hotspot('home-letter', 'A note on the bedside table', 'letter', 11.1, -9.1); b.hotspot('home-wish', 'Our little bucket list', 'wish', -3.2, -5);
}
function winter(b) {
  b.floor(100, 100, 0, 0, '#e3e7dd'); b.floor(4, 30, 0, 0, '#d0d7cd', false, -.006); b.floor(27, 3, 0, 3, '#d4d9cf', false, -.005);
  b.cabin(-9, -7.5, true); b.cabin(9, 8.7, true, 4.8, 4);
  for (let i = 0; i < 17; i++) b.tree(-18 + hash(i) * 36, -20 + hash(i + 13) * 5, .85 + hash(i + 3) * .5, 'snow');
  for (const [x, z, s] of [[-13, 7, 1.1], [-8, 11, 1.25], [13, -11, 1.1], [13, 0, .9]]) b.tree(x, z, s, 'snow');
  b.water(8, -7.5, 8, 7, '#b2cbc8', .002);
  for (let i = 0; i < 18; i++) b.rock(8 + Math.cos(i * PI / 9) * 4.3, -7.5 + Math.sin(i * PI / 9) * 3.8, .2 + hash(i) * .35, '#e5e8dd');
  b.tree(0, -2, 1.25, 'pine'); b.obstacle(0, -2, 2.8, 2.8);
  for (let i = 0; i < 28; i++) { const y = 1.2 + i / 28 * 3.2, a = i * 2.399, r = 1.3 - (y - 1.2) * .25; b.ball(.075, Math.cos(a) * r, y, -2 + Math.sin(a) * r, b.material(i % 2 ? '#eccf99' : '#b68175', i % 2 === 0), b.architecture, 1); }
  b.ball(.17, 0, 5.25, -2, b.material('#ffe7ad', true), b.architecture, 1);
  for (const [x, z] of [[-2.7, 10], [2.7, 10], [-2.7, 3], [2.7, 3], [-4.5, -9], [4.5, -11]]) b.lamp(x, z, 2.4);
  b.stringLights([-13, 3, 3], [13, 3, 3], 23); b.sit('winter-seat', 'Warm hearts, cold hands', -8.5, -3.8, PI);
  b.hotspot('winter-memory', 'A winter memory', 'memory', 4.5, -3.5); b.hotspot('winter-letter', 'A gift for you', 'letter', -6, 9); b.hotspot('winter-wish', 'A wish for the next season', 'wish', -2.1, -.5);
  for (let i = 0; i < 5; i++) { const x = -1.2 + i * .55, z = -.5 + hash(i) * .5; b.box(.35, .3 + hash(i + 4) * .2, .35, x, .18, z, ['#ba8b80', '#b3aa87', '#a2b7a7'][i % 3]); b.box(.04, .4, .36, x, .2, z, '#e4d7b7'); }
}
function celebration(b) {
  b.floor(100, 100, 0, 0, '#9bA183'); b.floor(3.2, 28, 0, 1, '#dacbb1', false, -.005);
  b.pergola(0, 10, 4.3, 1.7, true);
  for (let i = 0; i < 22; i++) { const side = i % 2 ? -1 : 1, y = i < 12 ? .4 + Math.floor(i / 2) * .45 : 3.1, x = i < 12 ? side * 2.15 : -2.2 + (i - 12) * .46; b.ball(.20, x, y, 10.85, ['#d5aaa2', '#edd3bf', '#afbc93'][i % 3], b.architecture, 1); }
  b.floor(7, 6, 5, -5, '#c6b596', true, .008); b.pergola(5, -5, 7.2, 6.2);
  b.table(-7, 1, 1.3, '#e6d7bd'); b.chair(-7, 2.7, 0, '#b5a083'); b.chair(-7, -.7, PI, '#b5a083'); b.cup(-7.5, .84, 1); b.cup(-6.5, .84, 1);
  for (const x of [-7.35, -6.65]) { b.cylinder(.045, .05, .35, x, 1.01, 1.05, '#eee3c7'); b.ball(.025, x, 1.21, 1.05, b.material('#ffe0a1', true), b.architecture, 0); }
  b.planter(-7, 1.4, .5, true);
  b.pergola(-5, -11, 5.7, 4, true); b.box(3.9, .75, .9, -5, .375, -11.5, '#d6c2a7'); b.obstacle(-5, -11.5, 4, 1);
  for (let i = 0; i < 14; i++) b.tree(-16 + hash(i) * 32, -18 + hash(i + 14) * 4, .85 + hash(i + 1) * .3, 'blossom');
  for (const [x, z] of [[-13, 9], [13, 10], [-13, -3], [13, -10]]) b.tree(x, z, 1.05, 'blossom');
  for (const x of [-2.2, 2.2]) for (let z = 7; z > -10; z -= 3.8) { b.planter(x, z, .85, true); b.cylinder(.09, .11, .24, x, .12, z - .7, '#dfcbb0'); b.ball(.035, x, .28, z - .7, b.material('#ffe0ab', true), b.architecture, 0); }
  b.stringLights([-13, 3.6, 7], [13, 3.6, 7], 24); b.stringLights([-13, 3.6, -11], [13, 3.6, -11], 24);
  b.sit('celebration-seat', 'Take a moment together', 10.8, 3.5, -.5); b.hotspot('celebration-memory', 'A day worth keeping', 'memory', -4.4, 2.2); b.hotspot('celebration-letter', 'The surprise is for you', 'letter', -5, -9.5); b.hotspot('celebration-wish', 'Make a wish together', 'wish', 9.2, -2.1);
}
const builders = { beach, park, cafe, rooftop, forest, home, winter, celebration };

export function buildPlace(id, renderer, options = {}) {
  if (!builders[id]) throw new Error('Unknown outdoor place: ' + id);
  const scene = new T.Scene(), night = id === 'rooftop' || options.time === 'night';
  const sky = night ? '#424d69' : id === 'winter' ? '#b8c9cc' : id === 'forest' ? '#bac5ad' : '#d8d3ba';
  scene.background = new T.Color(sky); scene.userData.low = !!renderer?.isCPU;
  const b = makeBuilder(scene);
  const light = new T.HemisphereLight(night ? '#c3cbe2' : '#fff2d7', night ? '#8c8b8f' : '#c1bd9a', night ? 1.55 : 2.05); scene.add(light);
  const sun = new T.DirectionalLight(night ? '#d9dfec' : '#ffe0ac', night ? .65 : 2.05); sun.position.set(-10, 20, 9); scene.add(sun);
  if (!renderer?.isCPU && !options.low) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .035;
  }
  if (['beach', 'park', 'celebration', 'rooftop', 'winter'].includes(id)) {
    const orb = b.ball(night ? 1.6 : 3.2, -31, night ? 23 : 12.5, -65, b.material(night ? '#e5e3cf' : '#ffe0a5', true), b.architecture, 2); orb.castShadow = false;
  }
  builders[id](b);
  b.finish();
  const overviews = {
    beach: { position: [-6.4, 4.4, 14.1], target: [1.5, 1.5, -1.8] },
    park: { position: [-8.7, 4.5, 13.6], target: [1, 1.2, -4.1] },
    cafe: { position: [-8, 3.5, 12.4], target: [0, 1.2, -5] },
    rooftop: { position: [-7.5, 4.6, 14], target: [1.1, 1.3, -6] },
    forest: { position: [-5.6, 4.2, 13.8], target: [0, 1.3, -5.2] },
    home: { position: [-1.5, 3.4, 14], target: [-.5, 1.1, -4] },
    winter: { position: [-7, 4, 14], target: [1, 1.2, -4] },
    celebration: { position: [-5.3, 4.3, 16], target: [1, 1.3, -5] },
  };
  return {
    scene, bounds: { x: id === 'beach' ? 17 : 14.5, z: id === 'beach' ? 18 : 14 },
    obstacles: b.obstacles, spawn: [0.2, 8.5], overview: overviews[id],
    zones: placeCatalog.find(p => p.id === id).zones, hotspots: b.hotspots,
    update(time, dt) { for (const update of b.updates) update(time, dt); },
  };
}
