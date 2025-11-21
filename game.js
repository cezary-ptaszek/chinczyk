// game.js

const BOARD_SIZE = 11;

// === ŚCIEŻKA PO KRZYŻU (PLUS) =======================================
// Gramy tylko po polach krzyża (pion + poziom przez środek).
// Robimy pętlę: góra -> środek -> prawo -> środek -> dół -> środek -> lewo -> środek -> góra.

const CROSS_PATH = [];

function addCoord(r, c) {
  CROSS_PATH.push({ row: r, col: c });
}

// Segment A: góra -> środek
addCoord(0, 5);
addCoord(1, 5);
addCoord(2, 5);
addCoord(3, 5);
addCoord(4, 5);
addCoord(5, 5); // środek

// Segment B: środek -> prawo (do (5,10))
addCoord(5, 6);
addCoord(5, 7);
addCoord(5, 8);
addCoord(5, 9);
addCoord(5, 10);

// Segment C: prawo -> środek
addCoord(5, 9);
addCoord(5, 8);
addCoord(5, 7);
addCoord(5, 6);
addCoord(5, 5);

// Segment D: środek -> dół (do (10,5))
addCoord(6, 5);
addCoord(7, 5);
addCoord(8, 5);
addCoord(9, 5);
addCoord(10, 5);

// Segment E: dół -> środek
addCoord(9, 5);
addCoord(8, 5);
addCoord(7, 5);
addCoord(6, 5);
addCoord(5, 5);

// Segment F: środek -> lewo (do (5,0))
addCoord(5, 4);
addCoord(5, 3);
addCoord(5, 2);
addCoord(5, 1);
addCoord(5, 0);

// Segment G: lewo -> środek
addCoord(5, 1);
addCoord(5, 2);
addCoord(5, 3);
addCoord(5, 4);
addCoord(5, 5);

// Segment H: środek -> góra (zamyka pętlę do (0,5))
addCoord(4, 5);
addCoord(3, 5);
addCoord(2, 5);
addCoord(1, 5);
addCoord(0, 5);

const BOARD_LEN = CROSS_PATH.length; // długość pętli

// Startowe pola (koordynaty na krzyżu)
const START_COORDS = {
  red: { row: 0, col: 5 },    // góra
  blue: { row: 5, col: 10 },  // prawo
  yellow: { row: 10, col: 5 },// dół
  green: { row: 5, col: 0 }   // lewo
};

const PLAYER_COLORS = ["red", "blue", "green", "yellow"];
const PAWNS_PER_PLAYER = 4;

// DOM
const boardEl = document.getElementById("board");
const currentPlayerSpan = document.getElementById("currentPlayer");
const diceResultSpan = document.getElementById("diceResult");
const rollBtn = document.getElementById("rollBtn");
const messageP = document.getElementById("message");

// Plansza (macierz komórek)
const cellMatrix = [];
let trackCellsByIndex = [];

// Stan gry
let players = [];
let currentPlayerIndex = 0;
let rolledDice = null;
let selectablePawns = [];
let winner = null;
let canRoll = true;

// === TWORZENIE PLANSZY ===============================================

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

  // Zaznacz ścieżkę po krzyżu – tylko te pola są "track"
  CROSS_PATH.forEach((pos, index) => {
    const cell = cellMatrix[pos.row][pos.col];
    cell.classList.add("track", "centerPath");
    // środek wyróżniamy dodatkowo
    if (pos.row === 5 && pos.col === 5) {
      cell.classList.add("center");
    }
    cell.dataset.trackIndex = index;
    trackCellsByIndex[index] = cell;
  });
}

// === GRACZE I PIONKI =================================================

function findPathIndexForCoord(coord) {
  return CROSS_PATH.findIndex(
    (p) => p.row === coord.row && p.col === coord.col
  );
}

function createPlayers() {
  players = PLAYER_COLORS.map((color) => {
    const startIndex = findPathIndexForCoord(START_COORDS[color]);
    if (startIndex === -1) {
      console.error("Brak pola startowego na ścieżce dla koloru:", color);
    }

    const pawns = [];
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      pawns.push({
        id: `${color}-${i}`,
        color,
        state: "home", // "home" | "track" | "finished"
        trackIndex: null,
        stepsMoved: 0
      });
    }

    return {
      color,
      startIndex,
      pawns
    };
  });
}

function clearPawnsFromBoard() {
  document.querySelectorAll(".cell .pawn").forEach((el) => el.remove());
  document.querySelectorAll(".pawnsHome .pawn").forEach((el) => el.remove());
}

function renderPawns() {
  clearPawnsFromBoard();

  players.forEach((player) => {
    const homeContainer = document.getElementById(`home-${player.color}`);
    const finishedSpan = document.getElementById(`finished-${player.color}`);
    let finishedCount = 0;

    player.pawns.forEach((pawn) => {
      const pawnEl = document.createElement("div");
      pawnEl.classList.add("pawn", pawn.color);
      pawnEl.dataset.pawnId = pawn.id;

      if (pawn.state === "home") {
        homeContainer.appendChild(pawnEl);
      } else if (pawn.state === "track") {
        const cell = trackCellsByIndex[pawn.trackIndex];
        if (cell) cell.appendChild(pawnEl);
      } else if (pawn.state === "finished") {
        finishedCount++;
        homeContainer.appendChild(pawnEl);
      }
    });

    finishedSpan.textContent = finishedCount.toString();
  });
}

// === UI ==============================================================

function updateUI() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayerSpan.textContent = currentPlayer.color.toUpperCase();

  document.querySelectorAll(".playerArea").forEach((area) => {
    const color = area.dataset.color;
    area.dataset.active = color === currentPlayer.color ? "true" : "false";
  });

  renderPawns();
}

// === LOGIKA RUCHU ====================================================

function getPawnById(id) {
  for (const player of players) {
    for (const pawn of player.pawns) {
      if (pawn.id === id) return pawn;
    }
  }
  return null;
}

// Oblicz nową pozycję po rzucie (bez zmiany pionka)
function computeNewPosition(pawn, player, dice) {
  if (pawn.state === "finished") return { valid: false };

  // z bazy można wyjść tylko na 6
  if (pawn.state === "home") {
    if (dice !== 6) return { valid: false };
    return {
      valid: true,
      newState: "track",
      trackIndex: player.startIndex,
      stepsMoved: 0
    };
  }

  if (pawn.state === "track") {
    const newSteps = pawn.stepsMoved + dice;
    const maxSteps = BOARD_LEN; // dokładnie jedno okrążenie po krzyżu

    if (newSteps > maxSteps) {
      // trzeba wejść dokładnie – jak w klasycznym chińczyku
      return { valid: false };
    }

    if (newSteps === maxSteps) {
      // pionek ukończył rundę
      return {
        valid: true,
        newState: "finished",
        trackIndex: null,
        stepsMoved: newSteps
      };
    }

    // wciąż na trasie
    const newIndex = (player.startIndex + newSteps) % BOARD_LEN;
    return {
      valid: true,
      newState: "track",
      trackIndex: newIndex,
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
  pawn.stepsMoved = res.stepsMoved;

  // Zbijanie – tylko gdy pionek stoi na ścieżce
  if (pawn.state === "track") {
    players.forEach((pl) => {
      pl.pawns.forEach((otherPawn) => {
        if (
          otherPawn !== pawn &&
          otherPawn.state === "track" &&
          otherPawn.trackIndex === pawn.trackIndex &&
          otherPawn.color !== pawn.color
        ) {
          otherPawn.state = "home";
          otherPawn.trackIndex = null;
          otherPawn.stepsMoved = 0;
        }
      });
    });
  }

  return true;
}

function checkWin(player) {
  return player.pawns.every((p) => p.state === "finished");
}

// === WYBÓR PIONKÓW ===================================================

function highlightSelectablePawns(dice) {
  selectablePawns = [];
  document.querySelectorAll(".pawn").forEach((p) =>
    p.classList.remove("selectable")
  );

  const currentPlayer = players[currentPlayerIndex];

  currentPlayer.pawns.forEach((pawn) => {
    if (canMove(pawn, currentPlayer, dice)) {
      selectablePawns.push(pawn.id);
    }
  });

  selectablePawns.forEach((pawnId) => {
    document
      .querySelectorAll(`.pawn[data-pawn-id="${pawnId}"]`)
      .forEach((el) => el.classList.add("selectable"));
  });
}

// --- Obsługa kliknięcia pionka --------------------------------------

boardEl.addEventListener("click", onPawnClick);
document.querySelectorAll(".pawnsHome").forEach((container) =>
  container.addEventListener("click", onPawnClick)
);

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

  // Wygrana?
  if (checkWin(currentPlayer)) {
    winner = currentPlayerIndex;
    messageP.textContent = `Wygrał gracz: ${currentPlayer.color.toUpperCase()}!`;
    rollBtn.disabled = true;
    canRoll = false;
    return;
  }

  // Jeśli 6 – dodatkowa tura po ruchu
  if (rolledDice === 6) {
    messageP.textContent = `Gracz ${currentPlayer.color.toUpperCase()} wyrzucił 6 i ma dodatkową turę!`;
    rolledDice = null;
    diceResultSpan.textContent = "-";
    selectablePawns = [];
    document
      .querySelectorAll(".pawn")
      .forEach((p) => p.classList.remove("selectable"));

    canRoll = true;
    rollBtn.disabled = false;
    return;
  }

  // Koniec tury
  nextPlayer();
}

function nextPlayer() {
  selectablePawns = [];
  document.querySelectorAll(".pawn").forEach((p) =>
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

  // Blokujemy kolejne rzuty, dopóki gracz nie ruszy pionka / nie minie tura
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
