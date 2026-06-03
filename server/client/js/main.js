const socket = io("https://card-marble-production.up.railway.app");

let myId = null;
let myRoomId = null;
let isHost = false;
let gameState = null;
let myHand = [];
let potionMode = false;
let alchBoostMode = false;

// ── 로비 ──
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

document.getElementById("btn-start").addEventListener("click", () => socket.emit("start-game"));
document.getElementById("btn-draw").addEventListener("click", () => socket.emit("draw-card"));
document.getElementById("btn-potion-pass").addEventListener("click", () => {
  potionMode = false;
  document.getElementById("potion-banner").style.display = "none";
  socket.emit("potion-pass");
});
document.getElementById("btn-restart").addEventListener("click", () => showScreen("lobby-screen"));

// 칸 설명 모달 닫기
document.getElementById("cell-desc-close").addEventListener("click", () => {
  document.getElementById("cell-desc-modal").style.display = "none";
});

// ── 소켓 이벤트 ──
socket.on("connect", () => { myId = socket.id; });

socket.on("room-created", ({ roomId }) => {
  myRoomId = roomId;
  isHost = true;
  document.getElementById("room-code-text").textContent = roomId;
  document.getElementById("btn-start").style.display = "inline-block";
  showScreen("waiting-screen");
});

socket.on("room-joined", () => {
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
  addLog("✦ 연금술 실험 시작!");
  renderGameState();
});

socket.on("game-updated", (state) => {
  gameState = state;
  renderGameState();

  // 연금술 촉진 모드
  const isMyAlch = state.alchBoostPlayer === myId;
  const alchBanner = document.getElementById("alch-boost-banner");
  if (isMyAlch) {
    alchBoostMode = true;
    alchBanner.style.display = "block";
  } else {
    alchBoostMode = false;
    alchBanner.style.display = "none";
  }
});

socket.on("hand-updated", ({ hand }) => {
  myHand = hand;
  const isMyTurn = gameState && gameState.currentTurn === myId;
  renderHand(myHand, (isMyTurn && !potionMode && !alchBoostMode) || alchBoostMode, potionMode || alchBoostMode, handleCardPlay);
});

socket.on("cell-events", ({ events }) => {
  events.forEach(e => { if (e.message) addLog(e.message, true); });
});

socket.on("potion-chance", () => {
  potionMode = true;
  document.getElementById("potion-banner").style.display = "block";
  addLog("🔮 수정구슬! 카드 1장을 골라 버릴 수 있습니다.", true);
  renderHand(myHand, true, true, handleCardPlay);
});

socket.on("alch-boost-chance", () => {
  alchBoostMode = true;
  document.getElementById("alch-boost-banner").style.display = "block";
  addLog("✨ 연금술 촉진! 버릴 카드를 선택하세요.", true);
  renderHand(myHand, true, true, handleCardPlay);
});

socket.on("game-over", ({ winnerName }) => {
  document.getElementById("result-winner").textContent = `🏆 ${winnerName} 승리!`;
  showScreen("result-screen");
});

socket.on("error", ({ message }) => addLog("오류: " + message));

// ── 렌더링 ──
function renderGameState() {
  if (!gameState) return;
  drawBoard(null, gameState.board, gameState.players);
  updatePlayerInfoList(gameState.players, gameState.currentTurn, myId);
  updateTurnBanner(gameState.currentTurn, gameState.players, myId);

  const isMyTurn = gameState.currentTurn === myId;
  document.getElementById("btn-draw").disabled = !isMyTurn || potionMode || alchBoostMode;

  // 찬스 카드 렌더링
  const me = gameState.players.find(p => p.id === myId);
  if (me) renderChanceCards(me.chanceCards || []);

  if (myHand.length > 0) {
    renderHand(myHand, isMyTurn && !potionMode && !alchBoostMode, potionMode || alchBoostMode, handleCardPlay);
  }
}

function renderChanceCards(cards) {
  const inv = document.getElementById("inventory");
  inv.innerHTML = "";
  if (cards.length === 0) return;

  const label = document.createElement("div");
  label.className = "chance-label";
  label.textContent = "✦ 찬스 카드";
  inv.appendChild(label);

  cards.forEach(card => {
    const btn = document.createElement("button");
    btn.className = "inv-btn";
    btn.title = `${card.name}: ${card.desc}`;
    btn.innerHTML = `${card.icon}<span class="inv-name">${card.name}</span>`;
    btn.onclick = () => socket.emit("use-chance-card", { cardId: card.id });
    inv.appendChild(btn);
  });
}

function handleCardPlay(cardIndex, isSpecialMode) {
  if (alchBoostMode) {
    socket.emit("alch-boost-discard", { cardIndex });
    alchBoostMode = false;
    document.getElementById("alch-boost-banner").style.display = "none";
  } else if (isSpecialMode) {
    socket.emit("potion-discard", { cardIndex });
    potionMode = false;
    document.getElementById("potion-banner").style.display = "none";
  } else {
    socket.emit("play-card", { cardIndex });
  }
}
