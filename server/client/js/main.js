const socket = io("https://card-marble-production.up.railway.app");

let myId = null;
let myRoomId = null;
let isHost = false;
let gameState = null;
let myHand = [];
let potionMode = false;

// ── 로비 ───────────────────────────────────────
document.getElementById("btn-create").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  if (!name) return setLobbyError("닉네임을 입력해주세요.");
  socket.emit("create-room", { playerName: name });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const row = document.getElementById("join-row");
  row.style.display = row.style.display === "none" ? "flex" : "none";
});

document.getElementById("btn-join-confirm").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  const roomId = document.getElementById("room-id-input").value.trim().toUpperCase();
  if (!name) return setLobbyError("닉네임을 입력해주세요.");
  if (!roomId) return setLobbyError("방 코드를 입력해주세요.");
  socket.emit("join-room", { roomId, playerName: name });
});

function setLobbyError(msg) {
  document.getElementById("lobby-error").textContent = msg;
}

// ── 대기실 ───────────────────────────────────────
document.getElementById("btn-start").addEventListener("click", () => {
  socket.emit("start-game");
});

document.getElementById("btn-draw").addEventListener("click", () => {
  socket.emit("draw-card");
});

document.getElementById("btn-potion-pass").addEventListener("click", () => {
  potionMode = false;
  document.getElementById("potion-banner").style.display = "none";
  socket.emit("potion-pass");
});

document.getElementById("btn-restart").addEventListener("click", () => {
  showScreen("lobby-screen");
});

// ── 소켓 이벤트 ───────────────────────────────────
socket.on("connect", () => { myId = socket.id; });

socket.on("room-created", ({ roomId, player }) => {
  myRoomId = roomId;
  isHost = true;
  document.getElementById("room-code-text").textContent = roomId;
  document.getElementById("btn-start").style.display = "inline-block";
  showScreen("waiting-screen");
});

socket.on("room-joined", ({ player }) => {
  isHost = false;
  document.getElementById("btn-start").style.display = "none";
  showScreen("waiting-screen");
});

socket.on("room-updated", (state) => {
  document.getElementById("room-code-text").textContent = state.roomId;
  const list = document.getElementById("player-list");
  list.innerHTML = "";
  state.players.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="player-dot" style="background:${p.color}"></span> ${p.name}`;
    list.appendChild(li);
  });
});

socket.on("game-started", (state) => {
  gameState = state;
  showScreen("game-screen");
  addLog("게임 시작!");
  renderGameState();
});

socket.on("game-updated", (state) => {
  gameState = state;
  renderGameState();
});

socket.on("hand-updated", ({ hand }) => {
  myHand = hand;
  const isMyTurn = gameState && gameState.currentTurn === myId;
  renderHand(myHand, isMyTurn && !potionMode, false, handleCardPlay);
});

socket.on("cell-events", ({ events }) => {
  events.forEach(e => addLog(e.message, true));
});

socket.on("potion-chance", () => {
  potionMode = true;
  document.getElementById("potion-banner").style.display = "block";
  addLog("물약 찬스! 카드를 1장 더 버릴 수 있습니다.", true);
  renderHand(myHand, true, true, handleCardPlay);
});

socket.on("game-updated", (state) => {
  gameState = state;
  renderGameState();

  // 상점 UI
  const isMyShop = state.shopPlayer === myId;
  const shopModal = document.getElementById("shop-modal");
  if (isMyShop) {
    renderShop(state.shopItems);
    shopModal.style.display = "flex";
  } else {
    shopModal.style.display = "none";
  }
});

socket.on("game-over", ({ winnerName }) => {
  document.getElementById("result-winner").textContent = `🏆 ${winnerName} 승리!`;
  showScreen("result-screen");
  addLog(`${winnerName}이(가) 승리했습니다!`, true);
});

socket.on("error", ({ message }) => {
  addLog("오류: " + message);
});

// ── 게임 렌더링 ───────────────────────────────────
function renderGameState() {
  if (!gameState) return;
  const canvas = document.getElementById("board-canvas");
  drawBoard(canvas, gameState.board, gameState.players);
  updatePlayerInfoList(gameState.players, gameState.currentTurn, myId);
  updateTurnBanner(gameState.currentTurn, gameState.players, myId);

  const isMyTurn = gameState.currentTurn === myId;
  document.getElementById("btn-draw").disabled = !isMyTurn || potionMode;

  if (myHand.length > 0) {
    renderHand(myHand, isMyTurn && !potionMode, potionMode, handleCardPlay);
  }
}

// 내 인벤토리 렌더링
  const me = gameState.players.find(p => p.id === myId);
  if (me) renderInventory(me.items);

function handleCardPlay(cardIndex, isPotionMode) {
  if (isPotionMode) {
    socket.emit("potion-discard", { cardIndex });
    potionMode = false;
    document.getElementById("potion-banner").style.display = "none";
  } else {
    socket.emit("play-card", { cardIndex });
  }
}

function renderShop(items) {
  const list = document.getElementById("shop-item-list");
  list.innerHTML = "";
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "shop-item-btn";
    btn.innerHTML = `<span class="shop-icon">${item.icon}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-desc">${item.desc}</span>`;
    btn.onclick = () => {
      socket.emit("buy-item", { itemId: item.id });
      document.getElementById("shop-modal").style.display = "none";
    };
    list.appendChild(btn);
  });
}

// 인벤토리 아이템 사용
function renderInventory(items) {
  const inv = document.getElementById("inventory");
  inv.innerHTML = "";
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "inv-btn";
    btn.title = item.desc;
    btn.textContent = item.icon;
    btn.onclick = () => socket.emit("use-item", { itemId: item.id });
    inv.appendChild(btn);
  });
}