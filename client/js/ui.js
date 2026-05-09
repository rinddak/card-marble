function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function addLog(msg, highlight = false) {
  const box = document.getElementById("log-box");
  const el = document.createElement("div");
  el.className = "log-entry" + (highlight ? " highlight" : "");
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function updatePlayerInfoList(players, currentTurnId, myId) {
  const list = document.getElementById("player-info-list");
  list.innerHTML = "";
  players.forEach(p => {
    const row = document.createElement("div");
    row.className = "player-info-row" + (p.id === currentTurnId ? " active-player" : "");
    const dot = `<span class="player-dot" style="background:${p.color}"></span>`;
    const you = p.id === myId ? " (나)" : "";
    const reverse = p.reverseNext ? " 🔄" : "";
    row.innerHTML = `${dot} ${p.name}${you}${reverse} <span class="hand-count">${p.handCount}장</span>`;
    list.appendChild(row);
  });
}

function updateTurnBanner(currentTurnId, players, myId) {
  const banner = document.getElementById("turn-banner");
  const current = players.find(p => p.id === currentTurnId);
  if (!current) return;
  if (currentTurnId === myId) {
    banner.textContent = "⚡ 내 턴입니다!";
    banner.style.background = "#00b894";
  } else {
    banner.textContent = `${current.name}의 턴`;
    banner.style.background = "#6c5ce7";
  }
}

window.showScreen = showScreen;
window.addLog = addLog;
window.updatePlayerInfoList = updatePlayerInfoList;
window.updateTurnBanner = updateTurnBanner;