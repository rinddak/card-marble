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
  HERB:       "herb",       // 약초밭: 카드 1장 드로우
  CAULDRON:   "cauldron",   // 등가교환 가마솥: 카드 2장 버리고 1장 드로우
  WORMHOLE:   "wormhole",   // 불안정한 웜홀: 랜덤 칸으로 순간이동
  MAGIC_BOX:  "magic_box",  // 마법 상자 (동적 배치)
};

const INGREDIENTS = [
  { id:"fire",  name:"불꽃의 정수", icon:"🔥" },
  { id:"water", name:"물의 정수",   icon:"💧" },
  { id:"earth", name:"대지의 정수", icon:"🌿" },
  { id:"wind",  name:"바람의 정수", icon:"🌪️" },
];

// 24칸: 모서리(0,6,12,18) + 각 변 5칸
const BOARD_LAYOUT = [
  "start",                                                      // 0  출발
  "herb",    "chance",  "trap",    "normal",  "ingredient_fire",// 1~5
  "thunder",                                                    // 6  번개
  "trap",    "cauldron","ingredient_water","chance","wormhole", // 7~11
  "crystal",                                                    // 12 수정구슬
  "chance",  "trap",    "herb",    "ingredient_earth","normal", // 13~17
  "reverse",                                                    // 18 역류
  "wormhole","ingredient_wind","cauldron","chance","trap",      // 19~23
];

const CELL_INFO = {
  start:            { label:"출발",       icon:"🏠", desc:"시작점! 이 칸을 지날 때마다 카드 1장을 드로우합니다." },
  normal:           { label:"",           icon:"",   desc:"" },
  trap:             { label:"독함정",     icon:"💀", desc:"독 함정! 카드 2장을 강제로 드로우합니다." },
  chance:           { label:"찬스",       icon:"🍀", desc:"찬스 칸! 찬스 카드 1장을 획득합니다. 원할 때 사용하세요." },
  alchemy:          { label:"연금술",     icon:"⚗️", desc:"연금술! 플레이어를 지정해 카드 2장을 강제 드로우시킵니다." },
  reverse:          { label:"역류",       icon:"🌀", desc:"역류! 다음 턴에 뒤로 이동합니다. (마법 방패로 무효)" },
  thunder:          { label:"번개",       icon:"⚡", desc:"번개! 모든 플레이어가 카드 1장씩 드로우합니다. (마법 방패로 무효)" },
  crystal:          { label:"수정구슬",   icon:"🔮", desc:"수정구슬! 손패에서 원하는 카드 1장을 골라 버릴 수 있습니다." },
  herb:             { label:"약초밭",     icon:"🌱", desc:"약초밭! 싱싱한 약초를 발견했습니다. 카드 1장을 드로우합니다." },
  cauldron:         { label:"가마솥",     icon:"🫕", desc:"등가교환 가마솥! 카드 2장을 버리고 덱에서 1장을 드로우합니다." },
  wormhole:         { label:"웜홀",       icon:"🌀", desc:"불안정한 웜홀! 보드의 랜덤한 칸으로 순간이동합니다!" },
  magic_box:        { label:"마법 상자",  icon:"✨", desc:"마법 상자! 전설급 찬스 카드를 획득합니다!" },
  ingredient_fire:  { label:"불꽃의 정수", icon:"🔥", desc:"불꽃의 정수 획득! 물약 완성에 필요한 재료입니다." },
  ingredient_water: { label:"물의 정수",   icon:"💧", desc:"물의 정수 획득! 물약 완성에 필요한 재료입니다." },
  ingredient_earth: { label:"대지의 정수", icon:"🌿", desc:"대지의 정수 획득! 물약 완성에 필요한 재료입니다." },
  ingredient_wind:  { label:"바람의 정수", icon:"🌪️", desc:"바람의 정수 획득! 물약 완성에 필요한 재료입니다." },
};

// 일반 찬스 카드
const CHANCE_CARDS = [
  { id:"thunder_boost", name:"번개 가속",   icon:"⚡", desc:"즉시 3칸 추가 이동합니다.",                         rarity:"normal" },
  { id:"magic_shield",  name:"마법 방패",   icon:"🛡️", desc:"다음 공격/함정 효과를 1회 무효화합니다.",           rarity:"normal" },
  { id:"time_reverse",  name:"시간 역행",   icon:"🔄", desc:"플레이어를 선택해 2칸 뒤로 보냅니다.",              rarity:"normal" },
  { id:"alch_boost",    name:"연금술 촉진", icon:"✨", desc:"손패에서 카드 1장을 즉시 버립니다.",               rarity:"normal" },
];

// 전설급 마법 상자 전용 카드
const LEGENDARY_CARDS = [
  { id:"mana_explosion",  name:"광역 폭발",    icon:"💥", desc:"나를 제외한 모든 플레이어가 즉시 카드 2장 드로우.", rarity:"legendary" },
  { id:"impurity_refine", name:"불순물 정제",  icon:"⚗️", desc:"손패에서 최대 2장 선택해 버리고 덱에서 1장 드로우.", rarity:"legendary" },
  { id:"spacetime_leap",  name:"시공간 도약",  icon:"🌌", desc:"아무 카드 1장을 내고 원하는 칸으로 즉시 이동.",    rarity:"legendary" },
];

function createBoard() {
  return BOARD_LAYOUT.map((type, index) => {
    const info = CELL_INFO[type] || CELL_INFO.normal;
    const isIngredient = type.startsWith("ingredient_");
    const ingredientId = isIngredient ? type.replace("ingredient_", "") : null;
    const baseType = isIngredient ? "ingredient" : type;
    return { index, type, baseType, label:info.label, icon:info.icon, desc:info.desc, ingredientId, hasMagicBox:false };
  });
}

function getRandomChanceCard() {
  return CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
}

function getRandomLegendaryCard() {
  return LEGENDARY_CARDS[Math.floor(Math.random() * LEGENDARY_CARDS.length)];
}

// 마법 상자 배치 가능한 칸 (일반 칸만)
function getBoxEligibleCells(board) {
  return board.filter(c => c.type === "normal" || c.type === "herb");
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
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패! 독 함정 효과 무효!" });
        break;
      }
      const drawn = [];
      for (let i = 0; i < 2 && deck.length > 0; i++) drawn.push(deck.pop());
      player.hand.push(...drawn);
      events.push({ type:"trap", playerId:player.id, count:drawn.length,
        message:`💀 독 함정! 카드 ${drawn.length}장 드로우.` });
      break;
    }
    case "chance": {
      const card = getRandomChanceCard();
      player.chanceCards.push(card);
      events.push({ type:"chance", playerId:player.id, card,
        message:`🍀 찬스! [${card.icon} ${card.name}] 획득!` });
      break;
    }
    case "herb": {
      if (deck.length > 0) player.hand.push(deck.pop());
      events.push({ type:"herb", playerId:player.id, message:"🌱 약초밭! 카드 1장 드로우." });
      break;
    }
    case "cauldron": {
      // 카드 버리기는 클라이언트에서 선택 (최대 2장)
      events.push({ type:"cauldron", playerId:player.id,
        message:"🫕 등가교환 가마솥! 버릴 카드를 최대 2장 선택하세요." });
      break;
    }
    case "wormhole": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패! 웜홀 효과 무효!" });
        break;
      }
      // 현재 위치 제외 랜덤 이동
      const total = 24;
      let newPos;
      do { newPos = Math.floor(Math.random() * total); } while (newPos === player.pos);
      player.pos = newPos;
      events.push({ type:"wormhole", playerId:player.id, newPos,
        message:`🌀 웜홀! ${newPos}번 칸으로 순간이동!` });
      break;
    }
    case "magic_box": {
      const legendCard = getRandomLegendaryCard();
      player.chanceCards.push(legendCard);
      events.push({ type:"magic_box", playerId:player.id, card:legendCard,
        message:`✨ 마법 상자 획득! 전설 카드 [${legendCard.icon} ${legendCard.name}]!` });
      break;
    }
    case "alchemy": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패! 연금술 무효!" });
        break;
      }
      events.push({ type:"alchemy_select", playerId:player.id, message:"⚗️ 연금술! 공격할 플레이어를 선택하세요." });
      break;
    }
    case "reverse": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패! 역류 무효!" });
        break;
      }
      player.reverseNext = true;
      events.push({ type:"reverse", playerId:player.id, message:"🌀 역류! 다음 턴 뒤로 이동." });
      break;
    }
    case "thunder": {
      if (player.protected) {
        player.protected = false;
        events.push({ type:"shield_used", playerId:player.id, message:"🛡️ 마법 방패! 번개 무효!" });
        break;
      }
      players.forEach(p => { if (deck.length > 0) p.hand.push(deck.pop()); });
      events.push({ type:"thunder", playerId:player.id, message:"⚡ 번개! 모두 카드 1장 드로우." });
      break;
    }
    case "crystal": {
      events.push({ type:"potion", playerId:player.id, message:"🔮 수정구슬! 버릴 카드를 선택하세요." });
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
        events.push({ type:"ingredient_already", playerId:player.id, message:"이미 보유한 재료입니다." });
      }
      break;
    }
  }
  return events;
}

module.exports = {
  createBoard, applyCellEffect, CELL_TYPES,
  CHANCE_CARDS, LEGENDARY_CARDS, INGREDIENTS,
  getBoxEligibleCells
};
