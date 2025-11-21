// game.js

const BOARD_SIZE = 11;

// === TOR: PĘTLA WOKÓŁ KRZYŻA (40 PÓL) ===============================
//
// Idziemy "ramką" wokół centralnego krzyża:
// - w dół górnym ramieniem
// - w prawo nad prawym ramieniem
// - w dół prawym ramieniem
// - w lewo pod dolnym ramieniem
// - w górę dolnym ramieniem
// - w lewo nad lewym ramieniem
// - w górę lewym ramieniem
// - w prawo nad górnym ramieniem

const BOARD_PATH = [];
function addTrack(r, c) {
  BOARD_PATH.push({ row: r, col: c });
}

// 1) góra: kolumna 5, rzędy 0..4
for (let r = 0; r <= 4; r++) addTrack(r, 5);
// 2) nad prawym ramieniem: rząd 4, kolumny 6..10
for (let c = 6; c <= 10; c++) addTrack(4, c);
// 3) w dół prawą stroną: kolumna 10, rzędy 5..10
for (let r = 5; r <= 10; r++) addTrack(r, 10);
// 4) pod dolnym ramieniem: rząd 10, kolumny 9..5
for (let c = 9; c >= 5; c--) addTrack(10, c);
// 5) w górę dolnym ramieniem: kolumna 5, rzędy 9..6
for (let r = 9; r >= 6; r--) addTrack(r, 5);
// 6) nad lewym ramieniem: rząd 6, kolumny 4..0
for (let c = 4; c >= 0; c--) addTrack(6, c);
// 7) w górę lewą stroną: kolumna 0, rzędy 5..0
for (let r = 5; r >= 0; r--) addTrack(r, 0);
// 8) pod górnym ramieniem: rząd 0, kolumny 1..4
for (let c = 1; c <= 4; c++) addTrack(0, c);

const BOARD_LEN = BOARD_PATH.length; // 40
const HOME_LEN = 4;

// === DOMEK i KORYTARZE (home rows) ===================================
const CENTER = { row: 5, col: 5 };

// Korytarze do domku – specjalne pola w kolorze gracza
// (nie są częścią pętli, są "w środku" krzyża)
const HOME_PATH = {
  red: [
    { row: 4, col: 4 },
    { row: 3, col: 4 },
    { row: 2, col: 4 },
    { row: 1, col: 4 }
  ],
  blue: [
    { row: 4, col: 6 },
    { row: 4, col: 7 },
    { row: 4, col: 8 },
    { row: 4, col: 9 }
  ],
  yellow: [
    { row: 6, col: 6 },
    { row: 7, col: 6 },
    { row: 8, col: 6 },
    { row: 9, col: 6 }
  ],
  green: [
    { row: 6, col: 4 },
    { row: 6, col: 3 },
    { row: 6, col: 2 },
    { row: 6, col: 1 }
  ]
};

// === BAZY 2×2 W ROGACH ===============================================

const BASE_CELLS = {
  red: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 }
  ],
  blue: [
    { row: 0, col: 9 },
    { row: 0, col: 10 },
    { row: 1, col: 9 },
    { row: 1, col: 10 }
  ],
  green: [
    { row: 9, col: 0 },
    { row: 10, col: 0 },
    { row: 9, col: 1 },
    { row: 10, col: 1 }
  ],
  yellow: [
    { row: 9, col: 9 },
    { row: 9, col: 10 },
    { row: 10, col: 9 },
    { row: 10, col: 10 }
  ]
};

// === WYZNACZANIE WEJŚCIA DO DOMKU DLA KAŻDEGO KOLORU =================
//
// Szukamy takiego pola na pętli (BOARD_PATH), które jest
// sąsiadem (góra/dół/lewo/prawo) pierwszego pola w korytarzu HOME_PATH[color][0]

function findEntryIndexForColor(color) {
  const home0 = HOME_PATH[color][0];
  for (let i = 0; i < BOARD_PATH.length; i++) {
    const p = BOARD_PATH[i];
    const dist =
      Math.abs(p.row - home0.row) + Math.abs(p.col - home0.col);
    if (dist === 1) return i;
  }
  console.warn("Nie znaleziono wejścia do domku dla koloru:", color);
  return 0;
}

const ENTRY_INDEX = {
  red: findEntryIndexForColor("red"),
  blue: findEntryIndexForColor("blue"),
  yellow: findEntryIndexForColor("yellow"),
  green: findEntryIndexForColor("green")
};

// Start to pole "za" wejściem – po pełnym okrążeniu (40 kroków)
// pionek wraca do ENTRY_INDEX i z niego wchodzi do korytarza.
const PLAYERS = [
  { color: "red", startIndex: (ENTRY_INDEX.red + 1) % BOARD_LEN },
  { color: "blue", startIndex: (ENTRY_INDEX.blue + 1) % BOARD_LEN },
  { color: "green", startIndex: (ENTRY_INDEX.green + 1) % BOARD_LEN },
  { color: "yellow", startIndex: (ENTRY_INDEX.yellow + 1) % BOARD_LEN }
];

const PAWNS_PER_PLAYER = 4;

// === DOM =============================================================

const boardEl = document.getElementById("board");
const currentPlayerSpan = document.getElementById("currentPlayer");
const diceResultSpan = document.getElementById("diceResult");
const rollBtn = document.getElementById("rollBtn");
const messageP = document.getElementById("message");

const cellMatrix = [];
let trackCellsByIndex = [];

let players = [];
let currentPlayerIndex = 0;
let rolledDice = null;
let selectablePawns = [];
let winner = null;
let canRoll = true;

// === TWORZENIE PLANSZY ==============================================

function createBoard() {
  boardEl.innerHTML = "";
  cellMatrix.length = 0;
  trackCellsByIndex = new Array(BOARD_LEN);

  for (let r = 0; r < BOARD_SIZE; r++) {
    const rowArr = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
      rowArr.push(cell);
    }
    cellMatrix.push(rowArr);
  }

  // tor po obwodzie krzyża
  BOARD_PATH.forEach((pos, index) => {
    const cell = cellMatrix[pos.row][pos.col];
    cell.classList.add("track");
    cell.dataset.trackIndex = index;
    trackCellsByIndex[index] = cell;
  });

  // bazy 2x2
  BASE_CELLS.red.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("base-red");
  });
  BASE_CELLS.blue.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("base-blue");
  });
  BASE_CELLS.green.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("base-green");
  });
  BASE_CELLS.yellow.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("base-yellow");
  });

  // korytarze (home rows) – kolorowane pola
  HOME_PATH.red.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("home-red");
  });
  HOME_PATH.blue.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("home-blue");
  });
  HOME_PATH.yellow.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("home-yellow");
  });
  HOME_PATH.green.forEach(pos => {
    cellMatrix[pos.row][pos.col].classList.add("home-green");
  });

  // domek
  cellMatrix[CENTER.row][CENTER.col].classList.add("center");
}

// === GRACZE I PIONKI ================================================

function createPlayers() {
  players = PLAYERS.map(playerDef => {
    const { color, startIndex } = playerDef;
    const pawns = [];
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      pawns.push({
        id: `${color}-${i}`,
        color,
        state: "home", // "home" | "track" | "homeRow" | "finished"
        trackIndex: null,
        homeIndex: null,
        stepsMoved: 0,
        baseIndex: i
      });
    }
    return { color, startIndex, pawns };
  });
}

// === RENDEROWANIE PIONKÓW ===========================================

function clearPawnsFromBoard() {
  document.querySelectorAll(".cell .pawn").forEach(el => el.remove());
  document.querySelectorAll(".pawnsHome .pawn").forEach(el => el.remove());
}

function renderPawns() {
  clearPawnsFromBoard();

  players.forEach(player => {
    const finishedSpan = document.getElementById(`finished-${player.color}`);
    const homeContainer = document.getElementById(`home-${player.color}`);
    let finishedCount = 0;

    player.pawns.forEach(pawn => {
      const pawnEl = document.createElement("div");
      pawnEl.classList.add("pawn", pawn.color);
      pawnEl.dataset.pawnId = pawn.id;

      if (pawn.state === "home") {
        const basePos = BASE_CELLS[pawn.color][pawn.baseIndex];
        const cell = cellMatrix[basePos.row][basePos.col];
        cell.appendChild(pawnEl);
      } else if (pawn.state === "track") {
        const cell = trackCellsByIndex[pawn.trackIndex];
        if (cell) cell.appendChild(pawnEl);
      } else if (pawn.state === "homeRow") {
        const coord = HOME_PATH[pawn.color][pawn.homeIndex];
        const cell = cellMatrix[coord.row][coord.col];
        cell.appendChild(pawnEl);
      } else if (pawn.state === "finished") {
        finishedCount++;
        homeContainer.appendChild(pawnEl);
      }
    });

    finishedSpan.textContent = finishedCount.toString();
  });
}

// === UI =============================================================

function updateUI() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayerSpan.textContent = currentPlayer.color.toUpperCase();

  document.querySelectorAll(".playerArea").forEach(area => {
    const color = area.dataset.color;
    area.dataset.active = color === currentPlayer.color ? "true" : "false";
  });

  renderPawns();
}

// === LOGIKA RUCHU ===================================================

function getPawnById(id) {
  for (const player of players) {
    for (const pawn of player.pawns) {
      if (pawn.id === id) return pawn;
    }
  }
  return null;
}

function computeNewPosition(pawn, player, dice) {
  if (pawn.state === "finished") return { valid: false };

  // z bazy wychodzimy tylko na 6
  if (pawn.state === "home") {
    if (dice !== 6) return { valid: false };
    return {
      valid: true,
      newState: "track",
      trackIndex: player.startIndex,
      homeIndex: null,
      stepsMoved: 0
    };
  }

  const maxSteps = BOARD_LEN + HOME_LEN; // pełna pętla + 4 pola domku

  if (pawn.state === "track") {
    const newSteps = pawn.stepsMoved + dice;
    if (newSteps > maxSteps) return { valid: false };

    if (newSteps < BOARD_LEN) {
      const trackIndex =
        (player.startIndex + newSteps) % BOARD_LEN;
      return {
        valid: true,
        newState: "track",
        trackIndex,
        homeIndex: null,
        stepsMoved: newSteps
      };
    }

    if (newSteps === maxSteps) {
      return {
        valid: true,
        newState: "finished",
        trackIndex: null,
        homeIndex: null,
        stepsMoved: newSteps
      };
    }

    // wejście do korytarza
    const homeIndex = newSteps - BOARD_LEN; // 0..3
    return {
      valid: true,
      newState: "homeRow",
      trackIndex: null,
      homeIndex,
      stepsMoved: newSteps
    };
  }

  if (pawn.state === "homeRow") {
    const newSteps = pawn.stepsMoved + dice;
    if (newSteps > maxSteps) return { valid: false };

    if (newSteps === maxSteps) {
      return {
        valid: true,
        newState: "finished",
        trackIndex: null,
        homeIndex: null,
        stepsMoved: newSteps
      };
    }

    const homeIndex = newSteps - BOARD_LEN;
    return {
      valid: true,
      newState: "homeRow",
      trackIndex: null,
      homeIndex,
      stepsMoved: newSteps
    };
  }

  return { valid: false };
}

function canMove(pawn, player, dice) {
  return computeNewPosition(pawn, player, dice).valid;
}

function movePawn(pawn, player, dice) {
  const res = computeNewPosition(pawn, player, dice);
  if (!res.valid) return false;

  pawn.state = res.newState;
  pawn.trackIndex = res.trackIndex;
  pawn.homeIndex = res.homeIndex;
  pawn.stepsMoved = res.stepsMoved;

  // zbijanie tylko na pętli (nie w domkach)
  if (pawn.state === "track") {
    players.forEach(pl => {
      pl.pawns.forEach(other => {
        if (
          other !== pawn &&
          other.state === "track" &&
          other.trackIndex === pawn.trackIndex &&
          other.color !== pawn.color
        ) {
          other.state = "home";
          other.trackIndex = null;
          other.homeIndex = null;
          other.stepsMoved = 0;
        }
      });
    });
  }

  return true;
}

function checkWin(player) {
  return player.pawns.every(p => p.state === "finished");
}

// === WYBÓR PIONKÓW ==================================================

function highlightSelectablePawns(dice) {
  selectablePawns = [];
  document.querySelectorAll(".pawn").forEach(p =>
    p.classList.remove("selectable")
  );

  const currentPlayer = players[currentPlayerIndex];

  currentPlayer.pawns.forEach(pawn => {
    if (canMove(pawn, currentPlayer, dice)) {
      selectablePawns.push(pawn.id);
    }
  });

  selectablePawns.forEach(pawnId => {
    document
      .querySelectorAll(`.pawn[data-pawn-id="${pawnId}"]`)
      .forEach(el => el.classList.add("selectable"));
  });
}

// === KLIK PIONKA =====================================================

boardEl.addEventListener("click", onPawnClick);

function onPawnClick(e) {
  const pawnEl = e.target.closest(".pawn");
  if (!pawnEl) return;
  if (winner !== null) return;

  const pawnId = pawnEl.dataset.pawnId;
  if (!selectablePawns.includes(pawnId)) return;

  const currentPlayer = players[currentPlayerIndex];
  const pawn = getPawnById(pawnId);

  const moved = movePawn(pawn, currentPlayer, rolledDice);
  if (!moved) return;

  renderPawns();

  // wygrana?
  if (checkWin(currentPlayer)) {
    winner = currentPlayerIndex;
    messageP.textContent = `Wygrał gracz: ${currentPlayer.color.toUpperCase()}!`;
    rollBtn.disabled = true;
    canRoll = false;
    return;
  }

  // 6 = dodatkowa tura
  if (rolledDice === 6) {
    messageP.textContent = `Gracz ${currentPlayer.color.toUpperCase()} wyrzucił 6 i ma dodatkową turę!`;
    rolledDice = null;
    diceResultSpan.textContent = "-";
    selectablePawns = [];
    document
      .querySelectorAll(".pawn")
      .forEach(p => p.classList.remove("selectable"));
    canRoll = true;
    rollBtn.disabled = false;
    return;
  }

  nextPlayer();
}

function nextPlayer() {
  selectablePawns = [];
  document.querySelectorAll(".pawn").forEach(p =>
    p.classList.remove("selectable")
  );
  rolledDice = null;
  diceResultSpan.textContent = "-";
  messageP.textContent = "";
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateUI();
  canRoll = true;
  rollBtn.disabled = false;
}

// === RZUT KOSTKĄ =====================================================

rollBtn.addEventListener("click", () => {
  if (winner !== null) return;
  if (!canRoll) return;

  const currentPlayer = players[currentPlayerIndex];

  rolledDice = Math.floor(Math.random() * 6) + 1;
  diceResultSpan.textContent = rolledDice.toString();

  canRoll = false;
  rollBtn.disabled = true;

  highlightSelectablePawns(rolledDice);

  if (selectablePawns.length === 0) {
    messageP.textContent = `Brak możliwego ruchu dla gracza ${currentPlayer.color.toUpperCase()}.`;
    setTimeout(() => {
      nextPlayer();
    }, 800);
  } else {
    messageP.textContent = `Wybierz pionek gracza ${currentPlayer.color.toUpperCase()} do przesunięcia.`;
  }
});

// === START GRY =======================================================

function initGame() {
  createBoard();
  createPlayers();
  currentPlayerIndex = 0;
  rolledDice = null;
  winner = null;
  messageP.textContent = "";
  canRoll = true;
  rollBtn.disabled = false;
  updateUI();
}

initGame();
