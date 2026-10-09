
const $ = (id) => document.getElementById(id);

let called = [];
let ticket = [];
let ticketNumber = 1;
let timer = null;
let voiceEnabled = false;

// Shuffle numbers randomly
function shuffle(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// Create a valid 3 x 9 ticket with 15 numbers
function makeTicket() {
  let grid;

  // Find a layout with exactly five numbers per row
  // and at least one number in every column.
  while (true) {
    grid = Array.from(
      { length: 3 },
      () => Array(9).fill(null)
    );

    for (let r = 0; r < 3; r++) {
      const columns = shuffle([0,1,2,3,4,5,6,7,8])
        .slice(0, 5);

      columns.forEach(c => {
        grid[r][c] = 0;
      });
    }

    const columnCounts = Array(9).fill(0);

    for (let c = 0; c < 9; c++) {
      for (let r = 0; r < 3; r++) {
        if (grid[r][c] !== null) {
          columnCounts[c]++;
        }
      }
    }

    if (columnCounts.every(n => n >= 1 && n <= 3)) {
      break;
    }
  }

  // Standard Tambola column ranges
  for (let c = 0; c < 9; c++) {
    const start = c === 0 ? 1 : c * 10;
    const end = c === 8 ? 90 : c * 10 + 9;

    const numbers = shuffle(
      Array.from(
        { length: end - start + 1 },
        (_, i) => start + i
      )
    );

    const rows = [0, 1, 2].filter(
      r => grid[r][c] !== null
    );

    rows.sort((a, b) => a - b);

    rows.forEach(r => {
      grid[r][c] = numbers.pop();
    });

    // Numbers must increase from top to bottom
    const values = rows
      .map(r => grid[r][c])
      .sort((a, b) => a - b);

    rows.forEach((r, i) => {
      grid[r][c] = values[i];
    });
  }

  ticket = grid;
  ticketNumber++;

  renderTicket();
  checkPrizes();
}

// Display ticket
function renderTicket() {
  $("ticketName").textContent =
    `Ticket #${String(ticketNumber).padStart(3, "0")} · 15 numbers`;

  const ticketEl = $("ticket");
  ticketEl.innerHTML = "";

  ticket.flat().forEach(number => {
    const cell = document.createElement("div");

    cell.className =
      "cell" +
      (number === null ? " blank" : "") +
      (
        number !== null && called.includes(number)
          ? " marked"
          : ""
      );

    cell.textContent = number === null ? "" : number;
    ticketEl.appendChild(cell);
  });
}

// Display 1–90 board and called history
function renderBoard() {
  const board = $("board");
  board.innerHTML = "";

  for (let n = 1; n <= 90; n++) {
    const cell = document.createElement("div");

    cell.className =
      "num" +
      (called.includes(n) ? " called" : "") +
      (called[0] === n ? " latest" : "");

    cell.textContent = n;
    board.appendChild(cell);
  }

  $("current").textContent = called[0] ?? "—";

  $("status").textContent = called.length
    ? `Number ${called[0]} called`
    : "Ready to play";

  $("count").textContent =
    `${called.length} / 90 numbers called`;

  const history = $("history");
  history.innerHTML = "";

  called.forEach(number => {
    const ball = document.createElement("div");
    ball.className = "historyball";
    ball.textContent = number;
    history.appendChild(ball);
  });

  $("next").disabled = called.length >= 90;

  renderTicket();
  checkPrizes();
}

// Call one random number without repetition
function nextNumber() {
  if (called.length >= 90) {
    stopAuto();
    alert("All 90 numbers have been called!");
    return;
  }

  const remaining = Array.from(
    { length: 90 },
    (_, i) => i + 1
  ).filter(number => !called.includes(number));

  const number =
    remaining[Math.floor(Math.random() * remaining.length)];

  called.unshift(number);

  renderBoard();

  if (
    voiceEnabled &&
    "speechSynthesis" in window
  ) {
    speechSynthesis.cancel();

    speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        `Number ${number}`
      )
    );
  }

  if (called.length >= 90) {
    stopAuto();
  }
}

// Start or stop automatic calling
function startAuto() {
  if (timer) {
    stopAuto();
    return;
  }

  if (called.length >= 90) {
    alert("All numbers have already been called.");
    return;
  }

  $("auto").textContent = "Ⅱ Stop Auto";

  nextNumber();

  if (called.length < 90) {
    timer = setInterval(nextNumber, 5000);
  }
}

function stopAuto() {
  if (timer !== null) {
    clearInterval(timer);
  }

  timer = null;

  if ($("auto")) {
    $("auto").textContent = "▶ Auto Call";
  }
}

// Check winning patterns on this ticket
function checkPrizes() {
  const rows = ticket.map(row =>
    row.filter(number => number !== null)
  );

  const numbers = ticket.flat().filter(
    number => number !== null
  );

  const markedCount = numbers.filter(
    number => called.includes(number)
  ).length;

  const wins = {
    early: markedCount >= 5,

    top:
      rows[0]?.length === 5 &&
      rows[0].every(n => called.includes(n)),

    middle:
      rows[1]?.length === 5 &&
      rows[1].every(n => called.includes(n)),

    bottom:
      rows[2]?.length === 5 &&
      rows[2].every(n => called.includes(n)),

    full:
      numbers.length === 15 &&
      markedCount === 15
  };

  Object.entries(wins).forEach(([id, won]) => {
    const element = $(id);

    element.textContent = won
      ? "Completed"
      : "Pending";

    element.className = won ? "ok" : "";
  });
}

// Reset all called numbers
function resetGame() {
  stopAuto();

  called = [];

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  renderBoard();
}

// Button actions
$("next").addEventListener("click", () => {
  stopAuto();
  nextNumber();
});

$("auto").addEventListener("click", startAuto);

$("undo").addEventListener("click", () => {
  stopAuto();

  if (called.length > 0) {
    called.shift();
    renderBoard();
  }
});

$("reset").addEventListener("click", resetGame);

$("newTicket").addEventListener("click", () => {
  makeTicket();
});

$("mark").addEventListener("click", () => {
  renderTicket();
  alert("Called numbers have been marked.");
});

// Optional voice calling toggle for browser console
window.enableHousieVoice = function(enabled) {
  voiceEnabled = Boolean(enabled);
};

// Start the demo
makeTicket();
ticketNumber = 1;
renderBoard();
  
