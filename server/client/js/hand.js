const SUIT_SYMBOLS = { spade:"♠", heart:"♥", diamond:"♦", club:"♣" };

function renderHand(hand, isActive, isSpecialMode, onCardSelect) {
  const container = document.getElementById("hand-cards");
  const countLabel = document.getElementById("hand-count-label");
  const actionStatus = document.getElementById("action-status");
  container.innerHTML = "";

  if (countLabel) countLabel.textContent = `(${hand.length}장)`;
  if (actionStatus) {
    if (isSpecialMode) actionStatus.textContent = "⬆ 버릴 카드를 클릭하세요";
    else if (isActive) actionStatus.textContent = "✦ 카드 선택 후 내기 버튼";
    else actionStatus.textContent = "⏳ 상대방 턴...";
  }

  // 카드 내기 버튼 초기화 (이벤트 중복 방지)
  const oldBtn = document.getElementById("btn-play-card");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  newBtn.disabled = true;

  hand.forEach((card, i) => {
    const isRed = card.suit === "heart" || card.suit === "diamond";
    const sym = SUIT_SYMBOLS[card.suit] || card.suit;
    const el = document.createElement("div");
    el.className = "card " + (isRed ? "red" : "black") +
      (!isActive ? " disabled" : "") +
      (isSpecialMode ? " highlight-mode" : "");
    el.dataset.move = card.move;

    el.innerHTML = `
      <div class="card-corner">
        <div class="card-rank-small">${card.rank}</div>
        <div class="card-suit-small">${sym}</div>
      </div>
      <div class="card-move-display">
        <div class="card-move-symbol">⏩</div>
        <div class="card-move-number">${card.move}</div>
      </div>
    `;

    if (isActive) {
      el.addEventListener("click", () => {
        container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        newBtn.disabled = false;
        newBtn.onclick = () => {
          onCardSelect(i, isSpecialMode);
          container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
          newBtn.disabled = true;
        };
      });
    }
    container.appendChild(el);
  });
}

window.renderHand = renderHand;
