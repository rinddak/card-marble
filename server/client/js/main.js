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
    showMultiSelectBanner("cauldron", "🫕 가마솥! 버릴 카드를 최대 2장 선택하세요.", 2);
  } else { cauldronMode = false; }

  // 불순물 정제
  if (state.impurityPlayer === myId) {
    impurityMode = true;
    showMultiSelectBanner("impurity", "⚗️ 불순물 정제! 버릴 카드를 최대 2장 선택하세요.", 2);
  } else { impurityMode = false; }

  // 시공간 도약
  if (state.spacetimeLeapPlayer === myId) {
    spacetimeMode = true;
    showSpacetimeModal();
  }
}); // 👈👈 최종적으로 여기서 이벤트 리스너를 닫습니다!

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

function showMultiSelectBanner(type, msg, maxCount) {
  const banner = document.getElementById("multi-select-banner");
  if (!banner) return;
  document.getElementById("multi-select-msg").textContent = msg;
  banner.style.display = "block";

  const confirmBtn = document.getElementById("btn-multi-confirm");
  
  // 기존 onclick 이벤트를 초기화하기 위해 화살표 함수 대신 
  // 새 함수를 할당하거나 리스너를 교체하는 방식이 안전합니다.
  confirmBtn.onclick = () => {
    // 1. 현재 모드에 따라 선택된 데이터 참조
    const selected = (type === "cauldron") ? cauldronSelected : impuritySelected;
    
    // 2. 예외 처리: 카드가 선택되지 않았을 때
    if (selected.length === 0) {
      alert("카드를 최소 1장 이상 선택해주세요!");
      return;
    }

    // 3. 서버로 전송
    if (type === "cauldron") {
      socket.emit("cauldron-discard", { cardIndices: selected });
      cauldronMode = false;
      cauldronSelected = []; // 초기화
    } else {
      socket.emit("impurity-discard", { cardIndices: selected });
      impurityMode = false;
      impuritySelected = []; // 초기화
    }

    // 4. UI 닫기 및 초기화
    banner.style.display = "none";
    document.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
  };
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
let cauldronSelected = [];

// 불순물 정제 - 다중 선택 모드
let impurityMode = false;
let impuritySelected = [];

// 시공간 도약 모드
let spacetimeMode = false;
let spacetimeCardIndex = -1;

function handleCardPlay(cardIndex, isSpecialMode) {
  if (cauldronMode) {
    // 가마솥: 다중 선택
    const idx = cauldronSelected.indexOf(cardIndex);
    if (idx >= 0) cauldronSelected.splice(idx, 1);
    else if (cauldronSelected.length < 2) cauldronSelected.push(cardIndex);
    // 선택 표시
    document.querySelectorAll(".card").forEach((el, i) => {
      el.classList.toggle("selected", cauldronSelected.includes(i));
    });
    return;
  }
  if (impurityMode) {
    const idx = impuritySelected.indexOf(cardIndex);
    if (idx >= 0) impuritySelected.splice(idx, 1);
    else if (impuritySelected.length < 2) impuritySelected.push(cardIndex);
    document.querySelectorAll(".card").forEach((el, i) => {
      el.classList.toggle("selected", impuritySelected.includes(i));
    });
    return;
  }
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
