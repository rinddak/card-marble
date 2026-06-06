const socket = io();

let myId = null;
let myRoomId = null;
let isHost = false;
let gameState = null;
let myHand = [];
let potionMode = false;
let alchBoostMode = false;
let selectedBotCount = 0;

// ── 로비 ──
document.getElementById("btn-single").addEventListener("click", () => {
  document.getElementById("btn-single").classList.add("active-mode");
  document.getElementById("btn-multi-mode").classList.remove("active-mode");
  document.getElementById("single-options").style.display = "block";
  document.getElementById("multi-options").style.display = "none";
});

document.getElementById("btn-multi-mode").addEventListener("click", () => {
  document.getElementById("btn-multi-mode").classList.add("active-mode");
  document.getElementById("btn-single").classList.remove("active-mode");
  document.getElementById("multi-options").style.display = "block";
  document.getElementById("single-options").style.display = "none";
});

document.querySelectorAll(".bot-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bot-btn").forEach(b => b.classList.remove("active-bot"));
    btn.classList.add("active-bot");
    selectedBotCount = parseInt(btn.dataset.bot);
  });
});

document.getElementById("btn-start-single").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  if (!name) return setLobbyError("닉네임을 입력해주세요.");
  socket.emit("start-single", { playerName:name, botCount:selectedBotCount });
});

document.getElementById("btn-create").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  if (!name) return setLobbyError("닉네임을 입력해주세요.");
  socket.emit("create-room", { playerName:name });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const row = document.getElementById("join-row");
  row.style.display = row.style.display === "none" ? "flex" : "none";
});

document.getElementById("btn-join-confirm").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  const roomId = document.getElementById("room-id-input").value.trim();
  if (!name) return setLobbyError("닉네임을 입력해주세요.");
  if (!roomId) return setLobbyError("방 코드를 입력해주세요.");
  socket.emit("join-room", { roomId, playerName:name });
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
  renderHand(myHand, gameState?.currentTurn === myId, false, handleCardPlay);
});

document.getElementById("btn-restart").addEventListener("click", () => {
  window._boardInited = false;
  showScreen("lobby-screen");
});

document.getElementById("cell-desc-close").addEventListener("click", () => {
  document.getElementById("cell-desc-modal").style.display = "none";
});

document.getElementById("ingredient-warning-close")?.addEventListener("click", () => {
  document.getElementById("ingredient-warning-modal").style.display = "none";
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
    li.innerHTML = `<span class="player-dot" style="background:${p.color}"></span> ${p.name}${p.isBot ? " 🤖" : ""}`;
    list.appendChild(li);
  });
  if (isHost) {
    document.getElementById("btn-start").textContent =
      state.players.length === 1 ? "혼자 연습하기" : "실험 시작!";
  }
});

socket.on("game-started", (state) => {
  gameState = state;
  window._boardInited = false;
  showScreen("game-screen");
  addLog("✦ 연금술 실험 시작!");
  renderGameState();
});

socket.on("game-updated", (state) => {
  gameState = state;
  renderGameState();

  // 연금술 타겟 선택
  if (state.alchemySelectPlayer === myId) {
    showTargetSelect("alchemy");
  }
  // 시간 역행 타겟 선택
  if (state.timeReversePlayer === myId) {
    showTargetSelect("time-reverse");
  }
  // 연금술 촉진 모드
  if (state.alchBoostPlayer === myId) {
    alchBoostMode = true;
    document.getElementById("alch-boost-banner").style.display = "block";
    renderHand(myHand, true, true, handleCardPlay);
  } else {
    alchBoostMode = false;
    document.getElementById("alch-boost-banner").style.display = "none";
  }
  // 수정구슬 모드
  if (state.potionChancePlayer === myId && !potionMode) {
    potionMode = true;
    document.getElementById("potion-banner").style.display = "block";
    renderHand(myHand, true, true, handleCardPlay);
  } else if (state.potionChancePlayer !== myId) {
    potionMode = false;
    document.getElementById("potion-banner").style.display = "none";
  }
});

socket.on("hand-updated", ({ hand }) => {
  myHand = hand;
  const isMyTurn = gameState && gameState.currentTurn === myId;
  const canPlay = (isMyTurn && !potionMode && !alchBoostMode) || potionMode || alchBoostMode;
  renderHand(myHand, canPlay, potionMode || alchBoostMode, handleCardPlay);
});

socket.on("cell-events", ({ events }) => {
  events.forEach(e => { if (e.message) addLog(e.message, true); });
});

socket.on("ingredient-warning", ({ message }) => {
  showIngredientWarning(message);
});

socket.on("game-over", ({ winnerName, winnerId }) => {
  const isMe = winnerId === myId;
  document.getElementById("result-title").textContent = isMe ? "🏆 물약 완성!" : "실험 실패...";
  document.getElementById("result-winner").textContent = `${winnerName} 승리!`;
  showScreen("result-screen");
  addLog(`✦ ${winnerName} 승리!`, true);
});

socket.on("error", ({ message }) => {
  addLog("⚠️ " + message);
  if (message.includes("재료")) showIngredientWarning(message);
});

// ── 타겟 선택 UI ──
function showTargetSelect(type) {
  const modal = document.getElementById("target-select-modal");
  const title = document.getElementById("target-select-title");
  const list = document.getElementById("target-select-list");

  title.textContent = type === "alchemy"
    ? "⚗️ 연금술 - 공격할 플레이어 선택"
    : "🔄 시간 역행 - 대상 플레이어 선택";

  list.innerHTML = "";
  gameState.players
    .filter(p => p.id !== myId)
    .forEach(p => {
      const btn = document.createElement("button");
      btn.className = "target-btn";
      btn.innerHTML = `<span class="player-dot" style="background:${p.color}"></span>
        ${p.name}${p.isBot ? " 🤖" : ""} (패 ${p.handCount}장)`;
      btn.onclick = () => {
        modal.style.display = "none";
        if (type === "alchemy") socket.emit("alchemy-target", { targetId:p.id });
        else socket.emit("time-reverse-target", { targetId:p.id });
      };
      list.appendChild(btn);
    });

  modal.style.display = "flex";
}

function showIngredientWarning(msg) {
  const modal = document.getElementById("ingredient-warning-modal");
  document.getElementById("ingredient-warning-text").textContent = msg;
  modal.style.display = "flex";
}

// ── 렌더링 ──
function renderGameState() {
  if (!gameState) return;
  drawBoard(null, gameState.board, gameState.players);
  updatePlayerInfoList(gameState.players, gameState.currentTurn, myId);
  updateTurnBanner(gameState.players, gameState.currentTurn, myId);

  const isMyTurn = gameState.currentTurn === myId;
  document.getElementById("btn-draw").disabled = !isMyTurn || potionMode || alchBoostMode;

  const me = gameState.players.find(p => p.id === myId);
  if (me) {
    renderChanceCards(me.chanceCards || []);
    renderIngredients(me.ingredients || []);
  }
}

function renderChanceCards(cards) {
  const inv = document.getElementById("inventory");
  inv.innerHTML = "";
  if (cards.length === 0) {
    inv.innerHTML = "<div class='chance-empty'>찬스 카드 없음</div>";
    return;
  }
  const label = document.createElement("div");
  label.className = "chance-label";
  label.textContent = "✦ 찬스 카드";
  inv.appendChild(label);
  cards.forEach(card => {
    const btn = document.createElement("button");
    btn.className = "inv-btn";
    btn.title = `${card.name}: ${card.desc}`;
    btn.innerHTML = `<span>${card.icon}</span><span class="inv-name">${card.name}</span>`;
    btn.onclick = () => {
      socket.emit("use-chance-card", { cardId:card.id });
    };
    inv.appendChild(btn);
  });
}

function renderIngredients(ingredients) {
  const box = document.getElementById("ingredient-box");
  if (!box) return;
  const all = [
    { id:"fire",  icon:"🔥", name:"불꽃" },
    { id:"water", icon:"💧", name:"물"   },
    { id:"earth", icon:"🌿", name:"대지" },
    { id:"wind",  icon:"🌪️", name:"바람" },
  ];
  box.innerHTML = `<div class='ing-label'>✦ 재료 (${ingredients.length}/4)</div>` +
    all.map(ing => `
      <div class="ing-item ${ingredients.includes(ing.id) ? "ing-got" : "ing-empty"}">
        <span>${ing.icon}</span>
        <span class="ing-name">${ing.name}</span>
      </div>
    `).join("");
}

function handleCardPlay(cardIndex, isSpecialMode) {
  if (alchBoostMode) {
    socket.emit("alch-boost-discard", { cardIndex });
    alchBoostMode = false;
    document.getElementById("alch-boost-banner").style.display = "none";
  } else if (isSpecialMode || potionMode) {
    socket.emit("potion-discard", { cardIndex });
    potionMode = false;
    document.getElementById("potion-banner").style.display = "none";
  } else {
    socket.emit("play-card", { cardIndex });
  }
}
