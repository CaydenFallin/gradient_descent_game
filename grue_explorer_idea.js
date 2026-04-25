let data;
let vt323;

// --- MENU STATE ---
let isMenu = true;
let menuInput = "";
let menuCursorBlink = 0;
let menuScanlineOffset = 0;

// --- BOOT SEQUENCE SETTINGS ---
let isBooting = false;
let bootIndex = 0;
let ivuVisualized = false;
let audioVisualized = false;

const bootSequence = [
  
  { line: "GRADIENT DESCENT", sp: "se", speed: 60 },
  { line: "     \n", sp: "se", speed: 100 },
  { line: "K-LEVEL BIOS V.7.62 - INITIALIZING...", sp: "na", speed: 5 },
  { line: "WELCOME [[USER]], BOOTUP SEQUENCE STARTING...", sp: "na", speed: 5 },
  { line: "\n", sp: "se", speed: 5 },
  { line: "MEMORY CHECK........................ERROR", sp: "na", speed: 5 },
  { line: "WARNING: MEMORY ERROR DETECTED. ERROR LOG PRINTED TO TERMINAL 6B.", sp: "na", speed: 5 },
  { line: "CORE LOGIC..........................OK", sp: "na", speed: 5 },
  { line: "INITIALIZING INTEGRATED VISUAL UNIT...........OK", sp: "na", speed: 5 },
  { line: "CALIBRATING OPTICAL BUFFER...", sp: "na", trigger: "ivu", speed: 5 },
  { line: "INITIALIZING AUDIO..INPUT DEVICE..........OK", sp: "na", speed: 5 },
  { line: "ALLIANCE INTERFACE SYSTEM - COPYRIGHT 19XX", sp: "na", trigger: "audio", speed: 5 },
  { line: "----------------------------------------", sp: "na", speed: 5 },
  { line: "PRIMARY INTERFACE UNIT: ONLINE", sp: "na", speed: 5 },
  { line: "SENSOR DESCRIPTION SYSTEM: ONLINE", sp: "na", speed: 5 },
  { line: "WARNING, SENSOR DESCRIPTION SYSTEM MEMORY LEAK. ERROR LOG PRINTED TO TERMINAL 6B.", sp: "na", speed: 5 },
  { line: "SYSTEM READY.", sp: "na", speed: 5 },
  { line: "\n", sp: "se", speed: 5 },
  { line: "HELLO [[USER]], WELCOME TO THE ALLIANCE INTERFACE SYSTEM. YOUR PRIMARY INTERFACE UNIT IS NOW ONLINE. PLEASE STAND BY.", sp: "se" },
  { line: "\n", sp: "se", speed: 5 },
  { line: "CALIBRATING...", sp : "se"},
  { line: "..............", sp : "se"},
  { line: "CALIBRATION COMPLETE. WELCOME TO TEST SITE CHELBASKIA-40, [[USER]].", sp: "se"},
  { line: "\n", sp: "se", speed: 5 },
  { line: "YOUR JOB IS TO MAINTAIN NUCLEAR WARHEADS, FACILITY INFRASTRUCTURE, LOG RESOURCES, AND ENSURE STABILITY DURING THIS MONTH'S OPERATIONAL CHECKPOINT.", sp: "se"},
  { line: "BEGINNING REMOTE INTERFACE SOFTWARE NOW. USE COMMANDS PROVIDED BY THE SYSTEM TO NAVIGATE THE FACILITY AND INTERACT WITH THE ENVIRONMENT.", sp: "se"},
  { line: "\n", sp: "se", speed: 5 },
  { line: "MONTHLY CHECKLIST CAN BE FOUND HUNG ON THE WALL IN THE FACILITY LOUNGE, GOOD LUCK [[USER]].", sp: "se"},
  { line: "\n", sp: "se", speed: 5 },
];

let currentRoom;
let currentChoices = [];
let flags = {};
let relationship = 0;
let sensorShift = 0;
let pendingEnding = null;

let lines = [];
let currentLine = "";
let currentCol;
let printQueue = [];
let lastPrint = 0;
let inputBuffer = "";
let scrollBuffer = [];
let scrollOffset = 0;
let choiceStartIndex = 0;

let textWidthLimit = 600;

let graphics = {};
let currentGraphic = null;
let currentNoRotate = false;
let rotationAngle = 0;

const PRINT_DELAY = 18;
const LINE_H = 32;
const MARGIN = 36;
const MAX_LINES = 13;
const DEFAULT_SPEED = 40;
const TEXT_MULTIPLIER = 1.0;

const START_ROOM = "a1_boot_room";

// ─── LOAD ─────────────────────────────────────────────────────

function preload() {
  vt323 = loadFont("VT323-Regular.ttf", () => {}, () => console.log("Font failed"));
  data = loadJSON("game.json");
  loadGraphic("star_gear_graphic", "graphics/star_gear_graphic.png");
  loadGraphic("map", "graphics/map.png");
  loadGraphic("clipboard", "graphics/clipboard.png");
  loadGraphic("elevator", "graphics/elevator.png");
  loadGraphic("water", "graphics/water.png");
  loadGraphic("weights", "graphics/weights.png");
  loadGraphic("ice", "graphics/ice.png");
  loadGraphic("admin_terminal", "graphics/admin_terminal.png");
  loadGraphic("warning_terminal", "graphics/warning_terminal.png");
  loadGraphic("tabernacle_terminal", "graphics/tabernacle_terminal.png");
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
  textWidthLimit = (width * 0.62) - (MARGIN * 2);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  textWidthLimit = (width * 0.62) - (MARGIN * 2);
}

// ─── MAIN MENU ────────────────────────────────────────────────

function drawMenu() {
  background(5, 10, 5);

  // Subtle scanline effect
  menuScanlineOffset = (menuScanlineOffset + 0.4) % 6;
  for (let y = menuScanlineOffset; y < height; y += 6) {
    fill(0, 0, 0, 18);
    noStroke();
    rect(0, y, width, 2);
  }

  // Vignette
  for (let r = min(width, height) * 0.95; r > 0; r -= 10) {
    let a = map(r, 0, min(width, height) * 0.95, 55, 0);
    fill(0, 0, 0, a);
    noStroke();
    ellipse(width / 2, height / 2, r * 2, r * 1.6);
  }

  // Corner brackets
  stroke(0, 60, 0, 120);
  strokeWeight(1);
  line(MARGIN, MARGIN, MARGIN + 80, MARGIN);
  line(MARGIN, MARGIN, MARGIN, MARGIN + 80);
  line(width - MARGIN, height - MARGIN, width - MARGIN - 80, height - MARGIN);
  line(width - MARGIN, height - MARGIN, width - MARGIN, height - MARGIN - 80);
  noStroke();

  // ── TITLE (top left) ──
  let titleX = MARGIN + 10;
  let titleY = MARGIN + 20;
  let titleSize = min(width * 0.072, 88);

  textFont(vt323);
  textSize(titleSize);
  textAlign(LEFT, TOP);

  // Glow layers
  drawingContext.shadowBlur = 36;
  drawingContext.shadowColor = "rgba(0,255,80,0.18)";
  fill(0, 180, 60, 55);
  text("GRADIENT", titleX, titleY);
  text("DESCENT", titleX, titleY + titleSize * 1.05);

  drawingContext.shadowBlur = 12;
  drawingContext.shadowColor = "rgba(0,255,80,0.45)";
  fill(0, 220, 80, 130);
  text("GRADIENT", titleX, titleY);
  text("DESCENT", titleX, titleY + titleSize * 1.05);

  drawingContext.shadowBlur = 0;
  fill(0, 255, 90);
  text("GRADIENT", titleX, titleY);
  fill(0, 200, 70);
  text("DESCENT", titleX, titleY + titleSize * 1.05);

  // Rule under title
  let titleBottom = titleY + titleSize * 2.25;
  stroke(0, 100, 35, 160);
  strokeWeight(1);
  line(titleX, titleBottom, titleX + titleSize * 4.4, titleBottom);
  noStroke();

  // Author blurb
  textSize(18);
  fill(0, 130, 45, 190);
  textAlign(LEFT, TOP);
  text("BY [John Fallin]", titleX, titleBottom + 12);

  // ── GRAPHIC UNIT (right side) ──
  let menuMonitorX = width * 0.65;
  let menuMonitorY = height * 0.12;
  let menuMonitorSize = min(width * 0.22, height * 0.38);

  drawMonitorFrame(menuMonitorX, menuMonitorY, menuMonitorSize);
  drawGraphic("star_gear_graphic", menuMonitorX, menuMonitorY, menuMonitorSize, false);
  fill(0, 150, 0, 180);
  textSize(18);
  textAlign(CENTER);
  text("INTEGRATED VISUAL UNIT", menuMonitorX + menuMonitorSize / 2, menuMonitorY + menuMonitorSize + 30);
  textAlign(LEFT, BASELINE);
  textSize(28);

  // ── INPUT PROMPT (center-left, vertically centered) ──
  let optY = height * 0.48;
  let optX = titleX;

  // Blinking cursor
  menuCursorBlink = (menuCursorBlink + 1) % 60;
  let showCursor = menuCursorBlink < 38;

  textSize(24);
  fill(255, 140, 0);
  textAlign(LEFT, TOP);
  text("> " + menuInput + (showCursor ? "_" : " "), optX, optY);

  // Live-highlight matched option
  let typed = menuInput.trim().toLowerCase();
  let startMatch = typed.length > 0 && "start".startsWith(typed);
  let quitMatch  = typed.length > 0 && "quit".startsWith(typed);

  textSize(28);
  let labelY = optY + 50;

  if (startMatch) {
    drawingContext.shadowBlur = 16;
    drawingContext.shadowColor = "rgba(0,255,80,0.65)";
    fill(0, 255, 90);
  } else {
    drawingContext.shadowBlur = 0;
    fill(0, 155, 50);
  }
  textAlign(LEFT, TOP);
  text("[ START ]", optX, labelY);

  let quitX = optX + textWidth("[ START ]") + 52;
  if (quitMatch) {
    drawingContext.shadowBlur = 16;
    drawingContext.shadowColor = "rgba(0,255,80,0.65)";
    fill(0, 255, 90);
  } else {
    drawingContext.shadowBlur = 0;
    fill(0, 155, 50);
  }
  text("[ QUIT ]", quitX, labelY);
  drawingContext.shadowBlur = 0;

  // ── CONTROLS (bottom right) ──
  let controls = [
    "CONTROLS",
    "─────────────────────",
    "TYPE COMMAND + ENTER   SELECT",
    "E                   SKIP LINE",
    "UP / DOWN ARROWS       SCROLL",
    "F4                 FULLSCREEN",
    "INSPECT = I     QUICK INSPECT"
  ];

  textSize(30);
  let ctrlLineH = 22;
  let ctrlBlockH = controls.length * ctrlLineH;
  let ctrlX = width - MARGIN - 10;
  let ctrlY = height - MARGIN - ctrlBlockH;

  textAlign(RIGHT, TOP);
  for (let i = 0; i < controls.length; i++) {
    if (i === 0)      fill(0, 175, 60, 220);
    else if (i === 1) fill(0, 75,  28, 150);
    else              fill(0, 130, 48, 175);
    text(controls[i], ctrlX, ctrlY + i * ctrlLineH);
  }

  // Reset alignment for rest of app
  textAlign(LEFT, BASELINE);
  textSize(28);
}

function handleMenuInput(cmd) {
  if (cmd === "start") {
    isMenu = false;
    isBooting = true;
  } else if (cmd === "quit") {
    window.close();
  } else {
    menuInput = "";
  }
}

// ─── DRAW ─────────────────────────────────────────────────────

function draw() {
  if (isMenu) {
    drawMenu();
    return;
  }

  background(5, 10, 5);

  let dividerX = width * 0.62;
  textWidthLimit = dividerX - (MARGIN * 2);
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
        enterRoom(START_ROOM);
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
        scrollBuffer.push({ text: currentLine, col: currentCol });
        lines = scrollBuffer.slice(-MAX_LINES);
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
  let choiceLines = scrollBuffer.slice(choiceStartIndex);
  let maxScroll = max(0, choiceLines.length - MAX_LINES);
  let clampedOffset = constrain(scrollOffset, 0, maxScroll);

  let visibleLines;
  if (clampedOffset === 0) {
    visibleLines = scrollBuffer.slice(-MAX_LINES);
  } else {
    let visibleStart = choiceStartIndex + maxScroll - clampedOffset;
    visibleLines = scrollBuffer.slice(visibleStart, visibleStart + MAX_LINES);
  }

  for (let i = 0; i < visibleLines.length; i++) {
    let c = visibleLines[i].col;
    fill(c.r, c.g, c.b);
    text(visibleLines[i].text, MARGIN, MARGIN + i * LINE_H);
  }
  if (clampedOffset === 0) {
    if (currentCol) fill(currentCol.r, currentCol.g, currentCol.b);
    text(currentLine, MARGIN, MARGIN + visibleLines.length * LINE_H);
  }

  // UI dividers and visuals
  stroke(40, 60, 40, 150);
  strokeWeight(2);
  line(dividerX, 20, dividerX, height - 20);
  noStroke();

  if (ivuVisualized) {
    drawMonitorFrame(monitorX, monitorY, monitorSize);
    drawGraphic(currentGraphic, monitorX, monitorY, monitorSize, currentNoRotate);
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

  if (audioVisualized) {
    let mapY = monitorY + monitorSize + 80 + 120 + 30;
    let mapH = height - mapY - MARGIN;
    if (mapH > 60) {
      drawLocalMap(monitorX, mapY, monitorSize, mapH);
      fill(0, 150, 0, 180);
      textAlign(CENTER);
      textSize(18);
      text("INTEGRATED LOCAL MAP", monitorX + monitorSize / 2, mapY + mapH + 20);
      textAlign(LEFT);
      textSize(28);
    }
  }

  if (!isBooting) {
    fill(255, 140, 0);
    text("> " + inputBuffer, MARGIN, height - MARGIN);
  }
}

// ─── FLAG LOGIC ───────────────────────────────────────────────

function hasRequiredFlags(req, ex) {
  if (ex) {
    if (Array.isArray(ex)) {
      if (ex.some(f => flags[f] === true)) return false;
    } else {
      if (flags[ex] === true) return false;
    }
  }
  if (!req) return true;
  if (Array.isArray(req)) {
    return req.every(f => flags[f] === true);
  }
  return flags[req] === true;
}

// ─── INPUT / GAME LOGIC ───────────────────────────────────────

function keyPressed() {
  if (key === 'F4' || keyCode === 115) { let fs = fullscreen(); fullscreen(!fs); }

  // ── MENU INPUT ──
  if (isMenu) {
    if (keyCode === ENTER) {
      let cmd = menuInput.trim().toLowerCase();
      menuInput = "";
      if (cmd !== "") handleMenuInput(cmd);
    } else if (keyCode === BACKSPACE) {
      menuInput = menuInput.slice(0, -1);
    } else if (key.length === 1) {
      menuInput += key;
    }
    return;
  }

  if (isBooting) return;

  if (keyCode === UP_ARROW) {
    if (printQueue.length === 0 && currentLine === "") {
      let choiceLines = scrollBuffer.slice(choiceStartIndex);
      scrollOffset = constrain(scrollOffset + 1, 0, max(0, choiceLines.length - MAX_LINES));
    }
    return;
  }
  if (keyCode === DOWN_ARROW) {
    let choiceLines = scrollBuffer.slice(choiceStartIndex);
    scrollOffset = constrain(scrollOffset - 1, 0, max(0, choiceLines.length - MAX_LINES));
    return;
  }

  if (key === 'e' || key === 'E') {
    if (printQueue.length > 0) {
      while (printQueue.length > 0) {
        let item = printQueue.shift();
        if (item.ch === "\n") {
          scrollBuffer.push({ text: currentLine, col: currentCol });
          lines = scrollBuffer.slice(-MAX_LINES);
          currentLine = "";
          break;
        } else {
          currentLine += item.ch;
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
  scrollOffset = 0;
  choiceStartIndex = scrollBuffer.length;

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

  if (cmd === "back") {
    if (currentChoices.includes("back")) { enterRoom(currentRoom); clearGraphic(); }
    else { queueLine("UNRECOGNIZED INPUT.", "se"); showChoices(currentChoices); }
    return;
  }

  let choiceId = currentChoices.find(id => {
    if (id === "back" || id === "move") return false;
    let label = data.choices[id].label.toLowerCase();
    if (cmd === "i" && label === "inspect") return true;
    return label === cmd;
  });

  if (!choiceId) {
    queueLine("UNRECOGNIZED INPUT.", "se");
    showChoices(currentChoices);
    return;
  }

  let choice = data.choices[choiceId];
  if (choice.graphic) {
    currentGraphic = choice.graphic;
    currentNoRotate = choice.no_rotate || false;
  }
  if (choice.rel_delta) relationship += choice.rel_delta;

  if (choice.move_to_room) {
    currentRoom = choice.move_to_room;
  }

  let nextChoices = processText(choice.text, choice.leads_to);
  if (choice.sets_flag) {
    flags[choice.sets_flag] = true;
    if (choice.sets_flag === "c_rebooted" || choice.sets_flag === "c_merged") {
      pendingEnding = choice.sets_flag;
    }
  }
  showChoices(nextChoices);
}

function enterRoom(roomId) {
  scrollOffset = 0;
  choiceStartIndex = scrollBuffer.length;

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

      if (entry.sets_flag) {
        flags[entry.sets_flag] = true;
      }

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

  let wrappedLines = [];
  let manualSegments = str.split("\n");

  for (let segment of manualSegments) {
    let words = segment.split(" ");
    let currentLine = "";

    for (let word of words) {
      let candidate = currentLine.length > 0 ? currentLine + " " + word : word;
      if (currentLine.length > 0 && textWidth(candidate) > textWidthLimit) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    } else if (manualSegments.length > 1) {
      wrappedLines.push("");
    }
  }

  for (let wl of wrappedLines) {
    for (let ch of wl) {
      printQueue.push({ ch: ch, col: col, speed: finalSpeed });
    }
    printQueue.push({ ch: "\n", col: col, speed: finalSpeed });
  }
}

function runGlobalWatchers() {
  if (printQueue.length > 0 || currentLine !== "") return;

  if (pendingEnding) {
    let ending = pendingEnding;
    pendingEnding = null;
    if (ending === "c_rebooted") triggerEndingReboot();
    else if (ending === "c_merged") triggerEndingMerge();
    return;
  }

  if (!data.watchers) return;

  for (let w of data.watchers) {
    if (flags[w.result_flag]) continue;

    let conditionsMet = w.requires.every(f => flags[f] === true);

    if (conditionsMet) {
      flags[w.result_flag] = true;
      let nextChoices = processText(w.text);
      showChoices(nextChoices !== undefined ? nextChoices : ["back"]);
    }
  }
}

// ─── ENDINGS ──────────────────────────────────────────────────

function triggerEndingReboot() {
  lines = [];
  scrollBuffer = [];
  currentLine = "";
  printQueue = [];
  queueLine("ENDING A ACHIEVED", "na");
  // TODO: Play reboot cutscene mp4 here
}

function triggerEndingMerge() {
  lines = [];
  scrollBuffer = [];
  currentLine = "";
  printQueue = [];
  queueLine("ENDING B ACHIEVED", "se");
  // TODO: Play merge cutscene mp4 here
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

function drawLocalMap(x, y, w, h) {
  // Background frame
  noFill(); stroke(30, 45, 30); strokeWeight(1); rect(x, y, w, h, 5); noStroke();

  if (!currentRoom || !data || !data.rooms[currentRoom]) return;

  let room = data.rooms[currentRoom];
  let exits = room.exits || {};

  let cx = x + w / 2;
  let cy = y + h / 2;
  let reach = min(w, h) * 0.29; // distance from center box to adjacent box
  let boxW = w * 0.22;
  let boxH = h * 0.18;

  // Direction vectors
  let dirs = {
    n: { dx: 0,  dy: -1 },
    s: { dx: 0,  dy:  1 },
    e: { dx: 1,  dy:  0 },
    w: { dx: -1, dy:  0 }
  };

  // Arrow head helper
  function drawArrow(x1, y1, x2, y2) {
    stroke(0, 160, 50, 200); strokeWeight(1.5);
    line(x1, y1, x2, y2);
    let angle = atan2(y2 - y1, x2 - x1);
    let hs = 7;
    fill(0, 160, 50, 200); noStroke();
    triangle(
      x2, y2,
      x2 - hs * cos(angle - 0.4), y2 - hs * sin(angle - 0.4),
      x2 - hs * cos(angle + 0.4), y2 - hs * sin(angle + 0.4)
    );
  }

  // Room label helper (first 2 chars of room id)
  function roomLabel(roomId) {
    return roomId.substring(0, 2).toUpperCase();
  }

  // Draw current room box (center)
  fill(0, 40, 15); stroke(0, 180, 60, 200); strokeWeight(1.5);
  rectMode(CENTER);
  rect(cx, cy, boxW, boxH, 3);
  noStroke(); fill(0, 230, 80);
  textSize(13); textAlign(CENTER, CENTER);
  text(roomLabel(currentRoom), cx, cy);

  // Draw each exit
  for (let dir in exits) {
    if (!dirs[dir]) continue;
    let d = dirs[dir];
    let nx = cx + d.dx * reach;
    let ny = cy + d.dy * reach;

    // Arrow from edge of current box to edge of adjacent box
    let fromX = cx + d.dx * (boxW / 2 + 2);
    let fromY = cy + d.dy * (boxH / 2 + 2);
    let toX   = nx - d.dx * (boxW / 2 + 2);
    let toY   = ny - d.dy * (boxH / 2 + 2);
    drawArrow(fromX, fromY, toX, toY);

    // Adjacent room box
    fill(0, 20, 8); stroke(0, 100, 35, 160); strokeWeight(1);
    rect(nx, ny, boxW, boxH, 3);
    noStroke(); fill(0, 160, 55);
    text(roomLabel(exits[dir]), nx, ny);
  }

  rectMode(CORNER);
  textAlign(LEFT, BASELINE);
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

function drawGraphic(id, x, y, size, noRotate) {
  if (!id || !graphics[id]) return;
  let img = graphics[id];

  // Fit image within the box while preserving aspect ratio
  let aspect = img.width / img.height;
  let drawW, drawH;
  if (aspect >= 1) {
    drawW = size * 0.95;
    drawH = drawW / aspect;
  } else {
    drawH = size * 0.95;
    drawW = drawH * aspect;
  }

  push(); translate(x + size/2, y + size/2); imageMode(CENTER);
  let flicker = 1.0 + sin(millis() * 0.003) * 0.05;
  tint(0, 230 * flicker, 80 * flicker, 220);
  if (noRotate) {
    image(img, 0, 0, drawW, drawH);
  } else {
    rotationAngle += 0.012;
    scale(cos(rotationAngle), 1.0 + sin(rotationAngle) * 0.01);
    image(img, 0, 0, drawW, drawH);
  }
  noTint(); pop();
}

function clearGraphic() { currentGraphic = null; currentNoRotate = false; rotationAngle = 0; }