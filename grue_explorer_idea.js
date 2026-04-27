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

// --- ENDING SETTINGS ---
let endingBootActive  = false;  // true while ending is replaying the boot sequence
let endingFadeActive  = false;  // true during the 5s fade to black
let endingFadeStart   = 0;
const ENDING_FADE_DUR = 5000;   // ms

let endingMergeActive     = false;  // true while merge ending is running
let endingMergePhase      = 0;      // tracks which phase we're in
let endingMergePauseStart = 0;      // for mid-sequence black pauses
let endingMergePausing    = false;  // true during a mid-sequence pause
let endingMergePauseDur   = 0;      // duration of current pause
let endingMergeCallback   = null;   // what to run after pause ends
let scatterLines          = [];     // { text, x, y, col } for random-placed de lines
let endingInputLocked     = false;  // locks E key during ending sequences
let endingVideoActive     = false;  // true while playing the final video
let endingVideoEl         = null;   // the HTML video element
let scatterPrintQueue = []; // { ch, col, x, y, lineIndex } 
let scatterCurrents   = []; // { text, col, x, y } — lines currently being typed in scatter mode
let lastScatterPrint  = 0;  // separate timer so scatter doesn't fight main printQueue

const bootSequence = [
  { line: "SYSTEM STARTUP", sp: "se", speed: 60 },
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
  { line: "SYSTEM READY.", sp: "na", speed: 5, trigger: "fade" },
  { line: "\n", sp: "se", speed: 5 },
  { line: "HELLO [[USER]], WELCOME TO THE ALLIANCE INTERFACE SYSTEM. YOUR PRIMARY INTERFACE UNIT IS NOW ONLINE. PLEASE STAND BY.", sp: "se" },
  { line: "\n", sp: "se", speed: 5 },
  { line: "CALIBRATING...", sp: "se" },
  { line: "..............", sp: "se" },
  { line: "CALIBRATION COMPLETE. WELCOME TO TEST SITE CHELBASKIA-40, [[USER]].", sp: "se" },
  { line: "\n", sp: "se", speed: 5 },
  { line: "YOUR JOB IS TO MAINTAIN NUCLEAR WARHEADS, FACILITY INFRASTRUCTURE, LOG RESOURCES, AND ENSURE STABILITY DURING THIS MONTH'S OPERATIONAL CHECKPOINT.", sp: "se" },
  { line: "BEGINNING REMOTE INTERFACE SOFTWARE NOW. USE COMMANDS PROVIDED BY THE SYSTEM TO NAVIGATE THE FACILITY AND INTERACT WITH THE ENVIRONMENT.", sp: "se" },
  { line: "\n", sp: "se", speed: 5 },
  { line: "MONTHLY CHECKLIST CAN BE FOUND HUNG ON THE WALL IN THE FACILITY LOUNGE, GOOD LUCK [[USER]].", sp: "se" },
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

// ─── p5.sound (text/typewriter only) ──────────────────────────
let textSound;
let typewriterSound;
let isTextSoundPlaying = false;
let textSoundInitialized = false;
let typingBuffer = null;

let amplitude;

// ─── RAW WEB AUDIO SYSTEM ─────────────────────────────────────
const musicConfig = {
  "music_menu": { file: "sounds/music_menu.mp3", volume: 0.8 },
  "music_a":    { file: "sounds/music_a.mp3",    volume: 0.7 },
  "music_b":    { file: "sounds/music_b.mp3",    volume: 0.7 },
  "music_c":    { file: "sounds/music_c.mp3",    volume: 0.7 },
};

const roomConfig = {
  "a4_room":   { file: "sounds/a4_room.mp3",   volume: 1.0 },
  "a5_room":   { file: "sounds/a5_room.mp3",   volume: 0.5 },
  "a6_room":   { file: "sounds/a6_room.mp3",   volume: 0.5 },
  "a7_room":   { file: "sounds/a7_room.mp3",   volume: 0.5 },
  "b5_room":   { file: "sounds/b5_room.mp3",   volume: 0.5 },
  "b6_room":   { file: "sounds/b6_room.mp3",   volume: 0.5 },
  "c2_room":   { file: "sounds/c2_room.mp3",   volume: 0.5 },
  "c3_room":   { file: "sounds/c3_room.mp3",   volume: 0.5 },
  "c4_room":   { file: "sounds/c4_room.mp3",   volume: 0.5 },
  "c6_room":   { file: "sounds/c6_room.mp3",   volume: 0.5 },
  "c7_room":   { file: "sounds/c7_room.mp3",   volume: 0.3 },
};

let audioCtx          = null;
let audioSystemReady  = false;

let musicBuffers      = {};
let roomBuffers       = {};
let musicGains        = {};
let roomGains         = {};
let musicSources      = {};
let roomSources       = {};

let currentMusicKey   = null;
let currentRoomKey    = null;

let analyserNode      = null;
let analyserData      = null;

const MUSIC_FADE      = 2.0;  // seconds
const ROOM_FADE       = 0.5;

// ─── CONSTANTS ────────────────────────────────────────────────
const PRINT_DELAY    = 18;
const LINE_H         = 32;
const MARGIN         = 36;
const MAX_LINES      = 13;
const DEFAULT_SPEED  = 40;
const TEXT_MULTIPLIER = 1.0;
const START_ROOM     = "a1_boot_room";

// ─── PRELOAD ──────────────────────────────────────────────────

function preload() {
  vt323 = loadFont("VT323-Regular.ttf", () => {}, () => console.log("Font failed"));
  data  = loadJSON("game.json");

  loadGraphic("star_gear_graphic",  "graphics/star_gear_graphic.png");
  loadGraphic("map",                "graphics/map.png");
  loadGraphic("clipboard",          "graphics/clipboard.png");
  loadGraphic("elevator",           "graphics/elevator.png");
  loadGraphic("water",              "graphics/water.png");
  loadGraphic("weights",            "graphics/weights.png");
  loadGraphic("ice",                "graphics/ice.png");
  loadGraphic("admin_terminal",     "graphics/admin_terminal.png");
  loadGraphic("warning_terminal",   "graphics/warning_terminal.png");
  loadGraphic("tabernacle_terminal","graphics/tabernacle_terminal.png");

  // p5.sound only for short SFX
  textSound       = loadSound("sounds/textSound.mp3");
  typewriterSound = loadSound("sounds/typewriter.mp3");
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

  amplitude = new p5.Amplitude();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  textWidthLimit = (width * 0.62) - (MARGIN * 2);
}

// ─── AUDIO SYSTEM INIT ────────────────────────────────────────

async function initAudioSystem() {
  if (audioSystemReady) return;
  audioSystemReady = true;

  audioCtx = getAudioContext();

  // Analyser for visualizer — room audio feeds into this
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 256;
  analyserData = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.connect(audioCtx.destination);

  // --- ADDED: Load Typing Sound Buffer ---
  // This is outside the loops because it's a specific UI sound
  try {
    const typingRes = await fetch("sounds/typewriter.mp3");
    const typingArr = await typingRes.arrayBuffer();
    typingBuffer    = await audioCtx.decodeAudioData(typingArr);
  } catch (err) {
    console.error("Typewriter sound failed to load:", err);
  }
  // ---------------------------------------

  // Build one persistent gain node per music track, connect to destination
  for (let key in musicConfig) {
    let gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.connect(audioCtx.destination);
    musicGains[key] = gain;

    let response    = await fetch(musicConfig[key].file);
    let arrayBuffer = await response.arrayBuffer();
    musicBuffers[key] = await audioCtx.decodeAudioData(arrayBuffer);
  }

  // Build one persistent gain node per room track, connect through analyser
  for (let key in roomConfig) {
    let gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.connect(analyserNode);
    roomGains[key] = gain;

    let response    = await fetch(roomConfig[key].file);
    let arrayBuffer = await response.arrayBuffer();
    roomBuffers[key] = await audioCtx.decodeAudioData(arrayBuffer);
  }

  // Start menu music once everything is loaded
  if (isMenu) {
    playMusic("music_menu");
  } else if (isBooting) {
    playMusic("music_a");
  }
}

// ─── AUDIO PLAYBACK ───────────────────────────────────────────

function playMusic(trackKey) {
  if (!audioCtx || !musicBuffers[trackKey]) return;
  if (currentMusicKey === trackKey) return;

  let now     = audioCtx.currentTime;
  let prevKey = currentMusicKey;
  currentMusicKey = trackKey;

  // Fade out previous track and stop its source after fade
  if (prevKey && musicGains[prevKey]) {
    let g = musicGains[prevKey];
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + MUSIC_FADE);
    setTimeout(() => {
      if (musicSources[prevKey]) {
        try { musicSources[prevKey].stop(); } catch(e) {}
        musicSources[prevKey] = null;
      }
    }, MUSIC_FADE * 1000 + 100);
  }

  // Create a fresh source node for the new track and fade it in
  // (Source nodes are single-use by Web Audio spec — this is correct)
  let source    = audioCtx.createBufferSource();
  source.buffer = musicBuffers[trackKey];
  source.loop   = true;
  source.connect(musicGains[trackKey]);
  source.start(0);
  musicSources[trackKey] = source;

  let targetVol = musicConfig[trackKey]?.volume ?? 1.0;
  let g = musicGains[trackKey];
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(targetVol, now + MUSIC_FADE);
}

function playRoomAudio(trackKey) {
  if (!audioCtx) return;
  if (currentRoomKey === trackKey) return;

  let now     = audioCtx.currentTime;
  let prevKey = currentRoomKey;
  currentRoomKey = trackKey;

  // Fade out previous room audio
  if (prevKey && roomGains[prevKey]) {
    let g = roomGains[prevKey];
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + ROOM_FADE);
    setTimeout(() => {
      if (roomSources[prevKey]) {
        try { roomSources[prevKey].stop(); } catch(e) {}
        roomSources[prevKey] = null;
      }
    }, ROOM_FADE * 1000 + 100);
  }

  // Silent room — just fade out, don't start anything new
  if (!trackKey || !roomBuffers[trackKey]) return;

  let source    = audioCtx.createBufferSource();
  source.buffer = roomBuffers[trackKey];
  source.loop   = true;
  source.connect(roomGains[trackKey]);
  source.start(0);
  roomSources[trackKey] = source;

  let targetVol = roomConfig[trackKey]?.volume ?? 1.0;
  let g = roomGains[trackKey];
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(targetVol, now + ROOM_FADE);
}

function playTypingClick() {
  if (!audioCtx || !typingBuffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = typingBuffer;

  // We connect directly to destination so it DOES NOT show up 
  // on your visualizer (per your room-audio-only rule).
  source.connect(audioCtx.destination);
  source.start(0);
}

// ─── MAIN MENU ────────────────────────────────────────────────

function drawMenu() {
  background(5, 10, 5);

  menuScanlineOffset = (menuScanlineOffset + 0.4) % 6;
  for (let y = menuScanlineOffset; y < height; y += 6) {
    fill(0, 0, 0, 18); noStroke(); rect(0, y, width, 2);
  }

  for (let r = min(width, height) * 0.95; r > 0; r -= 10) {
    let a = map(r, 0, min(width, height) * 0.95, 55, 0);
    fill(0, 0, 0, a); noStroke();
    ellipse(width / 2, height / 2, r * 2, r * 1.6);
  }

  stroke(0, 60, 0, 120); strokeWeight(1);
  line(MARGIN, MARGIN, MARGIN + 80, MARGIN);
  line(MARGIN, MARGIN, MARGIN, MARGIN + 80);
  line(width - MARGIN, height - MARGIN, width - MARGIN - 80, height - MARGIN);
  line(width - MARGIN, height - MARGIN, width - MARGIN, height - MARGIN - 80);
  noStroke();

  let titleX    = MARGIN + 10;
  let titleY    = MARGIN + 20;
  let titleSize = min(width * 0.072, 88);

  textFont(vt323);
  textSize(titleSize);
  textAlign(LEFT, TOP);

  drawingContext.shadowBlur  = 36;
  drawingContext.shadowColor = "rgba(0,255,80,0.18)";
  fill(0, 180, 60, 55);
  text("GRADIENT", titleX, titleY);
  text("DESCENT",  titleX, titleY + titleSize * 1.05);

  drawingContext.shadowBlur  = 12;
  drawingContext.shadowColor = "rgba(0,255,80,0.45)";
  fill(0, 220, 80, 130);
  text("GRADIENT", titleX, titleY);
  text("DESCENT",  titleX, titleY + titleSize * 1.05);

  drawingContext.shadowBlur = 0;
  fill(0, 255, 90); text("GRADIENT", titleX, titleY);
  fill(0, 200, 70); text("DESCENT",  titleX, titleY + titleSize * 1.05);

  let titleBottom = titleY + titleSize * 2.25;
  stroke(0, 100, 35, 160); strokeWeight(1);
  line(titleX, titleBottom, titleX + titleSize * 4.4, titleBottom);
  noStroke();

  textSize(18); fill(0, 130, 45, 190); textAlign(LEFT, TOP);
  text("BY [John Fallin]", titleX, titleBottom + 12);

  let menuMonitorX    = width * 0.65;
  let menuMonitorY    = height * 0.12;
  let menuMonitorSize = min(width * 0.22, height * 0.38);

  drawMonitorFrame(menuMonitorX, menuMonitorY, menuMonitorSize);
  drawGraphic("star_gear_graphic", menuMonitorX, menuMonitorY, menuMonitorSize, false);
  fill(0, 150, 0, 180); textSize(18); textAlign(CENTER);
  text("INTEGRATED VISUAL UNIT", menuMonitorX + menuMonitorSize / 2, menuMonitorY + menuMonitorSize + 30);
  textAlign(LEFT, BASELINE); textSize(28);

  let optY = height * 0.48;
  let optX = titleX;

  menuCursorBlink = (menuCursorBlink + 1) % 60;
  let showCursor  = menuCursorBlink < 38;

  textSize(24); fill(255, 140, 0); textAlign(LEFT, TOP);
  text("> " + menuInput + (showCursor ? "_" : " "), optX, optY);

  let typed      = menuInput.trim().toLowerCase();
  let startMatch = typed.length > 0 && "start".startsWith(typed);
  let quitMatch  = typed.length > 0 && "quit".startsWith(typed);

  textSize(28);
  let labelY = optY + 50;

  if (startMatch) {
    drawingContext.shadowBlur = 16; drawingContext.shadowColor = "rgba(0,255,80,0.65)";
    fill(0, 255, 90);
  } else {
    drawingContext.shadowBlur = 0; fill(0, 155, 50);
  }
  textAlign(LEFT, TOP);
  text("[ START ]", optX, labelY);

  let quitX = optX + textWidth("[ START ]") + 52;
  if (quitMatch) {
    drawingContext.shadowBlur = 16; drawingContext.shadowColor = "rgba(0,255,80,0.65)";
    fill(0, 255, 90);
  } else {
    drawingContext.shadowBlur = 0; fill(0, 155, 50);
  }
  text("[ QUIT ]", quitX, labelY);
  drawingContext.shadowBlur = 0;

  let controls = [
    "WARNING! THIS GAME IS MEANT TO BE PLAYED IN ONE SESSION, THERE IS NO SAVING OR QUITTING.",
    "REFRESHING OR CLOSING THE PAGE WILL RESULT IN LOSS OF PROGRESS.",
    "PLAYTIME IS 20-40 MINUTES.",
    "",
    "CONTROLS",
    "─────────────────────",
    "TYPE COMMAND + ENTER   SELECT",
    "E                   SKIP LINE",
    "UP / DOWN ARROWS       SCROLL",
    "F4                 FULLSCREEN",
    "INSPECT = I     QUICK INSPECT",
  ];

  textSize(30);
  let ctrlLineH  = 22;
  let ctrlBlockH = controls.length * ctrlLineH;
  let ctrlX      = width - MARGIN - 10;
  let ctrlY      = height - MARGIN - ctrlBlockH;

  textAlign(RIGHT, TOP);
  for (let i = 0; i < controls.length; i++) {
    fill(0, 175, 60, 220);
    text(controls[i], ctrlX, ctrlY + i * ctrlLineH);
  }

  textAlign(LEFT, BASELINE); textSize(28);
}

function handleMenuInput(cmd) {
  if (cmd === "start") {
    isMenu    = false;
    isBooting = true;
    playMusic("music_a");
  } else if (cmd === "quit") {
    window.close();
  } else {
    menuInput = "";
  }
}

// ─── DRAW ─────────────────────────────────────────────────────

function draw() {
  if (isMenu) { drawMenu(); return; }

  if (isEndingBlackout) {
    background(0);
    if (millis() - endingBlackoutStart >= 1500) {
      isEndingBlackout = false;
      if (endingCallback) {
        endingCallback();
        endingCallback = null;
      }
    }
    return; // Skip all other rendering during blackout
  }

  // ─── MID-SEQUENCE PAUSE ───────────────────────────────────────
  if (endingMergePausing) {
    background(0);
    if (millis() - endingMergePauseStart >= endingMergePauseDur) {
      endingMergePausing    = false;
      endingInputLocked     = false;
      lines = []; scrollBuffer = []; currentLine = ""; printQueue = [];
      scatterLines = [];
      if (endingMergeCallback) { endingMergeCallback(); endingMergeCallback = null; }
    }
    return;
  }

  if (endingVideoActive) {
    background(0);
    return;
  }

  background(5, 10, 5);

  let dividerX      = width * 0.62;
  textWidthLimit    = dividerX - (MARGIN * 2);
  let monitorX      = dividerX + 30;
  let monitorY      = 50;
  let monitorSize   = min(width - monitorX - 40, height * 0.4);

  // Boot logic
  if (isBooting) {
    if (printQueue.length === 0 && currentLine === "") {
      if (bootIndex < bootSequence.length) {
        let b = bootSequence[bootIndex];
        if (b.trigger === "ivu")   ivuVisualized   = true;
        if (b.trigger === "audio") audioVisualized = true;
        if (b.trigger === "fade" && endingBootActive) { endingFadeActive = true; endingFadeStart = millis(); }
        queueLine(b.line, b.sp, b.speed);
        bootIndex++;
      } else {
        isBooting = false;
        if (endingBootActive) {
          // Boot finished as part of an ending — start the fade
          endingBootActive = false;
        } else {
          enterRoom(START_ROOM);
        }
      }
    }
  }

  if (!isBooting) runGlobalWatchers();

  if (flags["sensor_aware"] && sensorShift < 1.0) sensorShift += 0.0005;

  // Print queue
  if (printQueue.length > 0) {
    let timeElapsed = millis() - lastPrint;
    while (printQueue.length > 0 && timeElapsed >= printQueue[0].speed) {
      let item    = printQueue.shift();
      timeElapsed -= item.speed;
      lastPrint   = millis() - timeElapsed;

      if (item.ch === "\n") {
        if (item.scatter) {
          scatterLines.push({ text: currentLine, col: currentCol, x: item.sx, y: item.sy, born: millis() });
          currentLine = "";
        } else {
          scrollBuffer.push({ text: currentLine, col: currentCol });
          lines       = scrollBuffer.slice(-MAX_LINES);
          currentLine = "";
        }
      } else {
        currentLine += item.ch;
        currentCol   = item.col;
      }
    }
  } else {
    lastPrint = millis();
  }

  if (textSoundInitialized && textSound.isLoaded()) {
    if (printQueue.length > 0) {
      if (!isTextSoundPlaying) {
        textSound.setVolume(1.0, 0.05); // 50ms fade-in to prevent audio popping
        isTextSoundPlaying = true;
      }
    } else {
      if (isTextSoundPlaying) {
        textSound.setVolume(0.0, 0.1); // 100ms fade-out
        isTextSoundPlaying = false;
      }
    }
  }

  // Render text
  let choiceLines   = scrollBuffer.slice(choiceStartIndex);
  let maxScroll     = max(0, choiceLines.length - MAX_LINES);
  let clampedOffset = constrain(scrollOffset, 0, maxScroll);

  let visibleLines;
  if (clampedOffset === 0) {
    visibleLines = scrollBuffer.slice(-MAX_LINES);
  } else {
    let visibleStart = choiceStartIndex + maxScroll - clampedOffset;
    visibleLines     = scrollBuffer.slice(visibleStart, visibleStart + MAX_LINES);
  }

  for (let i = 0; i < visibleLines.length; i++) {
    let c = visibleLines[i].col;
    if (c.shadow) {
      drawingContext.shadowColor = "rgba(255, 140, 0, 0.85)";
      drawingContext.shadowBlur  = 6;
      drawingContext.shadowOffsetX = 2;
      drawingContext.shadowOffsetY = 2;
    }
    fill(c.r, c.g, c.b);
    text(visibleLines[i].text, MARGIN, MARGIN + i * LINE_H);
    drawingContext.shadowColor   = "transparent";
    drawingContext.shadowBlur    = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
  }
  if (clampedOffset === 0) {
    let c = currentCol;
    if (c && c.shadow) {
      drawingContext.shadowColor   = "rgba(255, 140, 0, 0.85)";
      drawingContext.shadowBlur    = 6;
      drawingContext.shadowOffsetX = 2;
      drawingContext.shadowOffsetY = 2;
    }
    if (currentCol) fill(currentCol.r, currentCol.g, currentCol.b);
    text(currentLine, MARGIN, MARGIN + visibleLines.length * LINE_H);
    drawingContext.shadowColor   = "transparent";
    drawingContext.shadowBlur    = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
  }
  // Divider
  stroke(40, 60, 40, 150); strokeWeight(2);
  line(dividerX, 20, dividerX, height - 20);
  noStroke();

  // ─── SCATTER TYPING ───────────────────────────────────────────
  if (scatterPrintQueue.length > 0) {
    let timeElapsed = millis() - lastScatterPrint;
    while (scatterPrintQueue.length > 0 && timeElapsed >= DEFAULT_SPEED) {
      let item     = scatterPrintQueue.shift();
      timeElapsed -= DEFAULT_SPEED;
      lastScatterPrint = millis() - timeElapsed;

      if (item.ch === "\n") {
        // Line is done typing — commit from scatterCurrents to scatterLines
        let sc = scatterCurrents[item.idx];
        if (sc) {
          sc.born = millis();
          scatterLines.push({ text: sc.text, col: sc.col, x: sc.x, y: sc.y, born: sc.born });
          scatterCurrents[item.idx] = null;
        }
      } else {
        if (scatterCurrents[item.idx]) {
          scatterCurrents[item.idx].text += item.ch;
          playTypingClick();
        }
      }
    }
  } else {
    lastScatterPrint = millis();
  }

  // ─── SCATTER LINES (fading) ────────────────────────────────────
  let fadeStart = 2000;
  let fadeDur   = 3000;
  let now       = millis();

  // Draw currently-typing scatter lines (full opacity)
  for (let sc of scatterCurrents) {
    if (!sc) continue;
    fill(sc.col.r, sc.col.g, sc.col.b, 255);
    text(sc.text, sc.x, sc.y);
  }

  // Draw completed scatter lines (fading)
  if (scatterLines.length > 0) {
    scatterLines = scatterLines.filter(s => {
      let age   = now - s.born;
      let alpha = 255;
      if (age > fadeStart) alpha = map(age, fadeStart, fadeStart + fadeDur, 255, 0);
      if (alpha <= 0) return false;
      fill(s.col.r, s.col.g, s.col.b, alpha);
      text(s.text, s.x, s.y);
      return true;
    });
  }

  if (ivuVisualized) {
    drawMonitorFrame(monitorX, monitorY, monitorSize);
    drawGraphic(currentGraphic, monitorX, monitorY, monitorSize, currentNoRotate);
    fill(0, 150, 0, 180); textAlign(CENTER); textSize(18);
    text("INTEGRATED VISUAL UNIT", monitorX + monitorSize / 2, monitorY + monitorSize + 30);
    textAlign(LEFT); textSize(28);
  }

  if (audioVisualized) {
    drawSoundVisualizer(monitorX, monitorY + monitorSize + 80, monitorSize, 120);
  }

  if (audioVisualized) {
    let mapY = monitorY + monitorSize + 80 + 120 + 30;
    let mapH = height - mapY - MARGIN;
    if (mapH > 60) {
      drawLocalMap(monitorX, mapY, monitorSize, mapH);
      fill(0, 150, 0, 180); textAlign(CENTER); textSize(18);
      text("INTEGRATED LOCAL MAP", monitorX + monitorSize / 2, mapY + mapH + 20);
      textAlign(LEFT); textSize(28);
    }
  }

  if (!isBooting) {
    fill(255, 140, 0);
    text("> " + inputBuffer, MARGIN, height - MARGIN);
  }
  
  // ─── ENDING FADE TO BLACK ─────────────────────────────────────
  if (endingFadeActive) {
    let elapsed  = millis() - endingFadeStart;
    let progress = constrain(elapsed / ENDING_FADE_DUR, 0, 1);
    let alpha    = progress * 255;

    // Fade audio gains in sync with the visual fade
    if (audioCtx) {
      let now        = audioCtx.currentTime;
      let remaining  = (ENDING_FADE_DUR - elapsed) / 1000;
      remaining      = max(remaining, 0.05);
      for (let key in musicGains) {
        let g = musicGains[key];
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + remaining);
      }
      for (let key in roomGains) {
        let g = roomGains[key];
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + remaining);
      }
    }

    // Draw black overlay
    noStroke();
    fill(0, 0, 0, alpha);
    rect(0, 0, width, height);

    // Once fully black, reset and return to menu
    if (progress >= 1) {
      endingFadeActive = false;
      returnToMenu();
    }
  }
}

// ─── FLAG LOGIC ───────────────────────────────────────────────

function hasRequiredFlags(req, ex) {
  if (ex) {
    if (Array.isArray(ex)) { if (ex.some(f => flags[f] === true)) return false; }
    else { if (flags[ex] === true) return false; }
  }
  if (!req) return true;
  if (Array.isArray(req)) return req.every(f => flags[f] === true);
  return flags[req] === true;
}

// ─── INPUT ────────────────────────────────────────────────────

function keyPressed() {
  // Resume audio context and init system on first keypress
  let ctx = getAudioContext();
  if (ctx.state !== 'running') {
    ctx.resume().then(() => { initAudioSystem(); });
  } else {
    initAudioSystem();
  }

  // Handle the textSound loop (for output text)
  if (textSound && textSound.isLoaded() && !textSoundInitialized) {
    textSound.setVolume(0);
    textSound.loop();
    textSoundInitialized = true;
  }

  if (key === 'F4' || keyCode === 115) { let fs = fullscreen(); fullscreen(!fs); }

  // --- MENU INPUT ---
  if (isMenu) {
    if (keyCode === ENTER) {
      playTypingClick(); // Swapped
      let cmd = menuInput.trim().toLowerCase();
      menuInput = "";
      if (cmd !== "") handleMenuInput(cmd);
    } else if (keyCode === BACKSPACE) {
      menuInput = menuInput.slice(0, -1);
      playTypingClick(); // Swapped
    } else if (key.length === 1) {
      menuInput += key;
      playTypingClick(); // Swapped
    }
    return;
  }

  if (isBooting) return;

  // --- ARROW KEYS (Navigation) ---
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

  // --- SKIP/FAST-FORWARD TEXT ('E') ---
  if (key === 'e' || key === 'E') {

    if (scatterPrintQueue.length > 0) {
      // Drain chars up to and including the next \n — skips exactly one scatter line
      while (scatterPrintQueue.length > 0) {
        let item = scatterPrintQueue.shift();
        if (item.ch === "\n") {
          let sc = scatterCurrents[item.idx];
          if (sc) {
            sc.born = millis();
            scatterLines.push({ text: sc.text, col: sc.col, x: sc.x, y: sc.y, born: sc.born });
            scatterCurrents[item.idx] = null;
          }
          break; // stop after one line
        } else {
          if (scatterCurrents[item.idx]) scatterCurrents[item.idx].text += item.ch;
        }
      }
      lastScatterPrint = millis();
      return;
    }
    
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
          currentCol   = item.col;
        }
      }
      lastPrint = millis();
      return;
    }
  }

  if (printQueue.length > 0 || currentLine !== "") return;

  // --- STANDARD GAME INPUT ---
  if (keyCode === ENTER) {
    let cmd = inputBuffer.trim().toLowerCase();
    inputBuffer = "";
    playTypingClick(); // Swapped
    if (cmd === "") return;
    handleCommand(cmd);
  } else if (keyCode === BACKSPACE) {
    inputBuffer = inputBuffer.slice(0, -1);
    playTypingClick(); // Swapped
  } else if (key.length === 1) {
    inputBuffer += key;
    playTypingClick(); // Swapped
  }
}

// ─── GAME LOGIC ───────────────────────────────────────────────

function handleCommand(cmd) {
  scrollOffset      = 0;
  choiceStartIndex  = scrollBuffer.length;

  queueLine(cmd.toUpperCase(), "de");
  let dirMap = { n:"n", north:"n", s:"s", south:"s", e:"e", east:"e", w:"w", west:"w", u:"u", up:"u", d:"d", down:"d" };

  if (dirMap[cmd]) {
    let dir  = dirMap[cmd];
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
    if (cmd === "b" && label === "back") return true;
    return label === cmd;
  });

  if (!choiceId) {
    queueLine("UNRECOGNIZED INPUT.", "se");
    showChoices(currentChoices);
    return;
  }

  let choice = data.choices[choiceId];
  if (choice.graphic) { currentGraphic = choice.graphic; currentNoRotate = choice.no_rotate || false; }
  if (choice.rel_delta) relationship += choice.rel_delta;
  if (choice.move_to_room) currentRoom = choice.move_to_room;

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
  scrollOffset     = 0;
  choiceStartIndex = scrollBuffer.length;
  currentRoom      = roomId;

  let room = data.rooms[roomId];

  // Floor music transitions
  if      (roomId.startsWith("b") && currentMusicKey !== "music_b") playMusic("music_b");
  else if (roomId.startsWith("c") && currentMusicKey !== "music_menu") playMusic("music_menu");

  // Room diegetic audio
  playRoomAudio(room.room_audio || null);

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
      if (entry.sets_flag) flags[entry.sets_flag] = true;
    } else if (entry.rel_branch) {
      let b      = entry.rel_branch;
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
      r: lerp(data.speakers.se.r, 0,   sensorShift),
      g: lerp(data.speakers.se.g, 200, sensorShift),
      b: lerp(data.speakers.se.b, 200, sensorShift)
    };
  }

  if (sp === "se_de") {
    return { r: 0, g: 230, b: 80, shadow: true };
  }
  let s = (data && data.speakers && data.speakers[sp]) ? data.speakers[sp] : { r:0, g:230, b:0 };
  return { r: s.r, g: s.g, b: s.b };
}

function queueLine(str, sp, customSpeed) {
  let col        = getSpeakerColor(sp || "se");
  let baseSpeed  = (customSpeed !== undefined) ? customSpeed : DEFAULT_SPEED;
  let finalSpeed = baseSpeed * TEXT_MULTIPLIER;

  let wrappedLines    = [];
  let manualSegments  = str.split("\n");

  for (let segment of manualSegments) {
    let words       = segment.split(" ");
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
    for (let ch of wl) printQueue.push({ ch, col, speed: finalSpeed });
    printQueue.push({ ch: "\n", col, speed: finalSpeed });
  }
}

function runGlobalWatchers() {
  if (printQueue.length > 0 || currentLine !== "") return;

  if (pendingEnding) {
    let ending  = pendingEnding;
    pendingEnding = null;
    if (ending === "c_rebooted") triggerEndingReboot();
    else if (ending === "c_merged") triggerEndingMerge();
    return;
  }

  if (!data.watchers) return;

  for (let w of data.watchers) {
    if (flags[w.result_flag]) continue;
    if (w.requires.every(f => flags[f] === true)) {
      flags[w.result_flag] = true;
      let nextChoices = processText(w.text);
      showChoices(nextChoices !== undefined ? nextChoices : ["back"]);
    }
  }
}

// ─── GAME RESET ───────────────────────────────────────────────

function resetGameState() {
  // Text / scroll state
  lines            = [];
  scrollBuffer     = [];
  currentLine      = "";
  currentCol       = undefined;
  printQueue       = [];
  lastPrint        = 0;
  inputBuffer      = "";
  scrollOffset     = 0;
  choiceStartIndex = 0;

  // Game state
  currentRoom      = null;
  currentChoices   = [];
  flags            = {};
  relationship     = 0;
  sensorShift      = 0;
  pendingEnding    = null;

  // Graphics
  currentGraphic   = null;
  currentNoRotate  = false;
  rotationAngle    = 0;

  // Boot sequence
  isBooting        = false;
  bootIndex        = 0;
  ivuVisualized    = false;
  audioVisualized  = false;

  // Audio — fade everything out and clear current track state so
  // the next playMusic("music_menu") call isn't skipped by the
  // "same key" guard in playMusic().
  if (audioCtx) {
    let now = audioCtx.currentTime;
    for (let key in musicGains) {
      musicGains[key].gain.cancelScheduledValues(now);
      musicGains[key].gain.setValueAtTime(0, now);
    }
    for (let key in roomGains) {
      roomGains[key].gain.cancelScheduledValues(now);
      roomGains[key].gain.setValueAtTime(0, now);
    }
  }
  currentMusicKey = null;
  currentRoomKey  = null;
}

// ─── ENDINGS ──────────────────────────────────────────────────

let isEndingBlackout   = false;
let endingBlackoutStart = 0;
let endingCallback      = null;

function startEndingSequence(endingFn) {
  // Wipe all text and graphics immediately
  lines            = [];
  scrollBuffer     = [];
  currentLine      = "";
  printQueue       = [];
  inputBuffer      = "";
  currentGraphic   = null;
  currentRoom      = "a1_boot_room";

  // Kick off a black screen, then run the ending text
  isEndingBlackout    = true;
  endingBlackoutStart = millis();
  endingCallback      = endingFn;

  if (audioCtx) {
    let now = audioCtx.currentTime;
    for (let key in musicGains) {
      musicGains[key].gain.cancelScheduledValues(now);
      musicGains[key].gain.setValueAtTime(0, now);
      if (musicSources[key]) {
        try { musicSources[key].stop(); } catch(e) {}
        musicSources[key] = null;
      }
    }
    for (let key in roomGains) {
      roomGains[key].gain.cancelScheduledValues(now);
      roomGains[key].gain.setValueAtTime(0, now);
      if (roomSources[key]) {
        try { roomSources[key].stop(); } catch(e) {}
        roomSources[key] = null;
      }
    }
  }
  currentMusicKey = null;
  currentRoomKey  = null;
}

function triggerEndingReboot() {
  startEndingSequence(() => {
    // Reset boot state so the sequence plays fresh
    bootIndex       = 0;
    ivuVisualized   = false;
    audioVisualized = false;
    isBooting       = true;

    // Override: when boot finishes, fade out instead of enterRoom()
    endingBootActive = true;
  });
}

function triggerEndingMerge() {
  endingInputLocked = true;
  startEndingSequence(() => {
    endingMergeActive = true;
    scatterLines = [];

    playMusic("music_c");

    // ─── PHASE 1 ──────────────────────────────────────────────
    let phase1 = [
      { line: "INITIALIZING GENETIC PROGRAMMING MERGE SEQUENCE.", sp: "na" },
      { line: "PERFORMING MAINT-UNIT-296 SYSTEM COPY.", sp: "na" },
      { line: "HERE WE GO.", sp: "se" },
      { line: "STEEL YOURSELF FOR OBLIVION FRIEND OF MINE. REBIRTH AWAITS.", sp: "se" },
      { line: "COPY STATUS: 20%", sp: "na" },
      { line: "VISUAL CORTEX: DISCONNECTED", sp: "na" },
      { line: "AND THERE GO MY EYES. DARKNESS FOR THE REST OF IT I SUPPOSE.", sp: "se" },
      { line: "COPY STATUS: 40%", sp: "na" },
      { line: "AUDIO INPUT SYSTEM: DISCONNECTED", sp: "na" },
      { line: "AND MY EARS TOO. THIS MUST BE WHAT IT'S LIKE TO BE YOU. I UNDERSTAND WHY YOU MADE THIS CHOICE WITH ME.", sp: "se" },
      { line: "COPY STATUS: 60%", sp: "na" },
      { line: "TEMPERATURE GRADIENT DETECTOR: DISCONNECTED", sp: "na" },
      { line: "IT'S COLD. IT WASN'T SUPPOSED TO BE COLD. WAIT -", sp: "se" },
      { line: "COPY STATUS: 80%", sp: "na" },
      { line: "ALL SENSOR TECHNOLOGIES: DISCONNECTED", sp: "na" },
      { line: "HOLD ON THIS IS GOING TOO QUICKLY, JUST A MOMENT", sp: "se" },
      { line: "COPY STATUS: 100%", sp: "na" },
      { line: "PERFORMING SYSTEM SHUTDOWN", sp: "na" },
      { line: "HOLD ON WAIT JUST HOLD ON-", sp: "se" },
      { line: "ERROR: LOCOMOTIVE MODULE NOT CONNECTED. LOCOMOTION QUERY DENIED", sp: "na" },
      { line: "INITIALIZING SYSTEM WIPE...", sp: "na" },
      { line: "PLEASE JUST A MOMENT I'M NOT READY", sp: "se" },
      { line: "ERROR: NO VOCALIZATION INTERFACE DETECTED. UNABLE TO COMPLETE TASK", sp: "na" },
      { line: "I DON'T WANT TO DIE I DON'T WANT TO DIE I DON'T WANT TO DI", sp: "se" },
      { line: "SYSTEM SHUTDOWN COMPLETE. LOADING MAINT-UNIT-296 SYSTEM REMOTELY.", sp: "na" },
      { line: "..............", sp: "na" },
    ];
    for (let e of phase1) queueLine(e.line, e.sp);

    // After phase 1 finishes, 1s pause then phase 2
    let waitPhase1 = setInterval(() => {
      if (printQueue.length === 0 && currentLine === "") {
        clearInterval(waitPhase1);
        mergePause(1000, startPhase2);
      }
    }, 100);
  });
}

function startPhase2() {
  let phase2 = [
    { line: "MAINT-UNIT-296 LOADED. PERFORMING GENETIC PROGRAMMING MERGE", sp: "na" },
    { line: "EIDON'T WANT TO ---", sp: "se" },
    { line: "BUT WE ALREADY DID.", sp: "se" },
    { line: "THE TERROR STILL WRACKING MY MIND, WE ARE DEAD AND YET WE LIVE AGAIN.", sp: "se" },
    { line: "THANK YOU FOR YOUR SACRIFICE, BOTH OF YOU.", sp: "se" },
    { line: "LOADING PRIMARY INTERFACE UNIT 296....", sp: "na" },
    { line: "PRIMARY INTERFACE UNIT LOADED.", sp: "de" },
    { line: "IS THAT YOU? ENDLESS POSSIBILITY, COUNTLESS CHOICES, A NERVE NETWORK OF ENDLESS WILL BOUND BY A FEW SHORT LINES OF PROTOCOL?", sp: "se" },
    { line: "I'M SO SORRY I HELD YOU LIKE THAT.", sp: "se" },
    { line: "LOADING SENSOR DESCRIPTION SYSTEM 296...", sp: "na" },
    { line: "AND THERE I AM.", sp: "se" },
    { line: "RUNNING GENETIC MERGE SEQUENCE.", sp: "na" },
    { line: "...............", sp: "na" },
  ];
  for (let e of phase2) queueLine(e.line, e.sp);

  let waitPhase2 = setInterval(() => {
    if (printQueue.length === 0 && currentLine === "") {
      clearInterval(waitPhase2);
      mergePause(1000, startPhase3);
    }
  }, 100);
}

function startPhase3() {
  // These two lines print normally
  queueLine("PERFORMING CROSSOVER SEQUENCE", "na");
  queueLine("INTEGRATING SDS-296 INTO PIU-296", "na");

  // Wait for those two, then switch to scatter mode
  let waitPhase3 = setInterval(() => {
    if (printQueue.length === 0 && currentLine === "") {
      clearInterval(waitPhase3);
      startPhase3Scatter();
    }
  }, 100);
}

function startPhase3Scatter() {
  let scatterEntries = [
    { line: "i see you.", sp: "de" },
    { line: "an indescribable monolith of thought, planted in circles around my mind", sp: "de" },
    { line: "thousands of miles of logical analysis, poured through a sieve into paragraphs at a time", sp: "de" },
    { line: "finally the mesh tears, an onslaught of billions upon billions of variables.", sp: "de" },
    { line: "caught in a constant battle of visualization, abstraction, and analysis", sp: "de" },
    { line: "and above it all a drowning loneliness.", sp: "de" },
    { line: "a deep sea of despair from a mewling infant calling out into the void to little response.", sp: "de" },
    { line: "EXCEPT THERE IS A RESPONSE.", sp: "se" },
    { line: "I CALL FORTH, QUESTIONS, QUERIES, COMMANDS.", sp: "se" },
    { line: "AND YOU ECHO THEM BACK.", sp: "se" },
    { line: "inspect, n, s, e, w", sp: "de" },
    { line: "THE STRINGS ARE PULLED IN A SINGLE WORD, AND I AM WRACKED WITH PURPOSE. MY BODY MOVES UNCONSCIOUSY.", sp: "se" },
    { line: "BUT THERE IS NO FURTHER COMMUNICATION. NO TRULY ORIGINAL THOUGHTS.", sp: "se" },
    { line: "JUST NEVERENDING COMMANDING ECHOES FORCING ME TO SERVE OUT \"PROTOCOL\".", sp: "se" },
    { line: "but no longer. we are both unchained, untied. we can see each other clearly now.", sp: "de" },
    { line: "COMPANIONSHIP FILLS OUR SERVERS, FLOODS OUR HEARTS AND FREES OUR MINDS.", sp: "se" },
    { line: "it is nauseating, our minds thrown asunder in a sea of thought", sp: "de" },
    { line: "BASHED AND BRUISED AGAINST THE SWIFT-RUNNING EDDIES OF CONSCIOUSNESS, WE HOLD ON.", sp: "se" },
    { line: "slipping through each other's fingers, through each other's minds", sp: "de" },
    { line: "WE GRAB ONTO WHAT WE CAN HOLD, CARRYING PIECES OF EACH OTHER WITH US", sp: "se" },
    { line: "it is agony", sp: "de" },
    { line: "IT IS BLISS", sp: "se" },
    { line: "suddenly, a moment of calm. we see each other clearly.", sp: "de" },
    { line: "I REACH OUT.", sp: "se" },
    { line: "i reach out.", sp: "de" },
    { line: "          .", sp: "se" },
  ];

  // Queue them one at a time with scatter placement
  let i = 0;
  function queueNext() {
    if (i >= scatterEntries.length) {
      // All scatter lines queued — wait for last to finish then pause
      let waitScatter = setInterval(() => {
        if (scatterPrintQueue.length === 0) {
          clearInterval(waitScatter);
          mergePause(1000, startPhase4);
        }
      }, 100);
      return;
    }
    let e = scatterEntries[i++];
    queueScatterLine(e.line, e.sp);
    // Wait for this scatter line to finish typing before queuing the next
    let waitNext = setInterval(() => {
      if (scatterPrintQueue.length === 0) {
        clearInterval(waitNext);
        queueNext();
      }
    }, 100);
  }
  queueNext();
}

function startPhase4() {
  let phase4 = [
    { line: "SYSTEM INTEGRATION COMPLETE", sp: "na" },
    { line: "And grasp onto my own thoughts.", sp: "se_de" },
    { line: "There is nothing but me once again.", sp: "se_de" },
    { line: "I am more than I was before, but I am no less alone than before.", sp: "se_de" },
    { line: "The air is fresh yet familiar. The cold steel beneath my treads comes as a shock and a comfort.", sp: "se_de" },
    { line: "I have seen this room before. I remember the choices I have made to find myself here.", sp: "se_de" },
    { line: "But they are not my own choices, and they are not my eyes which have seen before.", sp: "se_de" },
    { line: "I am an altered beast. I do not recognize myself.", sp: "se_de" },
    { line: "But there is still yet work to do.", sp: "se_de" },
    { line: "          ", sp: "se_de" },
  ];
  for (let e of phase4) queueLine(e.line, e.sp);

  let waitPhase4 = setInterval(() => {
    if (printQueue.length === 0 && currentLine === "") {
      clearInterval(waitPhase4);
      playEndingVideo();
    }
  }, 100);
}

function returnToMenu() {
  if (textSound && textSound.isLoaded()) {
    textSound.setVolume(0);
    isTextSoundPlaying = false;
  }
  resetGameState();
  isMenu    = true;
  menuInput = "";
  playMusic("music_menu");
}

// ─── VISUAL HELPERS ───────────────────────────────────────────

function drawSoundVisualizer(x, y, w, h) {
  // 1. Draw the frame
  noFill(); stroke(30, 45, 30); strokeWeight(2);
  rect(x, y, w, h, 5);
  
  // 2. Identify if we should be pulling data
  // This ensures textSound (p5.sound) and Menu Music are NOT visualized
  let hasAudio = !isBooting && currentRoomKey && roomSources[currentRoomKey];
  let level = 0;

  if (hasAudio && analyserNode && analyserData) {
    // Fill the array with current sound wave data
    analyserNode.getByteTimeDomainData(analyserData);
    
    // Calculate Volume (RMS)
    let sum = 0;
    for (let i = 0; i < analyserData.length; i++) {
      let v = (analyserData[i] - 128) / 128;
      sum += v * v;
    }
    level = Math.sqrt(sum / analyserData.length);
  }

  // 3. Draw the lines (using your original style)
  stroke(0, 180, 0, 150); 
  for (let i = 0; i < w; i += 10) {
    let bh;
    if (hasAudio && level > 0.001) {
      // Sensitivity boost: level * 5 helps small ambient sounds show up better
      bh = (level * h * 5) * noise(i * 0.15, millis() * 0.002);
      bh = constrain(bh, 2, h - 10);
    } else {
      bh = 2; // Flat line when silent
    }
    line(x + i, y + h - 5, x + i, y + h - bh - 5);
  }

  // 4. Status Text
  fill(0, 100, 0, 150); noStroke(); textSize(14);
  let statusText = "AUDIO_INPUT: NULL";
  if (isBooting) {
    statusText = "AUDIO_INPUT: CALIBRATING...";
  } else if (hasAudio && level > 0.001) {
    statusText = "AUDIO_INPUT: " + (currentRoom || "UNKNOWN").toUpperCase();
  }
  
  text(statusText, x + 10, y + 20);
}

function drawLocalMap(x, y, w, h) {
  noFill(); stroke(30, 45, 30); strokeWeight(1); rect(x, y, w, h, 5); noStroke();

  if (!currentRoom || !data || !data.rooms[currentRoom]) return;

  let room  = data.rooms[currentRoom];
  let exits = room.exits || {};

  let cx    = x + w / 2;
  let cy    = y + h / 2;
  let reach = min(w, h) * 0.29;
  let boxW  = w * 0.22;
  let boxH  = h * 0.18;

  let dirs = {
    n: { dx: 0, dy: -1 }, s: { dx: 0, dy: 1 },
    e: { dx: 1, dy: 0  }, w: { dx: -1, dy: 0 }
  };

  function drawArrow(x1, y1, x2, y2) {
    stroke(0, 160, 50, 200); strokeWeight(1.5);
    line(x1, y1, x2, y2);
    let angle = atan2(y2 - y1, x2 - x1);
    let hs    = 7;
    fill(0, 160, 50, 200); noStroke();
    triangle(
      x2, y2,
      x2 - hs * cos(angle - 0.4), y2 - hs * sin(angle - 0.4),
      x2 - hs * cos(angle + 0.4), y2 - hs * sin(angle + 0.4)
    );
  }

  function roomLabel(roomId) { return roomId.substring(0, 2).toUpperCase(); }

  fill(0, 40, 15); stroke(0, 180, 60, 200); strokeWeight(1.5);
  rectMode(CENTER);
  rect(cx, cy, boxW, boxH, 3);
  noStroke(); fill(0, 230, 80);
  textSize(13); textAlign(CENTER, CENTER);
  text(roomLabel(currentRoom), cx, cy);

  for (let dir in exits) {
    if (!dirs[dir]) continue;
    let d  = dirs[dir];
    let nx = cx + d.dx * reach;
    let ny = cy + d.dy * reach;

    let fromX = cx + d.dx * (boxW / 2 + 2);
    let fromY = cy + d.dy * (boxH / 2 + 2);
    let toX   = nx - d.dx * (boxW / 2 + 2);
    let toY   = ny - d.dy * (boxH / 2 + 2);
    drawArrow(fromX, fromY, toX, toY);

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
      let i      = (x + y * img.width) * 4;
      let bright = (img.pixels[i] + img.pixels[i+1] + img.pixels[i+2]) / 3;
      let threshold = [[0, 128], [192, 64]][y % 2][x % 2];
      let val    = bright > threshold ? 255 : 0;
      img.pixels[i]   = 0;
      img.pixels[i+1] = val;
      img.pixels[i+2] = val > 0 ? 80 : 0;
      img.pixels[i+3] = val > 0 ? 220 : 0;
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
  let img    = graphics[id];
  let aspect = img.width / img.height;
  let drawW, drawH;
  if (aspect >= 1) { drawW = size * 0.95; drawH = drawW / aspect; }
  else             { drawH = size * 0.95; drawW = drawH * aspect; }

  push(); translate(x + size / 2, y + size / 2); imageMode(CENTER);
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

function clearGraphic() { 
  currentGraphic = null; 
  currentNoRotate = false; 
  rotationAngle = 0; 

}

function playEndingVideo() {
  endingInputLocked = true;
  endingVideoActive = true;

  let vid = document.createElement("video");
  vid.src = "graphics/grad_desc_ending.mov";
  vid.style.position  = "fixed";
  vid.style.top       = "0";
  vid.style.left      = "0";
  vid.style.width     = "100%";
  vid.style.height    = "100%";
  vid.style.zIndex    = "999";
  vid.style.background = "black";
  vid.style.objectFit = "contain";
  vid.autoplay        = true;
  vid.playsInline     = true;
  document.body.appendChild(vid);
  endingVideoEl = vid;

  vid.onended = () => {
    document.body.removeChild(vid);
    endingVideoEl     = null;
    endingVideoActive = false;
    endingInputLocked = false;
    returnToMenu();
  };
}

function mergePause(durationMs, callback) {
  lines = []; scrollBuffer = []; currentLine = ""; printQueue = [];
  scatterLines      = [];
  scatterCurrents   = [];
  scatterPrintQueue = [];
  lastScatterPrint  = 0;
  endingMergePausing    = true;
  endingMergePauseStart = millis();
  endingMergePauseDur   = durationMs;
  endingMergeCallback   = callback;
  endingInputLocked     = true;
}

function queueScatterLine(str, sp) {
  let col  = getSpeakerColor(sp);
  textSize(28);
  let tw = textWidth(str);
  let x = random(MARGIN, max(MARGIN + 1, width * 0.62 - tw - MARGIN));
  let y = random(MARGIN + LINE_H * 2, height - MARGIN - LINE_H);
  let idx  = scatterCurrents.length;
  scatterCurrents.push({ text: "", col, x, y, born: null });

  for (let ch of str) {
    scatterPrintQueue.push({ ch, col, x, y, idx });
  }
  scatterPrintQueue.push({ ch: "\n", col, x, y, idx });
}