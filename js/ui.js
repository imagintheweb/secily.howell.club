// Page games: jokes, name makers, the nursery, favorite shows, petting Sparkle...
// Talks to the 3D world (main.js) with "kc:*" window events.
import * as S from './sound.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

window.addEventListener('pointerdown', () => S.initAudio(), { once: true });

/* --------------------------------------------------------- sparkly effects */

function burst(x, y, emojis, n = 8) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'burst';
    s.textContent = pick(emojis);
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d - 30}px`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
    s.addEventListener('animationend', () => s.remove());
    document.body.appendChild(s);
  }
}
function burstAt(el, emojis, n) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, emojis, n);
}
function rain(emojis, n = 30) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'rain';
    s.textContent = pick(emojis);
    s.style.left = `${Math.random() * 100}vw`;
    s.style.setProperty('--dur', `${2 + Math.random() * 2}s`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.fontSize = `${20 + Math.random() * 22}px`;
    s.addEventListener('animationend', () => s.remove());
    document.body.appendChild(s);
  }
}

/* ------------------------------------------------------------- greeting */

const hour = new Date().getHours();
$('#greeting').textContent = hour < 12 ? 'Good morning, Secily! ☀️' : hour < 18 ? 'Good afternoon, Secily! 🌸' : 'Good evening, Secily! 🌙';

/* ------------------------------------------------------- crew & puppies */

$$('[data-meow]').forEach((b) => b.addEventListener('click', () => {
  S.meow(parseFloat(b.dataset.pitch) || 1);
  emit('kc:poke', { name: b.dataset.meow });
  burstAt(b, ['💖', '🐾', '✨'], 6);
}));
$$('[data-woof]').forEach((b) => b.addEventListener('click', () => {
  S.woof(parseFloat(b.dataset.pitch) || 1);
  emit('kc:poke', { name: b.dataset.woof });
  burstAt(b, ['🦴', '🐾', '💙'], 6);
}));

/* ----------------------------------------------------------- cat facts */

$$('.flip').forEach((f) => f.addEventListener('click', () => {
  f.classList.toggle('flipped');
  S.pop();
}));

/* --------------------------------------------------------------- jokes */

const JOKES = [
  ['Why did the cat sit on the computer?', 'To keep an eye on the mouse!'],
  ['What do you call a pile of kittens?', 'A meow-ntain!'],
  ['What is a cat\'s favorite color?', 'Purr-ple!'],
  ['Why don\'t cats play games in the jungle?', 'Too many cheetahs!'],
  ['What do cats eat for breakfast?', 'Mice Krispies!'],
  ['What is a cat\'s favorite dessert?', 'Mice cream!'],
  ['What do you call a dog magician?', 'A labracadabrador!'],
  ['Why did the dog sit in the shade?', 'He didn\'t want to be a hot dog!'],
  ['What is a dog\'s favorite pizza?', 'Pupperoni!'],
  ['Why was the kitten sent to the principal?', 'For being a copycat!'],
  ['What do you call a sleeping dinosaur?', 'A dino-snore!'],
  ['Why did the teddy bear say no to dessert?', 'Because she was already stuffed!'],
  ['How do you make a tissue dance?', 'Put a little boogie in it!'],
  ['What did one toilet say to the other toilet?', 'You look a little flushed!'],
  ['Why was the baby strawberry crying?', 'Her mom and dad were in a jam!'],
  ['Knock knock! Who\'s there? Interrupting cow. Interrupting cow wh—', 'MOOOOO!'],
  ['What do you call a cat that loves to bowl?', 'An alley cat!'],
  ['What kind of shoes do frogs wear?', 'Open-toad sandals!'],
  ['Why do bees have sticky hair?', 'Because they use honey-combs!'],
  ['What did the princess say when her photos didn\'t come back?', 'Someday my prints will come!'],
];
let jokeI = Math.floor(Math.random() * JOKES.length);
function showJoke() {
  const [q, a] = JOKES[jokeI];
  $('#joke-q').textContent = q;
  $('#joke-a').textContent = a;
  $('#joke-a').hidden = true;
}
showJoke();
$('#joke-reveal').addEventListener('click', (e) => {
  if (!$('#joke-a').hidden) return;
  $('#joke-a').hidden = false;
  S.giggle();
  burstAt(e.currentTarget, ['😂', '🤣', '😹', '😆'], 10);
});
$('#joke-next').addEventListener('click', () => {
  jokeI = (jokeI + 1 + Math.floor(Math.random() * (JOKES.length - 1))) % JOKES.length;
  showJoke();
  S.pop();
});

/* ----------------------------------------------------- silly kitty name */

const SILLY = {
  a: ['Captain', 'Princess', 'Sir', 'Lady', 'Professor', 'Baby', 'Duchess', 'Mister', 'Queen', 'Little'],
  b: ['Fluffy', 'Sparkle', 'Wiggle', 'Giggle', 'Noodle', 'Pickle', 'Snuggle', 'Bubble', 'Jelly', 'Muffin', 'Sprinkle', 'Waffle'],
  c: ['McWhiskers', 'Fuzzbottom', 'Snickerdoodle', 'Puddingpaws', 'Beanface', 'Wobblebottom', 'Stinkypaws', 'Von Purrington', 'Toots', 'Sockfeet', 'Marshmallow-Nose'],
};
$('#silly-btn').addEventListener('click', (e) => {
  $('#silly-out').textContent = `${pick(SILLY.a)} ${pick(SILLY.b)} ${pick(SILLY.c)}`;
  $('#silly-out').classList.remove('pop'); void $('#silly-out').offsetWidth; $('#silly-out').classList.add('pop');
  S.boing();
  burstAt(e.currentTarget, ['🤪', '😹', '🎉'], 6);
});

/* --------------------------------------------------------- royal name */

const ROYAL = {
  title: ['the Sparkly', 'the Brave', 'the Giggly', 'the Kind', 'the Magnificent', 'the Fluffy-Hearted', 'the Twirly', 'the Super Smart', 'the Glittering'],
  land: ['the Cupcake Kingdom', 'Kitty Castle', 'Rainbow Mountain', 'Glitter Bay', 'the Cloud Palace', 'Marshmallow Meadows', 'Lollipop Lagoon', 'the Land of a Thousand Puppies'],
  pet: ['a unicorn kitten named Biscuit', 'a tiny dragon who sneezes glitter', 'a puppy who wears a tutu', 'a talking bunny named Mr. Hops', 'a flying pony named Cupcake', 'a giant fluffy cat named Pillow'],
  power: ['can talk to animals', 'turns broccoli into candy', 'makes rainbows by giggling', 'can fly when she twirls', 'makes flowers grow by singing', 'gives the best hugs in the land'],
};
$('#crown-btn').addEventListener('click', () => {
  $('#royal-out').innerHTML = `
    <p class="royal-title">Princess Secily ${pick(ROYAL.title)} of ${pick(ROYAL.land)}</p>
    <p class="royal-detail">👑 Royal pet: ${pick(ROYAL.pet)}<br>✨ Superpower: she ${pick(ROYAL.power)}</p>`;
  S.chime();
  rain(['👑', '✨', '💖', '💎', '🌸'], 28);
});

/* -------------------------------------------------------------- nursery */

const careMsgs = {
  feed: 'Glug glug! {b} drank the whole bottle. 🍼',
  diaper: 'All fresh and clean! {b} feels much better.',
  bath: 'Splish splash! So many bubbles! 🫧',
  dress: '{b} looks SO cute in the new outfit! 👗',
  sing: '🎵 Twinkle twinkle little star… {b} is getting sleepy.',
  tuck: 'Tucked in with a snuggly blanket. Night night! 🌙',
};
const done = new Set();
const nameIn = $('#baby-name');
nameIn.value = store.get('kc-baby', 'Baby Rosie');
nameIn.addEventListener('input', () => store.set('kc-baby', nameIn.value));
const baby = () => nameIn.value.trim() || 'Baby';

$$('[data-care]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.care;
  if (done.has(k)) return;
  done.add(k);
  b.classList.add('done');
  $('#care-fill').style.width = `${(done.size / 6) * 100}%`;
  burstAt(b, ['💖', '✨', '⭐'], 6);
  if (done.size === 6) {
    $('#care-msg').textContent = `Shhh… ${baby()} is fast asleep. You're the best at taking care of babies! 💤`;
    $('#care-reset').hidden = false;
    S.chime();
    rain(['💤', '💖', '🌙', '⭐'], 24);
    emit('kc:celebrate');
  } else {
    $('#care-msg').textContent = careMsgs[k].replace('{b}', baby());
    S.note(done.size);
  }
}));
$('#care-reset').addEventListener('click', () => {
  done.clear();
  $$('[data-care]').forEach((b) => b.classList.remove('done'));
  $('#care-fill').style.width = '0%';
  $('#care-msg').textContent = `${baby()} is awake and ready to play!`;
  $('#care-reset').hidden = true;
  S.pop();
});

/* ---------------------------------------------------------------- shows */

let shows = store.get('kc-shows', []);
function renderShows() {
  const ul = $('#show-list');
  ul.innerHTML = '';
  if (!shows.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No shows yet. Add your favorites!';
    ul.appendChild(li);
  }
  shows.forEach((s, i) => {
    const li = document.createElement('li');
    li.append(`⭐ ${s}`);
    const x = document.createElement('button');
    x.className = 'x';
    x.title = 'Remove';
    x.textContent = '✖';
    x.addEventListener('click', () => { shows.splice(i, 1); store.set('kc-shows', shows); renderShows(); S.pop(); });
    li.appendChild(x);
    ul.appendChild(li);
  });
}
renderShows();
$('#show-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#show-input').value.trim();
  if (!v) return;
  shows.push(v);
  store.set('kc-shows', shows);
  $('#show-input').value = '';
  renderShows();
  S.chime();
  burstAt($('#show-list'), ['⭐', '📺', '✨'], 8);
});

const CARTOON = {
  who: ['a puppy who can fly', 'a princess cat', 'a baby dragon', 'a silly unicorn', 'twin kittens', 'a talking cupcake', 'a shy little monster', 'a robot puppy'],
  what: ['opens a cupcake shop on the moon', 'goes to ballet school', 'finds a magic paintbrush', 'has to babysit 100 kittens', 'goes on a treasure hunt under the sea', 'starts a rock band', 'becomes a superhero for one day', 'builds the world\'s biggest pillow fort'],
  twist: ['but everything turns into jelly!', 'and their best friend is a grumpy goldfish.', 'but they can only talk in rhymes.', 'and every episode ends with a dance party.', 'but the moon is made of cheese!', 'and the mailman is secretly a giraffe.'],
};
$('#cartoon-btn').addEventListener('click', (e) => {
  $('#cartoon-out').textContent = `A show about ${pick(CARTOON.who)} who ${pick(CARTOON.what)}, ${pick(CARTOON.twist)}`;
  S.pop();
  burstAt(e.currentTarget, ['🎬', '🍿', '⭐'], 6);
});

/* --------------------------------------------------------- dance party */

let partyCooldown = 0;
function danceParty() {
  if (Date.now() < partyCooldown) return;
  partyCooldown = Date.now() + 2500;
  S.party();
  emit('kc:dance');
  rain(['🎵', '🎶', '⭐', '🪩', '💃', '✨'], 30);
}
$('#party-btn').addEventListener('click', danceParty);
$('#fab-party').addEventListener('click', danceParty);

/* -------------------------------------------------------- floating buttons */

$('#fab-yarn').addEventListener('click', (e) => {
  emit('kc:throw-yarn');
  S.pop();
  burstAt(e.currentTarget, ['🧶'], 3);
});
// "Watch" mode hides the cards so you can just watch the kitties play
const peekBtn = $('#fab-peek');
function setPeek(on) {
  document.body.classList.toggle('peek', on);
  peekBtn.querySelector('span').textContent = on ? '📖' : '👀';
  peekBtn.querySelector('small').textContent = on ? 'Read' : 'Watch';
}
setPeek(new URLSearchParams(location.search).has('peek'));
peekBtn.addEventListener('click', () => { setPeek(!document.body.classList.contains('peek')); S.pop(); });

const soundBtn = $('#fab-sound');
function paintSound() {
  soundBtn.querySelector('span').textContent = S.isOn() ? '🔊' : '🔇';
  soundBtn.classList.toggle('off', !S.isOn());
}
paintSound();
soundBtn.addEventListener('click', () => { S.setOn(!S.isOn()); paintSound(); S.pop(); });

/* ---------------------------------------------------------- pet the kitty */

let purr = 0, lastPet = 0, lastPurrSound = 0, lastMilestone = 0;
const petEl = $('#pet-kitty');
function addPurr(n, x, y) {
  purr = Math.min(100, purr + n);
  lastPet = Date.now();
  if (Math.random() < 0.35) burst(x, y, ['💖', '💕', '✨'], 1);
  if (Date.now() - lastPurrSound > 1200) { S.purr(); lastPurrSound = Date.now(); }
  const m = Math.floor(purr / 25) * 25;
  if (m > lastMilestone) {
    lastMilestone = m;
    if (m === 100) { S.meow(1.2); rain(['💖', '😻', '✨', '🌈'], 30); } else S.chime();
  }
  paintPurr();
}
function paintPurr() {
  $('#purr-fill').style.width = `${purr}%`;
  $('#purr-msg').textContent = purr >= 100 ? 'MAXIMUM PURR! Sparkle loves you! 😻' : `Purr-O-Meter: ${Math.round(purr)}%`;
  petEl.classList.toggle('happy', purr >= 100);
}
let lx = null, ly = null;
petEl.addEventListener('pointermove', (e) => {
  if (lx !== null) addPurr(Math.min(3, Math.hypot(e.clientX - lx, e.clientY - ly) / 40), e.clientX, e.clientY);
  lx = e.clientX; ly = e.clientY;
});
petEl.addEventListener('pointerleave', () => { lx = ly = null; });
petEl.addEventListener('click', (e) => addPurr(7, e.clientX, e.clientY));
setInterval(() => {
  if (purr > 0 && Date.now() - lastPet > 2500) {
    purr = Math.max(0, purr - 2);
    if (purr < lastMilestone) lastMilestone = Math.floor(purr / 25) * 25;
    paintPurr();
  }
}, 250);

/* -------------------------------------------------------- nav highlight */

const links = new Map($$('.nav a').map((a) => [a.getAttribute('href').slice(1), a]));
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) {
      links.forEach((a) => a.classList.remove('active'));
      links.get(en.target.id)?.classList.add('active');
    }
  }
}, { rootMargin: '-45% 0px -45% 0px' });
$$('section[id]').forEach((s) => io.observe(s));
