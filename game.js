// game.js

// Rozmiar planszy
const BOARD_SIZE = 11;

// Ścieżka po obwodzie (40 pól)
const BOARD_PATH = [];
for (let c = 0; c < BOARD_SIZE; c++) {
  BOARD_PATH.push({ row: 0, col: c }); // górny rząd
}
for (let r = 1; r < BOARD_SIZE; r++) {
  BOARD_PATH.push({ row: r, col: BOARD_SIZE - 1 }); // prawa kolumna
}
for (let c = BOARD_SIZE - 2; c >= 0; c--) {
  BOARD_PATH.push({ row: BOARD_SIZE - 1, col: c }); // dolny rząd
}
for (let r = BOARD_SIZE - 2; r >= 1; r--) {
  BOARD_PATH.push({ row: r, col: 0 }); // lewa kolumna
}

const BOARD_LEN = BOARD_PATH.length; // 40

// Długość "krzyża" (wewnętrznej prostej do środka) – uproszczona: 4 pola
const HOME_LEN = 4;

// Współrzędne pól na krzyżu dla każdego koloru
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

// Kolejność i startowe indexy na obwodzie
const PLAYERS = [
  { color: "red", startIndex: 0 },
  { color: "blue", startIndex: 10 },
  { color: "green", startIndex: 20 },
  { color: "yellow", startIndex: 30 }
];

const PAWNS_PER_PLAYER = 4;

// DOM
const boardEl = document.getElementById("board");
const currentPlayerSpan = document.getElementById("currentPlayer");
const diceResultSpan = document.getElementById("diceResult");
const rollBtn = document.getElementById("rollBtn");
const messageP = document.getElementById("message");

// Tablica komórek
const cellMatrix = [];
let trackCellsByIndex = [];

// Stan
let players = [];
let currentPlayerIndex = 0;
let rolledDice = null;
let selectablePawns = [];
let winner = null;
let canRoll = true; // kontrola rzutu

// ----- Plansza -------------------------------------------------

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

  // Obwód
  BOARD_PATH.forEach((pos, index) => {
    const cell = cellMatrix[pos.row][pos.col];
    cell.classList.add("track");
    cell.dataset.trackIndex = index;
    trackCellsByIndex[index] = cell;
  });

  // Bazy w narożnikach (jak wcześniej)
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      cellMatrix[r][c].classList.add("base", "base-red");
    }
  }
  for (let r = 1; r <= 3; r++) {
    for (let c = 7; c <= 9; c++) {
      cellMatrix[r][c].classList.add("base", "base-blue");
    }
  }
  for (let r = 7; r <= 9; r++) {
    for (let c = 1; c <= 3; c++) {
      cellMatrix[r][c].classList.add("base", "base-green");
    }
  }
  for (let r = 7; r <= 9; r++) {
    for (let c = 7; c <= 9; c++) {
      cellMatrix[r][c].classList.add("base", "base-yellow");
    }
  }

  // Krzyż przez całą planszę (1..9)
  const center = 5;
  for (let r = 1; r <= 9; r++) {
    cellMatrix[r][center].classList.add("centerPath");
  }
  for (let c = 1; c <= 9; c++) {
    cellMatrix[center][c].classList.add("centerPath");
  }
  cellMatrix[center][center].classList.add("center");
}

// ----- Gracze / pionki ------------------------------------------

function createPlayers() {
  players = PLAYERS.map((p) => {
    const pawns = [];
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      pawns.push({
        id: `${p.color}-${i}`,
        color: p.color,
        state: "home", // "home" | "track" | "homeRow" | "finished"
        trackIndex: null,
        homeIndex: null,
        stepsMoved: 0
      });
    }
    return {
      color: p.color,
      startIndex: p.startIndex,
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
        // baza – małe pionki w panelu
        homeContainer.appendChild(pawnEl);
      } else if (pawn.state === "track") {
        const cell = trackCellsByIndex[pawn.trackIndex];
        if (cell) cell.appendChild(pawnEl);
      } else if (pawn.state === "homeRow") {
        const path = HOME_PATH[pawn.color];
        const coord = path[pawn.homeIndex];
        if (coord) {
          const cell = cellMatrix[coord.row][coord.col];
          cell.appendChild(pawnEl);
        }
      } else if (pawn.state === "finished") {
        finishedCount++;
        homeContainer.appendChild(pawnEl);
      }
    });

    finishedSpan.textContent = finishedCount.toString();
  });
}

// ----- UI -------------------------------------------------------

function updateUI() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayerSpan.textContent = currentPlayer.color.toUpperCase();

  document.querySelectorAll(".playerArea").forEach((area) => {
    const color = area.dataset.color;
    area.dataset.active = color === currentPlayer.color ? "true" : "false";
  });

  renderPawns();
}

// ----- Logika ruchu ---------------------------------------------

function getPawnById(id) {
  for (const player of players) {
    for (const pawn of player.pawns) {
      if (pawn.id === id) return pawn;
    }
  }
  return null;
}

// Oblicza nową pozycję (bez modyfikacji pionka)
function computeNewPosition(pawn, player, dice) {
  if (pawn.state === "finished") {
    return { valid: false };
  }

  if (pawn.state === "home") {
    if (dice !== 6) return { valid: false };
    // wyjście na start
    return {
      valid: true,
      newState: "track",
      trackIndex: player.startIndex,
      homeIndex: null,
      stepsMoved: 0
    };
  }

  if (pawn.state === "track") {
    const newSteps = pawn.stepsMoved + dice;
    const maxSteps = BOARD_LEN + HOME_LEN; // ostatni ruch wchodzi do "domu"

    if (newSteps > maxSteps) {
      return { valid: false };
    }

    if (newSteps < BOARD_LEN) {
      // dalej po obwodzie
      return {
        valid: true,
        newState: "track",
        trackIndex: (player.startIndex + newSteps) % BOARD_LEN,
        homeIndex: null,
        stepsMoved: newSteps
      };
    }

    if (newSteps === maxSteps) {
      // dokładnie w domu – pionek kończy
      return {
        valid: true,
        newState: "finished",
        trackIndex: null,
        homeIndex: null,
        stepsMoved: newSteps
      };
    }

    // wchodzimy na krzyż (domową ścieżkę)
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
    const maxSteps = BOARD_LEN + HOME_LEN;

    if (newSteps > maxSteps) {
      return { valid: false };
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
  const res = computeNewPosition(pawn, player, dice);
  return !!res.valid;
}

function movePawn(pawn, player, dice) {
  const res = computeNewPosition(pawn, player, dice);
  if (!res.valid) return false;

  pawn.state = res.newState;
  pawn.trackIndex = res.trackIndex;
  pawn.homeIndex = res.homeIndex;
  pawn.stepsMoved = res.stepsMoved;

  // Zbijanie tylko na obwodzie
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
          otherPawn.homeIndex = null;
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

// Zaznacz pionki, którymi można się ruszyć
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

// ----- Klikanie pionków ----------------------------------------

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

  // Wygrana
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

// ----- Rzut kostką ---------------------------------------------

rollBtn.addEventListener("click", () => {
  if (winner !== null) return;
  if (!canRoll) return;

  const currentPlayer = players[currentPlayerIndex];

  rolledDice = Math.floor(Math.random() * 6) + 1;
  diceResultSpan.textContent = rolledDice.toString();

  // Po rzucie – blokada kolejnego rzutu
  canRoll = false;
  rollBtn.disabled = true;

  highlightSelectablePawns(rolledDice);

  if (selectablePawns.length === 0) {
    messageP.textContent = `Brak możliwego ruchu dla gracza ${currentPlayer.color.toUpperCase()}.`;

    // przejście tury po krótkiej pauzie
    setTimeout(() => {
      nextPlayer();
    }, 800);
  } else {
    messageP.textContent = `Wybierz pionek gracza ${currentPlayer.color.toUpperCase()} do przesunięcia.`;
  }
});

// ----- Start gry -----------------------------------------------

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
