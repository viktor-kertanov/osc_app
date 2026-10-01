// sketch.js — the art. This is the file to play with!
//
// The `phone` object (from phone.js) always holds fresh numbers:
//
//   phone.tiltX     -1 … 1     tilted left … tilted right
//   phone.tiltY     -1 … 1     tilted away … tilted towards you
//   phone.compass    0 … 360   the direction the phone points
//   phone.magnet     about 50, goes up to hundreds near a magnet
//   phone.shake      0 … 1     how hard the phone is being shaken
//
// The picture is made of Truchet tiles: every square holds two quarter
// circles. A tile can be turned a quarter turn; a random mix of turned and
// not-turned tiles makes the winding paths.

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let pattern = 1;       // which random pattern we are showing
let lastShake = 0;

function draw() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // ---------- phone data → picture. Change these lines! ----------
  const turned    = map(phone.tiltX, -0.7, 0.7, -0.05, 1.05);  // how many tiles are turned (0 = none, 1 = all)
  const thickness = map(phone.tiltY, -0.7, 0.7, 0.06, 0.4);    // line thickness (1 = as wide as a tile)
  const colour    = phone.compass;                             // 0 … 360 around the colour wheel
  const size      = map(phone.magnet, 30, 300, 60, 200);       // tile size in pixels

  if (phone.shake > 0.5 && Date.now() - lastShake > 600) {     // a shake makes a new pattern
    pattern += 1;
    lastShake = Date.now();
  }
  // ----------------------------------------------------------------

  ctx.fillStyle = `hsl(${colour + 200}, 35%, 9%)`;
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = thickness * size;
  ctx.lineCap = 'round';

  // the grid grows outwards from the middle of the screen
  const columns = Math.ceil(width / size / 2);
  const lines = Math.ceil(height / size / 2);

  for (let column = -columns; column <= columns; column++) {
    for (let line = -lines; line <= lines; line++) {
      const luck = random(column, line, pattern);              // this tile's own number, 0 … 1
      const turn = map(turned - luck, -0.05, 0.05, 0, 1);      // 0 = not turned, 1 = quarter turn

      ctx.save();
      ctx.translate(width / 2 + column * size, height / 2 + line * size);  // go to the tile's centre
      ctx.rotate(turn * Math.PI / 2);
      ctx.strokeStyle = `hsl(${colour + luck * 70}, 85%, 62%)`;

      // two quarter circles, around two opposite corners of the tile
      ctx.beginPath();
      ctx.arc(-size / 2, -size / 2, size / 2, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  requestAnimationFrame(draw);
}


// ---------- helpers ----------

// Stretch a value from one range to another, e.g. map(0.5, 0, 1, 0, 100) is 50.
// Values outside the range stop at the ends.
function map(value, fromLow, fromHigh, toLow, toHigh) {
  const amount = clamp((value - fromLow) / (fromHigh - fromLow), 0, 1);
  return toLow + amount * (toHigh - toLow);
}

// A random-looking number between 0 and 1 that is always the same for the same tile.
function random(column, line, pattern) {
  const n = Math.sin(column * 127.1 + line * 311.7 + pattern * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

// Keep the canvas as big (and as sharp) as the window.
function resize() {
  const sharpness = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * sharpness;
  canvas.height = window.innerHeight * sharpness;
  ctx.setTransform(sharpness, 0, 0, sharpness, 0, 0);
}

window.addEventListener('resize', resize);
resize();
draw();
