// Procedural 3D kitties and puppies, built from simple shapes, plus the little
// "task" helpers that make them walk, sit, nap, climb, jump, pounce and dance.
import * as THREE from 'three';

const SPH = new THREE.SphereGeometry(1, 22, 16);
const CONE = new THREE.ConeGeometry(1, 1, 14);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const TORUS = new THREE.TorusGeometry(1, 0.22, 8, 24);
const BAND = new THREE.CylinderGeometry(0.17, 0.15, 0.1, 18, 1, true);

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// Soft, fluffy-looking fur (sheen gives a velvety edge glow).
export function fur(color, glow = 0.06) {
  return cached(`fur${color}|${glow}`, () => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.85, sheen: 1, sheenRoughness: 0.35, sheenColor: 0xffffff,
    emissive: color, emissiveIntensity: glow,
  }));
}
export function shiny(color, extra = {}) {
  return cached(`sh${color}|${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.35, ...extra }));
}
export function glowMat(color, intensity = 1.2) {
  return cached(`gl${color}|${intensity}`, () => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity, roughness: 0.4,
  }));
}

function part(parent, geo, mat, s, p, r) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(s[0], s[1], s[2]);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function group(parent, p, r) {
  const g = new THREE.Group();
  if (p) g.position.set(p[0], p[1], p[2]);
  if (r) g.rotation.set(r[0], r[1], r[2]);
  parent.add(g);
  return g;
}

export function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ---------------------------------------------------------------- accessories */

function crown(head) {
  const g = group(head, [0.04, 0.34, -0.02], [0.1, 0, 0.18]);
  const gold = shiny('#ffcf3f', { metalness: 0.8, roughness: 0.25, emissive: '#8a5c00', emissiveIntensity: 0.45, side: THREE.DoubleSide });
  const band = new THREE.Mesh(BAND, gold);
  band.castShadow = true;
  g.add(band);
  const gems = ['#ff4fa3', '#4fe3ff', '#b47cff', '#5ef08c', '#ff4fa3'];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    part(g, CONE, gold, [0.04, 0.13, 0.04], [Math.sin(a) * 0.16, 0.115, Math.cos(a) * 0.16]);
    part(g, SPH, glowMat(gems[k], 0.8), [0.03, 0.03, 0.03], [Math.sin(a) * 0.16, 0.185, Math.cos(a) * 0.16]);
  }
  part(g, SPH, glowMat('#ff4fa3', 0.9), [0.045, 0.045, 0.02], [0, 0, 0.17]);
}

function bow(head, color, side = 1) {
  const g = group(head, [side * 0.2, 0.28, 0.06], [0, 0, side * 0.3]);
  const m = shiny(color, { roughness: 0.5 });
  part(g, CONE, m, [0.09, 0.16, 0.05], [0.08, 0, 0], [0, 0, Math.PI / 2]);
  part(g, CONE, m, [0.09, 0.16, 0.05], [-0.08, 0, 0], [0, 0, -Math.PI / 2]);
  part(g, SPH, m, [0.05, 0.05, 0.05]);
}

function glasses(head) {
  const g = group(head, [0, 0.03, 0.385]);
  const m = shiny('#15101c', { roughness: 0.05, metalness: 0.3 });
  for (const s of [-1, 1]) {
    part(g, BOX, m, [0.19, 0.13, 0.03], [s * 0.15, 0, 0], [0, s * 0.2, 0]);
    part(g, BOX, m, [0.025, 0.02, 0.32], [s * 0.27, 0.03, -0.16]);
    part(g, BOX, glowMat('#ffffff', 1), [0.06, 0.015, 0.005], [s * 0.15 - 0.03, 0.03, 0.02], [0, 0, 0.6]);
  }
  part(g, BOX, m, [0.1, 0.025, 0.02], [0, 0.03, 0.02]);
}

function collar(bp, color, y = 0.42, z = 0.62) {
  part(bp, TORUS, shiny(color, { roughness: 0.4 }), [0.25, 0.25, 0.25], [0, y, z], [-0.8, 0, 0]);
  part(bp, SPH, shiny('#ffd23f', { metalness: 0.7, roughness: 0.25, emissive: '#6b4a00', emissiveIntensity: 0.4 }), [0.06, 0.06, 0.06], [0, y - 0.12, z + 0.2]);
}

function spots(bp, color, n, center, radii) {
  const m = fur(color, 0.03);
  for (let k = 0; k < n; k++) {
    const a = -1.3 + (k / n) * 2.6 + Math.sin(k * 7.1) * 0.3;
    const zz = Math.sin(k * 3.7) * 0.32;
    const f = Math.sqrt(1 - (zz / radii[2]) ** 2);
    part(bp, SPH, m, [0.1, 0.1, 0.1], [
      center[0] + radii[0] * Math.sin(a) * f * 0.92,
      center[1] + radii[1] * Math.cos(a) * f * 0.92,
      center[2] + zz,
    ]);
  }
}

/* ----------------------------------------------------------------------- cat */

function buildCat(c, o) {
  const main = fur(o.color, o.glow ?? 0.06);
  const acc = fur(o.accent || '#fff6fb', 0.08);
  const pts = o.points ? fur(o.points, 0.04) : main;
  const pink = fur('#ff9cc4', 0.2);
  const bp = c.bodyPivot;

  // body
  part(bp, SPH, main, [0.36, 0.33, 0.5], [0, 0.12, 0.25]);
  part(bp, SPH, acc, [0.27, 0.24, 0.4], [0, 0.03, 0.3]);
  part(bp, SPH, o.chestGlow ? glowMat(o.chestGlow, 1.3) : acc, [0.23, 0.24, 0.2], [0, 0.22, 0.58]);
  if (o.stripes) {
    for (let i = 0; i < 4; i++) {
      const dz = -0.28 + i * 0.16;
      const f = Math.sqrt(1 - (dz / 0.5) ** 2);
      part(bp, SPH, fur(o.stripes, 0.04), [0.37 * f, 0.34 * f, 0.04], [0, 0.12, 0.25 + dz]);
    }
  }
  if (o.spots) spots(bp, o.spots, 6, [0, 0.12, 0.25], [0.36, 0.33, 0.5]);
  if (o.collar) collar(bp, o.collar);

  // head
  const head = c.head = group(bp, [0, 0.5, 0.68]);
  c.headBaseY = 0.5;
  part(head, SPH, main, [0.42, 0.37, 0.37]);
  const irisM = cached(`eye${o.eyes}`, () => new THREE.MeshStandardMaterial({
    color: o.eyes || '#3fe0c5', emissive: o.eyes || '#3fe0c5', emissiveIntensity: 0.55, roughness: 0.1,
  }));
  const black = shiny('#140a1a', { roughness: 0.1 });
  const white = glowMat('#ffffff', 1);
  for (const s of [-1, 1]) {
    part(head, SPH, main, [0.2, 0.17, 0.17], [s * 0.22, -0.13, 0.12]);
    const tufts = o.fluffy ? 3 : 1;
    for (let k = 0; k < tufts; k++) {
      part(head, CONE, main, [0.06, 0.2, 0.06], [s * 0.4, -0.12 + k * 0.08, 0.06], [0, 0, -s * (Math.PI / 2 + 0.35 - k * 0.3)]);
    }
    part(head, SPH, acc, [0.1, 0.08, 0.08], [s * 0.065, -0.12, 0.3]);

    const ear = group(head, [s * 0.22, 0.24, -0.02], [0, 0, -s * 0.32]);
    part(ear, CONE, pts, [0.15, 0.32, 0.1], [0, 0.14, 0]);
    part(ear, CONE, pink, [0.09, 0.22, 0.04], [0, 0.11, 0.05]);
    if (o.fluffy) part(ear, CONE, acc, [0.03, 0.18, 0.03], [0, 0.32, 0]);
    ear.userData.baseZ = -s * 0.32;
    c.ears.push(ear);

    const eg = group(head, [s * 0.155, 0.02, 0.29], [0, s * 0.22, 0]);
    part(eg, SPH, irisM, [0.115, 0.13, 0.07]);
    part(eg, SPH, black, [0.06, 0.085, 0.03], [0, 0, 0.055]);
    part(eg, SPH, white, [0.032, 0.032, 0.015], [-0.03, 0.05, 0.078]);
    part(eg, SPH, white, [0.015, 0.015, 0.01], [0.03, -0.04, 0.075]);
    c.eyes.push(eg);
  }
  part(head, SPH, pink, [0.055, 0.038, 0.035], [0, -0.055, 0.365]);
  const wp = [];
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) wp.push(s * 0.12, -0.09, 0.33, s * 0.52, -0.06 + k * 0.06, 0.26 + k * 0.02);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  head.add(new THREE.LineSegments(wg, cached('whisk', () => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }))));
  if (o.crown) crown(head);
  if (o.bow) bow(head, o.bow, o.crown ? -1 : 1);
  if (o.glasses) glasses(head);

  // legs: front-right, front-left, back-right, back-left
  const pawM = o.points ? pts : acc;
  for (const [s, z] of [[1, 0.67], [-1, 0.67], [1, 0.1], [-1, 0.1]]) {
    const lg = group(bp, [s * 0.17, -0.08, z]);
    part(lg, CYL, main, [0.085, 0.42, 0.085], [0, -0.2, 0]);
    part(lg, SPH, pawM, [0.1, 0.07, 0.12], [0, -0.39, 0.03]);
    c.legs.push(lg);
  }

  // tail: a chain of fluffy beads that curls and swishes
  let parent = group(bp, [0, 0.22, -0.2]);
  const tipM = o.tailTip ? fur(o.tailTip, 0.06) : pts;
  for (let i = 0; i < 9; i++) {
    const seg = group(parent, [0, i === 0 ? 0 : 0.1, 0]);
    const r = 0.085 + (o.fluffy ? 0.035 : 0) - i * 0.002;
    part(seg, SPH, i >= 7 ? tipM : main, [r, 0.08, r], [0, 0.05, 0]);
    c.tail.push(seg);
    parent = seg;
  }
}

/* ----------------------------------------------------------------------- dog */

function buildDog(c, o) {
  const main = fur(o.color, 0.05);
  const acc = fur(o.accent || o.color, 0.06);
  const earM = fur(o.ears || o.color, 0.04);
  const bp = c.bodyPivot;

  part(bp, SPH, main, [0.37, 0.34, 0.55], [0, 0.14, 0.22]);
  part(bp, SPH, acc, [0.27, 0.24, 0.42], [0, 0.04, 0.3]);
  part(bp, SPH, acc, [0.24, 0.26, 0.22], [0, 0.24, 0.6]);
  if (o.spots) spots(bp, o.spots, 7, [0, 0.14, 0.22], [0.37, 0.34, 0.55]);
  collar(bp, o.collar || '#ff4f8b', 0.45, 0.6);

  const head = c.head = group(bp, [0, 0.55, 0.72]);
  c.headBaseY = 0.55;
  part(head, SPH, main, [0.38, 0.35, 0.35]);
  part(head, SPH, acc, [0.19, 0.15, 0.24], [0, -0.1, 0.27]);
  part(head, SPH, shiny('#1d1020', { roughness: 0.15 }), [0.075, 0.055, 0.055], [0, -0.03, 0.5]);
  c.tongue = part(head, SPH, fur('#ff7aa8', 0.15), [0.07, 0.025, 0.1], [0, -0.21, 0.4]);
  if (o.spots) part(head, SPH, fur(o.spots, 0.03), [0.13, 0.13, 0.1], [0.2, 0.12, 0.22]);
  const eyeM = shiny('#3b2414', { roughness: 0.1 });
  const white = glowMat('#ffffff', 1);
  for (const s of [-1, 1]) {
    const ear = group(head, [s * 0.3, 0.17, -0.02], [0, 0, s * 0.35]);
    part(ear, SPH, earM, [0.1, 0.24, 0.16], [0, -0.18, 0]);
    ear.userData.baseZ = s * 0.35;
    c.ears.push(ear);
    const eg = group(head, [s * 0.14, 0.06, 0.28], [0, s * 0.2, 0]);
    part(eg, SPH, eyeM, [0.085, 0.095, 0.06]);
    part(eg, SPH, white, [0.025, 0.025, 0.012], [-0.02, 0.035, 0.055]);
    c.eyes.push(eg);
  }
  if (o.bow) bow(head, o.bow, 1);

  for (const [s, z] of [[1, 0.68], [-1, 0.68], [1, 0.02], [-1, 0.02]]) {
    const lg = group(bp, [s * 0.18, -0.08, z]);
    part(lg, CYL, main, [0.09, 0.44, 0.09], [0, -0.21, 0]);
    part(lg, SPH, acc, [0.11, 0.07, 0.13], [0, -0.39, 0.03]);
    c.legs.push(lg);
  }

  let parent = group(bp, [0, 0.28, -0.28]);
  for (let i = 0; i < 5; i++) {
    const seg = group(parent, [0, i === 0 ? 0 : 0.09, 0]);
    part(seg, SPH, i === 4 ? acc : main, [0.065 - i * 0.004, 0.075, 0.065 - i * 0.004], [0, 0.045, 0]);
    c.tail.push(seg);
    parent = seg;
  }
}

/* ------------------------------------------------------------------ creature */

export class Creature {
  constructor(o) {
    this.kind = o.kind || 'cat';
    this.name = o.name || 'Kitty';
    this.size = o.size || 1;
    this.voice = o.voice || 1 / Math.sqrt(this.size);
    this.speed = (o.speed || (this.kind === 'dog' ? 1.7 : 1.3)) * this.size;

    this.root = new THREE.Group();
    this.root.scale.setScalar(this.size);
    this.root.userData.creature = this;
    this.rig = group(this.root, [0, 0.5, 0]);
    const inner = group(this.rig, [0, -0.5, 0]);
    this.bodyPivot = group(inner, [0, 0.5, -0.25]);
    this.legs = [];
    this.tail = [];
    this.eyes = [];
    this.ears = [];
    (this.kind === 'dog' ? buildDog : buildCat)(this, o);

    this.queue = [];
    this.task = null;
    this.brain = null;
    this.heading = 0;
    this.baseY = 0;
    this.hop = 0;
    this.flip = 0;
    this.spin = 0;
    this.airborne = false;
    this.spot = null;
    this.moveAmt = 0; this.targetMove = 0; this.gait = 1;
    this.sit = 0; this.sitTarget = 0;
    this.sleep = 0; this.sleepTarget = 0;
    this.dance = 0; this.danceOn = false;
    this.jumpPose = 0; this.swatAmt = 0;
    this.phase = Math.random() * 10;
    this.time = Math.random() * 100;
    this.blinkT = Math.random() * 4; this.blinking = 0;
    this.lookT = 0; this.lookYaw = 0; this.lookTilt = 0;
    this.reactT = 0;
    this.boost = 1;
  }

  get pos() { return this.root.position; }

  setPos(x, y, z) { this.root.position.set(x, y, z); this.baseY = y; }

  turnTo(want, rate) {
    const d = angDiff(this.heading, want);
    this.heading += Math.sign(d) * Math.min(Math.abs(d), rate);
  }

  resetPose() {
    this.targetMove = 0; this.sitTarget = 0; this.sleepTarget = 0;
    this.danceOn = false; this.swatAmt = 0;
  }

  // Replace whatever the creature is doing (a jump in progress is allowed to land first).
  interrupt(tasks) {
    this.queue = tasks;
    if (!this.airborne) { this.task = null; this.resetPose(); }
  }

  poke() { this.reactT = 0.6; this.lookYaw = 0; }

  headWorld(out) {
    return this.head.getWorldPosition(out);
  }

  update(dt, boost = 1) {
    this.boost = boost;
    const sdt = dt * boost;
    this.time += sdt;
    if (!this.task) {
      if (!this.queue.length && this.brain) this.queue.push(...this.brain(this));
      this.task = this.queue.shift() || null;
    }
    if (this.task && this.task(sdt)) this.task = null;
    this.animate(sdt);

    let react = 0;
    if (this.reactT > 0) {
      this.reactT = Math.max(0, this.reactT - dt);
      react = Math.sin((1 - this.reactT / 0.6) * Math.PI) * 0.6;
    }
    this.root.position.y = this.baseY + this.hop + react;
    this.root.rotation.y = this.heading;
    this.rig.rotation.x = this.flip;
    this.rig.rotation.y = this.spin;
  }

  animate(dt) {
    const k = 1 - Math.exp(-dt * 7);
    const ks = 1 - Math.exp(-dt * 3);
    this.moveAmt += (this.targetMove - this.moveAmt) * k;
    this.sit += (this.sitTarget - this.sit) * ks;
    this.sleep += (this.sleepTarget - this.sleep) * ks;
    this.dance += ((this.danceOn ? 1 : 0) - this.dance) * k;
    this.phase += dt * 10 * this.gait * this.moveAmt;

    const t = this.time, m = this.moveAmt, s = this.sit, sl = this.sleep;
    const jp = this.jumpPose, sw = this.swatAmt, d = this.dance;
    const dog = this.kind === 'dog';

    const bp = this.bodyPivot;
    const bob = Math.abs(Math.sin(this.phase)) * 0.03 * m;
    bp.position.y = 0.5 - 0.12 * s - 0.26 * sl + bob + d * Math.abs(Math.sin(t * 8)) * 0.04;
    bp.rotation.x = -0.35 * s - 0.35 * d - 0.15 * sw;
    bp.rotation.z = d * Math.sin(t * 4) * 0.12;

    for (let i = 0; i < 4; i++) {
      const L = this.legs[i];
      const front = i < 2;
      const off = (i === 0 || i === 3) ? 0 : Math.PI;
      let rx = Math.sin(this.phase + off) * 0.6 * m;
      let sy = 1;
      if (front) {
        rx += 0.35 * s + 0.35 * d - 0.9 * jp;
        sy = 1 + 0.25 * s;
        rx += d * (-1.9 + Math.sin(t * 8 + i * Math.PI) * 0.6);
        if (i === 0) rx -= 1.9 * sw;
      } else {
        rx += -0.95 * s + 0.35 * d + 0.8 * jp;
      }
      sy *= 1 - 0.75 * sl;
      L.rotation.x = rx;
      L.scale.y = sy;
    }

    this.lookT -= dt;
    if (this.lookT < 0) {
      this.lookT = 1.5 + Math.random() * 3;
      this.lookYaw = (Math.random() - 0.5) * 1.2 * (1 - m * 0.7);
      this.lookTilt = (Math.random() - 0.5) * 0.45;
    }
    const h = this.head;
    h.rotation.y += (this.lookYaw * (1 - sl) - h.rotation.y) * ks;
    h.rotation.z += (this.lookTilt * (1 - m) + d * Math.sin(t * 8) * 0.25 - h.rotation.z) * ks;
    h.rotation.x = 0.35 * s + 0.3 * d + 0.45 * sl - 0.1 * jp;
    h.position.y = this.headBaseY - 0.18 * sl;

    // tail
    const rest = Math.max(s, sl);
    for (let i = 0; i < this.tail.length; i++) {
      const seg = this.tail[i];
      if (dog) {
        seg.rotation.x = i === 0 ? -0.5 + 0.2 * m - 0.6 * sl : 0.15;
        seg.rotation.z = i === 0 ? Math.sin(t * 16) * (0.5 + 0.3 * d) * (1 - sl * 0.9) : 0;
      } else {
        seg.rotation.x = i === 0 ? -0.6 - 0.95 * rest + 0.3 * m : 0.16 * (1 - rest) + 0.04 * rest;
        seg.rotation.z = Math.sin(t * (2.2 + 4 * d) - i * 0.55) * (i === 0 ? 0.08 : 0.15) + (i > 0 ? rest * 0.3 : 0);
      }
    }

    // ears
    for (let i = 0; i < this.ears.length; i++) {
      const e = this.ears[i];
      const base = e.userData.baseZ;
      if (dog) e.rotation.z = base + Math.sin(this.phase * 2 + i) * 0.25 * m + (jp ? (i ? -0.5 : 0.5) * jp : 0);
      else e.rotation.z = base + (Math.sin(t * 1.3 + i * 2) > 0.97 ? 0.25 * (i ? 1 : -1) : 0);
    }

    // blink / sleepy eyes
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blinkT = 2 + Math.random() * 4; this.blinking = 0.13; }
    this.blinking -= dt;
    const closed = this.blinking > 0 || sl > 0.6;
    for (const e of this.eyes) e.scale.y = closed ? 0.12 : 1;

    if (this.tongue) this.tongue.position.y = -0.21 + Math.sin(t * 12) * 0.012 * (1 - sl);
  }
}

/* --------------------------------------------------------------------- tasks */
// Each task is a function(dt) that returns true when finished.

export const T = {
  walkTo(c, x, z, sp = 1) {
    let age = 0;
    return (dt) => {
      age += dt;
      const dx = x - c.pos.x, dz = z - c.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12 || age > 15) { c.targetMove = 0; return true; }
      const want = Math.atan2(dx, dz);
      c.turnTo(want, dt * 6);
      const facing = Math.max(0, Math.cos(angDiff(c.heading, want)));
      const step = Math.min(d, c.speed * sp * dt * (0.25 + 0.75 * facing));
      if (d < 0.5) { c.pos.x += (dx / d) * step; c.pos.z += (dz / d) * step; }
      else { c.pos.x += Math.sin(c.heading) * step; c.pos.z += Math.cos(c.heading) * step; }
      c.targetMove = 1;
      c.gait = sp;
      return false;
    };
  },

  approach(c, getPos, stop = 0.7, sp = 1.2, timeout = 8) {
    let age = 0;
    return (dt) => {
      age += dt;
      const p = getPos();
      const dx = p.x - c.pos.x, dz = p.z - c.pos.z, d = Math.hypot(dx, dz);
      if (d < stop || age > timeout) { c.targetMove = 0; return true; }
      const want = Math.atan2(dx, dz);
      c.turnTo(want, dt * 7);
      const facing = Math.max(0, Math.cos(angDiff(c.heading, want)));
      const step = Math.min(d - stop * 0.9, c.speed * sp * dt * (0.25 + 0.75 * facing));
      c.pos.x += Math.sin(c.heading) * step;
      c.pos.z += Math.cos(c.heading) * step;
      c.targetMove = 1;
      c.gait = sp;
      return false;
    };
  },

  wait(c, dur, pose = 'stand') {
    let t = 0;
    return (dt) => {
      c.targetMove = 0;
      c.sitTarget = pose === 'sit' ? 1 : 0;
      c.sleepTarget = pose === 'sleep' ? 1 : 0;
      t += dt;
      if (t >= dur) { c.sitTarget = 0; c.sleepTarget = 0; return true; }
      return false;
    };
  },

  face(c, getPos) {
    let age = 0;
    return (dt) => {
      age += dt;
      const p = typeof getPos === 'function' ? getPos() : getPos;
      const want = Math.atan2(p.x - c.pos.x, p.z - c.pos.z);
      c.turnTo(want, dt * 6);
      return Math.abs(angDiff(c.heading, want)) < 0.08 || age > 1.5;
    };
  },

  turn(c, angle) {
    return (dt) => {
      c.turnTo(angle, dt * 5);
      return Math.abs(angDiff(c.heading, angle)) < 0.08;
    };
  },

  jumpTo(c, x, y, z, o = {}) {
    let t = 0, sx, sy, sz, dur, h;
    return (dt) => {
      if (sx === undefined) {
        sx = c.pos.x; sy = c.baseY; sz = c.pos.z;
        const dist = Math.hypot(x - sx, z - sz);
        dur = o.dur ?? (0.45 + dist * 0.1 + Math.abs(y - sy) * 0.08);
        h = o.height ?? (0.45 + Math.max(0, y - sy) * 0.45 + dist * 0.08);
        if (dist > 0.05) c.heading = Math.atan2(x - sx, z - sz);
        c.airborne = true;
        c.targetMove = 0; c.sitTarget = 0; c.sleepTarget = 0;
        o.onStart?.();
      }
      t += dt;
      const k = Math.min(1, t / dur);
      c.pos.x = sx + (x - sx) * k;
      c.pos.z = sz + (z - sz) * k;
      c.baseY = sy + (y - sy) * k;
      c.hop = 4 * h * k * (1 - k);
      c.jumpPose = Math.sin(Math.PI * k);
      const e = k * k * (3 - 2 * k);
      c.flip = (o.flips || 0) * Math.PI * 2 * e;
      c.spin = (o.spins || 0) * Math.PI * 2 * e;
      if (k >= 1) {
        c.baseY = y; c.hop = 0; c.jumpPose = 0; c.flip = 0; c.spin = 0; c.airborne = false;
        o.onLand?.();
        return true;
      }
      return false;
    };
  },

  // Jump onto a perch (tower platform, roof, box...). Gives up if someone else is already there.
  jumpToSpot(c, spot) {
    let inner = null;
    return (dt) => {
      if (!inner) {
        if (spot.occ && spot.occ !== c) { c.queue.length = 0; return true; }
        if (c.spot && c.spot !== spot) c.spot.occ = null;
        spot.occ = c;
        c.spot = spot;
        inner = T.jumpTo(c, spot.pos.x, spot.pos.y, spot.pos.z);
      }
      return inner(dt);
    };
  },

  swat(c, ball, power = 3) {
    let t = 0, hit = false;
    return (dt) => {
      t += dt;
      c.swatAmt = Math.sin(Math.min(1, t / 0.45) * Math.PI);
      if (!hit && t > 0.22) {
        hit = true;
        const dx = ball.pos.x - c.pos.x, dz = ball.pos.z - c.pos.z;
        if (Math.hypot(dx, dz) < 1.6 * c.size + 0.4) {
          const a = c.heading + (Math.random() - 0.5) * 0.8;
          ball.kick(Math.sin(a) * power, Math.cos(a) * power);
        }
      }
      if (t >= 0.45) { c.swatAmt = 0; return true; }
      return false;
    };
  },

  dance(c, dur) {
    let t = 0, h0;
    return (dt) => {
      if (h0 === undefined) h0 = c.heading;
      t += dt;
      c.danceOn = true;
      c.sitTarget = 0.6;
      c.targetMove = 0;
      c.hop = Math.abs(Math.sin(t * 6)) * 0.22;
      c.heading = h0 + Math.sin(t * 2.4) * 0.9;
      if (t >= dur) { c.danceOn = false; c.sitTarget = 0; c.hop = 0; return true; }
      return false;
    };
  },

  call(fn) {
    return () => { fn(); return true; };
  },

  // Decide the next steps only when we get to them (positions may have changed).
  later(c, fn) {
    return () => { c.queue.unshift(...fn()); return true; };
  },
};
