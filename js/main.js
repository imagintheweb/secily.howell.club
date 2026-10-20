// Secily's Kitty Club - the 3D world behind the page.
// Scrolling glides the camera from one play area to the next; each area lines
// up with one section of the page (the <section data-zone="N"> elements).
import * as THREE from 'three';
import { Creature, T } from './creatures.js';
import * as W from './world.js';
import * as B from './brains.js';
import * as S from './sound.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const hideLoader = () => loader?.classList.add('done');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.body.classList.add('no-webgl');
  hideLoader();
  throw err;
}

const narrowQ = matchMedia('(max-width: 820px)');
let narrow = narrowQ.matches;
const lowPower = narrow || (navigator.hardwareConcurrency || 8) <= 4;

renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

// let the cute fonts load so 3D signs use them
await Promise.race([document.fonts?.load('64px Chewy'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#f9d3ea', 28, 115);
const camera = new THREE.PerspectiveCamera(narrow ? 58 : 50, innerWidth / innerHeight, 0.1, 900);
let camReady = false;

scene.add(new THREE.HemisphereLight('#fff0f8', '#8fd08f', 1.25));
const sun = new THREE.DirectionalLight('#fff1d6', 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#ffb6e1', 0.7);
fill.position.set(-12, 6, -6);
scene.add(fill);

/* --------------------------------------------------------------- the world */

const ZS = 32;
const sections = [...document.querySelectorAll('section[data-zone]')];
const zoneCount = sections.length;
const env = W.buildEnvironment(scene, { zMin: -(zoneCount - 1) * ZS - 30, zMax: 40, lowPower });

const zones = [];
const creatures = [];
const yarns = [];
const updaters = [];
const clickables = [];

function makeZone(view = {}) {
  const i = zones.length, cz = -i * ZS;
  const z = {
    i, center: new THREE.Vector3(0, 0, cz),
    bounds: { x0: -7.5, x1: 7.5, z0: cz - 5.5, z1: cz + 5.5 },
    obstacles: [], towers: [], yarns: [], creatures: [],
    view: { target: [0, 1.3, 0], offset: [0, 5, 12.5], ...view },
  };
  zones.push(z);
  return z;
}

function tower(zone, x, dz, levels) {
  const t = W.catTower(scene, x, zone.center.z + dz, levels);
  zone.towers.push(t);
  zone.obstacles.push({ x, z: zone.center.z + dz, r: t.radius });
  updaters.push((time) => t.update(time));
  return t;
}

function yarn(zone, x, dz, opts = {}) {
  const y = new W.Yarn(scene, { x, z: zone.center.z + dz, zone, ...opts });
  zone.yarns.push(y);
  yarns.push(y);
  clickables.push(y.mesh);
  return y;
}

function pet(zone, opts, brain, x, dz, heading = rnd(-1, 1)) {
  const c = new Creature(opts);
  c.setPos(x, 0, zone.center.z + dz);
  c.heading = heading;
  c.zone = zone;
  c.brain = brain;
  scene.add(c.root);
  zone.creatures.push(c);
  creatures.push(c);
  clickables.push(c.root);
  return c;
}

const TOWER_A = [
  { h: 1.0, dx: 0.55, dz: 0.35 },
  { h: 1.9, dx: -0.5, dz: -0.3, toy: '#ff6fb5' },
  { h: 2.8, dx: 0.35, dz: -0.55 },
  { h: 3.7, dx: -0.15, dz: 0.3, bed: true },
];
const TOWER_B = [
  { h: 1.2, dx: -0.5, dz: 0.4, toy: '#3fd8c8' },
  { h: 2.3, dx: 0.5, dz: 0.1 },
  { h: 3.3, dx: -0.2, dz: -0.45, bed: true },
];
const TOWER_BIG = [
  { h: 1.0, dx: 0.6, dz: 0.4 },
  { h: 1.9, dx: -0.55, dz: 0.2, toy: '#ffd23f' },
  { h: 2.8, dx: 0.45, dz: -0.45 },
  { h: 3.7, dx: -0.5, dz: -0.4, toy: '#b47cff' },
  { h: 4.6, dx: 0.3, dz: 0.3 },
  { h: 5.5, dx: -0.1, dz: -0.1, bed: true },
];

// 0 - Welcome: Sparkle the mascot, a cat tower and yarn
{
  // look a little upward so the pets show up below the welcome card
  const z = makeZone({ target: [0, 4.6, 0], offset: [0, 3.4, 10.5] });
  tower(z, 4.6, -1.8, TOWER_A);
  yarn(z, -3, 1.2, { color: '#ff6fb5' });
  yarn(z, 2.2, 2.6, { color: '#3fd8c8' });
  const home = { x: -0.6, z: z.center.z + 2.2 };
  pet(z, { name: 'Sparkle', color: '#ffb6dc', accent: '#fff0f8', eyes: '#3fe0c5', chestGlow: '#6ff0ff', fluffy: true, size: 1.45, glow: 0.12 }, B.mascotBrain(z, home), home.x, 2.2, 0);
  pet(z, { name: 'Twinkle', color: '#ffffff', accent: '#ffe3f1', eyes: '#59b8ff', bow: '#ff6fb5' }, B.catBrain(z), -4, -1);
  pet(z, { name: 'Bubblegum', color: '#ff8fc4', accent: '#fff', eyes: '#5ef08c' }, B.catBrain(z), 3, 0.5);
}

// 1 - The Kitty Crew
{
  const z = makeZone();
  tower(z, -4.2, -1.8, TOWER_A);
  tower(z, 4.4, -2.6, TOWER_B);
  yarn(z, 0.5, 1.5, { color: '#b47cff' });
  yarn(z, -1.5, 3, { color: '#ffd23f' });
  const crew = [
    { name: 'Marshmallow', color: '#ffffff', accent: '#ffeef7', eyes: '#59b8ff', bow: '#ff8fc4' },
    { name: 'Midnight', color: '#2a2235', accent: '#3a3048', eyes: '#ffcc33', collar: '#ff4f8b' },
    { name: 'Cocoa', color: '#f4e4cf', accent: '#fff7ec', points: '#6b4636', eyes: '#59b8ff' },
    { name: 'Ginger', color: '#ffa24c', accent: '#fff3e0', stripes: '#e07a1f', eyes: '#5ef08c' },
    { name: 'Lilac', color: '#c9b6e8', accent: '#f4eeff', eyes: '#ffab40', fluffy: true },
    { name: 'Peaches', color: '#ffc8a8', accent: '#fff4ea', eyes: '#3fe0c5', bow: '#b47cff' },
  ];
  crew.forEach((o, i) => pet(z, o, B.catBrain(z), -5 + i * 2, rnd(0, 3)));
}

// 2 - Cat facts: kitten playground full of yarn and a cardboard box
{
  const z = makeZone();
  const box = W.cardboardBox(scene, -4.5, z.center.z - 1, 0.3);
  z.towers.push(box);
  z.obstacles.push({ x: -4.5, z: z.center.z - 1, r: 0.7 });
  const box2 = W.cardboardBox(scene, 4.8, z.center.z - 2.2, -0.4);
  z.towers.push(box2);
  z.obstacles.push({ x: 4.8, z: z.center.z - 2.2, r: 0.7 });
  W.YARN_COLORS.slice(0, 5).forEach((color, i) => yarn(z, -4 + i * 2, rnd(-2, 3), { color }));
  const kittens = [
    { name: 'Mochi', color: '#ffffff', accent: '#ffe3f1', eyes: '#3fe0c5', spots: '#ffb36b' },
    { name: 'Bean', color: '#8a6a5a', accent: '#f6e6da', eyes: '#5ef08c' },
    { name: 'Button', color: '#9aa3b5', accent: '#ffffff', stripes: '#6e7790', eyes: '#ffcc33' },
    { name: 'Tiny', color: '#ffd1e8', accent: '#ffffff', eyes: '#59b8ff', bow: '#3fd8c8' },
    { name: 'Nugget', color: '#ffbe6b', accent: '#fff3e0', eyes: '#3fe0c5' },
  ];
  kittens.forEach((o, i) => pet(z, { ...o, size: rnd(0.58, 0.7), speed: 1.6 }, B.catBrain(z, { yarn: 5, climb: 2, wander: 2 }), -4 + i * 2, rnd(0, 3)));
}

// 3 - Puppy pals
{
  const z = makeZone();
  const dh = W.doghouse(scene, -4.6, z.center.z - 2);
  z.obstacles.push({ x: -4.6, z: z.center.z - 2, r: 1.3 });
  W.dogBowl(scene, 3.2, z.center.z - 3);
  z.bowl = { x: 3.2, z: z.center.z - 3 };
  W.bone(scene, 1.5, z.center.z + 3.5, 0.6);
  W.bone(scene, -2.5, z.center.z + 2.5, -0.3);
  yarn(z, 0, 1, { kind: 'ball', color: '#ff4f6d', radius: 0.26 });
  yarn(z, 3, 2, { kind: 'ball', color: '#c8f04a', radius: 0.24 });
  pet(z, { kind: 'dog', name: 'Biscuit', color: '#e8b15e', accent: '#fff1d8', ears: '#c98d3f', collar: '#ff4f8b', size: 1.1 }, B.dogBrain(z), -1.5, 1);
  pet(z, { kind: 'dog', name: 'Pepper', color: '#ffffff', accent: '#ffffff', ears: '#2a2235', spots: '#2a2235', collar: '#3fd8c8' }, B.dogBrain(z), 2, 0);
  pet(z, { kind: 'dog', name: 'Peanut', color: '#9a6b4a', accent: '#e9c9a8', ears: '#6b4636', collar: '#b47cff', bow: '#ff6fb5', size: 0.75 }, B.dogBrain(z), 0, 3);
  // the bossy cat who sits on the doghouse roof
  const boss = { towers: [dh], yarns: [] };
  pet(z, { name: 'Boss', color: '#9aa3b5', accent: '#ffffff', stripes: '#6e7790', eyes: '#ffcc33', size: 0.85 }, B.catBrain({ ...z, ...boss }, { climb: 6, wander: 1, nap: 0 }), -3, 2);
}

// 4 - Giggle zone: trampoline + a giant rubber duck
{
  const z = makeZone();
  const tr = W.trampoline(scene, 0.5, z.center.z - 1.2);
  z.obstacles.push({ x: 0.5, z: z.center.z - 1.2, r: tr.radius });
  updaters.push((t, dt) => tr.update(t, dt));
  const duck = W.rubberDuck(scene, -5, z.center.z - 3, 1.8);
  z.obstacles.push({ x: -5, z: z.center.z - 3, r: 1.3 });
  updaters.push((t) => duck.update(t));
  const brain = B.trampolineBrain(z, tr);
  pet(z, { name: 'Pickles', color: '#a8e6b8', accent: '#f0fff4', eyes: '#ff8a65', glasses: true }, brain, -3, 2);
  pet(z, { name: 'Noodle', color: '#b9b2c9', accent: '#ffffff', stripes: '#8c84a3', eyes: '#5ef08c' }, brain, 3, 2.5);
  pet(z, { name: 'Waffles', color: '#f2d7a6', accent: '#fff8ea', eyes: '#59b8ff', bow: '#ff6fb5' }, brain, 4, 0);
  pet(z, { name: 'Bubbles', color: '#a8c8f0', accent: '#ffffff', eyes: '#ffcc33', fluffy: true }, brain, -2, 3.5);
}

// 5 - Princess palace
{
  const z = makeZone({ target: [0, 2.4, -1], offset: [0, 5.2, 15] });
  const cs = W.castle(scene, 0, z.center.z - 3.5);
  updaters.push((t) => cs.update(t));
  z.obstacles.push({ x: -2.7, z: z.center.z - 3.4, r: 1.9 }, { x: 0, z: z.center.z - 3.8, r: 2.1 }, { x: 2.7, z: z.center.z - 3.4, r: 1.9 });
  z.bounds.z0 = z.center.z - 1;
  const carpet = { x: 0, z0: z.center.z - 1.2, z1: z.center.z + 5 };
  const brain = B.royalBrain(z, carpet);
  pet(z, { name: 'Princess Sprinkles', color: '#d6c2ff', accent: '#fff4ff', eyes: '#3fe0c5', crown: true, fluffy: true }, brain, 0, 1);
  pet(z, { name: 'Duchess Daisy', color: '#ffffff', accent: '#fff0f8', eyes: '#59b8ff', crown: true, bow: '#ff6fb5' }, brain, -3, 2.5);
  pet(z, { name: 'Lady Luna', color: '#c4ccd8', accent: '#ffffff', eyes: '#b47cff', crown: true }, brain, 3, 2);
}

// 6 - Baby doll nursery
let pramRef;
{
  const z = makeZone();
  pramRef = W.pram(scene, -3.8, z.center.z - 1);
  updaters.push((t) => pramRef.update(t));
  z.obstacles.push({ x: -3.8, z: z.center.z - 1, r: 1.2 });
  const cr = W.crib(scene, 3.4, z.center.z - 2.2);
  updaters.push((t) => cr.update(t));
  z.obstacles.push({ x: 3.4, z: z.center.z - 2.2, r: 1.3 });
  W.teddy(scene, 0.2, z.center.z - 3.6, 1.2);
  z.obstacles.push({ x: 0.2, z: z.center.z - 3.6, r: 0.8 });
  W.letterBlocks(scene, 'ABC', -0.6, z.center.z + 3.8).forEach((b) => clickables.push(b));
  pet(z, { name: 'Snuggles', color: '#fff3e0', accent: '#ffffff', eyes: '#59b8ff', size: 0.75 }, B.sleepyBrain(z, cr.spots[0]), 3.4, 0.2);
  pet(z, { name: 'Pudding', color: '#ffffff', accent: '#ffffff', spots: '#ff9f4a', eyes: '#5ef08c', size: 0.85 }, B.sleepyBrain(z, { x: 1.2, z: z.center.z - 2.2 }), 1.2, -2.2);
  pet(z, { name: 'Dozy', color: '#9aa3b5', accent: '#eef1f7', eyes: '#ffcc33' }, B.sleepyBrain(z, { x: -2.2, z: z.center.z + 0.6 }), -2.2, 0.6);
  pet(z, { name: 'Mama Mittens', color: '#ffb6dc', accent: '#ffffff', eyes: '#3fe0c5', bow: '#c7a8ff' }, B.catBrain(z, { climb: 0, yarn: 0, nap: 0 }), 0, 2);
}

// 7 - Show time: The Secily Show stage
{
  const z = makeZone({ target: [0, 2.2, -1], offset: [0, 4.6, 14] });
  const st = W.stage(scene, 0, z.center.z - 3);
  updaters.push((t) => st.update(t));
  z.obstacles.push({ x: -2.3, z: z.center.z - 3.4, r: 1.9 }, { x: 0, z: z.center.z - 3.4, r: 1.9 }, { x: 2.3, z: z.center.z - 3.4, r: 1.9 });
  pet(z, { name: 'Star', color: '#ffc2e3', accent: '#fff6fb', eyes: '#b47cff', bow: '#ffd23f', fluffy: true, glow: 0.12 }, B.dancerBrain(z, st), 0, -0.2, 0);
  const stageCenter = { x: 0, z: z.center.z - 3 };
  const fans = [
    { name: 'Popcorn', color: '#fff1b8', accent: '#ffffff', eyes: '#5ef08c' },
    { name: 'Jellybean', color: '#c99cff', accent: '#f6efff', eyes: '#ffcc33' },
    { name: 'Sprout', color: '#ffffff', accent: '#ffffff', spots: '#9aa3b5', eyes: '#59b8ff' },
    { name: 'Ziggy', color: '#2a2235', accent: '#ffffff', eyes: '#5ef08c', bow: '#ff4f8b' },
  ];
  fans.forEach((o, i) => {
    const seat = { x: -2.7 + i * 1.8, z: z.center.z + 1.6 + (i % 2) * 0.5 };
    pet(z, { ...o, size: 0.85 }, B.audienceBrain(z, seat, stageCenter), seat.x, seat.z - z.center.z, Math.PI);
  });
}

// 8 - Finale: rainbow, the biggest cat tower ever, and SECILY blocks
{
  const z = makeZone({ target: [0, 2.6, -1], offset: [0, 4.8, 14] });
  W.rainbow(scene, 0, z.center.z - 6, 7.5);
  tower(z, -4, -1.8, TOWER_BIG);
  tower(z, 4.4, -2.4, TOWER_B);
  const box = W.cardboardBox(scene, 1.6, z.center.z - 2.6, 0.2);
  z.towers.push(box);
  z.obstacles.push({ x: 1.6, z: z.center.z - 2.6, r: 0.7 });
  W.letterBlocks(scene, 'SECILY', 0, z.center.z + 4.2).forEach((b) => clickables.push(b));
  yarn(z, -1.5, 1, { color: '#ff6fb5' });
  yarn(z, 1.5, 1.8, { color: '#5ec8ff' });
  yarn(z, 3, 0, { color: '#ffd23f' });
  const party = [
    { name: 'Confetti', color: '#ffffff', accent: '#ffffff', spots: '#ff8fc4', eyes: '#3fe0c5' },
    { name: 'Sunny', color: '#ffe27a', accent: '#fffbe6', eyes: '#5ef08c', bow: '#ff6fb5' },
    { name: 'Blossom', color: '#ffb6dc', accent: '#fff0f8', eyes: '#59b8ff', crown: true },
    { name: 'Sugar', color: '#f6f0ff', accent: '#ffffff', eyes: '#b47cff', fluffy: true },
    { name: 'Cupcake', color: '#c99cff', accent: '#fff', eyes: '#ffcc33', collar: '#3fd8c8' },
    { name: 'Pumpkin', color: '#ffa24c', accent: '#fff3e0', stripes: '#e07a1f', eyes: '#3fe0c5' },
  ];
  party.forEach((o, i) => pet(z, o, B.catBrain(z, { climb: 4 }), -5 + i * 2, rnd(0, 3)));
}

/* --------------------------------------------------------------- effects */

const fx = (() => {
  const items = [];
  const texCache = new Map();
  function emojiTex(e) {
    if (!texCache.has(e)) {
      texCache.set(e, W.canvasTex(128, 128, (g) => {
        g.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(e, 64, 72);
      }));
    }
    return texCache.get(e);
  }
  function spawn(e, pos, o = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthWrite: false, toneMapped: false }));
    s.position.copy(pos);
    const sc = o.scale || 0.5;
    s.scale.setScalar(sc);
    scene.add(s);
    const spread = o.spread ?? 0.6;
    items.push({ s, life: o.life || 1.6, age: 0, sc, ownTex: false, wob: Math.random() * 6, vel: new THREE.Vector3(rnd(-spread, spread), o.vy ?? 1.2, rnd(-spread, spread) * 0.5) });
  }
  function bubble(text, creature) {
    const W2 = 640, H2 = 160;
    const tex = W.canvasTex(W2, H2, (g) => {
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#ff8cc6';
      g.lineWidth = 10;
      g.beginPath();
      g.roundRect ? g.roundRect(8, 8, W2 - 16, H2 - 40, 50) : g.rect(8, 8, W2 - 16, H2 - 40);
      g.fill(); g.stroke();
      g.beginPath(); g.moveTo(W2 / 2 - 22, H2 - 34); g.lineTo(W2 / 2, H2 - 6); g.lineTo(W2 / 2 + 22, H2 - 34); g.fill();
      let size = 64;
      g.font = `${size}px Chewy, "Comic Sans MS", cursive`;
      while (g.measureText(text).width > W2 - 60) { size -= 4; g.font = `${size}px Chewy, "Comic Sans MS", cursive`; }
      g.fillStyle = '#7a2a7e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, W2 / 2, (H2 - 32) / 2 + 6);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    s.scale.set(2.6, 0.65, 1);
    s.renderOrder = 10;
    scene.add(s);
    items.push({ s, life: 2.4, age: 0, sc: 1, ownTex: true, follow: creature });
  }
  const tmp = new THREE.Vector3();
  function update(dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      const k = it.age / it.life;
      if (k >= 1) {
        scene.remove(it.s);
        if (it.ownTex) it.s.material.map.dispose();
        it.s.material.dispose();
        items.splice(i, 1);
        continue;
      }
      if (it.follow) {
        it.follow.headWorld(tmp);
        it.s.position.set(tmp.x, tmp.y + 0.75 * it.follow.size + 0.35, tmp.z);
        it.s.material.opacity = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, it.age * 8);
      } else {
        it.s.position.addScaledVector(it.vel, dt);
        it.s.position.x += Math.sin(it.age * 3 + it.wob) * dt * 0.3;
        it.s.material.opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        it.s.scale.setScalar(it.sc * (0.7 + k * 0.6));
      }
    }
  }
  return { spawn, bubble, update };
})();

const tmpV = new THREE.Vector3();
const CAT_LINES = ['Meow! I\'m {n}!', 'Hi Secily! I\'m {n}!', 'Purrrr... 💕', '{n} wants a snack!', 'Hehe, that tickles!', 'Meow meow! ✨'];
const DOG_LINES = ['Woof! I\'m {n}!', 'Wanna play fetch?', '{n} loves you!', 'Arf arf! 🐾'];

function poke(c) {
  c.poke();
  if (c.kind === 'dog') S.woof(c.voice); else S.meow(c.voice);
  c.headWorld(tmpV);
  for (let i = 0; i < 4; i++) fx.spawn(pick(['💖', '💕', '✨', '💗']), tmpV, { scale: 0.45, spread: 0.8 });
  const line = pick(c.kind === 'dog' ? DOG_LINES : CAT_LINES).replace('{n}', c.name);
  fx.bubble(line, c);
}

/* -------------------------------------------------------------- camera */

const look = new THREE.Vector3(0, 2, 0);
const camGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const va = {}, vb = {};
const pointer = { x: 0, y: 0 };

function zoneView(i, out) {
  const z = zones[i];
  const side = narrow ? 0 : ({ left: -1, right: 1 }[sections[i]?.dataset.side] || 0);
  const v = z.view;
  const mul = narrow ? 1.5 : 1;
  out.tx = z.center.x + v.target[0] + side * 4.2;
  out.ty = v.target[1] + (narrow ? 0.6 : 0);
  out.tz = z.center.z + v.target[2];
  out.cx = out.tx + v.offset[0];
  out.cy = v.offset[1] * mul;
  out.cz = out.tz + v.offset[2] * mul;
}

// Where are we on the page, measured in "zones"? 2.5 means halfway between zone 2 and 3.
const forcedZone = new URLSearchParams(location.search).get('zone'); // ?zone=3 pins the camera (handy for testing)
function scrollZone() {
  if (forcedZone !== null) return +forcedZone;
  const mid = innerHeight / 2;
  const centers = sections.map((s) => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
  if (mid <= centers[0]) return 0;
  for (let i = 0; i < centers.length - 1; i++) {
    if (mid <= centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
  }
  return centers.length - 1;
}

const smooth = (t) => t * t * (3 - 2 * t);
let currentZone = 0;

function updateCamera(dt, time) {
  const f = Math.max(0, Math.min(zones.length - 1, scrollZone()));
  const i0 = Math.floor(f), i1 = Math.min(zones.length - 1, i0 + 1);
  const e = smooth(f - i0);
  zoneView(i0, va);
  zoneView(i1, vb);
  currentZone = Math.round(f);
  lookGoal.set(va.tx + (vb.tx - va.tx) * e, va.ty + (vb.ty - va.ty) * e, va.tz + (vb.tz - va.tz) * e);
  camGoal.set(va.cx + (vb.cx - va.cx) * e, va.cy + (vb.cy - va.cy) * e, va.cz + (vb.cz - va.cz) * e);
  camGoal.x += Math.sin(time * 0.25) * 0.4 + pointer.x * 0.8;
  camGoal.y += Math.sin(time * 0.33) * 0.15 - pointer.y * 0.4;
  if (!camReady) {
    // start right where the page is scrolled to, with a little swoop down
    camReady = true;
    camera.position.copy(camGoal).add(new THREE.Vector3(0, 3, 5));
    look.copy(lookGoal);
  }
  const k = 1 - Math.exp(-dt * 3.2);
  camera.position.lerp(camGoal, k);
  look.lerp(lookGoal, k);
  camera.lookAt(look);
  sun.position.set(look.x + 8, look.y + 16, look.z + 9);
  sun.target.position.copy(look);
}

/* ------------------------------------------------------------- input */

const ray = new THREE.Raycaster();
ray.params.Line.threshold = 0.05;
const ndc = new THREE.Vector2();

function hitTest(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  for (const h of ray.intersectObjects(clickables, true)) {
    let o = h.object;
    while (o && !o.userData.creature && !o.userData.block && !o.userData.yarn) o = o.parent;
    if (o) return { obj: o, point: h.point };
  }
  const g = ray.intersectObject(env.ground)[0];
  return g ? { ground: true, point: g.point } : null;
}

function nearestZone(z) {
  return zones[Math.max(0, Math.min(zones.length - 1, Math.round(-z / ZS)))];
}

canvas.addEventListener('click', (e) => {
  S.initAudio();
  const hit = hitTest(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.obj?.userData.creature) return poke(hit.obj.userData.creature);
  if (hit.obj?.userData.block) {
    const b = hit.obj.userData.block;
    b.hopT = 0.5;
    S.note(b.index);
    fx.spawn(pick(['⭐', '✨', '🎵']), hit.obj.position.clone().setY(0.9), { scale: 0.4 });
    return;
  }
  if (hit.obj?.userData.yarn) {
    const y = hit.obj.userData.yarn;
    y.kick(rnd(-2, 2), -rnd(2, 4));
    S.pop();
    return;
  }
  if (hit.ground) {
    // "Here kitty kitty!" - the closest pet trots over to where you tapped
    const zone = nearestZone(hit.point.z);
    const b = zone.bounds;
    const px = Math.max(b.x0, Math.min(b.x1, hit.point.x)), pz = Math.max(b.z0, Math.min(b.z1, hit.point.z));
    if (Math.abs(px - hit.point.x) > 3 || Math.abs(pz - hit.point.z) > 3) return;
    let best = null, bd = Infinity;
    for (const c of zone.creatures) {
      if (c.airborne || c.baseY > 0.05 || c.sleep > 0.5) continue;
      const d = Math.hypot(c.pos.x - px, c.pos.z - pz);
      if (d < bd) { bd = d; best = c; }
    }
    fx.spawn('🐾', tmpV.set(px, 0.3, pz), { scale: 0.45, vy: 0.6, spread: 0.1 });
    if (best) {
      best.interrupt([T.walkTo(best, px, pz, 1.5), T.turn(best, 0), T.wait(best, 2.5, 'sit')]);
      S.pop();
    }
  }
});

let hoverAt = 0;
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
  if (e.target !== canvas || e.pointerType !== 'mouse') return;
  const now = performance.now();
  if (now - hoverAt < 120) return;
  hoverAt = now;
  const hit = hitTest(e.clientX, e.clientY);
  canvas.style.cursor = hit?.obj ? 'pointer' : '';
});

/* ----------------------------------------------------- page events (ui.js) */

addEventListener('kc:throw-yarn', () => {
  const zone = zones[currentZone];
  const p = B.randomPoint(zone, 1.5);
  const y = yarn(zone, p.x, p.z - zone.center.z, { y: 7 });
  y.thrown = true;
  const thrown = zone.yarns.filter((t) => t.thrown);
  if (thrown.length > 5) {
    const old = thrown[0];
    zone.yarns.splice(zone.yarns.indexOf(old), 1);
    yarns.splice(yarns.indexOf(old), 1);
    clickables.splice(clickables.indexOf(old.mesh), 1);
    old.dispose();
  }
  const chasers = zone.creatures
    .filter((c) => !c.airborne && c.sleep < 0.5)
    .sort((a, b) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) - Math.hypot(b.pos.x - p.x, b.pos.z - p.z))
    .slice(0, 3);
  chasers.forEach((c) => c.interrupt(B.chaseThrown(c, zone, y)));
  fx.spawn('🧶', tmpV.set(p.x, 7.5, p.z), { scale: 0.7, vy: -1, spread: 0 });
});

addEventListener('kc:dance', () => {
  for (const c of creatures) {
    if (Math.abs(c.pos.z - look.z) > 45) continue;
    c.interrupt([T.dance(c, 6)]);
  }
  for (let i = 0; i < 10; i++) {
    fx.spawn(pick(['🎵', '🎶', '⭐', '✨']), tmpV.set(look.x + rnd(-6, 6), rnd(1, 3), look.z + rnd(-3, 3)), { life: 2.5 });
  }
});

addEventListener('kc:poke', (e) => {
  const c = creatures.find((k) => k.name === e.detail?.name);
  if (c) poke(c);
});

addEventListener('kc:celebrate', () => {
  for (let i = 0; i < 12; i++) {
    setTimeout(() => fx.spawn(pick(['💖', '💤', '⭐', '🍼', '💕']), pramRef.anchor, { scale: 0.5, life: 2.2 }), i * 120);
  }
});

addEventListener('resize', () => {
  narrow = narrowQ.matches;
  camera.aspect = innerWidth / innerHeight;
  camera.fov = narrow ? 58 : 50;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* -------------------------------------------------------------- loop */

function separate(zone) {
  const cs = zone.creatures;
  for (let a = 0; a < cs.length; a++) {
    const A = cs[a];
    if (A.airborne || A.baseY > 0.05) continue;
    for (let b = a + 1; b < cs.length; b++) {
      const Bc = cs[b];
      if (Bc.airborne || Bc.baseY > 0.05) continue;
      const dx = Bc.pos.x - A.pos.x, dz = Bc.pos.z - A.pos.z, d = Math.hypot(dx, dz);
      const min = 0.42 * (A.size + Bc.size) + 0.1;
      if (d < min && d > 1e-4) {
        const push = (min - d) * 0.5;
        A.pos.x -= (dx / d) * push; A.pos.z -= (dz / d) * push;
        Bc.pos.x += (dx / d) * push; Bc.pos.z += (dz / d) * push;
      }
    }
    for (const o of zone.obstacles) {
      const dx = A.pos.x - o.x, dz = A.pos.z - o.z, d = Math.hypot(dx, dz) || 1e-4;
      const min = o.r + 0.3 * A.size;
      if (d < min) { const k = (min - d) / d; A.pos.x += dx * k; A.pos.z += dz * k; }
    }
  }
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = performance.now(), time = 0, lastSY = scrollY, boost = 1, first = true;
const blocks = clickables.filter((o) => o.userData.block);

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  // scrolling makes the pets extra playful
  const v = Math.abs(scrollY - lastSY) / Math.max(dt, 1e-3);
  lastSY = scrollY;
  const bt = reduceMotion ? 1 : 1 + Math.min(1.6, v / 900);
  boost += (bt - boost) * (1 - Math.exp(-dt * (bt > boost ? 6 : 1.5)));

  updateCamera(dt, time);

  for (const zone of zones) {
    if (Math.abs(zone.center.z - look.z) > 80) continue;
    for (const c of zone.creatures) {
      c.update(dt, boost);
      if (c.sleep > 0.7 && Math.random() < dt * 0.5) fx.spawn('💤', c.headWorld(tmpV), { scale: 0.35, vy: 0.5, spread: 0.2, life: 2.2 });
      if (c.dance > 0.7 && Math.random() < dt * 1.2) fx.spawn(pick(['🎵', '🎶']), c.headWorld(tmpV), { scale: 0.4, life: 1.8 });
    }
    separate(zone);
  }
  for (const y of yarns) if (Math.abs(y.pos.z - look.z) < 80) y.update(dt);
  for (const u of updaters) u(time, dt);
  for (const b of blocks) {
    const d = b.userData.block;
    if (d.hopT > 0) { d.hopT = Math.max(0, d.hopT - dt); b.position.y = 0.3 + Math.sin((1 - d.hopT / 0.5) * Math.PI) * 0.7; b.rotation.y += dt * 8; }
  }
  fx.update(dt);
  env.update(time, camera);

  renderer.render(scene, camera);
  if (first) { first = false; hideLoader(); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
