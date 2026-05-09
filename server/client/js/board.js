// client/js/board.js
// 보드 구조:
// 캔버스 660x660
// 모서리 칸: 90x90
// 일반 칸 (위/아래변): 60x90
// 일반 칸 (좌/우변): 90x60
//
// 36칸 시계방향:
// 0        : 좌하단 모서리 (출발)
// 1~8      : 아래변 왼→오른
// 9        : 우하단 모서리
// 10~17    : 오른변 아래→위
// 18       : 우상단 모서리
// 19~26    : 위변 오른→왼
// 27       : 좌상단 모서리
// 28~35    : 왼변 위→아래

const C = 90;   // 모서리 크기
const W = 60;   // 일반 칸 너비
const BOARD_PX = C * 2 + W * 8; // 660

function getCellRect(index) {
  // ── 모서리 4칸 ──
  if (index === 0)  return { x: 0,          y: BOARD_PX - C, w: C, h: C }; // 좌하단
  if (index === 9)  return { x: BOARD_PX-C, y: BOARD_PX - C, w: C, h: C }; // 우하단
  if (index === 18) return { x: BOARD_PX-C, y: 0,            w: C, h: C }; // 우상단
  if (index === 27) return { x: 0,          y: 0,            w: C, h: C }; // 좌상단

  // ── 아래변: 1~8 (왼→오른, y = 하단) ──
  if (index >= 1 && index <= 8) {
    return { x: C + (index - 1) * W, y: BOARD_PX - C, w: W, h: C };
  }

  // ── 오른변: 10~17 (아래→위, x = 우측) ──
  if (index >= 10 && index <= 17) {
    return { x: BOARD_PX - C, y: BOARD_PX - C - (index - 9) * W, w: C, h: W };
  }

  // ── 위변: 19~26 (오른→왼, y = 상단) ──
  if (index >= 19 && index <= 26) {
    return { x: BOARD_PX - C - (index - 18) * W, y: 0, w: W, h: C };
  }

  // ── 왼변: 28~35 (위→아래, x = 좌측) ──
  if (index >= 28 && index <= 35) {
    return { x: 0, y: C + (index - 28) * W, w: C, h: W };
  }

  return { x: 0, y: 0, w: W, h: W };
}

const CELL_STYLES = {
  start:    { bg:"#3b1f0a", border:"#cd853f", icon:"🏠", label:"출발"      },
  normal:   { bg:"#12122a", border:"#2d2d5e", icon:"",   label:""          },
  potion:   { bg:"#0b3326", border:"#00b894", icon:"🧪", label:"물약찬스"  },
  trap:     { bg:"#3b0d0d", border:"#d63031", icon:"💀", label:"독함정"    },
  alchemy:  { bg:"#1a0d3b", border:"#6c5ce7", icon:"⚗️", label:"연금술"   },
  reverse:  { bg:"#3b2200", border:"#e17055", icon:"🌀", label:"역류"      },
  shortcut: { bg:"#0b3320", border:"#00cec9", icon:"⭐", label:"지름길"   },
  shop:     { bg:"#3b2e00", border:"#fdcb6e", icon:"🏪", label:"아이템상점" },
  thunder:  { bg:"#2a2a00", border:"#f9ca24", icon:"⚡", label:"번개"      },
  crystal:  { bg:"#001a3b", border:"#74b9ff", icon:"🔮", label:"수정구슬"  },
};

function drawCell(ctx, cell) {
  const r = getCellRect(cell.index);
  const s = CELL_STYLES[cell.type] || CELL_STYLES.normal;
  const isCorner = [0, 9, 18, 27].includes(cell.index);
  const pad = 2;

  // 배경
  ctx.shadowColor = s.border;
  ctx.shadowBlur = isCorner ? 16 : 5;
  ctx.fillStyle = s.bg;
  ctx.beginPath();
  ctx.roundRect(r.x + pad, r.y + pad, r.w - pad*2, r.h - pad*2, isCorner ? 10 : 5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 테두리
  ctx.strokeStyle = s.border;
  ctx.lineWidth = isCorner ? 2 : 1.2;
  ctx.stroke();

  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

// 아이콘
  if (s.icon) {
    ctx.font = isCorner ? "32px serif" : "18px serif"; /* 기존 28 / 15 */
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.icon, cx, s.label ? cy - (isCorner ? 14 : 8) : cy);
  }

  // 레이블
  if (s.label) {
    ctx.fillStyle = s.border;
    ctx.font = `bold ${isCorner ? 11 : 8}px sans-serif`; /* 기존 9 / 6.5 */
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(s.label, cx, r.y + r.h - 4);
  }

  // 칸 번호
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "8.5px sans-serif"; /* 기존 7px */
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(cell.index, r.x + 4, r.y + 4);
}
function drawPlayers(ctx, playersData) {
  if (!playersData) return;

  const posGroups = {};
  playersData.forEach(p => {
    if (!posGroups[p.pos]) posGroups[p.pos] = [];
    posGroups[p.pos].push(p);
  });

  Object.entries(posGroups).forEach(([pos, players]) => {
    const r = getCellRect(parseInt(pos));
    const isCorner = [0,9,18,27].includes(parseInt(pos));
    const radius = isCorner ? 13 : 10;

    // 1~4명 오프셋 (칸 중앙 기준)
    const offsets4 = [
      {x:-14, y:-10}, {x:14, y:-10},
      {x:-14, y:10},  {x:14, y:10}
    ];
    const offsets2 = [{x:-10, y:0}, {x:10, y:0}];
    const offsets1 = [{x:0, y:0}];

    const offsets = players.length === 1 ? offsets1
                  : players.length === 2 ? offsets2
                  : offsets4;

    const baseCx = r.x + r.w / 2;
    const baseCy = r.y + r.h / 2;

    players.forEach((p, i) => {
      const off = offsets[i] || { x:0, y:0 };
      const px = baseCx + off.x;
      const py = baseCy + off.y;

      // 글로우
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;

      // 원
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 테두리
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 이름 첫 글자
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${isCorner ? 10 : 8}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name[0], px, py);
    });
  });
}

function drawBackground(ctx) {
  ctx.fillStyle = "#0a0a1f";
  ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  // 중앙 보라 글로우
  const grad = ctx.createRadialGradient(
    BOARD_PX/2, BOARD_PX/2, 30,
    BOARD_PX/2, BOARD_PX/2, 230
  );
  grad.addColorStop(0, "rgba(108,92,231,0.20)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  // 중앙 텍스트
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = "64px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#a29bfe";
  ctx.fillText("⚗️", BOARD_PX/2, BOARD_PX/2 - 28);
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("카드마블", BOARD_PX/2, BOARD_PX/2 + 30);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBoard(canvas, boardData, playersData) {
  // 모바일이면 화면 너비에 맞게 캔버스 축소
  const maxWidth = Math.min(window.innerWidth - 32, BOARD_PX);
  const scale = maxWidth / BOARD_PX;

  canvas.width = BOARD_PX;
  canvas.height = BOARD_PX;
  canvas.style.width = maxWidth + "px";
  canvas.style.height = maxWidth + "px";

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

  drawBackground(ctx);
  boardData.forEach(cell => drawCell(ctx, cell));
  drawPlayers(ctx, playersData);
}

window.drawBoard = drawBoard;
window.BOARD_PX = BOARD_PX;