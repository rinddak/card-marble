const C = 90;
const W = 60;
const BOARD_PX = C * 2 + W * 8;

function getCellRect(index) {
  if (index === 0)  return { x: 0,          y: BOARD_PX - C, w: C, h: C };
  if (index === 9)  return { x: BOARD_PX-C, y: BOARD_PX - C, w: C, h: C };
  if (index === 18) return { x: BOARD_PX-C, y: 0,            w: C, h: C };
  if (index === 27) return { x: 0,          y: 0,            w: C, h: C };
  if (index >= 1  && index <= 8)  return { x: C + (index-1)*W,           y: BOARD_PX-C, w: W, h: C };
  if (index >= 10 && index <= 17) return { x: BOARD_PX-C, y: BOARD_PX-C-C-(index-10)*W, w: C, h: W };
  if (index >= 19 && index <= 26) return { x: BOARD_PX-C-(index-18)*W,   y: 0,          w: W, h: C };
  if (index >= 28 && index <= 35) return { x: 0,           y: C+(index-28)*W,            w: C, h: W };
  return { x:0, y:0, w:W, h:W };
}

const CELL_STYLES = {
  start:    { bg:"#5C3A1E", border:"#C8A96E", icon:"🏠", label:"출발"      },
  normal:   { bg:"#D4B896", border:"#8B6340", icon:"",   label:""          },
  potion:   { bg:"#C8D4A0", border:"#6B8C42", icon:"🧪", label:"물약찬스"  },
  trap:     { bg:"#C4A0A0", border:"#8C4242", icon:"💀", label:"독함정"    },
  alchemy:  { bg:"#C0B8D4", border:"#5A4A8C", icon:"⚗️", label:"연금술"   },
  reverse:  { bg:"#D4C4A0", border:"#8C6A42", icon:"🌀", label:"역류"      },
  shortcut: { bg:"#A8D4B8", border:"#42846A", icon:"⭐", label:"지름길"   },
  shop:     { bg:"#D4D0A0", border:"#8C8442", icon:"🏪", label:"아이템상점" },
  thunder:  { bg:"#D4D0A0", border:"#8C8442", icon:"⚡", label:"번개"      },
  crystal:  { bg:"#A8C4D4", border:"#42688C", icon:"🔮", label:"수정구슬"  },
};

// 나무 질감 배경 그리기
function drawWoodBackground(ctx) {
  // 전체 배경 - 어두운 나무색
  const bgGrad = ctx.createLinearGradient(0, 0, BOARD_PX, BOARD_PX);
  bgGrad.addColorStop(0,   "#3D2008");
  bgGrad.addColorStop(0.3, "#4A2A0E");
  bgGrad.addColorStop(0.6, "#3D2008");
  bgGrad.addColorStop(1,   "#2E1605");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  // 나무 결 줄무늬
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 30; i++) {
    const y = (i / 30) * BOARD_PX;
    const grad = ctx.createLinearGradient(0, y, BOARD_PX, y + 20);
    grad.addColorStop(0, "#C8A96E");
    grad.addColorStop(0.5, "#8B6340");
    grad.addColorStop(1, "#C8A96E");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, BOARD_PX, 8 + Math.sin(i) * 3);
  }
  ctx.restore();
}

// 중앙 마법진 그리기
function drawMagicCircle(ctx) {
  const cx = BOARD_PX / 2;
  const cy = BOARD_PX / 2;

  ctx.save();
  ctx.globalAlpha = 0.5;

  // 바깥 원
  ctx.beginPath();
  ctx.arc(cx, cy, 155, 0, Math.PI * 2);
  ctx.strokeStyle = "#C8A96E";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 중간 원
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.strokeStyle = "#C8A96E";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 안쪽 원
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.strokeStyle = "#C8A96E";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 별 모양 (6각형)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * 120;
    const y = cy + Math.sin(angle) * 120;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#C8A96E";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 삼각형 2개 (다윗의 별)
  for (let t = 0; t < 2; t++) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2 + (t * Math.PI / 3);
      const x = cx + Math.cos(angle) * 110;
      const y = cy + Math.sin(angle) * 110;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#C8A96E";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 중앙 텍스트
  ctx.globalAlpha = 0.7;
  ctx.font = "bold 14px serif";
  ctx.fillStyle = "#C8A96E";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("카드마블", cx, cy - 12);
  ctx.font = "22px serif";
  ctx.fillText("⚗️", cx, cy + 14);

  ctx.restore();
}

// 칸 그리기 (나무 타일 느낌)
function drawCell(ctx, cell) {
  const r = getCellRect(cell.index);
  const s = CELL_STYLES[cell.type] || CELL_STYLES.normal;
  const isCorner = [0, 9, 18, 27].includes(cell.index);
  const pad = 3;

  // 타일 배경 (베이지/나무 느낌)
  const tileGrad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  tileGrad.addColorStop(0, isCorner ? "#6B3A1E" : s.bg);
  tileGrad.addColorStop(1, isCorner ? "#4A2A0E" : shadeColor(s.bg, -20));
  ctx.fillStyle = tileGrad;
  ctx.beginPath();
  ctx.roundRect(r.x + pad, r.y + pad, r.w - pad*2, r.h - pad*2, isCorner ? 10 : 6);
  ctx.fill();

  // 타일 테두리 (각인 느낌)
  ctx.strokeStyle = s.border;
  ctx.lineWidth = isCorner ? 2.5 : 1.8;
  ctx.stroke();

  // 안쪽 음각 효과
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(r.x + pad + 2, r.y + pad + 2, r.w - pad*2 - 4, r.h - pad*2 - 4, isCorner ? 8 : 4);
  ctx.stroke();

  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  // 아이콘
  if (s.icon) {
    ctx.font = isCorner ? "28px serif" : "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 각인 효과 (그림자)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillText(s.icon, cx + 1, s.label ? cy - (isCorner ? 12 : 7) + 1 : cy + 1);
    ctx.fillStyle = isCorner ? "#FFE4B5" : "#5C3A1E";
    ctx.fillText(s.icon, cx, s.label ? cy - (isCorner ? 12 : 7) : cy);
  }

  // 레이블
  if (s.label) {
    ctx.font = `bold ${isCorner ? 10 : 7}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillText(s.label, cx + 1, r.y + r.h - 4 + 1);
    ctx.fillStyle = s.border;
    ctx.fillText(s.label, cx, r.y + r.h - 4);
  }

  // 칸 번호
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = "7px serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(cell.index, r.x + 5, r.y + 5);
}

// 색상 어둡게/밝게
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 플레이어 말 그리기
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
    const radius = isCorner ? 14 : 11;

    const offsets4 = [{x:-14,y:-10},{x:14,y:-10},{x:-14,y:10},{x:14,y:10}];
    const offsets2 = [{x:-12,y:0},{x:12,y:0}];
    const offsets1 = [{x:0,y:0}];
    const offsets = players.length === 1 ? offsets1
                  : players.length === 2 ? offsets2 : offsets4;

    const baseCx = r.x + r.w / 2;
    const baseCy = r.y + r.h / 2;

    players.forEach((p, i) => {
      const off = offsets[i] || {x:0,y:0};
      const px = baseCx + off.x;
      const py = baseCy + off.y;

      // 말 그림자
      ctx.beginPath();
      ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();

      // 말 원
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // 말 테두리
      ctx.strokeStyle = "#FFE4B5";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 이름 첫 글자
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${isCorner ? 11 : 9}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name[0], px, py);
    });
  });
}

function drawBoard(canvas, boardData, playersData) {
  const maxWidth = Math.min(window.innerWidth - 32, BOARD_PX);
  canvas.width  = BOARD_PX;
  canvas.height = BOARD_PX;
  canvas.style.width  = maxWidth + "px";
  canvas.style.height = maxWidth + "px";

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

  drawWoodBackground(ctx);
  drawMagicCircle(ctx);
  boardData.forEach(cell => drawCell(ctx, cell));
  drawPlayers(ctx, playersData);
}

window.drawBoard = drawBoard;
window.BOARD_PX = BOARD_PX;