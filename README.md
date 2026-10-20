# secily.howell.club

Secily's Kitty Club: a 3D (three.js) kids' website with kitties climbing cat
towers, chasing yarn, bouncing on a trampoline, napping in the nursery and
dancing on stage. The camera glides between play areas as you scroll.

It's a plain static site with no build step. Three.js loads from the jsDelivr CDN.

## Run it locally

ES modules don't load from `file://`, so serve the folder with any static server, e.g.

```
npx serve .
# or
python -m http.server 8000
```

## Where things live

| File | What it does |
| --- | --- |
| `index.html` | All the page text (cat facts, puppy facts, royal rules…) |
| `css/style.css` | Page look |
| `js/ui.js` | Page games: jokes, silly names, princess names, nursery, favorite shows, Purr-O-Meter |
| `js/main.js` | 3D scene: the 9 play areas, which pets live where, camera, clicking |
| `js/creatures.js` | How cats & dogs are built and animated |
| `js/brains.js` | What each pet decides to do next |
| `js/world.js` | Meadow, cat towers, yarn, castle, stage, nursery props… |
| `js/sound.js` | Synthesized meows, woofs, purrs and the dance-party tune |

Each `<section data-zone="N">` in `index.html` lines up with play area `N` in
`main.js`. `data-side="left|right"` puts the card on that side and turns the
camera so the pets show up on the other side.

Handy for testing: `?zone=3` pins the camera to play area 3, and `?peek` starts
with the cards hidden.
