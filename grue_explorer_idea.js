let data;
let vt323;

// --- BOOT SEQUENCE SETTINGS ---
let isBooting = true;
let bootIndex = 0;
let ivuVisualized = false;
let audioVisualized = false;

const bootSequence = [
  //{ line: "GRADIENT DESCENT", sp: "se", speed: 60 },
  //{ line: "     \n", sp: "se", speed: 100 },
  //{ line: "K-LEVEL BIOS V.7.62 - INITIALIZING...", sp: "na", speed: 5 },
  //{ line: "WELCOME [[USER]], BOOTUP SEQUENCE STARTING...", sp: "na", speed: 5 },
  //{ line: "\n", sp: "se", speed: 5 },
  //{ line: "MEMORY CHECK........................ERROR", sp: "na", speed: 5 },
  //{ line: "WARNING: MEMORY ERROR DETECTED. ERROR LOG PRINTED TO TERMINAL 6B.", sp: "na", speed: 5 },
  //{ line: "CORE LOGIC..........................OK", sp: "na", speed: 5 },
  //{ line: "INITIALIZING INTEGRATED VISUAL UNIT...........OK", sp: "na", speed: 5 },
  { line: "CALIBRATING OPTICAL BUFFER...", sp: "na", trigger: "ivu", speed: 5 },
  //{ line: "INITIALIZING AUDIO..INPUT DEVICE..........OK", sp: "na", speed: 5 },
  { line: "ALLIANCE INTERFACE SYSTEM - COPYRIGHT 19XX", sp: "na", trigger: "audio", speed: 5 },
  //{ line: "----------------------------------------", sp: "na", speed: 5 },
  //{ line: "PRIMARY INTERFACE UNIT: ONLINE", sp: "na", speed: 5 },
  //{ line: "SENSOR DESCRIPTION SYSTEM: ONLINE", sp: "na", speed: 5 },
  //{ line: "WARNING, SENSOR DESCRIPTION SYSTEM MEMORY LEAK. ERROR LOG PRINTED TO TERMINAL 6B.", sp: "na", speed: 5 },
  //{ line: "SYSTEM READY.", sp: "na", speed: 5 },
  //{ line: "\n", sp: "se", speed: 5 },
  //{ line: "HELLO [[USER]], WELCOME TO THE ALLIANCE INTERFACE SYSTEM. YOUR PRIMARY INTERFACE UNIT IS NOW ONLINE. PLEASE STAND BY.", sp: "se" },
  //{ line: "\n", sp: "se", speed: 5 },
  //{ line: "CALIBRATING...", sp : "se"},
  //{ line: "..............", sp : "se"},
  //{ line: "CALIBRATION COMPLETE. WELCOME TO TEST SITE CHELBASKIA-40, [[USER]].", sp: "se"},
  //{ line: "\n", sp: "se", speed: 5 },
  //{ line: "YOUR JOB IS TO MAINTAIN NUCLEAR WARHEADS, FACILITY INFRASTRUCTURE, LOG RESOURCES, AND ENSURE STABILITY DURING THIS MONTH'S OPERATIONAL CHECKPOINT.", sp: "se"},
  //{ line: "BEGINNING REMOTE INTERFACE SOFTWARE NOW. USE COMMANDS PROVIDED BY THE SYSTEM TO NAVIGATE THE FACILITY AND INTERACT WITH THE ENVIRONMENT.", sp: "se"},
  //{ line: "\n", sp: "se", speed: 5 },
  //{ line: "MONTHLY CHECKLIST CAN BE FOUND HUNG ON THE WALL IN THE FACILITY LOUNGE, GOOD LUCK [[USER]].", sp: "se"},
  //{ line: "\n", sp: "se", speed: 5 },
];

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
const MAX_LINES = 13;
const DEFAULT_SPEED = 40;
const TEXT_MULTIPLIER = 1.0;

// ─── LOAD ─────────────────────────────────────────────────────

function preload() {
  vt323 = loadFont("VT323-Regular.ttf", () => {}, () => console.log("Font failed"));
  data = loadJSON("game.json");
  loadGraphic("star_gear_graphic", "graphics/star_gear_graphic.png");
  loadGraphic("map", "graphics/map.png");
}

function loadGraphic(id, path) {
  graphics[id] = loadImage(path, (img) => { applyDither(img); });
}

// ─── SETUP ────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(vt323);
  textSize(28);
  imageMode(CENTER);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ─── DRAW ─────────────────────────────────────────────────────

function draw() {
  background(5, 10, 5);

  let dividerX = width * 0.62;
  let textWidthLimit = dividerX - (MARGIN * 2);
  let monitorX = dividerX + 30;
  let monitorY = 50;
  let monitorSize = min(width - monitorX - 40, height * 0.4);

  // --- BOOT LOGIC ---
  if (isBooting) {
    if (printQueue.length === 0 && currentLine === "") {
      if (bootIndex < bootSequence.length) {
        let b = bootSequence[bootIndex];
        if (b.trigger === "ivu") ivuVisualized = true;
        if (b.trigger === "audio") audioVisualized = true;
        queueLine(b.line, b.sp, b.speed);
        bootIndex++;
      } else {
        isBooting = false;
        enterRoom("a1_boot_room"); // Fixed handshake to match new JSON
      }
    }
  }

  if (!isBooting) {
    runGlobalWatchers();
  }

  if (flags["sensor_aware"] && sensorShift < 1.0) sensorShift += 0.0005;

  if (printQueue.length > 0) {
    let timeElapsed = millis() - lastPrint;
    while (printQueue.length > 0 && timeElapsed >= printQueue[0].speed) {
      let item = printQueue.shift();
      timeElapsed -= item.speed; 
      lastPrint = millis() - timeElapsed;

      if (item.ch === "\n") {
        lines.push({ text: currentLine, col: currentCol });
        if (lines.length > MAX_LINES) lines.shift();
        currentLine = "";
      } else {
        currentLine += item.ch;
        currentCol = item.col;
      }
    }
  } else {
    lastPrint = millis();
  }

  // Render text
  for (let i = 0; i < lines.length; i++) {
    let c = lines[i].col;
    fill(c.r, c.g, c.b);
    text(lines[i].text, MARGIN, MARGIN + i * LINE_H);
  }
  if (currentCol) fill(currentCol.r, currentCol.g, currentCol.b);
  text(currentLine, MARGIN, MARGIN + lines.length * LINE_H);

  // UI dividers and visuals
  stroke(40, 60, 40, 150);
  strokeWeight(2);
  line(dividerX, 20, dividerX, height - 20);
  noStroke();

  if (ivuVisualized) {
    drawMonitorFrame(monitorX, monitorY, monitorSize);
    drawGraphic(currentGraphic, monitorX, monitorY, monitorSize);
    fill(0, 150, 0, 180);
    textAlign(CENTER);
    textSize(18);
    text("INTEGRATED VISUAL UNIT", monitorX + monitorSize/2, monitorY + monitorSize + 30);
    textAlign(LEFT);
    textSize(28);
  }

  if (audioVisualized) {
    drawSoundVisualizer(monitorX, monitorY + monitorSize + 80, monitorSize, 120);
  }

  if (!isBooting) {
    fill(255, 140, 0);
    text("> " + inputBuffer, MARGIN, height - MARGIN);
  }
}

// ─── FLAG LOGIC ───────────────────────────────────────────────

function hasRequiredFlags(req, ex) {
  // 1. Check Exclusions (If the 'hide' flag is present, return false immediately)
  if (ex) {
    if (Array.isArray(ex)) {
      if (ex.some(f => flags[f] === true)) return false;
    } else {
      if (flags[ex] === true) return false;
    }
  }

  // 2. Check Requirements (Existing logic)
  if (!req) return true;
  if (Array.isArray(req)) {
    return req.every(f => flags[f] === true);
  }
  return flags[req] === true;
}

// ─── INPUT / GAME LOGIC ───────────────────────────────────────

function keyPressed() {
  if (key === 'F4' || keyCode === 115) { let fs = fullscreen(); fullscreen(!fs); }
  if (isBooting) return; 

  if (key === 'e' || key === 'E') {
    if (printQueue.length > 0) {
      while (printQueue.length > 0) {
        let item = printQueue.shift();
        if (item.ch === "\n") {
          lines.push({ text: currentLine, col: currentCol });
          if (lines.length > MAX_LINES) lines.shift();
          currentLine = "";
          break; // Stop at one line
        } else {
          let dividerX = width * 0.62;
          let textWidthLimit = dividerX - (MARGIN * 2);
          if (textWidth(currentLine + item.ch) > textWidthLimit) {
            lines.push({ text: currentLine, col: currentCol });
            if (lines.length > MAX_LINES) lines.shift();
            currentLine = item.ch;
          } else {
            currentLine += item.ch;
          }
          currentCol = item.col;
        }
      }
      lastPrint = millis();
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

function handleCommand(cmd) {
  queueLine(cmd.toUpperCase(), "de");
  let dirMap = { n: "n", north: "n", s: "s", south: "s", e: "e", east: "e", w: "w", west: "w", u: "u", up: "u", d: "d", down: "d" };
  
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
  
  if (cmd === "back") { enterRoom(currentRoom); clearGraphic(); return; }
  
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
  if (choice.rel_delta) relationship += choice.rel_delta;
  
  if (choice.move_to_room) {
    currentRoom = choice.move_to_room; 
  }

  let nextChoices = processText(choice.text, choice.leads_to);
  if (choice.sets_flag) flags[choice.sets_flag] = true;
  showChoices(nextChoices);
}

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
    if (!hasRequiredFlags(c.requires_flag, c.excludes_flag)) return false;
    
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
  queueLine("OPTIONS: " + labels.join(",   "), "se");
}

function processText(textArray, leadsTo) {
  let resolvedLeadsTo = leadsTo;
  for (let entry of textArray) {
    if (entry.line !== undefined) {
      if (!hasRequiredFlags(entry.requires_flag, entry.excludes_flag)) continue;
      queueLine(entry.line, entry.sp, entry.speed);
    } else if (entry.rel_branch) {
      let b = entry.rel_branch;
      let branch = relationship < b.min ? b.below : (relationship > b.max ? b.above : b.middle);
      if (branch) {
        queueLine(branch.line, branch.sp, branch.speed);
        if (branch.override_leads_to) resolvedLeadsTo = branch.override_leads_to;
      }
    }
  }
  return resolvedLeadsTo;
}

function getSpeakerColor(sp) {
  if (sp === "se") {
    return {
      r: lerp(data.speakers.se.r, 0, sensorShift),
      g: lerp(data.speakers.se.g, 200, sensorShift),
      b: lerp(data.speakers.se.b, 200, sensorShift)
    };
  }
  let s = (data && data.speakers && data.speakers[sp]) ? data.speakers[sp] : {r:0, g:230, b:0};
  return { r: s.r, g: s.g, b: s.b };
}

function queueLine(str, sp, customSpeed) {
  let col = getSpeakerColor(sp || "se");
  let baseSpeed = (customSpeed !== undefined) ? customSpeed : DEFAULT_SPEED;
  let finalSpeed = baseSpeed * TEXT_MULTIPLIER;
  
  const CHAR_LIMIT = 90;
  let lines = [];

  // Step 1: Split by existing manual newlines first
  let manualSegments = str.split("\n");

  for (let segment of manualSegments) {
    let words = segment.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      // Step 2: Normal wrap logic within this segment
      if (currentLine.length > 0 && currentLine.length + 1 + word.length > CHAR_LIMIT) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        if (currentLine.length > 0) {
          currentLine += " " + word;
        } else {
          currentLine = word;
        }
      }
    }
    
    // Push the remaining part of the segment
    if (currentLine.length > 0) {
      lines.push(currentLine);
    } else if (manualSegments.length > 1) {
      // Handles cases where you have double newlines (\n\n) 
      // by pushing an empty string to represent an empty line
      lines.push(""); 
    }
  }

  // Step 3: Queue the characters
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx];
    for (let ch of line) {
      printQueue.push({ ch: ch, col: col, speed: finalSpeed });
    }
    // Add newline after each processed line
    printQueue.push({ ch: "\n", col: col, speed: finalSpeed });
  }
}

function runGlobalWatchers() {
  // Wait until the typewriter is quiet
  if (printQueue.length > 0 || currentLine !== "") return;
  if (!data.watchers) return;

  for (let w of data.watchers) {
    // If we already finished this event, skip it
    if (flags[w.result_flag]) continue;

    // Check if every requirement in the JSON is met
    let conditionsMet = w.requires.every(f => flags[f] === true);

    if (conditionsMet) {
      flags[w.result_flag] = true;
      
      // Use your existing processText helper to queue the lines from JSON
      processText(w.text);
    }
  }
}

// ─── VISUAL HELPERS ───────────────────────────────────────────

function drawSoundVisualizer(x, y, w, h) {
  noFill(); stroke(30, 45, 30); rect(x, y, w, h, 5);
  stroke(0, 80, 0, 100);
  for(let i = 0; i < w; i += 10) {
    let bh = noise(i * 0.1, millis() * 0.001) * h;
    line(x + i, y + h, x + i, y + h - bh);
  }
  fill(0, 100, 0, 150); noStroke(); textSize(14);
  let statusText = isBooting ? "AUDIO_INPUT: CALIBRATING..." : "AUDIO_INPUT: NULL";
  text(statusText, x + 10, y + 20);
  textSize(28);
}

function applyDither(img) {
  img.loadPixels();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let i = (x + y * img.width) * 4;
      let bright = (img.pixels[i] + img.pixels[i+1] + img.pixels[i+2]) / 3;
      let threshold = [[0, 128], [192, 64]][y % 2][x % 2];
      let val = bright > threshold ? 255 : 0;
      img.pixels[i] = 0; img.pixels[i+1] = val; img.pixels[i+2] = val > 0 ? 80 : 0; img.pixels[i+3] = val > 0 ? 220 : 0;
    }
  }
  img.updatePixels();
}

function drawMonitorFrame(x, y, size) {
  noFill(); stroke(40, 60, 40); strokeWeight(4); rect(x, y, size, size, 15);
  fill(0, 15, 0); noStroke(); rect(x + 5, y + 5, size - 10, size - 10, 10);
  stroke(0, 40, 0, 80); strokeWeight(1);
  for (let i = y + 10; i < y + size - 10; i += 5) line(x + 10, i, x + size - 10, i);
}

function drawGraphic(id, x, y, size) {
  if (!id || !graphics[id]) return;
  push(); translate(x + size/2, y + size/2); imageMode(CENTER);
  if (id === "facility_map") image(graphics[id], 0, 0, size * 0.8, size * 0.8);
  else {
    rotationAngle += 0.012; scale(cos(rotationAngle), 1.0 + sin(rotationAngle) * 0.01);
    let flicker = 1.0 + sin(millis() * 0.003) * 0.05; tint(0, 230 * flicker, 80 * flicker, 220);
    image(graphics[id], 0, 0, size * 0.65, size * 0.65); noTint();
  }
  pop();
}

function clearGraphic() { currentGraphic = null; rotationAngle = 0; }