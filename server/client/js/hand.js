const SUIT_SYMBOLS = { spade:"♠", heart:"♥", diamond:"♦", club:"♣" };

function renderHand(hand, isActive, isSpecialMode, onCardSelect) {
  const container = document.getElementById("hand-cards");
  const countLabel = document.getElementById("hand-count-label");
  const actionStatus = document.getElementById("action-status");
  container.innerHTML = "";

  if (countLabel) countLabel.textContent = `(${hand.length}장)`;
  if (actionStatus) {
    if (isSpecialMode) actionStatus.textContent = "⬆ 버릴 카드를 선택하세요";
    else if (isActive) actionStatus.textContent = "✦ 카드를 선택 후 내기 버튼을 누르세요";
    else actionStatus.textContent = "⏳ 상대방의 턴입니다...";
  }

  // 카드 내기 버튼 재생성 (이벤트 중복 방지)
  const oldBtn = document.getElementById("btn-play-card");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  newBtn.disabled = true;

  let selectedIndex = -1;

  hand.forEach((card, i) => {
    const isRed = card.suit === "heart" || card.suit === "diamond";
    const colorClass = isRed ? "red" : "black";
    const sym = SUIT_SYMBOLS[card.suit] || card.suit;

    const el = document.createElement("div");
    el.className = "card " + colorClass +
      (!isActive ? " disabled" : "") +
      (isSpecialMode ? " highlight-mode" : "");

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
        selectedIndex = i;
        newBtn.disabled = false;
        newBtn.onclick = () => {
          onCardSelect(i, isSpecialMode);
          container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
          newBtn.disabled = true;
          selectedIndex = -1;
        };
      });
    }
    container.appendChild(el);
  });
}

window.renderHand = renderHand;
