function renderHand(hand, isMyTurn, potionMode, onCardSelect) {
  const container = document.getElementById("hand-cards");
  const actionBtns = document.getElementById("action-buttons");
  container.innerHTML = "";

  // Play 버튼이 없으면 추가
  let playBtn = document.getElementById("btn-play-card");
  if (!playBtn) {
    playBtn = document.createElement("button");
    playBtn.id = "btn-play-card";
    playBtn.textContent = "카드 내기";
    actionBtns.prepend(playBtn);
  }

  let selectedIndex = -1;

  hand.forEach((card, i) => {
    const el = document.createElement("div");
    const isRed = card.suit === "heart" || card.suit === "diamond";
    el.className = "card" + (isRed ? " red" : "") + (isMyTurn ? "" : " disabled");

    const suitSymbols = { spade:"♠", heart:"♥", diamond:"♦", club:"♣" };

    el.innerHTML = `
      <div class="card-rank">${card.rank}</div>
      <div class="card-suit">${suitSymbols[card.suit] || card.suit}</div>
      <div class="card-move">${card.move}칸</div>
    `;

    if (isMyTurn) {
      el.addEventListener("click", () => {
        container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        selectedIndex = i;
      });
    }
    container.appendChild(el);
  });

  playBtn.disabled = !isMyTurn;
  playBtn.onclick = () => {
    if (selectedIndex < 0) return alert("카드를 선택해주세요.");
    onCardSelect(selectedIndex, potionMode);
    selectedIndex = -1;
    container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
  };
}

window.renderHand = renderHand;