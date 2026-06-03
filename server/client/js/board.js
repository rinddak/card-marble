const CELL_CONFIG = {
  start:   { icon:"🏠", label:"출발",     cls:"cell-start",   desc:"게임의 시작점입니다. 이 칸을 지날 때마다 카드 1장을 드로우합니다." },
  normal:  { icon:"",   label:"",         cls:"cell-normal",  desc:"" },
  trap:    { icon:"💀", label:"독함정",   cls:"cell-trap",    desc:"독 함정! 카드 2장을 드로우해야 합니다. 손패가 늘어나 불리해집니다." },
  chance:  { icon:"🎴", label:"찬스",     cls:"cell-chance",  desc:"찬스 칸! 찬스 카드 1장을 획득합니다. 나중에 원할 때 사용하세요." },
  alchemy: { icon:"⚗️", label:"연금술",  cls:"cell-alchemy", desc:"연금술 칸! 다른 플레이어에게서 카드 1장을 빼앗습니다." },
  reverse: { icon:"🌀", label:"역류",     cls:"cell-reverse", desc:"역류 칸! 다음 턴에 뒤로 이동하게 됩니다." },
  thunder: { icon:"⚡", label:"번개",     cls:"cell-thunder", desc:"번개 칸! 모든 플레이어가 카드 1장씩 드로우합니다." },
  crystal: { icon:"🔮", label:"수정구슬", cls:"cell-crystal", desc:"수정구슬 칸! 손패에서 원하는 카드 1장을 골라 버릴 수 있습니다." },
};

function initBoard(boardData) {
  boardData.forEach(cell => {
    const el = document.getElementById("cell-" + cell.index);
    if (!el) return;
    const cfg = CELL_CONFIG[cell.type] || CELL_CONFIG.normal;
    el.classList.add(cfg.cls);
    el.dataset.index = cell.index;
    el.dataset.desc = cfg.desc;

    el.innerHTML = `
      <div class="cell-inner">
        <span class="cell-icon">${cfg.icon}</span>
        ${cfg.label ? `<span class="cell-label">${cfg.label}</span>` : ""}
        <span class="cell-num">${cell.index}</span>
        <div class="cell-players" id="players-${cell.index}"></div>
      </div>
    `;

    // 클릭 시 설명 팝업
    if (cfg.desc) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => showCellDesc(cfg.icon, cfg.label, cfg.desc));
    }
  });
}

function showCellDesc(icon, label, desc) {
  const modal = document.getElementById("cell-desc-modal");
  document.getElementById("cell-desc-icon").textContent = icon;
  document.getElementById("cell-desc-title").textContent = label;
  document.getElementById("cell-desc-text").textContent = desc;
  modal.style.display = "flex";
}

function updatePlayers(playersData) {
  document.querySelectorAll(".cell-players").forEach(el => el.innerHTML = "");
  if (!playersData) return;
  playersData.forEach(p => {
    const container = document.getElementById("players-" + p.pos);
    if (!container) return;
    const token = document.createElement("div");
    token.className = "player-token";
    token.style.background = p.color;
    token.style.boxShadow = `0 0 8px ${p.color}`;
    token.textContent = p.name[0];
    token.title = p.name;
    container.appendChild(token);
  });
}

function drawBoard(canvas, boardData, playersData) {
  if (!window._boardInited) {
    initBoard(boardData);
    window._boardInited = true;
  }
  updatePlayers(playersData);
}

window.drawBoard = drawBoard;
window.showCellDesc = showCellDesc;
