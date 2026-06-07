const SUIT_SYMBOLS = { spade:"♠", heart:"♥", diamond:"♦", club:"♣" };
const SUIT_COLORS  = { spade:"black", heart:"red", diamond:"red", club:"black" };

function renderHand(hand, isActive, isSpecialMode, onCardSelect) {
  const container = document.getElementById("hand-cards");
  const countLabel = document.getElementById("hand-count-label");
  const actionStatus = document.getElementById("action-status");
  const playBtn = document.getElementById("btn-play-card");
  container.innerHTML = "";

  if (countLabel) countLabel.textContent = `(${hand.length}장)`;

  if (actionStatus) {
    if (isSpecialMode) actionStatus.textContent = "버릴 카드를 선택하세요";
    else if (isActive) actionStatus.textContent = "카드를 선택하세요";
    else actionStatus.textContent = "상대방의 턴입니다...";
  }

  let selectedIndex = -1;

  hand.forEach((card, i) => {
    const el = document.createElement("div");
    const isRed = card.suit === "heart" || card.suit === "diamond";
    const sym = SUIT_SYMBOLS[card.suit] || card.suit;

    el.className = "card" + (isRed ? " red" : "") +
      (!isActive ? " disabled" : "") +
      (isSpecialMode ? " highlight-mode" : "");

    el.innerHTML = `
      <div class="card-top">
        <div class="card-rank">${card.rank}</div>
        <div class="card-suit">${sym}</div>
      </div>
      <div class="card-center">${sym}</div>
      <div class="card-bottom">
        <div class="card-rank">${card.rank}</div>
        <div class="card-suit">${sym}</div>
      </div>
      <div class="card-move">${card.move}칸</div>
    `;

    if (isActive) {
      el.addEventListener("click", () => {
        container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        selectedIndex = i;
        if (playBtn) playBtn.disabled = false;
      });
    }
    container.appendChild(el);
  });

  if (playBtn) {
    playBtn.disabled = !isActive || selectedIndex < 0;
    // 기존 이벤트 제거 후 재등록
    const newBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newBtn, playBtn);
    newBtn.disabled = true;

    // 카드 클릭 이벤트에서 버튼 활성화
    container.querySelectorAll(".card").forEach((el, i) => {
      if (isActive) {
        el.addEventListener("click", () => {
          newBtn.disabled = false;
          newBtn.onclick = () => {
            onCardSelect(i, isSpecialMode);
            container.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
            newBtn.disabled = true;
          };
        });
      }
    });
  }
}

window.renderHand = renderHand;
