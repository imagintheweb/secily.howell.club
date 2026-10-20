// The magical meadow: sky, grass, pink ferns, sparkles, and all the toys and
// buildings the pets play on (cat towers, yarn, trampoline, castle, stage...).
import * as THREE from 'three';
import { fur, shiny, glowMat } from './creatures.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const PI = Math.PI;

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function add(parent, geo, mat, { p, r, s, cast = true, recv = false } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s !== undefined) (typeof s === 'number' ? m.scale.setScalar(s) : m.scale.set(s[0], s[1], s[2]));
  m.castShadow = cast;
  m.receiveShadow = recv;
  parent.add(m);
  return m;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function textPlane(text, { w = 2.4, h = 0.6, bg = '#ffffff', fg = '#ff4f9a', border = '#ffb3d9', font = 'Chewy' } = {}) {
  const W = 1024, H = Math.round((1024 * h) / w);
  const tex = canvasTex(W, H, (g) => {
    roundRect(g, 8, 8, W - 16, H - 16, H * 0.3);
    g.fillStyle = bg; g.fill();
    g.lineWidth = 14; g.strokeStyle = border; g.stroke();
    let size = H * 0.62;
    g.font = `${size}px ${font}, "Comic Sans MS", cursive`;
    while (g.measureText(text).width > W * 0.88 && size > 10) { size -= 4; g.font = `${size}px ${font}, "Comic Sans MS", cursive`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.fillText(text, W / 2, H / 2 + size * 0.05);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  return m;
}

/* -------------------------------------------------------------- environment */

export function buildEnvironment(scene, { zMin, zMax, lowPower }) {
  const zc = (zMin + zMax) / 2, len = zMax - zMin;

  // dreamy gradient sky
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#fff1a8') },
        mid: { value: new THREE.Color('#ffc6e4') },
        bottom: { value: new THREE.Color('#c8f2dc') },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.02, 0.55, h)) : mix(mid, bottom, smoothstep(0.0, -0.25, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // grassy ground
  const groundTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a3dc98'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      g.fillStyle = pick(['#8fd38a', '#b4e6a4', '#a6e3b0', '#c3eeb2', '#86cc8e', '#d8f5c0']);
      g.globalAlpha = rnd(0.15, 0.45);
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(3, 14), 0, PI * 2); g.fill();
    }
  }, [28, 70]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, len + 160), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
  ground.rotation.x = -PI / 2;
  ground.position.z = zc;
  ground.receiveShadow = true;
  scene.add(ground);

  // stepping-stone path that winds through every play area
  const stoneGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.06, 14);
  const stoneCount = Math.floor(len / 1.7);
  const stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), stoneCount);
  const d = new THREE.Object3D();
  const stoneCols = ['#f3e6ff', '#ffe3f1', '#fff4cf', '#dcfff4'].map((c) => new THREE.Color(c));
  for (let i = 0; i < stoneCount; i++) {
    const z = zMax - i * 1.7;
    d.position.set(Math.sin(z * 0.07) * 1.4 + rnd(-0.15, 0.15), 0.02, z + 6);
    d.rotation.set(0, rnd(0, PI), 0);
    d.scale.set(rnd(0.75, 1.05), 1, rnd(0.65, 0.9));
    d.updateMatrix();
    stones.setMatrixAt(i, d.matrix);
    stones.setColorAt(i, pick(stoneCols));
  }
  stones.receiveShadow = true;
  scene.add(stones);

  // pink + green ferns like in Sparkle's picture
  const fernTex = canvasTex(128, 256, (g, w, h) => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(w / 2 + 6, h / 2, w / 2, 8); g.stroke();
    for (let i = 0; i < 14; i++) {
      const y = h - 22 - i * 16;
      const L = (1 - i / 14) * 50 + 8;
      for (const s of [-1, 1]) {
        g.save(); g.translate(w / 2, y); g.rotate(s * (1.15 - i * 0.025));
        g.beginPath(); g.ellipse(0, -L / 2, 5.5, L / 2, 0, 0, PI * 2); g.fill();
        g.restore();
      }
    }
  });
  const fernGeo = new THREE.PlaneGeometry(1, 2).translate(0, 1, 0);
  const fernMat = new THREE.MeshStandardMaterial({ map: fernTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 });
  // make the ferns softly glow in their own color (like the picture), even from behind
  fernMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.5;');
  };
  const clumps = lowPower ? 260 : 520;
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, clumps * 3);
  const pinkC = ['#ff8fc4', '#ffa8d2', '#ff7ab8', '#ffc2e0', '#f59ad0'].map((c) => new THREE.Color(c));
  const greenC = ['#5fbf6a', '#7fd37a', '#4fb07a', '#7fe0c0'].map((c) => new THREE.Color(c));
  d.rotation.order = 'YXZ';
  let n = 0;
  for (let i = 0; i < clumps; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (Math.random() < 0.85 ? rnd(8.5, 42) : rnd(7.6, 9));
    const z = rnd(zMin - 20, zMax + 10);
    const col = Math.random() < 0.55 ? pick(pinkC) : pick(greenC);
    const s = rnd(0.6, 1.5);
    for (let k = 0; k < 3; k++) {
      d.position.set(x + rnd(-0.2, 0.2), 0, z + rnd(-0.2, 0.2));
      d.rotation.set(-rnd(0.25, 0.75), rnd(0, PI * 2), 0);
      d.scale.setScalar(s * rnd(0.8, 1.1));
      d.updateMatrix();
      ferns.setMatrixAt(n, d.matrix);
      ferns.setColorAt(n, col);
      n++;
    }
  }
  scene.add(ferns);
  d.rotation.order = 'XYZ';

  // blossom trees
  const treeCount = lowPower ? 36 : 64;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 1, 8), new THREE.MeshStandardMaterial({ color: '#b98a6a', roughness: 1 }), treeCount);
  const blobs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.8, sheen: 1, sheenColor: 0xffffff }), treeCount * 5);
  const blossom = ['#ffc4e1', '#ffd9ec', '#e6c8ff', '#c9f5e4', '#fff0a8', '#ffb0d6'].map((c) => new THREE.Color(c));
  for (let i = 0; i < treeCount; i++) {
    const x = (Math.random() < 0.5 ? -1 : 1) * rnd(14, 48);
    const z = rnd(zMin - 20, zMax);
    const h = rnd(2.8, 5);
    d.position.set(x, h / 2, z); d.rotation.set(0, 0, 0); d.scale.set(1, h, 1); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    const col = pick(blossom);
    for (let k = 0; k < 5; k++) {
      const r = rnd(1.0, 1.7);
      d.position.set(x + rnd(-1.2, 1.2), h + 0.5 + rnd(-0.3, 1.0), z + rnd(-1.2, 1.2));
      d.scale.setScalar(r); d.updateMatrix();
      blobs.setMatrixAt(i * 5 + k, d.matrix);
      blobs.setColorAt(i * 5 + k, col);
    }
  }
  trunks.castShadow = true; blobs.castShadow = true;
  scene.add(trunks, blobs);

  // glowing teal orbs in the grass
  const orbCount = lowPower ? 160 : 320;
  const orbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), glowMat('#5ff3e3', 1.8), orbCount);
  for (let i = 0; i < orbCount; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    d.position.set(side * rnd(3, 30), rnd(0.05, 0.25), rnd(zMin - 10, zMax));
    d.scale.setScalar(rnd(0.05, 0.14)); d.updateMatrix();
    orbs.setMatrixAt(i, d.matrix);
  }
  scene.add(orbs);

  // little flowers
  const flowerCount = lowPower ? 300 : 600;
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), flowerCount);
  const flowerC = ['#ffffff', '#fff27a', '#ff8fc4', '#b89cff', '#8fd9ff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < flowerCount; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    d.position.set(side * rnd(5, 35), 0.08, rnd(zMin - 10, zMax));
    d.scale.set(0.12, 0.06, 0.12); d.updateMatrix();
    flowers.setMatrixAt(i, d.matrix);
    flowers.setColorAt(i, pick(flowerC));
  }
  scene.add(flowers);

  // fluffy clouds
  for (let i = 0; i < 16; i++) {
    cloud(scene, (Math.random() < 0.5 ? -1 : 1) * rnd(12, 40), rnd(12, 20), rnd(zMin, zMax), rnd(1.5, 3));
  }

  // floating sparkles
  const N = lowPower ? 500 : 1000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), baseY = new Float32Array(N), seed = new Float32Array(N);
  const sparkC = ['#fff6b0', '#7ff8ea', '#ffb3e0', '#ffffff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-28, 28);
    baseY[i] = pos[i * 3 + 1] = rnd(0.3, 9);
    pos[i * 3 + 2] = rnd(zMin - 10, zMax + 10);
    const c = pick(sparkC);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    seed[i] = rnd(0, 100);
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dot = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const sparkles = new THREE.Points(sGeo, new THREE.PointsMaterial({
    size: 0.22, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(sparkles);

  return {
    ground,
    update(t, camera) {
      sky.position.copy(camera.position);
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 1] = baseY[i] + Math.sin(t * 0.6 + seed[i]) * 0.35;
        pos[i * 3] += Math.sin(t * 0.3 + seed[i]) * 0.002;
      }
      sGeo.attributes.position.needsUpdate = true;
    },
  };
}

export function cloud(parent, x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  const m = fur('#ffffff', 0.25);
  for (const [dx, dy, r] of [[0, 0, 1], [1, -0.2, 0.75], [-1, -0.25, 0.7], [0.45, 0.5, 0.7], [-0.5, 0.35, 0.6]]) {
    add(g, new THREE.SphereGeometry(r, 14, 10), m, { p: [dx, dy, 0], cast: false });
  }
  parent.add(g);
  return g;
}

/* ---------------------------------------------------------------- cat tower */

const CARPETS = ['#ff9fcf', '#c7a8ff', '#8fe3d1', '#ffd36e', '#9fd4ff'];
let ropeTex;
function rope() {
  return (ropeTex ??= canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#ecd0a2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#bf9a66'; g.lineWidth = 3;
    for (let y = -w; y < h + w; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 12); g.stroke(); }
  }, [1, 5]));
}

export function catTower(scene, x, z, levels) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const postM = new THREE.MeshStandardMaterial({ map: rope(), roughness: 1 });
  const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
  const platGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 24);
  add(g, new THREE.BoxGeometry(2.3, 0.22, 2.3), fur(CARPETS[0], 0.05), { p: [0, 0.11, 0], recv: true });
  const spots = [];
  const swingers = [];
  levels.forEach((L, i) => {
    const col = CARPETS[(i + 1) % CARPETS.length];
    const postH = L.h - 0.2;
    add(g, postGeo, postM, { p: [L.dx, 0.2 + postH / 2, L.dz], s: [1, postH, 1] });
    add(g, platGeo, fur(col, 0.06), { p: [L.dx, L.h, L.dz], recv: true });
    let top = L.h + 0.07;
    if (L.bed) {
      add(g, new THREE.TorusGeometry(0.42, 0.13, 10, 24), fur('#fff6fb', 0.08), { p: [L.dx, top + 0.08, L.dz], r: [PI / 2, 0, 0] });
      add(g, new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20), fur(CARPETS[(i + 2) % CARPETS.length], 0.08), { p: [L.dx, top + 0.03, L.dz], recv: true });
      top += 0.05;
    }
    if (L.toy) {
      const pivot = new THREE.Group();
      pivot.position.set(L.dx + 0.48, L.h - 0.07, L.dz);
      g.add(pivot);
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.7, 0)]);
      pivot.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#7a4a80' })));
      add(pivot, new THREE.SphereGeometry(0.11, 12, 10), fur(L.toy, 0.2), { p: [0, -0.78, 0] });
      swingers.push({ pivot, ph: rnd(0, 6) });
    }
    spots.push({ pos: new THREE.Vector3(x + L.dx, top, z + L.dz), occ: null, tower: null });
  });
  const tower = {
    group: g, spots, center: new THREE.Vector3(x, 0, z), radius: 1.25,
    update(t) {
      for (const s of swingers) { s.pivot.rotation.z = Math.sin(t * 2 + s.ph) * 0.35; s.pivot.rotation.x = Math.sin(t * 1.3 + s.ph) * 0.2; }
    },
  };
  spots.forEach((s) => { s.tower = tower; });
  return tower;
}

export function cardboardBox(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  const m = new THREE.MeshStandardMaterial({ color: '#dcae72', roughness: 1 });
  const W = 1.15, D = 0.9, H = 0.55, T = 0.04;
  add(g, new THREE.BoxGeometry(W, T, D), m, { p: [0, T / 2, 0], recv: true });
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(W, H, T), m, { p: [0, H / 2, s * D / 2] });
    add(g, new THREE.BoxGeometry(T, H, D), m, { p: [s * W / 2, H / 2, 0] });
    add(g, new THREE.BoxGeometry(W, T, 0.36), m, { p: [0, H + 0.1, s * (D / 2 + 0.14)], r: [s * 0.75, 0, 0] });
  }
  add(g, new THREE.BoxGeometry(0.3, 0.3, 0.01), glowMat('#ff7ab8', 0.3), { p: [0.25, 0.3, D / 2 + 0.01], r: [0, 0, PI / 4] });
  const tower = { group: g, center: new THREE.Vector3(x, 0, z), radius: 0.75, spots: [] };
  tower.spots.push({ pos: new THREE.Vector3(x, 0.06, z), occ: null, tower });
  return tower;
}

/* --------------------------------------------------------------- yarn balls */

export const YARN_COLORS = ['#ff6fb5', '#b47cff', '#3fd8c8', '#ffd23f', '#ff8a65', '#5ec8ff'];

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return `#${c.getHexString()}`;
}

function yarnTex(color) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = Math.random() < 0.5 ? shade(color, 0.12) : shade(color, -0.12);
      g.globalAlpha = 0.7;
      g.lineWidth = rnd(2.5, 5);
      g.beginPath();
      g.ellipse(rnd(0, w), rnd(0, h), rnd(30, 120), rnd(10, 40), rnd(0, PI), 0, PI * 2);
      g.stroke();
    }
  });
}

function ballTex(color) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 10;
    g.beginPath();
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + Math.sin((x / w) * PI * 4) * h * 0.25);
    g.stroke();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i + 0.5) * (w / 6), h * 0.2, 7, 0, PI * 2); g.fill(); }
  });
}

const _axis = new THREE.Vector3();
export class Yarn {
  constructor(scene, { x, z, y, color = pick(YARN_COLORS), radius = 0.3, kind = 'yarn', zone }) {
    this.r = radius;
    this.zone = zone;
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      new THREE.MeshStandardMaterial({ map: kind === 'yarn' ? yarnTex(color) : ballTex(color), roughness: kind === 'yarn' ? 0.9 : 0.45 }),
    );
    this.mesh.castShadow = true;
    this.mesh.userData.yarn = this;
    this.pos = this.mesh.position;
    this.pos.set(x, y ?? radius, z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    scene.add(this.mesh);

    if (kind === 'yarn') {
      this.trailN = 40;
      this.trail = [];
      for (let i = 0; i < this.trailN; i++) this.trail.push(new THREE.Vector3(x, 0.03, z));
      this.trailGeo = new THREE.BufferGeometry();
      this.trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.trailN * 3), 3));
      this.line = new THREE.Line(this.trailGeo, new THREE.LineBasicMaterial({ color }));
      this.line.frustumCulled = false;
      scene.add(this.line);
      this.writeTrail();
    }
  }

  kick(vx, vz) {
    this.vel.x += vx;
    this.vel.z += vz;
    this.vy = Math.max(this.vy, 1 + Math.hypot(vx, vz) * 0.15);
    if (this.pos.y <= this.r) this.pos.y = this.r + 0.001;
  }

  writeTrail() {
    const a = this.trailGeo.attributes.position.array;
    for (let i = 0; i < this.trailN; i++) {
      const p = i === 0 ? { x: this.pos.x, y: Math.max(0.03, this.pos.y - this.r * 0.6), z: this.pos.z } : this.trail[i];
      a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
  }

  update(dt) {
    const p = this.pos, v = this.vel;
    if (p.y > this.r || this.vy !== 0) {
      this.vy -= 14 * dt;
      p.y += this.vy * dt;
      if (p.y <= this.r) {
        p.y = this.r;
        this.vy = this.vy < -2 ? -this.vy * 0.45 : 0;
      }
    }
    v.multiplyScalar(Math.exp(-dt * 1.1));
    const sp = Math.hypot(v.x, v.z);
    if (sp < 0.03) {
      v.set(0, 0, 0);
    } else {
      p.x += v.x * dt;
      p.z += v.z * dt;
      _axis.set(v.z, 0, -v.x).normalize();
      this.mesh.rotateOnWorldAxis(_axis, (sp * dt) / this.r);
    }
    const b = this.zone.bounds;
    if (p.x < b.x0) { p.x = b.x0; v.x = Math.abs(v.x) * 0.6; }
    if (p.x > b.x1) { p.x = b.x1; v.x = -Math.abs(v.x) * 0.6; }
    if (p.z < b.z0) { p.z = b.z0; v.z = Math.abs(v.z) * 0.6; }
    if (p.z > b.z1) { p.z = b.z1; v.z = -Math.abs(v.z) * 0.6; }
    for (const o of this.zone.obstacles) {
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || 1e-4, min = o.r + this.r;
      if (d < min) {
        const nx = dx / d, nz = dz / d;
        p.x = o.x + nx * min; p.z = o.z + nz * min;
        const vn = v.x * nx + v.z * nz;
        if (vn < 0) { v.x -= nx * vn * 1.6; v.z -= nz * vn * 1.6; }
      }
    }
    if (this.trail) {
      // a ball thrown from the sky only starts unrolling its string once it lands
      if (!this.landed) {
        this.landed = p.y <= this.r + 0.05;
        this.line.visible = this.landed;
        if (!this.landed) return;
        this.trail.forEach((t) => t.set(p.x, 0.03, p.z));
      }
      const last = this.trail[1];
      if (Math.hypot(p.x - last.x, p.z - last.z) > 0.12) {
        this.trail.pop();
        this.trail.splice(1, 0, new THREE.Vector3(p.x, 0.03, p.z));
      }
      this.writeTrail();
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.map?.dispose();
    this.mesh.material.dispose();
    if (this.line) { this.scene.remove(this.line); this.trailGeo.dispose(); this.line.material.dispose(); }
  }
}

/* ------------------------------------------------------------- puppy things */

export function doghouse(scene, x, z, label = 'PUPPY PALS') {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = 0.35;
  scene.add(g);
  const wall = fur('#8fd3ff', 0.06);
  const roof = fur('#ff6f91', 0.06);
  add(g, new THREE.BoxGeometry(1.7, 1.2, 1.7), wall, { p: [0, 0.6, 0], recv: true });
  const ridge = 1.9, a = 0.7, half = 0.68;
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(1.36, 0.12, 2.0), roof, {
      p: [s * half * Math.cos(a), ridge - half * Math.sin(a), 0], r: [0, 0, -s * a],
    });
  }
  const shape = new THREE.Shape();
  shape.moveTo(-0.85, 0); shape.lineTo(0.85, 0); shape.lineTo(0, 0.68); shape.closePath();
  add(g, new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: false }), wall, { p: [0, 1.2, -0.85] });
  const dark = new THREE.MeshStandardMaterial({ color: '#3b2a4a', roughness: 1 });
  add(g, new THREE.PlaneGeometry(0.7, 0.4), dark, { p: [0, 0.35, 0.852], cast: false });
  add(g, new THREE.CircleGeometry(0.35, 20, 0, PI), dark, { p: [0, 0.55, 0.852], cast: false });
  const sign = textPlane(label, { w: 1.2, h: 0.3, fg: '#ff4f8b' });
  sign.position.set(0, 1.42, 0.86);
  g.add(sign);
  const tower = { group: g, center: new THREE.Vector3(x, 0, z), radius: 1.3, spots: [] };
  tower.spots.push({ pos: new THREE.Vector3(x, ridge + 0.04, z), occ: null, tower });
  return tower;
}

export function dogBowl(scene, x, z, color = '#3fd8c8') {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  add(g, new THREE.CylinderGeometry(0.38, 0.3, 0.2, 20), shiny(color), { p: [0, 0.1, 0] });
  add(g, new THREE.CylinderGeometry(0.31, 0.31, 0.02, 20), fur('#a0643c', 0), { p: [0, 0.19, 0] });
  for (let i = 0; i < 9; i++) add(g, new THREE.SphereGeometry(0.06, 8, 6), fur('#b8743e', 0), { p: [rnd(-0.2, 0.2), 0.21, rnd(-0.2, 0.2)] });
  return g;
}

export function bone(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0.09, z);
  g.rotation.y = rotY;
  scene.add(g);
  const m = fur('#fff2d6', 0.1);
  add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), m, { r: [0, 0, PI / 2] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, new THREE.SphereGeometry(0.09, 10, 8), m, { p: [sx * 0.27, 0, sz * 0.07] });
  return g;
}

/* --------------------------------------------------------------- giggle zone */

export function trampoline(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8), shiny('#7d5cff'), { p: [Math.sin(a) * 1.38, 0.31, Math.cos(a) * 1.38] });
  }
  add(g, new THREE.TorusGeometry(1.45, 0.13, 10, 40), fur('#ff6fb5', 0.1), { p: [0, 0.62, 0], r: [PI / 2, 0, 0] });
  const mat = add(g, new THREE.CylinderGeometry(1.36, 1.36, 0.03, 32), shiny('#3a2d7a', { roughness: 0.6 }), { p: [0, 0.6, 0], recv: true });
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5, a = (i / 10) * PI * 2 + PI / 2;
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(mat, new THREE.ShapeGeometry(star), glowMat('#ffd23f', 0.5), { p: [0, 0.6, 0], r: [-PI / 2, 0, 0], cast: false });
  return {
    group: g, center: new THREE.Vector3(x, 0, z), radius: 1.6, top: 0.64, occ: null, dipT: 0,
    boing() { this.dipT = 0.3; },
    update(t, dt) {
      this.dipT = Math.max(0, this.dipT - dt);
      mat.position.y = 0.6 - Math.sin((this.dipT / 0.3) * PI) * 0.14;
    },
  };
}

export function rubberDuck(scene, x, z, s = 1.8) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.rotation.y = 0.6;
  scene.add(g);
  const y = shiny('#ffd93b', { roughness: 0.25 });
  add(g, new THREE.SphereGeometry(1, 24, 16), y, { p: [0, 0.42, 0], s: [0.6, 0.42, 0.75] });
  add(g, new THREE.ConeGeometry(0.22, 0.4, 14), y, { p: [0, 0.65, -0.62], r: [-0.9, 0, 0] });
  add(g, new THREE.SphereGeometry(0.36, 20, 14), y, { p: [0, 1.0, 0.35] });
  add(g, new THREE.SphereGeometry(1, 16, 10), shiny('#ff8a2b'), { p: [0, 0.94, 0.7], s: [0.18, 0.06, 0.2] });
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.07, 12, 8), shiny('#1a1020', { roughness: 0.1 }), { p: [sx * 0.15, 1.1, 0.64] });
    add(g, new THREE.SphereGeometry(0.025, 8, 6), glowMat('#ffffff', 1), { p: [sx * 0.15 - 0.02, 1.13, 0.7] });
    add(g, new THREE.SphereGeometry(1, 14, 10), y, { p: [sx * 0.55, 0.5, -0.05], s: [0.12, 0.25, 0.42], r: [0.3, 0, sx * 0.3] });
  }
  return { group: g, update(t) { g.rotation.z = Math.sin(t * 1.4) * 0.06; g.position.y = Math.abs(Math.sin(t * 1.4)) * 0.05; } };
}

/* ------------------------------------------------------------ princess zone */

export function castle(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const wall = fur('#ffd1ea', 0.08);
  const wall2 = fur('#f7b8dc', 0.08);
  const roofA = fur('#b07cff', 0.12);
  const roofB = fur('#ff6fb5', 0.12);
  const winM = glowMat('#ffe58a', 0.9);
  const flags = [];

  add(g, new THREE.BoxGeometry(6, 3, 3.5), wall, { p: [0, 1.5, 0], recv: true });
  for (let i = -2.7; i <= 2.71; i += 0.9) add(g, new THREE.BoxGeometry(0.45, 0.45, 0.45), wall, { p: [i, 3.2, 1.55] });

  const flag = (px, py, pz, col) => {
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), shiny('#ffcf3f', { metalness: 0.6 }), { p: [px, py + 0.45, pz] });
    const f = new THREE.Group();
    f.position.set(px, py + 0.75, pz);
    g.add(f);
    add(f, new THREE.PlaneGeometry(0.55, 0.32), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.2 }), { p: [0.29, 0, 0] });
    flags.push(f);
  };

  for (const [sx, sz, h] of [[-3, 1.6, 4.4], [3, 1.6, 4.4], [-3, -1.6, 5.2], [3, -1.6, 5.2]]) {
    add(g, new THREE.CylinderGeometry(0.85, 0.9, h, 20), wall2, { p: [sx, h / 2, sz] });
    add(g, new THREE.ConeGeometry(1.12, 1.9, 20), roofA, { p: [sx, h + 0.95, sz] });
    add(g, new THREE.BoxGeometry(0.3, 0.5, 0.05), winM, { p: [sx, h - 1.1, sz + 0.88], cast: false });
    flag(sx, h + 1.85, sz, '#ff6fb5');
  }
  add(g, new THREE.CylinderGeometry(1.3, 1.35, 6.4, 24), fur('#ffe6f3', 0.08), { p: [0, 3.2, -0.5] });
  add(g, new THREE.ConeGeometry(1.65, 2.8, 24), roofB, { p: [0, 7.8, -0.5] });
  flag(0, 9.15, -0.5, '#b07cff');
  for (const wx of [-0.45, 0.45]) add(g, new THREE.BoxGeometry(0.3, 0.6, 0.05), winM, { p: [wx, 5.2, 0.82], cast: false });
  for (const wx of [-2, 2]) add(g, new THREE.BoxGeometry(0.45, 0.65, 0.05), winM, { p: [wx, 1.9, 1.76], cast: false });

  const door = new THREE.MeshStandardMaterial({ color: '#7a3f6b', roughness: 0.9 });
  add(g, new THREE.PlaneGeometry(1.2, 1.4), door, { p: [0, 0.7, 1.76], cast: false });
  add(g, new THREE.CircleGeometry(0.6, 24, 0, PI), door, { p: [0, 1.4, 1.76], cast: false });

  const heart = new THREE.Shape();
  heart.moveTo(0, -0.35);
  heart.bezierCurveTo(-0.6, 0.05, -0.35, 0.5, 0, 0.22);
  heart.bezierCurveTo(0.35, 0.5, 0.6, 0.05, 0, -0.35);
  const heartMesh = add(g, new THREE.ExtrudeGeometry(heart, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), glowMat('#ff3d8b', 0.6), { p: [0, 2.45, 1.75] });

  const banner = textPlane("Princess Secily's Castle", { w: 3.6, h: 0.6, fg: '#b03fd0', border: '#ffcf3f' });
  banner.position.set(0, 3.0, 1.82);
  g.add(banner);

  add(g, new THREE.PlaneGeometry(1.3, 5.6), fur('#ff4f8b', 0.1), { p: [0, 0.025, 4.55], r: [-PI / 2, 0, 0], cast: false, recv: true });

  return {
    group: g,
    update(t) {
      flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.35; });
      heartMesh.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    },
  };
}

/* ------------------------------------------------------------ nursery zone */

export function pram(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = 0.5;
  scene.add(g);
  const body = fur('#ffb3d9', 0.1);
  const wheel = shiny('#ffffff', { roughness: 0.3 });
  const rock = new THREE.Group();
  g.add(rock);
  add(rock, new THREE.SphereGeometry(1, 24, 16), body, { p: [0, 1.0, 0], s: [0.9, 0.5, 0.58] });
  add(rock, new THREE.SphereGeometry(1, 20, 12, 0, PI, 0, PI / 2), fur('#c7a8ff', 0.1), { p: [0.3, 1.1, 0], s: [0.62, 0.62, 0.6], r: [0, PI / 2, 0] }).material.side = THREE.DoubleSide;
  // baby doll peeking out
  const skin = fur('#ffdcc8', 0.12);
  add(rock, new THREE.SphereGeometry(0.22, 18, 14), skin, { p: [0.28, 1.45, 0] });
  add(rock, new THREE.SphereGeometry(0.25, 18, 12, 0, PI * 2, 0, PI / 2), fur('#ffffff', 0.15), { p: [0.31, 1.47, 0], r: [0, 0, -0.9] });
  for (const s of [-1, 1]) {
    add(rock, new THREE.SphereGeometry(0.035, 8, 6), shiny('#4a2a3a'), { p: [0.1, 1.48, s * 0.08], s: [0.6, 0.35, 1] });
    add(rock, new THREE.SphereGeometry(0.04, 8, 6), fur('#ff9cc4', 0.3), { p: [0.1, 1.41, s * 0.13] });
  }
  add(rock, new THREE.SphereGeometry(1, 18, 10), fur('#c7f0ff', 0.1), { p: [-0.12, 1.33, 0], s: [0.62, 0.16, 0.48] });
  add(rock, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), shiny('#b07cff'), { p: [-0.95, 1.55, 0], r: [0, 0, 0.6] });
  add(rock, new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), shiny('#ffffff'), { p: [-1.2, 1.92, 0], r: [PI / 2, 0, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(g, new THREE.TorusGeometry(0.22, 0.06, 8, 20), wheel, { p: [sx * 0.55, 0.28, sz * 0.48] });
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), shiny('#b07cff'), { p: [sx * 0.45, 0.62, sz * 0.4], r: [0, 0, sx * 0.4] });
  }
  return {
    group: g,
    anchor: new THREE.Vector3(x, 1.8, z),
    update(t) { rock.rotation.x = Math.sin(t * 1.6) * 0.06; },
  };
}

export function crib(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const wood = fur('#fff6fb', 0.1);
  const W = 2.2, D = 1.3;
  add(g, new THREE.BoxGeometry(W, 0.25, D), fur('#ffe0f0', 0.12), { p: [0, 0.8, 0], recv: true });
  add(g, new THREE.SphereGeometry(1, 16, 10), fur('#ffffff', 0.2), { p: [-0.7, 0.98, 0], s: [0.28, 0.1, 0.4] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, new THREE.CylinderGeometry(0.06, 0.06, 1.55, 10), wood, { p: [sx * W / 2, 0.78, sz * D / 2] });
  for (const sz of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.04, 0.04, W, 8), wood, { p: [0, 1.45, sz * D / 2], r: [0, 0, PI / 2] });
    for (let i = -0.9; i <= 0.91; i += 0.3) add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), wood, { p: [i, 1.18, sz * D / 2] });
  }
  for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(0.04, 0.04, D, 8), wood, { p: [sx * W / 2, 1.45, 0], r: [PI / 2, 0, 0] });
  // hanging mobile with stars
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), wood, { p: [W / 2, 2.0, 0] });
  const mob = new THREE.Group();
  mob.position.set(W / 2 - 0.5, 2.5, 0);
  g.add(mob);
  add(mob, new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), wood, { r: [0, 0, PI / 2] });
  ['⭐', '🌙', '⭐'].forEach((_, i) => add(mob, new THREE.SphereGeometry(0.08, 10, 8), glowMat(['#ffd23f', '#c7a8ff', '#ff8fc4'][i], 0.8), { p: [-0.4 + i * 0.4, -0.3, 0] }));
  const tower = { group: g, center: new THREE.Vector3(x, 0, z), radius: 1.3, spots: [], update(t) { mob.rotation.y = t * 0.6; } };
  tower.spots.push({ pos: new THREE.Vector3(x + 0.2, 0.93, z), occ: null, tower });
  return tower;
}

export function teddy(scene, x, z, s = 1.2) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.rotation.y = -0.3;
  scene.add(g);
  const brown = fur('#c48a5a', 0.06), light = fur('#f2cfa8', 0.08);
  add(g, new THREE.SphereGeometry(0.55, 20, 14), brown, { p: [0, 0.6, 0], s: [1, 1.1, 0.9] });
  add(g, new THREE.SphereGeometry(0.35, 16, 12), light, { p: [0, 0.55, 0.32], s: [1, 1.1, 0.6] });
  add(g, new THREE.SphereGeometry(0.42, 20, 14), brown, { p: [0, 1.4, 0] });
  add(g, new THREE.SphereGeometry(0.17, 14, 10), light, { p: [0, 1.32, 0.36] });
  add(g, new THREE.SphereGeometry(0.06, 10, 8), shiny('#2b1a1a'), { p: [0, 1.38, 0.52] });
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.15, 14, 10), brown, { p: [sx * 0.3, 1.72, 0] });
    add(g, new THREE.SphereGeometry(0.08, 10, 8), light, { p: [sx * 0.3, 1.72, 0.08] });
    add(g, new THREE.SphereGeometry(0.05, 10, 8), shiny('#2b1a1a', { roughness: 0.1 }), { p: [sx * 0.14, 1.5, 0.37] });
    add(g, new THREE.SphereGeometry(1, 14, 10), brown, { p: [sx * 0.55, 0.75, 0.15], s: [0.17, 0.32, 0.17], r: [0.3, 0, sx * 0.6] });
    add(g, new THREE.SphereGeometry(1, 14, 10), brown, { p: [sx * 0.3, 0.2, 0.42], s: [0.2, 0.18, 0.3] });
    add(g, new THREE.ConeGeometry(0.1, 0.2, 10), fur('#ff6fb5', 0.15), { p: [sx * 0.1, 1.07, 0.3], r: [0, 0, sx * PI / 2] });
  }
  return g;
}

export function letterBlocks(scene, word, x, z, spacing = 0.78) {
  const cols = ['#ff6fb5', '#b47cff', '#3fd8c8', '#ffd23f', '#ff8a65', '#5ec8ff'];
  const blocks = [];
  [...word].forEach((ch, i) => {
    const bg = cols[i % cols.length];
    const tex = canvasTex(128, 128, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(8, 8, 112, 112);
      g.fillStyle = '#ffffff';
      g.font = '84px Chewy, "Comic Sans MS", cursive';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, 64, 70);
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    m.position.set(x + (i - (word.length - 1) / 2) * spacing, 0.3, z + rnd(-0.1, 0.1));
    m.rotation.y = rnd(-0.25, 0.25);
    m.castShadow = true;
    m.userData.block = { index: i, hopT: 0 };
    scene.add(m);
    blocks.push(m);
  });
  return blocks;
}

/* ------------------------------------------------------------- show stage */

export function stage(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  add(g, new THREE.BoxGeometry(7, 0.6, 3.6), fur('#ffd9a0', 0.08), { p: [0, 0.3, 0], recv: true });
  add(g, new THREE.BoxGeometry(7.05, 0.1, 0.06), shiny('#ffcf3f', { metalness: 0.6 }), { p: [0, 0.56, 1.81] });
  const bulbs = [];
  for (let i = -3.3; i <= 3.31; i += 0.5) {
    bulbs.push(add(g, new THREE.SphereGeometry(0.07, 10, 8), glowMat(bulbs.length % 2 ? '#ff8fc4' : '#fff27a', 1.4), { p: [i, 0.36, 1.83], cast: false }));
  }
  const curtain = fur('#e0336f', 0.08);
  let k = 0;
  for (let i = -3.4; i <= 3.41; i += 0.28) add(g, new THREE.CylinderGeometry(0.17, 0.17, 4.6, 10), curtain, { p: [i, 2.9, -1.6 + (k++ % 2) * 0.09] });
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.42, 0.5, 4.6, 14), curtain, { p: [s * 3.35, 2.9, -1.1] });
  add(g, new THREE.BoxGeometry(7.4, 0.7, 0.5), fur('#b81f58', 0.08), { p: [0, 5.2, -1.35] });
  add(g, new THREE.BoxGeometry(7.45, 0.1, 0.52), shiny('#ffcf3f', { metalness: 0.6 }), { p: [0, 4.86, -1.35] });
  const sign = textPlane('⭐ The Secily Show ⭐', { w: 3.8, h: 0.75, fg: '#e0336f', border: '#ffcf3f' });
  sign.position.set(0, 5.95, -1.3);
  g.add(sign);
  add(g, new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), shiny('#cccccc'), { p: [0, 4.55, -0.3] });
  const disco = add(g, new THREE.IcosahedronGeometry(0.38, 1), new THREE.MeshStandardMaterial({ color: '#f4eaff', metalness: 0.6, roughness: 0.15, flatShading: true, emissive: '#7a5cff', emissiveIntensity: 0.25 }), { p: [0, 4.15, -0.3] });

  const beams = [];
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const geo = new THREE.ConeGeometry(1.0, 5.5, 20, 1, true).translate(0, -2.75, 0).rotateX(-PI / 2);
    const b = new THREE.Mesh(geo, beamMat);
    b.position.set(s * 3.2, 5.0, 1.2);
    g.add(b);
    beams.push(b);
  }
  const tgt = new THREE.Vector3();
  return {
    group: g, center: new THREE.Vector3(x, 0, z), top: 0.6,
    spots: [new THREE.Vector3(x - 2, 0.6, z - 0.4), new THREE.Vector3(x, 0.6, z - 0.2), new THREE.Vector3(x + 2, 0.6, z - 0.4)],
    update(t) {
      disco.rotation.y = t * 0.8;
      beams.forEach((b, i) => {
        tgt.set(x + Math.sin(t * 0.9 + i * 2) * 2.2, 0.6, z + Math.cos(t * 0.7 + i) * 0.8);
        b.lookAt(tgt);
      });
      bulbs.forEach((b, i) => { b.visible = (Math.floor(t * 4) + i) % 3 !== 0; });
    },
  };
}

/* ----------------------------------------------------------------- finale */

export function rainbow(scene, x, z, R = 7) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  ['#ff5e7e', '#ffa45c', '#ffe066', '#7be495', '#5ec8ff', '#b58cff'].forEach((c, i) => {
    add(g, new THREE.TorusGeometry(R - i * 0.42, 0.22, 10, 64, PI), glowMat(c, 0.35), { cast: false });
  });
  cloud(g, -(R - 1.05), 0.4, 0, 1.2);
  cloud(g, R - 1.05, 0.4, 0, 1.2);
  return g;
}
