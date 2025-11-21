// game.js

const BOARD_SIZE = 11;

// --- Ścieżka po obwodzie (40 pól) ------------------------------------
const BOARD_PATH = [];

// góra (0,0) -> (0,10)
for (let c = 0; c < BOARD_SIZE; c++) {
  BOARD_PATH.push({ row: 0, col: c });
}
// prawa (1,10) -> (10,10)
for (let r = 1; r < BOARD_SIZE; r++) {
  BOARD_PATH.push({ row: r, col: BOARD_SIZE - 1 });
}
// dół (10,9) -> (10,0)
for (let c = BOARD_SIZE - 2; c >= 0; c--) {
  BOARD_PATH.push({ row: BOARD_SIZE - 1, col: c });
}
// lewa (9,0) -> (1,0)
for (let r = BOARD_SIZE - 2; r >= 1; r--) {
  BOARD_PATH.push({ row: r, col: 0 });
}

const BOARD_LEN = BOARD_PATH.length; // 40
const HOME_LEN = 4;

// --- Home rows (korytarze do domku) ----------------------------------
// domek = (5,5)
const CENTER = { row: 5, col: 5 };

const HOME_PATH = {
  red: [
    { row: 1, col: 5 },
    { row: 2, col: 5 },
    { row: 3, col: 5 },
    { row: 4, col: 5 }
  ],
  blue: [
    { row: 5, col: 9 },
    { row: 5, col: 8 },
    { row: 5, col: 7 },
    { row: 5, col: 6 }
  ],
  yellow: [
    { row: 9, col: 5 },
    { row: 8, col: 5 },
    { row: 7, col: 5 },
    { row: 6, col: 5 }
  ],
  green: [
    { row: 5, col: 1 },
    { row: 5, col: 2 },
    { row: 5, col: 3 },
    { row: 5, col: 4 }
  ]
};

// --- Punkty wejścia do home row na torze -----------------------------
// Komórki w BOARD_PATH odpowiadające wejściu do korytarzy
// top: (0,5), right: (5,10), bottom: (10,5), left: (5,0)
const ENTRY_INDEX = {
  red: BOARD_PATH.findIndex(p => p.row === 0 && p.col === 5),
  blue: BOARD_PATH.findIndex(p => p.row === 5 && p.col === 10),
  yellow: BOARD_PATH.findIndex(p => p.row === 10 && p.col === 5),
  green: BOARD_PATH.findIndex(p => p.row === 5 && p.col === 0)
};

// --- Bazy 2x2 w rogach -----------------------------------------------
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

// --- Startowe pola na torze ------------------------------------------
// Po pełnym okrążeniu (40) pionek trafia na ENTRY_INDEX,
// więc startIndex to (ENTRY_INDEX + 1) % 40.
const PLAYERS = [
  { color: "red", startIndex: (ENTRY_INDEX.red + 1) % BOARD_LEN },
  { color: "blue", startIndex: (ENTRY_INDEX.blue + 1) % BOARD_LEN },
  { color: "green", startIndex: (ENTRY_INDEX.green + 1) % BOARD_LEN },
  { color: "yellow", startIndex: (ENTRY_INDEX.yellow + 1) % BOARD_LEN }
];

const PAWNS_PER_PLAYER = 4;

// --- DOM -------------------------------------------------------------
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

// --- Tworzenie planszy ----------------------------------------------
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

  // tor po obwodzie
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

  // korytarze do domu
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

// --- Tworzenie graczy i pionków -------------------------------------
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
        baseIndex: i // który kwadrat w bazie
      });
    }
    return { color, startIndex, pawns };
  });
}

// --- Render pionków --------------------------------------------------
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

// --- UI --------------------------------------------------------------
function updateUI() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayerSpan.textContent = currentPlayer.color.toUpperCase();

  document.querySelectorAll(".playerArea").forEach(area => {
    const color = area.dataset.color;
    area.dataset.active = color === currentPlayer.color ? "true" : "false";
  });

  renderPawns();
}

// --- Logika ruchu ----------------------------------------------------
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

  // z bazy można wyjść tylko na 6
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

  const maxSteps = BOARD_LEN + HOME_LEN; // pełne okrążenie + 4 pola domku

  if (pawn.state === "track") {
    const newSteps = pawn.stepsMoved + dice;

    if (newSteps > maxSteps) {
      return { valid: false };
    }

    if (newSteps < BOARD_LEN) {
      const trackIndex = (player.startIndex + newSteps) % BOARD_LEN;
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

    // wejście na korytarz
    const homeIndex = newSteps - BOARD_LEN; // 0..HOME_LEN-1
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

  // zbijanie tylko na torze (nie w domkach)
  if (pawn.state === "track") {
    players.forEach(pl => {
      pl.pawns.forEach(other => {
        if (
          other !== pawn &&
          other.state === "track" &&
          other.trackIndex === pawn.trackIndex &&
          other.color !== pawn.color
        ) {
          // wraca do swojej bazy
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

// --- Wybór pionków ---------------------------------------------------
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
    document.querySelectorAll(`.pawn[data-pawn-id="${pawnId}"]`)
      .forEach(el => el.classList.add("selectable"));
  });
}

// --- Klikanie pionków -----------------------------------------------
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

  // dodatkowa tura po 6
  if (rolledDice === 6) {
    messageP.textContent = `Gracz ${currentPlayer.color.toUpperCase()} wyrzucił 6 i ma dodatkową turę!`;
    rolledDice = null;
    diceResultSpan.textContent = "-";
    selectablePawns = [];
    document.querySelectorAll(".pawn").forEach(p =>
      p.classList.remove("selectable")
    );
    canRoll = true;
    rollBtn.disabled = false;
    return;
  }

  // kolejny gracz
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

// --- Rzut kostką -----------------------------------------------------
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

// --- Start gry -------------------------------------------------------
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
