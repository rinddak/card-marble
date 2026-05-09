const CELL_TYPES = {
  START:    "start",
  NORMAL:   "normal",
  POTION:   "potion",
  TRAP:     "trap",
  ALCHEMY:  "alchemy",
  REVERSE:  "reverse",
  SHORTCUT: "shortcut",
  SHOP:     "shop",      // 아이템 상점
  THUNDER:  "thunder",   // 번개 칸
  CRYSTAL:  "crystal",   // 수정구슬
};

// 총 36칸: 모서리(0,9,18,27) + 각 변 8칸
// 시계방향: 0→8(아래변) → 9(모서리) → 10→17(오른변) → 18(모서리) → 19→26(위변) → 27(모서리) → 28→35(왼변) → 0
const BOARD_LAYOUT = [
  "start",                                                    // 0  모서리: 출발
  "normal","potion","normal","trap","normal","alchemy","normal","reverse", // 1~8
  "shop",                                                     // 9  모서리: 아이템 상점
  "normal","shortcut","normal","trap","normal","potion","normal","alchemy",// 10~17
  "thunder",                                                  // 18 모서리: 번개
  "normal","reverse","normal","potion","normal","trap","normal","shortcut",// 19~26
  "crystal",                                                  // 27 모서리: 수정구슬
  "normal","alchemy","normal","trap","normal","potion","normal","reverse", // 28~35
];

const CELL_LABELS = {
  start:"출발", normal:"", potion:"물약찬스", trap:"독함정",
  alchemy:"연금술", reverse:"역류", shortcut:"지름길",
  shop:"아이템상점", thunder:"번개", crystal:"수정구슬",
};

function createBoard() {
  return BOARD_LAYOUT.map((type, index) => ({
    index, type, label: CELL_LABELS[type]
  }));
}

function applyCellEffect(cell, player, players, deck) {
  const events = [];
  switch (cell.type) {
    case "potion":
      events.push({ type:"potion", playerId:player.id,
        message:"🧪 물약 찬스! 손패 1장을 추가로 버릴 수 있습니다." });
      break;

    case "trap": {
      const drawn = [];
      for (let i = 0; i < 2 && deck.length > 0; i++) drawn.push(deck.pop());
      player.hand.push(...drawn);
      events.push({ type:"trap", playerId:player.id, count:drawn.length,
        message:`💀 독 함정! 카드 ${drawn.length}장을 드로우합니다.` });
      break;
    }

    case "alchemy": {
      const others = players.filter(p => p.id !== player.id && p.hand.length > 0);
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        const stolen = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
        player.hand.push(stolen);
        events.push({ type:"alchemy", playerId:player.id, targetId:target.id,
          message:`⚗️ 연금술 발동! ${target.name}에게서 카드 1장을 빼앗았습니다.` });
      } else {
        events.push({ type:"alchemy_fail", playerId:player.id,
          message:"⚗️ 연금술 발동! 빼앗을 상대가 없습니다." });
      }
      break;
    }

    case "reverse":
      player.reverseNext = true;
      events.push({ type:"reverse", playerId:player.id,
        message:"🌀 역류! 다음 턴에 뒤로 이동합니다." });
      break;

    case "shortcut":
      player.pos = (player.pos + 3) % 36;
      events.push({ type:"shortcut", playerId:player.id,
        message:"⭐ 지름길! 3칸 추가 이동합니다." });
      break;

    case "shop":
      // 상점은 GameRoom에서 shopPlayer로 처리, 여기선 이벤트 없음
      break;

    case "thunder": {
      // 모든 플레이어 카드 1장 드로우
      players.forEach(p => {
        if (deck.length > 0) p.hand.push(deck.pop());
      });
      events.push({ type:"thunder", playerId:player.id,
        message:"⚡ 번개 발동! 모든 플레이어가 카드 1장을 드로우합니다." });
      break;
    }

    case "crystal":
      // 손패에서 원하는 카드 1장 골라서 버리기 (potion과 동일 메커니즘)
      events.push({ type:"potion", playerId:player.id,
        message:"🔮 수정구슬! 손패에서 카드 1장을 골라 버릴 수 있습니다." });
      break;
  }
  return events;
}

module.exports = { createBoard, applyCellEffect, CELL_TYPES };