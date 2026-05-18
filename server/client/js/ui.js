function updatePlayerInfoList(players, currentTurnId, myId) {
    const list = document.getElementById("player-info-list");
    list.innerHTML = "";
    
    players.forEach(p => {
      const isTurn = p.id === currentTurnId;
      const isMe = p.id === myId;
      
      const li = document.createElement("li");
      if (isTurn) li.style.background = "rgba(205, 168, 92, 0.2)"; // 턴인 사람 강조
      if (isTurn) li.style.borderLeftColor = "var(--border-gold)";
      
      let statusIcons = "";
      if (p.reverseNext) statusIcons += "🌀";
      if (p.doubleNext) statusIcons += "🔴";
      if (p.protected) statusIcons += "🔵";
  
      li.innerHTML = `
        <span class="player-dot" style="background:${p.color}; box-shadow: 0 0 10px ${p.color};"></span>
        <div style="flex-grow: 1; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: ${isMe ? 'bold' : 'normal'}; color: ${isTurn ? 'var(--text-main)' : 'var(--text-muted)'};">
            ${p.name} ${isMe ? '(나)' : ''} ${statusIcons}
          </span>
          <span style="font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px;">
            패 ${p.handCount}장
          </span>
        </div>
      `;
      list.appendChild(li);
    });
  }
  
  function updateTurnBanner(currentTurnId, players, myId) {
    const banner = document.getElementById("turn-banner");
    const turnPlayer = players.find(p => p.id === currentTurnId);
    
    if (!turnPlayer) {
      banner.textContent = "게임을 준비하는 중...";
      banner.style.borderColor = "var(--border-dark)";
      banner.style.color = "var(--text-muted)";
      return;
    }
  
    if (turnPlayer.id === myId) {
      banner.textContent = "당신의 턴입니다!";
      banner.style.borderColor = "var(--border-gold)";
      banner.style.color = "var(--border-gold)";
      banner.style.boxShadow = "0 0 15px rgba(205, 168, 92, 0.3)";
    } else {
      banner.textContent = `${turnPlayer.name}의 턴`;
      banner.style.borderColor = "var(--border-dark)";
      banner.style.color = "var(--text-main)";
      banner.style.boxShadow = "none";
    }
  }
  
  window.updatePlayerInfoList = updatePlayerInfoList;
  window.updateTurnBanner = updateTurnBanner;