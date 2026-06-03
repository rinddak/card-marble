const CELL_CONFIG = {
  start:    { icon:"🏠", label:"출발",      class:"cell-start"    },
  normal:   { icon:"",   label:"",          class:"cell-normal"   },
  potion:   { icon:"🧪", label:"물약찬스",  class:"cell-potion"   },
  trap:     { icon:"💀", label:"독함정",    class:"cell-trap"     },
  alchemy:  { icon:"⚗️", label:"연금술",   class:"cell-alchemy"  },
  reverse:  { icon:"🌀", label:"역류",      class:"cell-reverse"  },
  shortcut: { icon:"⭐", label:"지름길",   class:"cell-shortcut" },
  shop:     { icon:"🏪", label:"아이템상점", class:"cell-shop"    },
  thunder:  { icon:"⚡", label:"번개",      class:"cell-thunder"  },
  crystal:  { icon:"🔮", label:"수정구슬",  class:"cell-crystal"  },
};

function initBoard(boardData) {
  boardData.forEach(cell => {
    const el = document.getElementById("cell-" + cell.index);
    if (!el) return;
    const cfg = CELL_CONFIG[cell.type] || CELL_CONFIG.normal;

    el.className = el.className + " " + cfg.class;
    el.dataset.index = cell.index;

    el.innerHTML = `
      <div class="cell-inner">
        <span class="cell-icon">${cfg.icon}</span>
        ${cfg.label ? `<span class="cell-label">${cfg.label}</span>` : ""}
        <span class="cell-num">${cell.index}</span>
        <div class="cell-players" id="players-${cell.index}"></div>
      </div>
    `;
  });
}

function updatePlayers(playersData) {
  // 모든 플레이어 말 초기화
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
  // 첫 호출 시 보드 초기화
  if (!window._boardInited) {
    initBoard(boardData);
    window._boardInited = true;
  }
  updatePlayers(playersData);
}

window.drawBoard = drawBoard;
