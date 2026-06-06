const CELL_TYPES = {
  START:      "start",
  NORMAL:     "normal",
  TRAP:       "trap",
  CHANCE:     "chance",
  ALCHEMY:    "alchemy",
  REVERSE:    "reverse",
  THUNDER:    "thunder",
  CRYSTAL:    "crystal",
  INGREDIENT: "ingredient",
};

const INGREDIENTS = [
  { id:"fire",  name:"불꽃의 정수", icon:"🔥" },
  { id:"water", name:"물의 정수",   icon:"💧" },
  { id:"earth", name:"대지의 정수", icon:"🌿" },
  { id:"wind",  name:"바람의 정수", icon:"🌪️" },
];

// 각 변마다 칸 배치 불규칙하게 섞음
// 0: 출발(모서리), 1~4: 아래변, 5: 번개(모서리)
// 6~9: 오른변, 10: 수정구슬(모서리)
// 11~14: 위변, 15: 역류(모서리), 16~19: 왼변
const BOARD_LAYOUT = [
  "start",                                              // 0  모서리
  "normal", "chance", "trap", "ingredient_fire",        // 1~4  아래변
  "thunder",                                            // 5  모서리
  "trap", "ingredient_water", "normal", "chance",       // 6~9  오른변
  "crystal",                                            // 10 모서리
  "chance", "trap", "ingredient_earth", "normal",       // 11~14 위변
  "reverse",                                            // 15 모서리
  "ingredient_wind", "normal", "chance", "trap",        // 16~19 왼변
];

const CELL_INFO = {
  start:             { label:"출발",      icon:"🏠", desc:"게임의 시작점입니다. 이 칸을 지날 때마다 카드 1장을 드로우합니다." },
  normal:            { label:"",          icon:"",   desc:"" },
  trap:              { label:"독함정",    icon:"💀", desc:"독 함정! 카드 2장을 드로우해야 합니다. 손패가 늘어나 불리해집니다." },
  chance:            { label:"찬스",      icon:"🎴", desc:"찬스 칸! 찬스 카드 1장을 획득합니다. 나중에 원할 때 사용하세요." },
  alchemy:           { label:"연금술",    icon:"⚗️", desc:"연금술 칸! 플레이어를 지정해서 카드 2장을 강제로 드로우시킵니다." },
  reverse:           { label:"역류",      icon:"🌀", desc:"역류 칸! 다음 턴에 뒤로 이동하게 됩니다." },
  thunder:           { label:"번개",      icon:"⚡", desc:"번개 칸! 모든 플레이어가 카드 1장씩 드로우합니다." },
  crystal:           { label:"수정구슬",  icon:"🔮", desc:"수정구슬 칸! 손패에서 원하는 카드 1장을 골라 버릴 수 있습니다." },
  ingredient_fire:   { label:"불꽃의 정수", icon:"🔥", desc:"불꽃의 정수를 획득합니다! 물약 재료 중 하나입니다." },
  ingredient_water:  { label:"물의 정수",   icon:"💧", desc:"물의 정수를 획득합니다! 물약 재료 중 하나입니다." },
  ingredient_earth:  { label:"대지의 정수", icon:"🌿", desc:"대지의 정수를 획득합니다! 물약 재료 중 하나입니다." },
  ingredient_wind:   { label:"바람의 정수", icon:"🌪️", desc:"바람의 정수를 획득합니다! 물약 재료 중 하나입니다." },
};

const CHANCE_CARDS = [
  { id:"thunder_boost", name:"번개 가속",   icon:"⚡", desc:"즉시 3칸 추가 이동합니다." },
  { id:"magic_shield",  name:"마법 방패",   icon:"🛡️", desc:"연금술/시간역행 등 공격 효과를 1회 무효화합니다." },
  { id:"time_reverse",  name:"시간 역행",   icon:"🔄", desc:"플레이어를 선택해서 2칸 뒤로 보냅니다." },
  { id:"alch_boost",    name:"연금술 촉진", icon:"✨", desc:"손패에서 카드 1장을 즉시 버립니다." },
];

function createBoard() {
  return BOARD_LAYOUT.map((type, index) => {
    const baseType = type.startsWith("ingredient") ? "ingredient" : type;
    const info = CELL_INFO[type] || CELL_INFO[baseType] || CELL_INFO.normal;
    const ingredientId = type.startsWith("ingredient") ? type.replace("ingredient_","") : null;
    return {
      index, type, baseType,
      label: info.label,
      icon:  info.icon,
      desc:  info.desc,
      ingredientId,
    };
  });
}

function getRandomChanceCard() {
  return CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
}

function applyCellEffect(cell, player, players, deck) {
  const events = [];

  switch (cell.baseType) {
    case "start": {
      if (deck.length > 0) player.hand.push(deck.pop());
      events.push({ type:"start", playerId:player.id,
        message:"🏠 출발 칸! 카드 1장을 드로우합니다." });
      break;
    }
    case "trap": {
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
      // 플레이어 선택은 클라이언트에서 처리 (alchemyTarget 이벤트)
      events.push({ type:"alchemy_select", playerId:player.id,
        message:`⚗️ 연금술 발동! 공격할 플레이어를 선택하세요.` });
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
    case "ingredient": {
      const ingId = cell.ingredientId;
      if (ingId && !player.ingredients.includes(ingId)) {
        player.ingredients.push(ingId);
        const info = CELL_INFO[cell.type];
        events.push({ type:"ingredient", playerId:player.id, ingredientId:ingId,
          message:`${info.icon} ${info.label} 획득!` });
      } else {
        events.push({ type:"ingredient_already", playerId:player.id,
          message:`이미 보유한 재료입니다.` });
      }
      break;
    }
  }
  return events;
}

module.exports = { createBoard, applyCellEffect, CELL_TYPES, CHANCE_CARDS, INGREDIENTS };
