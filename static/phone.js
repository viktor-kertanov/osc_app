// phone.js — gets the phone data.
//
// About 30 times per second it asks app.py "what are the newest OSC messages?"
// and turns them into a few easy numbers inside the `phone` object.
// sketch.js then uses those numbers to draw.

const phone = {
  tiltX: 0,     // -1 … 1     tilted left … tilted right
  tiltY: 0,     // -1 … 1     tilted away … tilted towards you
  compass: 0,   //  0 … 360   the direction the phone points, in degrees
  magnet: 50,   //  about 50 normally, goes up to hundreds near a magnet
  shake: 0,     //  0 … 1     how hard the phone is being shaken
  raw: {},      //  every OSC message exactly as it arrived
};

const target = { tiltX: 0, tiltY: 0, compass: 0, magnet: 50 };  // newest values, before smoothing
let lastAccel = null;


// ---------- 1. ask app.py for the newest messages ----------

async function askForData() {
  try {
    const reply = await (await fetch('data')).json();
    phone.raw = reply.messages;
    translate(reply.messages);
    showStatus(reply);
  } catch (error) {
    document.getElementById('status').textContent = 'app.py is not running.';
  }
  setTimeout(askForData, 33);
}


// ---------- 2. turn raw OSC messages into easy numbers ----------
// Every app names its messages differently. These are the names used by
// GyrOSC (iPhone) and Sensors2OSC (Android). Using another app? Look at the
// "raw OSC messages" list on the page and put its names in here.

function translate(raw) {
  const gyro   = raw['/gyrosc/gyro'];                          // iPhone:  pitch, roll, yaw (radians)
  const gravity = raw['/accelerometer'];                       // Android: x, y, z (9.81 = pull of the earth)
  const compass = raw['/gyrosc/comp'] || raw['/orientation'];  // degrees, 0 = north
  const magnet = raw['/gyrosc/mag'] || raw['/magneticfield'];  // x, y, z
  const accel  = raw['/gyrosc/accel'] || (gravity && gravity.map(v => v / 9.81));

  // tilt
  if (gyro) {
    target.tiltX = clamp(gyro[1] / (Math.PI / 2), -1, 1);
    target.tiltY = clamp(gyro[0] / (Math.PI / 2), -1, 1);
  } else if (gravity) {
    target.tiltX = clamp(-gravity[0] / 9.81, -1, 1);
    target.tiltY = clamp(gravity[1] / 9.81, -1, 1);
  }

  // compass (if the app sends no compass, work it out from yaw or the magnetic field)
  if (compass) target.compass = compass[0];
  else if (gyro) target.compass = -gyro[2] * 180 / Math.PI;
  else if (magnet) target.compass = Math.atan2(-magnet[0], magnet[1]) * 180 / Math.PI;

  // magnet: the strength of the magnetic field, whatever its direction
  if (magnet) target.magnet = Math.hypot(...magnet);

  // shake: how much the movement changed since the last time we looked
  if (accel && lastAccel) {
    const change = Math.hypot(accel[0] - lastAccel[0], accel[1] - lastAccel[1], accel[2] - lastAccel[2]);
    phone.shake = Math.max(phone.shake, clamp(change / 2, 0, 1));
  }
  lastAccel = accel;
}


// ---------- 3. smooth the numbers, so the picture doesn't jitter ----------

function smooth() {
  phone.tiltX += (target.tiltX - phone.tiltX) * 0.15;
  phone.tiltY += (target.tiltY - phone.tiltY) * 0.15;
  phone.magnet += (target.magnet - phone.magnet) * 0.1;
  phone.shake *= 0.93;  // a shake fades out by itself

  // the compass is a circle: going from 359 to 1 is a small step, not a big one
  const step = ((target.compass - phone.compass) % 360 + 540) % 360 - 180;
  phone.compass = (phone.compass + step * 0.15 + 360) % 360;

  showValues();
  requestAnimationFrame(smooth);
}


// ---------- 4. the data panel in the corner ----------

const rows = [
  // name,     lowest, highest, what it does in sketch.js
  ['tiltX',   -1,   1, 'tilt left / right → tiles turn'],
  ['tiltY',   -1,   1, 'tilt away / towards → line thickness'],
  ['compass',  0, 360, 'turn around → colour'],
  ['magnet',   0, 300, 'magnet nearby → bigger tiles'],
  ['shake',    0,   1, 'shake → new pattern'],
];

// one line per number: name, bar, value (hover over a line to read what it does)
document.getElementById('values').innerHTML = rows.map(([name, low, high, does]) => `
  <div class="row" title="${does}">
    <span>${name}</span>
    <div class="track"><div class="fill" id="fill-${name}"></div></div>
    <span class="number" id="number-${name}"></span>
  </div>`).join('');

function showValues() {
  for (const [name, low, high] of rows) {
    const value = Math.abs(phone[name]) < 0.005 ? 0 : phone[name];  // show 0.00, never -0.00
    const percent = clamp((value - low) / (high - low), 0, 1) * 100;
    document.getElementById('fill-' + name).style.width = percent + '%';
    document.getElementById('number-' + name).textContent = value.toFixed(high > 1 ? 0 : 2);
  }
}

function showStatus(reply) {
  const names = Object.keys(reply.messages).sort();
  document.getElementById('raw').textContent = names
    .map(name => name + '  ' + reply.messages[name].map(short).join('  '))
    .join('\n');
  document.getElementById('status').innerHTML = reply.connected ? '' :
    `Waiting for your phone…<br>Send OSC to IP <b>${reply.ip}</b> port <b>${reply.port}</b>`;
}

function short(value) {
  return typeof value === 'number' ? value.toFixed(2) : value;
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

document.addEventListener('keydown', event => {
  const panel = document.getElementById('panel');
  if (event.key.toLowerCase() === 'h') panel.hidden = !panel.hidden;
});

askForData();
smooth();
