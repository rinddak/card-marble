const CELL_CONFIG = {
  start:            { icon:"🏠", label:"출발",       cls:"cell-start",     desc:"시작점! 지날 때마다 카드 1장 드로우." },
  normal:           { icon:"",   label:"",           cls:"cell-normal",    desc:"" },
  trap:             { icon:"💀", label:"독함정",     cls:"cell-trap",      desc:"카드 2장 드로우!" },
  chance:           { icon:"🍀", label:"찬스",       cls:"cell-chance",    desc:"찬스 카드 1장 획득!" },
  alchemy:          { icon:"⚗️", label:"연금술",    cls:"cell-alchemy",   desc:"플레이어 지정 카드 2장 강제 드로우." },
  reverse:          { icon:"🌀", label:"역류",       cls:"cell-reverse",   desc:"다음 턴 뒤로 이동." },
  thunder:          { icon:"⚡", label:"번개",       cls:"cell-thunder",   desc:"모두 카드 1장 드로우." },
  crystal:          { icon:"🔮", label:"수정구슬",   cls:"cell-crystal",   desc:"손패 카드 1장 선택 버리기." },
  herb:             { icon:"🌱", label:"약초밭",     cls:"cell-herb",      desc:"카드 1장 드로우." },
  cauldron:         { icon:"🫕", label:"가마솥",     cls:"cell-cauldron",  desc:"카드 2장 버리고 1장 드로우." },
  wormhole:         { icon:"🌀", label:"웜홀",       cls:"cell-wormhole",  desc:"랜덤 칸으로 순간이동!" },
  magic_box:        { icon:"✨", label:"마법 상자",  cls:"cell-magic-box", desc:"전설급 찬스 카드 획득!" },
  ingredient_fire:  { icon:"🔥", label:"불꽃의 정수", cls:"cell-ing-fire",  desc:"불꽃의 정수 획득!" },
  ingredient_water: { icon:"💧", label:"물의 정수",   cls:"cell-ing-water", desc:"물의 정수 획득!" },
  ingredient_earth: { icon:"🌿", label:"대지의 정수", cls:"cell-ing-earth", desc:"대지의 정수 획득!" },
  ingredient_wind:  { icon:"🌪️", label:"바람의 정수", cls:"cell-ing-wind",  desc:"바람의 정수 획득!" },
};

function getCellConfig(cell) {
  return CELL_CONFIG[cell.type] || CELL_CONFIG[cell.baseType] || CELL_CONFIG.normal;
}

function initBoard(boardData) {
  boardData.forEach(cell => {
    const el = document.getElementById("cell-" + cell.index);
    if (!el) return;
    const cfg = getCellConfig(cell);
    el.className = el.className.split(" ")[0] + " " + cfg.cls;
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
      ${cell.hasMagicBox || cell.type === "magic_box" ? '<div class="magic-box-glow"></div>' : ""}
    `;

    if (cfg.desc) {
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        if (!e.target.closest(".player-token")) {
          showCellDesc(cfg.icon, cfg.label || "칸 정보", cfg.desc);
        }
      });
    }
  });
}

function showCellDesc(icon, label, desc) {
  const modal = document.getElementById("cell-desc-modal");
  if (!modal) return;
  document.getElementById("cell-desc-icon").textContent = icon;
  document.getElementById("cell-desc-title").textContent = label;
  document.getElementById("cell-desc-text").textContent = desc;
  modal.style.display = "flex";
}

function updateBoardState(boardData) {
  boardData.forEach(cell => {
    const el = document.getElementById("cell-" + cell.index);
    if (!el) return;
    const cfg = getCellConfig(cell);

    // 마법 상자 빛기둥
    const existingGlow = el.querySelector(".magic-box-glow");
    if (cell.hasMagicBox || cell.type === "magic_box") {
      el.classList.add("has-magic-box");
      if (!existingGlow) {
        const glow = document.createElement("div");
        glow.className = "magic-box-glow";
        el.appendChild(glow);
      }
    } else {
      el.classList.remove("has-magic-box");
      if (existingGlow) existingGlow.remove();
    }

    // 아이콘 업데이트 (상자가 생겼을 때)
    const iconEl = el.querySelector(".cell-icon");
    if (iconEl) iconEl.textContent = cfg.icon;
    const labelEl = el.querySelector(".cell-label");
    if (labelEl) labelEl.textContent = cfg.label;
  });
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
    token.style.boxShadow = `0 0 8px ${p.color}, 0 2px 6px rgba(0,0,0,0.5)`;
    token.textContent = p.name[0];
    token.title = p.name + (p.isBot ? " (봇)" : "");
    container.appendChild(token);
  });
}

function drawBoard(canvas, boardData, playersData) {
  if (!window._boardInited) {
    initBoard(boardData);
    window._boardInited = true;
  } else {
    updateBoardState(boardData);
  }
  updatePlayers(playersData);
}

window.drawBoard = drawBoard;
window.showCellDesc = showCellDesc;
