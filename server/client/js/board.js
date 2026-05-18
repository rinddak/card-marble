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

// 다크 판타지 네온 색상 테마
const CELL_STYLES = {
  start:    { bg:"#1f1810", border:"#ffd700", glow:"#ffd700", icon:"👑", label:"출발" },
  normal:   { bg:"#121318", border:"#3a3a4a", glow:"transparent", icon:"",   label:"" },
  potion:   { bg:"#102218", border:"#48bb78", glow:"#48bb78", icon:"🧪", label:"물약찬스" },
  trap:     { bg:"#281212", border:"#f56565", glow:"#f56565", icon:"💀", label:"독함정" },
  alchemy:  { bg:"#1a1025", border:"#9f7aea", glow:"#9f7aea", icon:"⚗️", label:"연금술" },
  reverse:  { bg:"#241a10", border:"#ed8936", glow:"#ed8936", icon:"🌀", label:"역류" },
  shortcut: { bg:"#101e28", border:"#4299e1", glow:"#4299e1", icon:"✨", label:"지름길" },
  shop:     { bg:"#242010", border:"#ecc94b", glow:"#ecc94b", icon:"🏪", label:"아이템상점" },
  thunder:  { bg:"#181a20", border:"#e2e8f0", glow:"#e2e8f0", icon:"⚡", label:"번개" },
  crystal:  { bg:"#142433", border:"#63b3ed", glow:"#63b3ed", icon:"🔮", label:"수정구슬" },
};

// 어두운 흑요석(Obsidian) 바닥 그리기
function drawObsidianBackground(ctx) {
  // 깊고 어두운 돌 질감 그라데이션
  const bgGrad = ctx.createRadialGradient(BOARD_PX/2, BOARD_PX/2, 50, BOARD_PX/2, BOARD_PX/2, BOARD_PX);
  bgGrad.addColorStop(0, "#1c1c24");
  bgGrad.addColorStop(0.5, "#0c0c10");
  bgGrad.addColorStop(1, "#050508");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  // 미세한 노이즈 효과 (흑요석 느낌)
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < BOARD_PX; i += 4) {
    for (let j = 0; j < BOARD_PX; j += 4) {
      if (Math.random() > 0.5) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(i, j, 1, 1);
      }
    }
  }
  ctx.restore();
}

// 빛나는 중앙 마법진 (Neon Glow Effect)
function drawMagicCircle(ctx) {
  const cx = BOARD_PX / 2;
  const cy = BOARD_PX / 2;
  const glowColor = "#4fd1c5"; // 신비로운 시안색

  ctx.save();
  
  // 네온 글로우 설정
  ctx.shadowBlur = 15;
  ctx.shadowColor = glowColor;
  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = 0.4;

  // 바깥 원
  ctx.beginPath(); ctx.arc(cx, cy, 155, 0, Math.PI * 2);
  ctx.lineWidth = 1.5; ctx.stroke();

  // 룬 문자(점)들이 들어갈 궤도
  ctx.beginPath(); ctx.arc(cx, cy, 135, 0, Math.PI * 2);
  ctx.lineWidth = 0.5; ctx.setLineDash([5, 10]); ctx.stroke();
  ctx.setLineDash([]);

  // 안쪽 원
  ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.lineWidth = 1; ctx.stroke();

  // 육망성 (다윗의 별)
  ctx.globalAlpha = 0.3;
  for (let t = 0; t < 2; t++) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2 + (t * Math.PI / 3);
      const x = cx + Math.cos(angle) * 110;
      const y = cy + Math.sin(angle) * 110;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 중앙 텍스트 (타이포그래피 강조)
  ctx.shadowBlur = 20;
  ctx.globalAlpha = 0.8;
  ctx.font = "bold 20px 'Cinzel', serif";
  ctx.fillStyle = glowColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ALCHEMIST", cx, cy - 15);
  
  ctx.font = "12px 'Noto Sans KR', sans-serif";
  ctx.globalAlpha = 0.5;
  ctx.fillText("연금술사의 여정", cx, cy + 10);
  
  ctx.font = "24px serif";
  ctx.fillText("⚗️", cx, cy + 35);

  ctx.restore();
}

// 칸 그리기 (사이버펑크/마법 룬 타일 느낌)
function drawCell(ctx, cell) {
  const r = getCellRect(cell.index);
  const s = CELL_STYLES[cell.type] || CELL_STYLES.normal;
  const isCorner = [0, 9, 18, 27].includes(cell.index);
  const pad = 2;

  ctx.save();

  // 타일 배경 (어두운 색상)
  ctx.fillStyle = s.bg;
  ctx.beginPath();
  ctx.roundRect(r.x + pad, r.y + pad, r.w - pad*2, r.h - pad*2, 4);
  ctx.fill();

  // 테두리 빛 효과 (글로우)
  if (s.glow !== "transparent") {
    ctx.shadowBlur = 8;
    ctx.shadowColor = s.glow;
  }
  ctx.strokeStyle = s.border;
  ctx.lineWidth = isCorner ? 2 : 1.2;
  ctx.stroke();
  ctx.shadowBlur = 0; // 초기화

  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  // 아이콘 (투명도와 색상 조정)
  if (s.icon) {
    ctx.font = isCorner ? "24px serif" : "18px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.9;
    ctx.fillText(s.icon, cx, s.label ? cy - (isCorner ? 10 : 8) : cy);
    ctx.globalAlpha = 1.0;
  }

  // 레이블 (하단 텍스트)
  if (s.label) {
    ctx.font = `bold ${isCorner ? 11 : 9}px 'Noto Sans KR', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = s.border;
    ctx.fillText(s.label, cx, r.y + r.h - 5);
  }

  // 은은한 칸 번호
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "8px 'Cinzel', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(cell.index, r.x + 5, r.y + 5);

  ctx.restore();
}

// 플레이어 말 그리기 (빛나는 구슬 형태)
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
    const radius = isCorner ? 12 : 9;

    const offsets4 = [{x:-12,y:-10},{x:12,y:-10},{x:-12,y:10},{x:12,y:10}];
    const offsets2 = [{x:-10,y:0},{x:10,y:0}];
    const offsets1 = [{x:0,y:0}];
    const offsets = players.length === 1 ? offsets1
                  : players.length === 2 ? offsets2 : offsets4;

    const baseCx = r.x + r.w / 2;
    const baseCy = r.y + r.h / 2;

    players.forEach((p, i) => {
      const off = offsets[i] || {x:0,y:0};
      const px = baseCx + off.x;
      const py = baseCy + off.y;

      ctx.save();
      // 말의 네온 글로우
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      
      // 말 본체 (그라데이션 구슬)
      const pGrad = ctx.createRadialGradient(px-3, py-3, 1, px, py, radius);
      pGrad.addColorStop(0, "#ffffff");
      pGrad.addColorStop(0.3, p.color);
      pGrad.addColorStop(1, shadeColor(p.color, -50));
      
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = pGrad;
      ctx.fill();
      
      // 말 테두리
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0; // 텍스트엔 글로우 제거

      // 이름 첫 글자
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${isCorner ? 11 : 9}px 'Noto Sans KR', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name[0], px, py + 1);
      ctx.restore();
    });
  });
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
}

function drawBoard(canvas, boardData, playersData) {
  const maxWidth = Math.min(window.innerWidth - 32, BOARD_PX);
  canvas.width  = BOARD_PX;
  canvas.height = BOARD_PX;
  canvas.style.width  = maxWidth + "px";
  canvas.style.height = maxWidth + "px";

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

  drawObsidianBackground(ctx);
  drawMagicCircle(ctx);
  boardData.forEach(cell => drawCell(ctx, cell));
  drawPlayers(ctx, playersData);
}

window.drawBoard = drawBoard;
window.BOARD_PX = BOARD_PX;