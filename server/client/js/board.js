// 24칸 보드 - 모서리(0,6,12,18) + 각 변 5칸
const CELL_CONFIG = {
  start:            { icon:"🏠", label:"출발",       cls:"cell-start",    desc:"시작점! 지날 때마다 카드 1장 드로우." },
  normal:           { icon:"",   label:"",           cls:"cell-normal",   desc:"" },
  trap:             { icon:"💀", label:"독함정",     cls:"cell-trap",     desc:"독 함정! 카드 2장을 드로우합니다." },
  chance:           { icon:"🎴", label:"찬스",       cls:"cell-chance",   desc:"찬스 칸! 찬스 카드 1장을 획득합니다." },
  alchemy:          { icon:"⚗️", label:"연금술",    cls:"cell-alchemy",  desc:"연금술! 플레이어 지정 카드 2장 강제 드로우." },
  reverse:          { icon:"🌀", label:"역류",       cls:"cell-reverse",  desc:"역류! 다음 턴 뒤로 이동합니다." },
  thunder:          { icon:"⚡", label:"번개",       cls:"cell-thunder",  desc:"번개! 모든 플레이어 카드 1장 드로우." },
  crystal:          { icon:"🔮", label:"수정구슬",   cls:"cell-crystal",  desc:"수정구슬! 손패 카드 1장 골라 버리기." },
  ingredient_fire:  { icon:"🔥", label:"불꽃의 정수", cls:"cell-ing-fire",  desc:"불꽃의 정수 획득! 물약 재료입니다." },
  ingredient_water: { icon:"💧", label:"물의 정수",   cls:"cell-ing-water", desc:"물의 정수 획득! 물약 재료입니다." },
  ingredient_earth: { icon:"🌿", label:"대지의 정수", cls:"cell-ing-earth", desc:"대지의 정수 획득! 물약 재료입니다." },
  ingredient_wind:  { icon:"🌪️", label:"바람의 정수", cls:"cell-ing-wind",  desc:"바람의 정수 획득! 물약 재료입니다." },
};

function initBoard(boardData) {
  boardData.forEach(cell => {
    const el = document.getElementById("cell-" + cell.index);
    if (!el) return;
    const cfg = CELL_CONFIG[cell.type] || CELL_CONFIG.normal;

    // 기존 클래스 유지하고 타입 클래스 추가
    el.classList.add(cfg.cls);
    el.dataset.index = cell.index;
    el.dataset.desc = cfg.desc || "";
    el.dataset.type = cell.type;

    el.innerHTML = `
      <div class="cell-inner">
        <span class="cell-icon">${cfg.icon}</span>
        ${cfg.label ? `<span class="cell-label">${cfg.label}</span>` : ""}
        <span class="cell-num">${cell.index}</span>
        <div class="cell-players" id="players-${cell.index}"></div>
      </div>
    `;

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
    token.title = p.name + (p.isBot ? " (봇)" : "");
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
