const CELL_TYPES = {
  START:    "start",
  NORMAL:   "normal",
  TRAP:     "trap",
  CHANCE:   "chance",
  ALCHEMY:  "alchemy",
  REVERSE:  "reverse",
  THUNDER:  "thunder",
  CRYSTAL:  "crystal",
};

// 총 20칸: 모서리(0,5,10,15) + 각 변 4칸
// 시계방향
const BOARD_LAYOUT = [
  "start",                          // 0  모서리: 출발
  "normal","trap","chance","alchemy",// 1~4
  "thunder",                        // 5  모서리: 번개
  "normal","trap","chance","alchemy",// 6~9
  "crystal",                        // 10 모서리: 수정구슬
  "normal","trap","chance","alchemy",// 11~14
  "reverse",                        // 15 모서리: 역류
  "normal","trap","chance","alchemy",// 16~19
];

const CELL_INFO = {
  start:   { label:"출발",    icon:"🏠", desc:"게임의 시작점입니다. 이 칸을 지날 때마다 카드 1장을 드로우합니다." },
  normal:  { label:"",        icon:"",   desc:"" },
  trap:    { label:"독함정",  icon:"💀", desc:"독 함정! 카드 2장을 드로우해야 합니다. 손패가 늘어나 불리해집니다." },
  chance:  { label:"찬스",    icon:"🎴", desc:"찬스 칸! 찬스 카드 1장을 획득합니다. 나중에 원할 때 사용하세요." },
  alchemy: { label:"연금술",  icon:"⚗️", desc:"연금술 칸! 다른 플레이어에게서 카드 1장을 빼앗습니다." },
  reverse: { label:"역류",    icon:"🌀", desc:"역류 칸! 다음 턴에 뒤로 이동하게 됩니다. 조심하세요!" },
  thunder: { label:"번개",    icon:"⚡", desc:"번개 칸! 모든 플레이어가 카드 1장씩 드로우합니다." },
  crystal: { label:"수정구슬",icon:"🔮", desc:"수정구슬 칸! 손패에서 원하는 카드 1장을 골라 버릴 수 있습니다." },
};

const CHANCE_CARDS = [
  { id:"thunder_boost", name:"번개 가속", icon:"⚡", desc:"즉시 3칸 추가 이동합니다." },
  { id:"magic_shield",  name:"마법 방패", icon:"🛡️", desc:"다음 함정 효과를 1회 무효화합니다." },
  { id:"time_reverse",  name:"시간 역행", icon:"🔄", desc:"다른 플레이어 1명을 3칸 뒤로 보냅니다." },
  { id:"alch_boost",    name:"연금술 촉진",icon:"✨", desc:"손패에서 카드 1장을 즉시 버립니다." },
];

function createBoard() {
  return BOARD_LAYOUT.map((type, index) => ({
    index, type,
    label: CELL_INFO[type]?.label || "",
    icon:  CELL_INFO[type]?.icon  || "",
    desc:  CELL_INFO[type]?.desc  || "",
  }));
}

function getRandomChanceCard() {
  return CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
}

function applyCellEffect(cell, player, players, deck) {
  const events = [];

  switch (cell.type) {
    case "start": {
      if (deck.length > 0) player.hand.push(deck.pop());
      events.push({ type:"start", playerId:player.id,
        message:"🏠 출발 칸! 카드 1장을 드로우합니다." });
      break;
    }
    case "trap": {
      // 보호 물약 체크
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id,
          message:"🛡️ 마법 방패 발동! 독 함정 효과가 무효화됩니다." });
        break;
      }
      const drawn = [];
      for (let i = 0; i < 2 && deck.length > 0; i++) drawn.push(deck.pop());
      player.hand.push(...drawn);
      events.push({ type:"trap", playerId:player.id, count:drawn.length,
        message:`💀 독 함정! 카드 ${drawn.length}장을 드로우합니다.` });
      break;
    }
    case "chance": {
      const card = getRandomChanceCard();
      player.chanceCards = player.chanceCards || [];
      player.chanceCards.push(card);
      events.push({ type:"chance", playerId:player.id, card,
        message:`🎴 찬스 카드 획득! [${card.icon} ${card.name}] - ${card.desc}` });
      break;
    }
    case "alchemy": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id,
          message:"🛡️ 마법 방패 발동! 연금술 효과가 무효화됩니다." });
        break;
      }
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
    case "reverse": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id,
          message:"🛡️ 마법 방패 발동! 역류 효과가 무효화됩니다." });
        break;
      }
      player.reverseNext = true;
      events.push({ type:"reverse", playerId:player.id,
        message:"🌀 역류! 다음 턴에 뒤로 이동합니다." });
      break;
    }
    case "thunder": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id,
          message:"🛡️ 마법 방패 발동! 번개 효과가 무효화됩니다." });
        break;
      }
      players.forEach(p => { if (deck.length > 0) p.hand.push(deck.pop()); });
      events.push({ type:"thunder", playerId:player.id,
        message:"⚡ 번개! 모든 플레이어가 카드 1장씩 드로우합니다." });
      break;
    }
    case "crystal": {
      events.push({ type:"potion", playerId:player.id,
        message:"🔮 수정구슬! 손패에서 카드 1장을 골라 버릴 수 있습니다." });
      break;
    }
  }
  return events;
}

module.exports = { createBoard, applyCellEffect, CELL_TYPES, CHANCE_CARDS };
