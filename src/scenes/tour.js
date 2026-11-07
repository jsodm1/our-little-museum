import * as T from "three";
import { buildGallery, loadPictures, room, benches } from "./gallery.js";
import { compatibilityRenderer } from "./compatibilityRenderer.js";
import { createAvatar } from "../characters/avatars.js";
import { museumConfig, memories } from "../config/museumConfig.js";
import { bindNavigation, constrain } from "../controls/navigation.js";
import { buildPlace, placeCatalog } from "./places.js";
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
    const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2');
    if(!context)throw Error('WebGL unavailable');
    renderer = new T.WebGLRenderer({canvas,context,
      antialias: !low,
      alpha: false,
      preserveDrawingBuffer: true,
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
  let locationId = ui.world().startPlace || 'beach', worldData;
  async function build(id) {
    if (id !== 'museum') return buildPlace(id, renderer, {time:ui.world().time,low});
    const pics = await loadPictures(p=>ui.progress(10+p*67));
    return {...buildGallery(renderer,pics,low),bounds:room,obstacles:[...benches,{x:4.55,z:-8.05,w:.9,d:.9}],spawn:[.8,3.1],overview:{position:[-4.6,2.3,8.9],target:[.55,1.99,-3.25]},hotspots:[],zones:placeCatalog[0].zones};
  }
  worldData = await build(locationId);
  let {scene,frames=[],hits=[],particles}=worldData;
  const camera = new T.PerspectiveCamera(50, 1, 0.055, 220);
  let avatars = museumConfig.couple.map(createAvatar), role = ui.role(), player = avatars[role].group, mate = avatars[1-role].group, remote = null, walkTarget = null;
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
    desired.fromArray(worldData.overview.position);
    goal.fromArray(worldData.overview.target);
    if(host.clientWidth/host.clientHeight<.8){if(locationId==='museum'){desired.set(-2.8,2.7,8.8);goal.set(.8,1.3,1.8);}else{desired.set(-3.7,3.7,14.8);goal.set(2.4,1.3,4.5);}}
  }
  function bound(p,r=.28){return constrain(p,r,worldData.bounds,worldData.obstacles);}
  function reset() {
    nav?.reset();
    mode = "welcome";
    prior = "welcome";
    holding = false;
    ui.hands(false);
    player.position.set(worldData.spawn[0],0,worldData.spawn[1]);
    mate.position.copy(player.position).add(v(.83,0,0));
    bound(player.position); bound(mate.position);
    walkTarget=null;
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
    const target=ray.intersectObjects([...hits,...worldData.hotspots.map(h=>h.mesh)],false)[0];
    if(target) return target.object.userData.frame ?? worldData.hotspots.findIndex(h=>h.mesh===target.object)+1000;
    return -1;
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
      if (i >= 0) interactWith(i);
      else {const p=v(); if(ray.ray.intersectPlane(new T.Plane(v(0,1,0),0),p)&&p.distanceTo(player.position)<30)walkTarget=bound(p); }
    },
    hover: (e) => {
      renderer.domElement.style.cursor = pick(e) >= 0 ? "pointer" : "grab";
    },
    interact: () => {
      if (nearest >= 0) interactWith(nearest);
    },
  });
  function interactWith(i) {
    if(i<1000) ui.open(i);
    else {const h=worldData.hotspots[i-1000];if(!h)return;
      if(h.kind==='sit'){player.position.set(h.position[0],0,h.position[2]+.85);bound(player.position);walkTarget=null;burst(player.position);ui.notify('Take a quiet moment together.');}
      else ui.hotspot(h);
    }
  }
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
    if (frames[index] && memories[index]?.id === museumConfig.finaleId)
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
    if(dir.lengthSq()>.01)walkTarget=null;
    else if(walkTarget){dir.copy(walkTarget).sub(player.position);dir.y=0;if(dir.length()<.16){walkTarget=null;dir.set(0,0,0);}else dir.normalize();}
    const before=player.position.clone();
    player.position.addScaledVector(dir,dt*2.7); bound(player.position,.31);
    if(walkTarget&&before.distanceToSquared(player.position)<.000002)walkTarget=null;
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
    bound(goal,.27);
    delta.copy(goal).sub(mate.position);
    const dist = delta.length();
    const speed = Math.min(3.6, dist * (holding ? 6 : 4));
    if(remote && performance.now()-remote.at<5000){
      mate.visible=remote.place===locationId;
      if(mate.visible)mate.position.lerp(v(remote.x,0,remote.z),smooth(12,dt));
    }else {mate.visible=true;mate.position.addScaledVector(delta,(speed*dt)/(dist||1));bound(mate.position,.27);}
    if(remote&&performance.now()-remote.at<5000)mate.rotation.y=remote.yaw;
    const turn = !holding && dist > 0.85 ? Math.atan2(delta.x, delta.z) : rot;
    if(!remote||performance.now()-remote.at>=5000)mate.rotation.y=angle(mate.rotation.y,turn,smooth(8,dt));
    avatars[role].animate(dt,time,dir.length(),holding,-1);
    avatars[1-role].animate(dt,time,remote?remote.speed||0:speed/2.7,holding,1);
    ui.pose({place:locationId,x:player.position.x,z:player.position.z,yaw:player.rotation.y,speed:dir.length()});
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
    worldData.hotspots.forEach((h,i)=>{const d=Math.hypot(h.position[0]-player.position.x,h.position[2]-player.position.z);if(d<min){min=d;near=i+1000;}});
    if (near !== nearest) {
      nearest = near;
      ui.near(near,near>=1000?worldData.hotspots[near-1000]?.title:memories[near]?.title);
    }
  }
  function cameraTarget() {
    if (mode === "welcome") {
      entrance();
      return;
    }
    if (mode === "focus" && frames[focusIndex]) {
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
      ["x", worldData.bounds.x-.17],
      ["z", worldData.bounds.z-.17],
    ])
      if (Math.abs(offset[k]) > 0.0001) {
        fraction = Math.min(
          fraction,
          ((offset[k] > 0 ? b : -b) - goal[k]) / offset[k],
        );
      }
    desired.copy(goal).addScaledVector(offset, Math.max(0.005, fraction));
    desired.y = clamp(desired.y,1.18,locationId==="museum"?4.29:7.5);
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
      labels[i].hidden = !a.group.visible ||
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
    if (!reduce && particles) particles.position.y = Math.sin(time * 0.17) * 0.045;
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
    worldData.update?.(time,dt);
    renderer.render(scene, camera);
  }
  tick(performance.now());
  renderer.setAnimationLoop(tick);
  ui.progress(100);
  function disposeScene(old){
    const gs=new Set(),ms=new Set(),ts=new Set();old.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const key in m)if(m[key]?.isTexture)ts.add(m[key]);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());
  }
  return {
    get place(){return locationId;},
    get role(){return role;},
    async travel(id){
      nav.reset();walkTarget=null;mode='loading';
      const next=await build(id);avatars.forEach(a=>a.group.removeFromParent());feet.forEach(f=>f.removeFromParent());hearts.forEach(h=>h.mesh.removeFromParent());hearts.length=0;disposeScene(scene);
      worldData=next;scene=next.scene;frames=next.frames||[];hits=next.hits||[];particles=next.particles;locationId=id;
      avatars.forEach(a=>scene.add(a.group));feet.forEach(f=>scene.add(f));reset();mode='walking';prior='walking';ui.place(id);
    },
    refreshAvatars(){
      const positions=avatars.map(a=>({p:a.group.position.clone(),r:a.group.rotation.y}));
      avatars.forEach(a=>{a.group.removeFromParent();disposeScene(a.group);});
      avatars=museumConfig.couple.map(createAvatar);role=ui.role();player=avatars[role].group;mate=avatars[1-role].group;
      avatars.forEach((a,i)=>{a.group.position.copy(positions[i].p);a.group.rotation.y=positions[i].r;scene.add(a.group);labels[i].textContent=museumConfig.couple[i].name;});
    },
    remote(p){if(p&&[p.x,p.z,p.yaw].every(Number.isFinite)&&Math.abs(p.x)<100&&Math.abs(p.z)<100)remote={...p,at:performance.now()};else remote=null;},
    zone(position){player.position.set(position[0],0,position[1]);bound(player.position);mate.position.copy(player.position).add(v(.85,0,0));bound(mate.position);nav.reset();walkTarget=null;mode='walking';},
    recenter(){yaw=0;pitch=.29;distance=3.9;},
    snapshot(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
    reaction(){burst(player.position.clone().lerp(mate.position,.5));},
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
      if (nearest >= 0) interactWith(nearest);
    },
  };
}
