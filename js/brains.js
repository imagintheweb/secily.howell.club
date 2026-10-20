// Little "brains" that decide what each pet does next. A brain returns a list
// of tasks (from creatures.js) whenever its pet runs out of things to do.
import { T } from './creatures.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FACE_CAMERA = 0; // heading 0 looks toward +z, where the camera lives

function weighted(w) {
  const entries = Object.entries(w).filter(([, v]) => v > 0);
  let r = Math.random() * entries.reduce((s, [, v]) => s + v, 0);
  for (const [k, v] of entries) { if ((r -= v) <= 0) return k; }
  return entries[0][0];
}

export function randomPoint(zone, pad = 0.5) {
  const b = zone.bounds;
  for (let i = 0; i < 25; i++) {
    const x = rnd(b.x0 + pad, b.x1 - pad), z = rnd(b.z0 + pad, b.z1 - pad);
    if (!zone.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) return { x, z };
  }
  return { x: zone.center.x, z: zone.center.z + 4 };
}

function nearPoint(zone, x, z, r) {
  const b = zone.bounds;
  for (let i = 0; i < 15; i++) {
    const a = rnd(0, Math.PI * 2), d = rnd(0.3, r);
    const px = Math.min(b.x1, Math.max(b.x0, x + Math.cos(a) * d));
    const pz = Math.min(b.z1, Math.max(b.z0, z + Math.sin(a) * d));
    if (!zone.obstacles.some((o) => Math.hypot(px - o.x, pz - o.z) < o.r + 0.4)) return { x: px, z: pz };
  }
  return { x, z };
}

// Hop down from a perch back to the grass.
export function getDown(c, zone) {
  if (c.baseY < 0.05) return [];
  const t = c.spot?.tower;
  const from = t ? t.center : zone.center;
  let dx = c.pos.x - from.x, dz = c.pos.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) { const a = rnd(0, Math.PI * 2); dx = Math.cos(a); dz = Math.sin(a); } else { dx /= d; dz /= d; }
  // prefer hopping toward the front so we stay in view
  if (dz < -0.3) dz = -dz;
  const R = (t?.radius ?? 1.2) + 0.8;
  const gx = from.x + dx * R + rnd(-0.3, 0.3), gz = from.z + dz * R + rnd(-0.3, 0.3);
  return [
    T.face(c, { x: gx, z: gz }),
    T.jumpTo(c, gx, 0, gz),
    T.call(() => { if (c.spot) { c.spot.occ = null; c.spot = null; } }),
  ];
}

function wander(c, zone, pose) {
  const p = randomPoint(zone);
  return [T.walkTo(c, p.x, p.z, rnd(0.7, 1.2)), T.wait(c, rnd(1, 3.5), pose || pick(['sit', 'stand', 'sit']))];
}

function climb(c, tower, zone) {
  const s0 = tower.spots[0];
  let dx = s0.pos.x - tower.center.x, dz = s0.pos.z - tower.center.z;
  const d = Math.hypot(dx, dz) || 1;
  if (d < 0.05) { dx = 0; dz = 1; } else { dx /= d; dz /= d; }
  const gx = tower.center.x + dx * (tower.radius + 0.6), gz = tower.center.z + dz * (tower.radius + 0.6);
  const seq = [T.walkTo(c, gx, gz), T.face(c, s0.pos)];
  const top = 1 + Math.floor(Math.random() * tower.spots.length);
  for (let i = 0; i < top; i++) {
    seq.push(T.jumpToSpot(c, tower.spots[i]));
    if (i < top - 1) {
      seq.push(T.wait(c, rnd(0.3, 1.2), 'sit'));
      seq.push(T.face(c, tower.spots[i + 1].pos));
    }
  }
  seq.push(T.turn(c, FACE_CAMERA + rnd(-0.6, 0.6)));
  seq.push(T.wait(c, rnd(3, 7), Math.random() < 0.45 ? 'sleep' : 'sit'));
  seq.push(T.later(c, () => getDown(c, zone)));
  return seq;
}

function playYarn(c, zone, power = 3, sp = 1.3) {
  if (!zone.yarns.length) return wander(c, zone);
  let ball = zone.yarns[0], best = Infinity;
  for (const y of zone.yarns) {
    const d = Math.hypot(y.pos.x - c.pos.x, y.pos.z - c.pos.z) + Math.random() * 3;
    if (d < best) { best = d; ball = y; }
  }
  const stop = 0.55 * c.size + ball.r + 0.1;
  const seq = [];
  const rounds = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < rounds; i++) {
    seq.push(T.approach(c, () => ball.pos, stop, sp));
    seq.push(T.face(c, () => ball.pos));
    seq.push(T.swat(c, ball, power * rnd(0.7, 1.3)));
  }
  seq.push(T.face(c, () => ball.pos));
  seq.push(T.wait(c, rnd(0.8, 2), 'sit'));
  return seq;
}

export function chaseThrown(c, zone, ball) {
  const stop = 0.55 * c.size + ball.r + 0.1;
  return [
    ...getDown(c, zone),
    T.approach(c, () => ball.pos, stop, 1.8, 10),
    T.face(c, () => ball.pos),
    T.swat(c, ball, 4),
    T.approach(c, () => ball.pos, stop, 1.6, 8),
    T.swat(c, ball, 3.5),
  ];
}

/* ------------------------------------------------------------------ brains */

export function catBrain(zone, w = {}) {
  return (c) => {
    if (c.baseY > 0.05) return getDown(c, zone);
    const W = {
      wander: 3, sit: 1.5, nap: 0.6,
      climb: zone.towers.length ? 3.5 : 0,
      yarn: zone.yarns.length ? 3 : 0,
      ...w,
    };
    switch (weighted(W)) {
      case 'climb': return climb(c, pick(zone.towers), zone);
      case 'yarn': return playYarn(c, zone);
      case 'sit': return [T.turn(c, FACE_CAMERA + rnd(-0.8, 0.8)), T.wait(c, rnd(2, 4), 'sit')];
      case 'nap': return [...wander(c, zone, 'stand'), T.wait(c, rnd(4, 8), 'sleep')];
      default: return wander(c, zone);
    }
  };
}

// Sparkle, the mascot: hangs out front-and-center, poses for the camera.
export function mascotBrain(zone, home) {
  return (c) => {
    if (c.baseY > 0.05) return getDown(c, zone);
    const r = Math.random();
    if (r < 0.5) return [T.walkTo(c, home.x, home.z, 0.8), T.turn(c, FACE_CAMERA), T.wait(c, rnd(4, 8), 'sit')];
    if (r < 0.75 && zone.yarns.length) return playYarn(c, zone, 2.5);
    const p = nearPoint(zone, home.x, home.z, 2.5);
    return [T.walkTo(c, p.x, p.z, 0.8), T.turn(c, FACE_CAMERA + rnd(-0.5, 0.5)), T.wait(c, rnd(1.5, 3), 'stand')];
  };
}

export function dogBrain(zone) {
  return (c) => {
    if (c.baseY > 0.05) return getDown(c, zone);
    switch (weighted({ fetch: 4, zoomies: 2, sit: 1.5, bowl: zone.bowl ? 1 : 0, wander: 1.5 })) {
      case 'fetch': return playYarn(c, zone, 5, 2);
      case 'zoomies': {
        const seq = [];
        for (let i = 0; i < 4; i++) { const p = randomPoint(zone); seq.push(T.walkTo(c, p.x, p.z, 2.4)); }
        seq.push(T.wait(c, 1.5, 'sit'));
        return seq;
      }
      case 'sit': return [T.turn(c, FACE_CAMERA + rnd(-0.6, 0.6)), T.wait(c, rnd(2, 4), 'sit')];
      case 'bowl': {
        const b = zone.bowl;
        return [T.walkTo(c, b.x, b.z + 0.8), T.face(c, b), T.wait(c, rnd(2, 3), 'stand')];
      }
      default: return wander(c, zone);
    }
  };
}

// Giggle zone: take turns bouncing on the trampoline, sometimes doing flips!
export function trampolineBrain(zone, tramp) {
  return (c) => {
    // a turn that got interrupted (dance party, yarn...) shouldn't hog the trampoline forever
    if (tramp.occ && performance.now() - tramp.occSince > 15000) tramp.occ = null;
    if (tramp.occ === c) tramp.occ = null;
    if (c.baseY > 0.05) return getDown(c, zone);
    if (!tramp.occ && Math.random() < 0.7) {
      tramp.occ = c;
      tramp.occSince = performance.now();
      const a = rnd(-0.9, 0.9);
      const ex = tramp.center.x + Math.sin(a) * 2.2, ez = tramp.center.z + Math.cos(a) * 2.2;
      const cx = tramp.center.x, cz = tramp.center.z, top = tramp.top;
      const seq = [T.walkTo(c, ex, ez, 1.3), T.face(c, tramp.center), T.jumpTo(c, cx, top, cz, { onLand: () => tramp.boing() })];
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const trick = Math.random();
        seq.push(T.jumpTo(c, cx + rnd(-0.4, 0.4), top, cz + rnd(-0.4, 0.4), {
          height: rnd(1.6, 2.8), dur: 0.95,
          flips: trick < 0.25 ? 1 : trick < 0.35 ? -1 : 0,
          spins: trick > 0.75 ? 1 : 0,
          onStart: () => tramp.boing(),
        }));
      }
      const oa = rnd(-0.9, 0.9);
      const ox = cx + Math.sin(oa) * 2.4, oz = cz + Math.cos(oa) * 2.4;
      seq.push(T.jumpTo(c, ox, 0, oz, { height: 1.4, onStart: () => tramp.boing() }));
      seq.push(T.call(() => { tramp.occ = null; }));
      seq.push(T.wait(c, rnd(1, 2), 'sit'));
      return seq;
    }
    const p = nearPoint(zone, tramp.center.x, tramp.center.z + 2.2, 2.5);
    return [T.walkTo(c, p.x, p.z), T.face(c, tramp.center), T.wait(c, rnd(2, 4), 'sit')];
  };
}

// Princess cats: royal parades down the pink carpet and posing like queens.
export function royalBrain(zone, carpet) {
  return (c) => {
    if (c.baseY > 0.05) return getDown(c, zone);
    const r = Math.random();
    if (r < 0.35) {
      return [
        T.walkTo(c, carpet.x + rnd(-0.2, 0.2), carpet.z1),
        T.walkTo(c, carpet.x + rnd(-0.2, 0.2), carpet.z0, 0.55),
        T.turn(c, FACE_CAMERA),
        T.wait(c, rnd(2, 4), 'sit'),
      ];
    }
    if (r < 0.7) return [...wander(c, zone, 'sit')];
    return [T.turn(c, FACE_CAMERA + rnd(-0.7, 0.7)), T.wait(c, rnd(2, 5), 'sit')];
  };
}

// Nursery: snooze in a cozy spot, wake up for a stretch, snooze again.
export function sleepyBrain(zone, spot) {
  return (c) => {
    if (spot.tower) {
      if (c.spot !== spot) {
        if (c.baseY > 0.05) return getDown(c, zone);
        const tw = spot.tower;
        const gx = tw.center.x, gz = tw.center.z + tw.radius + 0.6;
        return [T.walkTo(c, gx, gz), T.face(c, spot.pos), T.jumpToSpot(c, spot)];
      }
    } else if (Math.hypot(c.pos.x - spot.x, c.pos.z - spot.z) > 0.3) {
      return [T.walkTo(c, spot.x, spot.z, 0.7)];
    }
    return [
      T.turn(c, FACE_CAMERA + rnd(-1.2, 1.2)),
      T.wait(c, rnd(10, 20), 'sleep'),
      T.wait(c, rnd(1, 2), 'stand'),
      T.wait(c, rnd(1.5, 3), 'sit'),
    ];
  };
}

// The star of The Secily Show dances across the stage.
export function dancerBrain(zone, stg) {
  return (c) => {
    if (c.baseY < 0.3) {
      const s = stg.spots[1];
      const gx = s.x, gz = stg.center.z + 2.6;
      return [T.walkTo(c, gx, gz), T.face(c, s), T.jumpTo(c, s.x, stg.top, s.z)];
    }
    const s = pick(stg.spots);
    return [
      T.walkTo(c, s.x, s.z, 0.9),
      T.turn(c, FACE_CAMERA),
      T.dance(c, rnd(4, 7)),
      T.wait(c, rnd(1, 2), 'sit'),
    ];
  };
}

export function audienceBrain(zone, seat, target) {
  return (c) => {
    if (c.baseY > 0.05) return getDown(c, zone);
    if (Math.random() < 0.2) {
      return [T.wait(c, 0.4, 'stand'), T.dance(c, rnd(1.5, 3)), T.face(c, target), T.wait(c, rnd(2, 4), 'sit')];
    }
    return [T.walkTo(c, seat.x, seat.z, 0.8), T.face(c, target), T.wait(c, rnd(5, 10), 'sit')];
  };
}
