function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function addLog(msg, highlight = false, isWarn = false) {
  const box = document.getElementById("log-box");
  if (!box) return;
  const el = document.createElement("div");
  el.className = "log-entry" +
    (highlight ? " highlight" : "") +
    (isWarn ? " log-warn" : "");
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;

  // 로그 최대 50개 유지
  while (box.children.length > 50) box.removeChild(box.firstChild);
}

function updatePlayerInfoList(players, currentTurnId, myId) {
  const list = document.getElementById("player-info-list");
  if (!list) return;
  list.innerHTML = "";
  players.forEach(p => {
    const isActive = p.id === currentTurnId;
    const isMe = p.id === myId;
    const row = document.createElement("div");
    row.className = "player-info-row" + (isActive ? " active-player" : "");

    const shield = p.protected ? '<span class="p-shield">🛡️</span>' : "";
    const botTag = p.isBot ? " 🤖" : "";
    const meTag = isMe ? " (나)" : "";

    row.innerHTML = `
      <span class="player-dot" style="background:${p.color}"></span>
      <span class="p-name">${p.name}${botTag}${meTag}</span>
      ${shield}
      <span class="p-cards">${p.handCount}장</span>
    `;
    list.appendChild(row);
  });
}

function updateTurnBanner(players, currentTurnId, myId) {
  const banner = document.getElementById("turn-banner");
  if (!banner) return;
  const current = players.find(p => p.id === currentTurnId);
  if (!current) return;

  if (currentTurnId === myId) {
    banner.textContent = "⚡ 내 턴입니다!";
    banner.style.background = "linear-gradient(135deg, rgba(42,80,32,0.9), rgba(20,50,14,0.9))";
    banner.style.borderColor = "#70B060";
    banner.style.color = "#C8F0C0";
  } else {
    banner.textContent = `${current.name}${current.isBot ? " 🤖" : ""}의 턴`;
    banner.style.background = "linear-gradient(135deg, rgba(92,58,30,0.9), rgba(45,20,8,0.9))";
    banner.style.borderColor = "#C8A96E";
    banner.style.color = "#FFE4B5";
  }
}

window.showScreen = showScreen;
window.addLog = addLog;
window.updatePlayerInfoList = updatePlayerInfoList;
window.updateTurnBanner = updateTurnBanner;
