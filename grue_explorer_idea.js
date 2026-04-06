let data;
let vt323;

let currentRoom;
let currentChoices = [];
let flags = {};
let relationship = 0;
let sensorShift = 0;

let lines = [];
let currentLine = "";
let currentCol;
let printQueue = [];
let lastPrint = 0;
let inputBuffer = "";

let graphics = {};
let currentGraphic = null;
let rotationAngle = 0;

const PRINT_DELAY = 18;
const LINE_H = 32;
const MARGIN = 36;
const MAX_LINES = 12;

// ─── LOAD ─────────────────────────────────────────────────────

function preload() {
  vt323 = loadFont("VT323-Regular.ttf", () => {}, () => console.log("Font failed"));
  data = loadJSON("game.json");

  loadGraphic("star_gear_graphic", "graphics/star_gear_graphic.png");
}

function loadGraphic(id, path) {
  graphics[id] = loadImage(path, 
    (img) => { applyDither(img); },
    ()    => { console.log("Image failed to load: " + path); }
  );
}

// ─── SETUP ────────────────────────────────────────────────────

function setup() {
  createCanvas(800, 520);
  textFont(vt323);
  textSize(28);
  enterRoom("corridor");
}

// ─── DRAW ─────────────────────────────────────────────────────

function draw() {
  background(0);

  // tick sensor color shift
  if (flags["sensor_aware"] && sensorShift < 1.0) sensorShift += 0.0005;

  // tick print queue
  if (printQueue.length > 0 && millis() - lastPrint > PRINT_DELAY) {
    let item = printQueue.shift();
    if (item.ch === "\n") {
      lines.push({ text: currentLine, col: currentCol });
      if (lines.length > MAX_LINES) lines.shift();
      currentLine = "";
    } else {
      currentLine += item.ch;
      currentCol = item.col;
    }
    lastPrint = millis();
  }

  // draw completed lines
  for (let i = 0; i < lines.length; i++) {
    let c = lines[i].col;
    fill(c.r, c.g, c.b);
    text(lines[i].text, MARGIN, MARGIN + i * LINE_H);
  }

  // draw currently printing line
  if (currentCol) fill(currentCol.r, currentCol.g, currentCol.b);
  text(currentLine, MARGIN, MARGIN + lines.length * LINE_H);

  drawGraphic(currentGraphic);

  // input bar in decider orange
  fill(255, 140, 0);
  text("> " + inputBuffer, MARGIN, 460);
}

// ─── INPUT ────────────────────────────────────────────────────

function keyPressed() {
  if (key === 'e' || key === 'E') {
    if (printQueue.length > 0 || currentLine !== "") {
      // finish the current line instantly
      while (printQueue.length > 0) {
        let item = printQueue.shift();
        if (item.ch === "\n") {
          lines.push({ text: currentLine, col: currentCol });
          if (lines.length > MAX_LINES) lines.shift();
          currentLine = "";
          break; // stop at the newline, leave the rest in the queue
        } else {
          currentLine += item.ch;
          currentCol = item.col;
        }
      }
      return;
    }
  }
  
  if (printQueue.length > 0 || currentLine !== "") return;

  if (keyCode === ENTER) {
    let cmd = inputBuffer.trim().toLowerCase();
    inputBuffer = "";
    if (cmd === "") return;
    handleCommand(cmd);
  } else if (keyCode === BACKSPACE) {
    inputBuffer = inputBuffer.slice(0, -1);
  } else if (key.length === 1) {
    inputBuffer += key;
  }
}

// ─── COMMANDS ─────────────────────────────────────────────────

function handleCommand(cmd) {
  queueLine(cmd.toUpperCase(), "de");

  // movement
  let dirMap = {
    n: "n", north: "n",
    s: "s", south: "s",
    e: "e", east:  "e",
    w: "w", west:  "w"
  };
  if (dirMap[cmd]) {
    let dir = dirMap[cmd];
    let room = data.rooms[currentRoom];
    if (!room.exits || !room.exits[dir]) {
      queueLine("NO EXIT IN THAT DIRECTION.", "se");
      showChoices(currentChoices);
      return;
    }
    enterRoom(room.exits[dir]);
    return;
  }

  // back
  if (cmd === "back") {
    enterRoom(currentRoom);
    clearGraphic();
    return;
  }

  // match typed command to a visible choice label
  let choiceId = currentChoices.find(id => {
    if (id === "back" || id === "move") return false;
    return data.choices[id].label.toLowerCase() === cmd;
  });

  if (!choiceId) {
    queueLine("UNRECOGNIZED INPUT.", "se");
    showChoices(currentChoices);
    return;
  }

  let choice = data.choices[choiceId];

  if (choice.graphic) currentGraphic = choice.graphic;

  // apply relationship delta
  if (choice.rel_delta) relationship += choice.rel_delta;

  // set flag
  if (choice.sets_flag) flags[choice.sets_flag] = true;

  // trigger sensor color shift
  if (choice.color_override) flags[choice.color_override] = true;

  // process text and get resolved leads_to
  let nextChoices = processText(choice.text, choice.leads_to);

  showChoices(nextChoices);
}

// ─── ROOMS ────────────────────────────────────────────────────

function enterRoom(roomId) {
  currentRoom = roomId;
  let room = data.rooms[roomId];
  processText(room.intro, room.choices);
  showChoices(room.choices);
  clearGraphic();
}

function showChoices(choiceIds) {
  currentChoices = choiceIds.filter(id => {
    if (id === "back" || id === "move") return true;
    let c = data.choices[id];
    if (!c) return false;
    if (c.requires_flag && !flags[c.requires_flag]) return false;
    if (c.requires_rel) {
      if (c.requires_rel.min !== undefined && relationship < c.requires_rel.min) return false;
      if (c.requires_rel.max !== undefined && relationship > c.requires_rel.max) return false;
    }
    return true;
  });

  let labels = currentChoices.map(id => {
    if (id === "back") return "BACK";
    if (id === "move") return "N / S / E / W";
    return data.choices[id].label;
  });

  queueLine("OPTIONS: " + labels.join(",  "), "se");
}

// ─── TEXT PROCESSING ──────────────────────────────────────────

function processText(textArray, leadsTo) {
  let resolvedLeadsTo = leadsTo;

  for (let entry of textArray) {
    if (entry.line !== undefined) {
      if (entry.requires_flag && !flags[entry.requires_flag]) continue;
      queueLine(entry.line, entry.sp);
    } else if (entry.rel_branch) {
      let b = entry.rel_branch;
      let branch = relationship < b.min ? b.below
                 : relationship > b.max ? b.above
                 : b.middle;
      if (branch) {
        queueLine(branch.line, branch.sp);
        if (branch.override_leads_to) resolvedLeadsTo = branch.override_leads_to;
      }
    }
  }

  return resolvedLeadsTo;
}

// ─── HELPERS ──────────────────────────────────────────────────

function getSpeakerColor(sp) {
  if (sp === "se") {
    return {
      r: lerp(data.speakers.se.r, 0,   sensorShift),
      g: lerp(data.speakers.se.g, 200, sensorShift),
      b: lerp(data.speakers.se.b, 200, sensorShift)
    };
  }
  let s = data.speakers[sp];
  return { r: s.r, g: s.g, b: s.b };
}

function queueLine(str, sp) {
  let col = getSpeakerColor(sp || "se");
  for (let ch of str) printQueue.push({ ch: ch, col: col });
  printQueue.push({ ch: "\n", col: col });
}


//---------- GRAPHICS -----------------------

function applyDither(img) {
  img.loadPixels();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let i = (x + y * img.width) * 4;
      let bright = (img.pixels[i] + img.pixels[i+1] + img.pixels[i+2]) / 3;

      // 2x2 bayer ordered dither matrix
      let bayer = [
        [  0, 128 ],
        [ 192,  64 ]
      ];
      let threshold = bayer[y % 2][x % 2];
      let val = bright > threshold ? 255 : 0;

      img.pixels[i]   = 0;                      // R
      img.pixels[i+1] = val;                    // G — keeps green phosphor tint
      img.pixels[i+2] = val > 0 ? 80 : 0;      // B — slight teal for darker areas
      img.pixels[i+3] = val > 0 ? 220 : 0;     // A — black areas go transparent
    }
  }
  img.updatePixels();
}

function drawGraphic(id) {
  if (!id || !graphics[id]) return;

  push();
  translate(630, 200);   // position on right side of screen
  imageMode(CENTER);

  if (id === "facility_map") {
    // static — no rotation, just dithered image
    image(graphics[id], 0, 0, 160, 160);

  } else {
    // faux-3D rotation for logos and objects
    rotationAngle += 0.012;

    let sx = cos(rotationAngle);
    let sy = 1.0 + sin(rotationAngle) * 0.01; // subtle vertical breathe
    scale(sx, sy);

    // scanline flicker — very subtle brightness pulse
    let flicker = 1.0 + sin(millis() * 0.003) * 0.04;
    tint(0, 230 * flicker, 80 * flicker, 220);

    image(graphics[id], 0, 0, 140, 140);
    noTint();
  }

  pop();
}

function clearGraphic() {
  currentGraphic = null;
  rotationAngle = 0;
}

