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

// ── 대기실 ──
document.getElementById("btn-start").addEventListener("click", () => socket.emit("start-game"));

// ── 게임 버튼 ──
document.getElementById("btn-draw").addEventListener("click", () => socket.emit("draw-card"));

document.getElementById("btn-potion-pass").addEventListener("click", () => {
  potionMode = false;
  document.getElementById("potion-banner").style.display = "none";
  socket.emit("potion-pass");
  const isMyTurn = gameState?.currentTurn === myId;
  renderHand(myHand, isMyTurn, false, handleCardPlay);
});

document.getElementById("btn-restart").addEventListener("click", () => {
  window._boardInited = false;
  potionMode = false;
  alchBoostMode = false;
  showScreen("lobby-screen");
});

// ── 모달 닫기 ──
document.getElementById("cell-desc-close").addEventListener("click", () => {
  document.getElementById("cell-desc-modal").style.display = "none";
});
document.getElementById("ingredient-warning-close").addEventListener("click", () => {
  document.getElementById("ingredient-warning-modal").style.display = "none";
});
document.getElementById("target-select-cancel").addEventListener("click", () => {
  document.getElementById("target-select-modal").style.display = "none";
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
    li.innerHTML = `<span class="player-dot" style="background:${p.color}"></span>
      ${p.name}${p.isBot ? " 🤖" : ""}`;
    list.appendChild(li);
  });
  if (isHost) {
    const btn = document.getElementById("btn-start");
    btn.textContent = state.players.length === 1 ? "혼자 연습하기" : "실험 시작!";
  }
});

socket.on("game-started", (state) => {
  gameState = state;
  window._boardInited = false;
  potionMode = false;
  alchBoostMode = false;
  showScreen("game-screen");
  addLog("✦ 연금술 실험 시작!", true);
  renderGameState();
});

socket.on("game-updated", (state) => {
  gameState = state;
  renderGameState();

  // 연금술 타겟 선택
  if (state.alchemySelectPlayer === myId) showTargetSelect("alchemy");
  // 시간 역행 타겟 선택
  if (state.timeReversePlayer === myId) showTargetSelect("time-reverse");
  // 연금술 촉진 모드
  if (state.alchBoostPlayer === myId) {
    alchBoostMode = true;
    document.getElementById("alch-boost-banner").style.display = "block";
    renderHand(myHand, true, true, handleCardPlay);
  } else if (state.alchBoostPlayer !== myId) {
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

  // 덱 카운트 업데이트
  const deckEl = document.getElementById("deck-count");
  if (deckEl) deckEl.textContent = state.deckCount;

  // 👇👇 가마솥 등 새 로직들을 이벤트 리스너 안으로 넣었습니다 👇👇

  // 가마솥
  if (state.cauldronPlayer === myId) {
    cauldronMode = true;
    startMultiSelectUI("🫕 가마솥! 버릴 카드를 선택하고 [선택 완료]를 누르세요.");
  } else { cauldronMode = false; }

  // 불순물 정제
  if (state.impurityPlayer === myId) {
    impurityMode = true;
    startMultiSelectUI("⚗️ 불순물 정제! 버릴 카드를 선택하고 [선택 완료]를 누르세요.");
  } else { impurityMode = false; }

  // 시공간 도약
  if (state.spacetimeLeapPlayer === myId) {
    spacetimeMode = true;
    showSpacetimeModal();
  }
});

socket.on("hand-updated", ({ hand }) => {
  myHand = hand;
  const isMyTurn = gameState && gameState.currentTurn === myId;
  const canPlay = isMyTurn && !potionMode && !alchBoostMode;
  renderHand(myHand, canPlay || potionMode || alchBoostMode,
    potionMode || alchBoostMode, handleCardPlay);
});

socket.on("cell-events", ({ events }) => {
  events.forEach(e => {
    if (e.message) addLog(e.message, e.type !== "ingredient_already");
  });
});

socket.on("ingredient-warning", ({ message }) => showIngredientWarning(message));

socket.on("game-over", ({ winnerName, winnerId }) => {
  const isMe = winnerId === myId;
  document.getElementById("result-title").textContent =
    isMe ? "🏆 물약 완성!" : "실험 실패...";
  document.getElementById("result-winner").textContent =
    `${winnerName}이(가) 승리했습니다!`;

  // 최종 재료/카드 수 표시
  if (gameState) {
    const details = document.getElementById("result-details");
    details.innerHTML = gameState.players.map(p =>
      `<div>${p.name}: 카드 ${p.handCount}장 남음, 재료 ${p.ingredients.length}/4</div>`
    ).join("");
  }
  showScreen("result-screen");
  addLog(`✦ ${winnerName} 승리!`, true);
});

socket.on("error", ({ message }) => {
  addLog("⚠️ " + message, false, true);
  if (message.includes("재료")) showIngredientWarning(message);
});

// ── 타겟 선택 ──
function showTargetSelect(type) {
  const modal = document.getElementById("target-select-modal");
  const title = document.getElementById("target-select-title");
  const list = document.getElementById("target-select-list");

  title.textContent = type === "alchemy"
    ? "⚗️ 연금술 - 공격할 플레이어를 선택하세요"
    : "🔄 시간 역행 - 대상 플레이어를 선택하세요";

  list.innerHTML = "";
  if (!gameState) return;
  gameState.players.filter(p => p.id !== myId).forEach(p => {
    const btn = document.createElement("button");
    btn.className = "target-btn";
    btn.innerHTML = `
      <span class="player-dot" style="background:${p.color}"></span>
      <span style="flex:1">${p.name}${p.isBot ? " 🤖" : ""}</span>
      <span style="font-size:.82rem;color:var(--text-muted)">패 ${p.handCount}장</span>
      ${p.protected ? '<span>🛡️</span>' : ""}
    `;
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
  document.getElementById("ingredient-warning-text").textContent = msg;
  document.getElementById("ingredient-warning-modal").style.display = "flex";
}

// ── 렌더링 ──
function renderGameState() {
  if (!gameState) return;
  drawBoard(null, gameState.board, gameState.players);
  updatePlayerInfoList(gameState.players, gameState.currentTurn, myId);
  // ▼ 규칙 추가: 리스트 아래에 규칙을 삽입하는 코드입니다 ▼
  const list = document.getElementById("player-list");
  if (list && !document.getElementById("game-rule-text")) {
      const ruleDiv = document.createElement("div");
      ruleDiv.id = "game-rule-text";
      ruleDiv.style.cssText = "font-size: 0.8rem; color: #aaa; margin-top: 15px; padding: 10px; border-top: 1px solid #444; line-height: 1.4;";
      ruleDiv.innerHTML = "📜 <b>실험 목표:</b><br>재료 4종(🔥💧🌿🌪️)을 모두 모으고,<br>손패의 카드를 모두 소진하세요!";
      list.appendChild(ruleDiv);
  }
  // ▲ 규칙 추가 끝 ▲
  updateTurnBanner(gameState.players, gameState.currentTurn, myId);

  const isMyTurn = gameState.currentTurn === myId;
  const drawBtn = document.getElementById("btn-draw");
  if (drawBtn) drawBtn.disabled = !isMyTurn || potionMode || alchBoostMode;

  const me = gameState.players.find(p => p.id === myId);
  if (me) {
    renderIngredients(me.ingredients || []);
    renderChanceCards(me.chanceCards || []);
  }

  const deckEl = document.getElementById("deck-count");
  if (deckEl) deckEl.textContent = gameState.deckCount;
}

function renderIngredients(ingredients) {
  const box = document.getElementById("ingredient-box");
  if (!box) return;
  const all = [
    { id:"fire",  icon:"🔥", name:"불꽃의 정수" },
    { id:"water", icon:"💧", name:"물의 정수"   },
    { id:"earth", icon:"🌿", name:"대지의 정수" },
    { id:"wind",  icon:"🌪️", name:"바람의 정수" },
  ];
  box.innerHTML = all.map(ing => {
    const got = ingredients.includes(ing.id);
    return `<div class="ing-item ${got ? "ing-got" : "ing-empty"}">
      <span class="ing-icon">${ing.icon}</span>
      <span class="ing-name">${ing.name}</span>
    </div>`;
  }).join("");
}

function renderChanceCards(cards) {
  const inv = document.getElementById("inventory");
  if (!inv) return;
  inv.innerHTML = "";
  if (cards.length === 0) {
    inv.innerHTML = "<div class='chance-empty'>보유한 찬스 카드 없음</div>";
    return;
  }
  cards.forEach(card => {
    const btn = document.createElement("button");
    const isLegendary = card.rarity === "legendary";
    btn.className = "inv-btn" + (isLegendary ? " legendary" : "");
    btn.title = `${card.name}: ${card.desc}`;
    btn.innerHTML = `<span class="inv-icon">${card.icon}</span><span class="inv-name">${card.name}</span>`;
    btn.onclick = () => socket.emit("use-chance-card", { cardId:card.id });
    inv.appendChild(btn);
  });
}

function showSpacetimeModal() {
  // 카드 선택 후 칸 선택 UI
  const modal = document.getElementById("spacetime-modal");
  if (!modal) return;

  // 먼저 카드 선택 안내
  document.getElementById("spacetime-step").textContent = "1단계: 내보낼 카드를 손패에서 선택하세요.";
  modal.style.display = "flex";

  // 카드 선택 → 칸 선택으로 이동
  document.getElementById("spacetime-card-done").onclick = () => {
    if (spacetimeCardIndex < 0) return alert("카드를 먼저 선택하세요!");
    document.getElementById("spacetime-step1").style.display = "none";
    document.getElementById("spacetime-step2").style.display = "block";
    renderCellSelector();
  };
}

function renderCellSelector() {
  const grid = document.getElementById("spacetime-cell-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const btn = document.createElement("button");
    btn.className = "cell-select-btn";
    btn.textContent = i;
    btn.onclick = () => {
      socket.emit("spacetime-leap", { cardIndex:spacetimeCardIndex, targetCell:i });
      document.getElementById("spacetime-modal").style.display = "none";
      spacetimeMode = false; spacetimeCardIndex = -1;
    };
    grid.appendChild(btn);
  }
}

// 가마솥 - 다중 선택 모드
let cauldronMode = false;


// 불순물 정제 - 다중 선택 모드
let impurityMode = false;


// 시공간 도약 모드
let spacetimeMode = false;
let spacetimeCardIndex = -1;

// 2. handleCardPlay 함수 교체 (가마솥/불순물 관련 불필요한 코드 삭제)
function handleCardPlay(cardIndex, isSpecialMode) {
  if (spacetimeMode) {
    spacetimeCardIndex = cardIndex;
    document.getElementById("spacetime-step").textContent =
      `카드 ${cardIndex + 1}번 선택됨. 이동할 칸을 선택하세요.`;
    return;
  }
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

// ── 다중 선택 (가마솥, 불순물 정제) 직관적 UI 처리 ──
let multiSelectedIndices = [];

function startMultiSelectUI(msg) {
  multiSelectedIndices = [];
  const statusEl = document.getElementById("action-status");
  if (statusEl) {
    statusEl.innerHTML = `<span>${msg}</span>`;
    statusEl.style.display = "block";
    statusEl.style.color = "#ffcc00";
    statusEl.style.marginBottom = "10px";
  }
  const playBtn = document.getElementById("btn-play-card");
  if (playBtn) {
    playBtn.innerHTML = `<span class="btn-icon">✨</span> 선택 완료`;
  }
}

// 1. 손패 클릭 가로채기 (가마솥/불순물 모드일 때만 작동)
document.getElementById("hand-cards").addEventListener("click", (e) => {
  if (!cauldronMode && !impurityMode) return;
  
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  e.stopPropagation(); // 기존 1장 선택 로직 막기

  const allCards = Array.from(document.querySelectorAll("#hand-cards .card"));
  const idx = allCards.indexOf(cardEl);

  const selIdx = multiSelectedIndices.indexOf(idx);
  if (selIdx >= 0) {
    // 이미 선택된 경우 -> 선택 해제 (원래 위치로 복구)
    multiSelectedIndices.splice(selIdx, 1);
    cardEl.style.transform = "translateY(0)";
    cardEl.style.boxShadow = "none";
    cardEl.style.border = "none";
  } else {
    // 새로 선택하는 경우 (위로 띄우고 형광색 빛 효과)
    if (multiSelectedIndices.length < 2) {
      multiSelectedIndices.push(idx);
      cardEl.style.transform = "translateY(-20px)";
      cardEl.style.boxShadow = "0 0 15px #00ffcc";
      cardEl.style.border = "2px solid #00ffcc";
      cardEl.style.borderRadius = "8px";
    } else {
      alert("최대 2장까지만 선택할 수 있습니다.");
    }
  }
}, true); // true = 캡처링 단계에서 우선 가로채기

// 2. [카드 내기] 버튼 가로채기
// 기존의 btn-play-card 관련 모든 addEventListener를 지우고 아래 코드를 넣어주세요
document.getElementById("btn-play-card").addEventListener("click", () => {
  // 1. 가마솥 / 불순물 모드일 때
  if (cauldronMode || impurityMode) {
    if (multiSelectedIndices.length === 0) {
      return alert("버릴 카드를 1장 이상 선택해주세요!");
    }

    const eventName = cauldronMode ? "cauldron-discard" : "impurity-discard";
    socket.emit(eventName, { cardIndices: multiSelectedIndices });

    // UI 초기화
    cauldronMode = false;
    impurityMode = false;
    multiSelectedIndices = [];
    document.getElementById("action-status").style.display = "none";
    document.getElementById("btn-play-card").innerHTML = `<span class="btn-icon">⚗️</span> 카드 내기`;
    document.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
    return; // 여기서 종료
  }

  // 2. 일반 카드 내기 모드 (기존 hand.js 시스템 사용)
  // hand.js에서 선택된 카드 정보를 가져와야 합니다.
  const selectedCard = document.querySelector("#hand-cards .card.selected");
  if (!selectedCard) {
    return alert("먼저 카드를 클릭해서 선택해주세요!");
  }
  
  // 선택된 카드의 인덱스를 찾아야 함
  const allCards = Array.from(document.querySelectorAll("#hand-cards .card"));
  const cardIndex = allCards.indexOf(selectedCard);
  
  if (cardIndex >= 0) {
    handleCardPlay(cardIndex, false);
    selectedCard.classList.remove("selected"); // 선택 해제
  }
});
