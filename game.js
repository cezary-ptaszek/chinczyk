// game.js

// Ustawienia planszy
const BOARD_SIZE = 11;
const BOARD_PATH = []; // tablica pól po obwodzie

// Tworzymy ścieżkę wokół krawędzi 11x11 (40 pól)
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

// Kolejność i startowe pozycje (indeksy na BOARD_PATH)
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

// Tablica komórek [row][col]
const cellMatrix = [];
let trackCellsByIndex = [];

// Stan gry
let players = [];
let currentPlayerIndex = 0;
let rolledDice = null;
let selectablePawns = [];
let winner = null;
let canRoll = true; // kontrola czy można rzucić kostką

// 1. Inicjalizacja planszy
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

  // Oznacz ścieżkę dookoła (tak jak wcześniej)
  BOARD_PATH.forEach((pos, index) => {
    const cell = cellMatrix[pos.row][pos.col];
    cell.classList.add("track");
    cell.dataset.trackIndex = index;
    trackCellsByIndex[index] = cell;
  });

  // --- Nowe: bazy w narożnikach (wewnątrz obwodu), bardziej jak klasyczny Chińczyk ---

  // Czerwony – lewy górny róg (wewnętrzne 3x3)
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      cellMatrix[r][c].classList.add("base", "base-red");
    }
  }

  // Niebieski – prawy górny róg
  for (let r = 1; r <= 3; r++) {
    for (let c = 7; c <= 9; c++) {
      cellMatrix[r][c].classList.add("base", "base-blue");
    }
  }

  // Zielony – lewy dolny róg
  for (let r = 7; r <= 9; r++) {
    for (let c = 1; c <= 3; c++) {
      cellMatrix[r][c].classList.add("base", "base-green");
    }
  }

  // Żółty – prawy dolny róg
  for (let r = 7; r <= 9; r++) {
    for (let c = 7; c <= 9; c++) {
      cellMatrix[r][c].classList.add("base", "base-yellow");
    }
  }

  // Krzyż i środek
  const center = 5;

  // pionowy pasek
  for (let r = 3; r <= 7; r++) {
    cellMatrix[r][center].classList.add("centerPath");
  }

  // poziomy pasek
  for (let c = 3; c <= 7; c++) {
    cellMatrix[center][c].classList.add("centerPath");
  }

  // środkowe pole
  cellMatrix[center][center].classList.add("center");
}


// 2. Inicjalizacja graczy i pionków
function createPlayers() {
  players = PLAYERS.map((p) => {
    const pawns = [];
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      pawns.push({
        id: `${p.color}-${i}`,
        color: p.color,
        state: "home", // "home" | "track" | "finished"
        trackIndex: null,
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

// 3. Rysowanie pionków
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
        // w bazie – pokaż mały pionek w panelu gracza
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

// 4. Wyświetlanie stanu / komunikatów
function updateUI() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayerSpan.textContent = currentPlayer.color.toUpperCase();

  // zaznacz aktualnego gracza z boku
  document.querySelectorAll(".playerArea").forEach((area) => {
    const color = area.dataset.color;
    area.dataset.active = color === currentPlayer.color ? "true" : "false";
  });

  renderPawns();
}

// 5. Logika ruchów

function getPawnById(id) {
  for (const player of players) {
    for (const pawn of player.pawns) {
      if (pawn.id === id) return pawn;
    }
  }
  return null;
}

// Czy pionek może się ruszyć przy danym wyniku?
function canMove(pawn, player, dice) {
  if (pawn.state === "finished") return false;

  if (pawn.state === "home") {
    // z bazy można wyjść tylko na 6
    return dice === 6;
  }

  if (pawn.state === "track") {
    // sprawdź czy po ruchu nie wyjdzie poza "pełne okrążenie"
    const newSteps = pawn.stepsMoved + dice;
    // w tej wersji: po >= BOARD_LEN pionek schodzi z planszy (zakończony)
    // dopuszczamy "przeskok" – klasyczne zasady często wymagają dokładnego dojścia,
    // ale tu uproszczamy.
    return newSteps >= 0; // zawsze może się ruszyć po ścieżce lub zakończyć
  }

  return false;
}

function movePawn(pawn, player, dice) {
  if (!canMove(pawn, player, dice)) return false;

  if (pawn.state === "home") {
    // wychodzimy na startowy index
    pawn.state = "track";
    pawn.trackIndex = player.startIndex;
    pawn.stepsMoved = 0;
  } else if (pawn.state === "track") {
    const newSteps = pawn.stepsMoved + dice;

    if (newSteps >= BOARD_LEN) {
      // ukończone pełne okrążenie
      pawn.state = "finished";
      pawn.trackIndex = null;
      pawn.stepsMoved = BOARD_LEN;
    } else {
      pawn.stepsMoved = newSteps;
      pawn.trackIndex = (player.startIndex + newSteps) % BOARD_LEN;

      // sprawdź, czy ktoś stoi na tym polu – zbijamy
      players.forEach((pl) => {
        pl.pawns.forEach((otherPawn) => {
          if (
            otherPawn !== pawn &&
            otherPawn.state === "track" &&
            otherPawn.trackIndex === pawn.trackIndex
          ) {
            // zbicie przeciwnika
            otherPawn.state = "home";
            otherPawn.trackIndex = null;
            otherPawn.stepsMoved = 0;
          }
        });
      });
    }
  }

  return true;
}

// Sprawdź, czy gracz wygrał
function checkWin(player) {
  return player.pawns.every((p) => p.state === "finished");
}

// Zaznacz pionki, którymi można ruszyć
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

// Obsługa kliknięcia pionka
boardEl.addEventListener("click", onPawnClick);
document.querySelectorAll(".pawnsHome").forEach((container) =>
  container.addEventListener("click", onPawnClick)
);

function onPawnClick(e) {
  const pawnEl = e.target.closest(".pawn");
  if (!pawnEl) return;
  if (winner !== null) return; // gra skończona

  const pawnId = pawnEl.dataset.pawnId;
  if (!selectablePawns.includes(pawnId)) return; // nie ten pionek

  const currentPlayer = players[currentPlayerIndex];
  const pawn = getPawnById(pawnId);

  const moved = movePawn(pawn, currentPlayer, rolledDice);
  if (!moved) return;

  renderPawns();

  // sprawdź wygraną
  if (checkWin(currentPlayer)) {
    winner = currentPlayerIndex;
    messageP.textContent = `Wygrał gracz: ${currentPlayer.color.toUpperCase()}!`;
    rollBtn.disabled = true;
    canRoll = false;
    return;
  }

  // Jeśli 6 – jeszcze jedna tura po ruchu
  if (rolledDice === 6) {
    messageP.textContent = `Gracz ${currentPlayer.color.toUpperCase()} wyrzucił 6 i ma dodatkową turę!`;
    rolledDice = null;
    diceResultSpan.textContent = "-";
    selectablePawns = [];
    document
      .querySelectorAll(".pawn")
      .forEach((p) => p.classList.remove("selectable"));

    // teraz znowu wolno rzucać
    canRoll = true;
    rollBtn.disabled = false;
    return;
  }

  // Koniec tury – następny gracz
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

  // nowy gracz może rzucać kostką
  canRoll = true;
  rollBtn.disabled = false;
}

// Obsługa przycisku "Rzuć kostką"
rollBtn.addEventListener("click", () => {
  if (winner !== null) return;
  if (!canRoll) {
    // zabezpieczenie – jakby ktoś próbował spamic kliknięciami
    return;
  }

  const currentPlayer = players[currentPlayerIndex];

  rolledDice = Math.floor(Math.random() * 6) + 1;
  diceResultSpan.textContent = rolledDice.toString();

  // od tego momentu nie można rzucać, dopóki nie będzie ruchu / zmiany tury
  canRoll = false;
  rollBtn.disabled = true;

  // wyznacz możliwe pionki
  highlightSelectablePawns(rolledDice);

  if (selectablePawns.length === 0) {
    messageP.textContent = `Brak możliwego ruchu dla gracza ${currentPlayer.color.toUpperCase()}.`;
    // po krótkim czasie przechodzimy do następnego gracza
    setTimeout(() => {
      nextPlayer();
    }, 800);
  } else {
    messageP.textContent = `Wybierz pionek gracza ${currentPlayer.color.toUpperCase()} do przesunięcia.`;
  }
});

// Start gry
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
