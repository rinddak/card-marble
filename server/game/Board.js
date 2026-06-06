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

// 총 24칸: 모서리(0,6,12,18) + 각 변 5칸
const BOARD_LAYOUT = [
  "start",                                                    // 0  모서리: 출발
  "normal", "chance", "trap", "normal", "ingredient_fire",   // 1~5 아래변
  "thunder",                                                  // 6  모서리: 번개
  "trap", "normal", "ingredient_water", "chance", "normal",  // 7~11 오른변
  "crystal",                                                  // 12 모서리: 수정구슬
  "chance", "trap", "normal", "ingredient_earth", "normal",  // 13~17 위변
  "reverse",                                                  // 18 모서리: 역류
  "normal", "ingredient_wind", "normal", "chance", "trap",   // 19~23 왼변
];

const CELL_INFO = {
  start:            { label:"출발",       icon:"🏠", desc:"시작점! 이 칸을 지날 때마다 카드 1장을 드로우합니다." },
  normal:           { label:"",           icon:"",   desc:"" },
  trap:             { label:"독함정",     icon:"💀", desc:"독 함정! 카드 2장을 드로우합니다." },
  chance:           { label:"찬스",       icon:"🎴", desc:"찬스 칸! 찬스 카드 1장을 획득합니다." },
  alchemy:          { label:"연금술",     icon:"⚗️", desc:"연금술! 플레이어를 지정해 카드 2장을 강제 드로우시킵니다." },
  reverse:          { label:"역류",       icon:"🌀", desc:"역류! 다음 턴에 뒤로 이동합니다." },
  thunder:          { label:"번개",       icon:"⚡", desc:"번개! 모든 플레이어가 카드 1장씩 드로우합니다." },
  crystal:          { label:"수정구슬",   icon:"🔮", desc:"수정구슬! 손패에서 카드 1장을 골라 버릴 수 있습니다." },
  ingredient_fire:  { label:"불꽃의 정수", icon:"🔥", desc:"불꽃의 정수 획득! 물약 재료 중 하나입니다." },
  ingredient_water: { label:"물의 정수",   icon:"💧", desc:"물의 정수 획득! 물약 재료 중 하나입니다." },
  ingredient_earth: { label:"대지의 정수", icon:"🌿", desc:"대지의 정수 획득! 물약 재료 중 하나입니다." },
  ingredient_wind:  { label:"바람의 정수", icon:"🌪️", desc:"바람의 정수 획득! 물약 재료 중 하나입니다." },
};

const CHANCE_CARDS = [
  { id:"thunder_boost", name:"번개 가속",   icon:"⚡", desc:"즉시 3칸 추가 이동합니다." },
  { id:"magic_shield",  name:"마법 방패",   icon:"🛡️", desc:"연금술/시간역행 등 공격 효과를 1회 무효화합니다." },
  { id:"time_reverse",  name:"시간 역행",   icon:"🔄", desc:"플레이어를 선택해 2칸 뒤로 보냅니다." },
  { id:"alch_boost",    name:"연금술 촉진", icon:"✨", desc:"손패에서 카드 1장을 즉시 버립니다." },
];

function createBoard() {
  return BOARD_LAYOUT.map((type, index) => {
    const info = CELL_INFO[type] || CELL_INFO.normal;
    const isIngredient = type.startsWith("ingredient_");
    const ingredientId = isIngredient ? type.replace("ingredient_", "") : null;
    const baseType = isIngredient ? "ingredient" : type;
    return { index, type, baseType, label:info.label, icon:info.icon, desc:info.desc, ingredientId };
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
      events.push({ type:"start", playerId:player.id, message:"🏠 출발 칸! 카드 1장을 드로우합니다." });
      break;
    }
    case "trap": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패 발동! 독 함정 효과 무효화!" });
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
      player.chanceCards.push(card);
      events.push({ type:"chance", playerId:player.id, card,
        message:`🎴 찬스 카드 [${card.icon} ${card.name}] 획득! - ${card.desc}` });
      break;
    }
    case "alchemy": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패 발동! 연금술 효과 무효화!" });
        break;
      }
      events.push({ type:"alchemy_select", playerId:player.id,
        message:"⚗️ 연금술 발동! 공격할 플레이어를 선택하세요." });
      break;
    }
    case "reverse": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패 발동! 역류 효과 무효화!" });
        break;
      }
      player.reverseNext = true;
      events.push({ type:"reverse", playerId:player.id, message:"🌀 역류! 다음 턴에 뒤로 이동합니다." });
      break;
    }
    case "thunder": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패 발동! 번개 효과 무효화!" });
        break;
      }
      players.forEach(p => { if (deck.length > 0) p.hand.push(deck.pop()); });
      events.push({ type:"thunder", playerId:player.id, message:"⚡ 번개! 모든 플레이어가 카드 1장씩 드로우합니다." });
      break;
    }
    case "crystal": {
      events.push({ type:"potion", playerId:player.id, message:"🔮 수정구슬! 손패에서 카드 1장을 골라 버릴 수 있습니다." });
      break;
    }
    case "ingredient": {
      const ingId = cell.ingredientId;
      if (ingId && !player.ingredients.includes(ingId)) {
        player.ingredients.push(ingId);
        const info = CELL_INFO[cell.type] || {};
        events.push({ type:"ingredient", playerId:player.id, ingredientId:ingId,
          message:`${info.icon} ${info.label} 획득!` });
      } else {
        events.push({ type:"ingredient_already", playerId:player.id,
          message:"이미 보유한 재료입니다." });
      }
      break;
    }
  }
  return events;
}

module.exports = { createBoard, applyCellEffect, CELL_TYPES, CHANCE_CARDS, INGREDIENTS };
