// Small z-buffer rasterizer for browsers that deny WebGL. It consumes the same
// Three.js scene graph, skinned-by-joints character meshes and photo textures.
import { Matrix4, Matrix3, Color } from "three";
const near = 0.058;
const srgb = (value) =>
  Math.round(
    255 *
      (value <= 0.0031308
        ? 12.92 * value
        : 1.055 * Math.pow(value, 1 / 2.4) - 0.055),
  );
export function compatibilityRenderer() {
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas rendering unavailable");
  const geometries = new WeakMap(),
    maps = new WeakMap(),
    modelView = new Matrix4(),
    normalMatrix = new Matrix3();
  let w = 0,
    h = 0,
    output,
    depth,
    raf,
    fx,
    fy,
    last = -100,
    frameMs = 50;
  const tint = new Color();
  function photo(map) {
    if (maps.has(map)) return maps.get(map);
    const source = map.image,
      scale = Math.min(1, 1024 / Math.max(source.width, source.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(source.width * scale));
    c.height = Math.max(1, Math.round(source.height * scale));
    const d = c.getContext("2d", { willReadFrequently: true });
    d.drawImage(source, 0, 0, c.width, c.height);
    const img = d.getImageData(0, 0, c.width, c.height);
    const data = {
      w: c.width,
      h: c.height,
      rgba: img.data,
      s: map.repeat.x,
      t: map.repeat.y,
    };
    maps.set(map, data);
    return data;
  }
  function geometry(g) {
    if (geometries.has(g)) return geometries.get(g);
    const p = g.attributes.position,
      uv = g.attributes.uv,
      norm = g.attributes.normal,
      col = g.attributes.color;
    const vertices = Array.from({ length: p.count }, (_, i) => ({
      x: 0,
      y: 0,
      z: 0,
      px: 0,
      py: 0,
      iz: 0,
      shade: 1,
      u: uv ? uv.getX(i) : 0,
      v: uv ? uv.getY(i) : 0,
      r: col ? srgb(col.getX(i)) : 255,
      g: col ? srgb(col.getY(i)) : 255,
      b: col ? srgb(col.getZ(i)) : 255,
    }));
    const data = {
      vertices,
      p: p.array,
      n: norm?.array,
      idx: g.index?.array,
      count: g.index?.count || p.count,
    };
    geometries.set(g, data);
    return data;
  }
  function project(p) {
    p.iz = 1 / p.z;
    p.px = w * 0.5 + fx * p.x * p.iz;
    p.py = h * 0.5 - fy * p.y * p.iz;
    return p;
  }
  function intersection(a, b) {
    const t = (near - a.z) / (b.z - a.z),
      p = { z: near };
    for (const k of ["x", "y", "u", "v", "shade", "r", "g", "b"])
      p[k] = a[k] + (b[k] - a[k]) * t;
    return project(p);
  }
  function raster(a, b, c, mat, tex, red, green, blue) {
    const ax = a.px,
      ay = a.py,
      bx = b.px,
      by = b.py,
      cx = c.px,
      cy = c.py;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 0.03 || (area > 0 && mat.side === 0)) return;
    const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)),
      x1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
    const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)),
      y1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
    if (x0 > x1 || y0 > y1) return;
    const d1x = (cy - ay) / area,
      d1y = (ax - cx) / area,
      d2x = (ay - by) / area,
      d2y = (bx - ax) / area;
    const dz1 = b.iz - a.iz,
      dz2 = c.iz - a.iz;
    const ua = a.u * a.iz,
      ub = b.u * b.iz - ua,
      uc = c.u * c.iz - ua,
      va = a.v * a.iz,
      vb = b.v * b.iz - va,
      vc = c.v * c.iz - va;
    const light = (a.shade + b.shade + c.shade) / 3;
    const r = ((red * a.r) / 255) * light,
      g = ((green * a.g) / 255) * light,
      bl = ((blue * a.b) / 255) * light;
    const pixels = output.data,
      transparent = mat.transparent,
      opacity = mat.opacity;
    let row1 = d1x * (x0 + 0.5 - ax) + d1y * (y0 + 0.5 - ay),
      row2 = d2x * (x0 + 0.5 - ax) + d2y * (y0 + 0.5 - ay);
    for (let y = y0; y <= y1; y++, row1 += d1y, row2 += d2y) {
      let t = row1,
        s = row2;
      for (
        let x = x0, index = y * w + x;
        x <= x1;
        x++, index++, t += d1x, s += d2x
      ) {
        if (t < -0.00002 || s < -0.00002 || t + s > 1.00002) continue;
        const z = a.iz + t * dz1 + s * dz2;
        if (z < depth[index]) continue;
        let rr = r,
          gg = g,
          bb = bl,
          alpha = opacity;
        if (tex) {
          let u = ((ua + t * ub + s * uc) / z) * tex.s,
            v = (1 - (va + t * vb + s * vc) / z) * tex.t;
          u =
            tex.s === 1
              ? Math.max(0, Math.min(0.999999, u))
              : u - Math.floor(u);
          v =
            tex.t === 1
              ? Math.max(0, Math.min(0.999999, v))
              : v - Math.floor(v);
          const ti = (((v * tex.h) | 0) * tex.w + ((u * tex.w) | 0)) * 4,
            p = tex.rgba;
          rr *= p[ti] / 255;
          gg *= p[ti + 1] / 255;
          bb *= p[ti + 2] / 255;
          alpha *= p[ti + 3] / 255;
        }
        const pos = index * 4;
        if (transparent && alpha < 0.997) {
          if (alpha < 0.02) continue;
          pixels[pos] += alpha * (rr - pixels[pos]);
          pixels[pos + 1] += alpha * (gg - pixels[pos + 1]);
          pixels[pos + 2] += alpha * (bb - pixels[pos + 2]);
        } else {
          pixels[pos] = rr;
          pixels[pos + 1] = gg;
          pixels[pos + 2] = bb;
        }
        if (mat.depthWrite) depth[index] = z;
      }
    }
  }
  function draw(mesh, camera) {
    const mat = mesh.material;
    if (!mesh.geometry.attributes.position || !mat.visible) return;
    const geo = geometry(mesh.geometry),
      vs = geo.vertices,
      ps = geo.p,
      ns = geo.n,
      index = geo.idx;
    modelView.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    const m = modelView.elements;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    const n = normalMatrix.elements;
    const basic = mat.isMeshBasicMaterial;
    let inFront = false;
    for (let i = 0, k = 0; i < vs.length; i++, k += 3) {
      const p = vs[i],
        x = ps[k],
        y = ps[k + 1],
        z = ps[k + 2];
      p.x = m[0] * x + m[4] * y + m[8] * z + m[12];
      p.y = m[1] * x + m[5] * y + m[9] * z + m[13];
      p.z = -(m[2] * x + m[6] * y + m[10] * z + m[14]);
      if (p.z >= near) {
        project(p);
        inFront = true;
      }
      if (!basic && ns) {
        const nx = ns[k],
          ny = ns[k + 1],
          nz = ns[k + 2];
        const X = n[0] * nx + n[3] * ny + n[6] * nz,
          Y = n[1] * nx + n[4] * ny + n[7] * nz,
          Z = n[2] * nx + n[5] * ny + n[8] * nz;
        p.shade =
          0.85 +
          0.1 * Y +
          0.15 *
            Math.max(
              0,
              (-0.5 * X + 0.74 * Y + 0.45 * Z) / (Math.hypot(X, Y, Z) || 1),
            );
      }
    }
    if (!inFront) return;
    tint.copy(mat.color);
    tint.convertLinearToSRGB();
    const r = tint.r * 255,
      g = tint.g * 255,
      b = tint.b * 255,
      tex = mat.map ? photo(mat.map) : null;
    for (let i = 0; i < geo.count; i += 3) {
      const a = vs[index ? index[i] : i],
        v = vs[index ? index[i + 1] : i + 1],
        c = vs[index ? index[i + 2] : i + 2];
      if (a.z >= near && v.z >= near && c.z >= near) {
        raster(a, v, c, mat, tex, r, g, b);
        continue;
      }
      if (a.z < near && v.z < near && c.z < near) continue;
      const points = [a, v, c],
        poly = [];
      let prev = c;
      for (const next of points) {
        if (prev.z >= near !== next.z >= near)
          poly.push(intersection(prev, next));
        if (next.z >= near) poly.push(next);
        prev = next;
      }
      for (let j = 1; j < poly.length - 1; j++)
        raster(poly[0], poly[j], poly[j + 1], mat, tex, r, g, b);
    }
  }
  return {
    isCPU: true,
    domElement: canvas,
    shadowMap: {},
    capabilities: { getMaxAnisotropy: () => 1 },
    setPixelRatio() {},
    setSize(width, height) {
      const ratio = Math.min(1, 1160 / width, 560 / height);
      w = canvas.width = Math.max(1, Math.round(width * ratio));
      h = canvas.height = Math.max(1, Math.round(height * ratio));
      output = ctx.createImageData(w, h);
      depth = new Float32Array(w * h);
    },
    render(scene, camera) {
      if (!w || !h) return;
      const start = performance.now();
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      fx = (camera.projectionMatrix.elements[0] * w) / 2;
      fy = (camera.projectionMatrix.elements[5] * h) / 2;
      const buffer = new Uint32Array(output.data.buffer);
      const bg=scene.background?.isColor?scene.background.getHex():0xd8d4cd;
      buffer.fill((0xff000000 | ((bg & 255)<<16) | (bg & 65280) | (bg>>>16))>>>0);
      depth.fill(0);
      const transparent = [];
      scene.traverseVisible((mesh) => {
        if (!mesh.isMesh) return;
        if (mesh.material.transparent) transparent.push(mesh);
        else draw(mesh, camera);
      });
      transparent.forEach((mesh) => draw(mesh, camera));
      ctx.putImageData(output, 0, 0);
      frameMs = Math.max(42, Math.min(100, performance.now() - start + 8));
    },
    setAnimationLoop(step) {
      cancelAnimationFrame(raf);
      if (!step) return;
      function frame(now) {
        if (now - last >= frameMs) {
          last = now;
          step(now);
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    },
  };
}
