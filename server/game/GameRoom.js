const { createShuffledDeck } = require("./Deck");
const { createBoard, applyCellEffect, getBoxEligibleCells } = require("./Board");

const HAND_SIZE = 10;
const TOTAL_CELLS = 24;
const ALL_INGREDIENTS = ["fire","water","earth","wind"];

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.deck = [];
    this.board = createBoard();
    this.started = false;
    this.currentTurn = 0;
    this.potionChancePlayer = null;
    this.alchBoostPlayer = null;
    this.alchemySelectPlayer = null;
    this.timeReversePlayer = null;
    this.cauldronPlayer = null;       // 가마솥 대기
    this.spacetimeLeapPlayer = null;  // 시공간 도약 대기
    this.impurityPlayer = null;       // 불순물 정제 대기
    this.magicBoxTurnCounter = 0;     // 상자 재등장 카운터
    this.magicBoxCell = null;         // 현재 상자 위치
  }

  addPlayer(id, name) {
    const colors = ["#e74c3c","#3498db","#2ecc71","#f39c12"];
    const player = {
      id, name, isBot:false,
      pos:0, hand:[], chanceCards:[], ingredients:[],
      reverseNext:false, doubleNext:false, protected:false,
      color: colors[this.players.length % 4]
    };
    this.players.push(player);
    return player;
  }

  addBot(id, name) {
    const colors = ["#e74c3c","#3498db","#2ecc71","#f39c12"];
    const bot = {
      id, name, isBot:true,
      pos:0, hand:[], chanceCards:[], ingredients:[],
      reverseNext:false, doubleNext:false, protected:false,
      color: colors[this.players.length % 4]
    };
    this.players.push(bot);
    return bot;
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
    if (this.currentTurn >= this.players.length) this.currentTurn = 0;
  }

  // 마법 상자 초기 배치
  _placeMagicBox() {
    if (this.magicBoxCell !== null) {
      const oldCell = this.board[this.magicBoxCell];
      oldCell.hasMagicBox = false;
      oldCell.type = oldCell._origType || "normal";
      oldCell.baseType = oldCell.type;
      oldCell.label = oldCell._origLabel !== undefined ? oldCell._origLabel : "";
      oldCell.icon = oldCell._origIcon !== undefined ? oldCell._origIcon : "";
    }
    const eligible = getBoxEligibleCells(this.board);
    if (eligible.length === 0) return;
    const cell = eligible[Math.floor(Math.random() * eligible.length)];
    
    // 원래 칸 정보 완벽하게 백업
    cell._origType = cell.type;
    cell._origLabel = cell.label;
    cell._origIcon = cell.icon;
    
    // 상자 속성 덮어씌우기
    cell.hasMagicBox = true;
    cell.type = "magic_box";
    cell.baseType = "magic_box";
    cell.label = "마법 상자";
    cell.icon = "✨";
    this.magicBoxCell = cell.index;
    this.magicBoxTurnCounter = 0;
  }

  startGame() {
    this.deck = createShuffledDeck();
    this.players.forEach(p => {
      p.pos = 0;
      p.hand = this.deck.splice(0, HAND_SIZE);
      p.chanceCards = [];
      p.ingredients = [];
      p.reverseNext = false;
      p.doubleNext = false;
      p.protected = false;
    });
    this.started = true;
    this.currentTurn = 0;
    this._placeMagicBox();
  }

  getCurrentPlayer() { return this.players[this.currentTurn]; }

  _nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
    this.potionChancePlayer = null;
    this.alchBoostPlayer = null;
    this.alchemySelectPlayer = null;
    this.timeReversePlayer = null;
    this.cauldronPlayer = null;
    this.spacetimeLeapPlayer = null;
    this.impurityPlayer = null;

    // 마법 상자 재등장 카운터
    if (this.magicBoxCell === null) {
      this.magicBoxTurnCounter++;
      if (this.magicBoxTurnCounter >= 2) {
        this._placeMagicBox();
      }
    }
  }

  _checkWin(player) {
    return ALL_INGREDIENTS.every(id => player.ingredients.includes(id))
      && player.hand.length === 0;
  }

  _missingIngredients(player) {
    const icons = { fire:"🔥", water:"💧", earth:"🌿", wind:"🌪️" };
    const names = { fire:"불꽃의 정수", water:"물의 정수", earth:"대지의 정수", wind:"바람의 정수" };
    return ALL_INGREDIENTS
      .filter(id => !player.ingredients.includes(id))
      .map(id => `${icons[id]} ${names[id]}`).join(", ");
  }

  playCard(playerId, cardIndex) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { success:false, message:"당신의 턴이 아닙니다." };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스입니다." };

    if (player.hand.length === 1) {
      const missing = this._missingIngredients(player);
      if (missing) return { success:false,
        message:`⚠️ 재료 부족! 필요: ${missing}`, ingredientWarning:true };
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    let move = card.move;
    if (player.doubleNext) { move *= 2; player.doubleNext = false; }
    if (player.reverseNext) { move = -move; player.reverseNext = false; }

    player.pos = ((player.pos + move) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
    const cell = this.board[player.pos];

    let magicBoxEvent = null;

    // 마법 상자 획득 처리
    if (cell.hasMagicBox || cell.type === "magic_box") {
      // 1. 전설 카드 보상 지급 풀
      const legendaryCards = [
        { id: "mana_explosion", name: "광역 폭발", icon: "💥", desc: "모든 상대방 카드 2장 드로우", rarity: "legendary" },
        { id: "impurity_refine", name: "불순물 정제", icon: "⚗️", desc: "최대 2장 버리고 1장 드로우", rarity: "legendary" },
        { id: "spacetime_leap", name: "시공간 도약", icon: "🌌", desc: "원하는 칸으로 즉시 이동", rarity: "legendary" }
      ];
      // 랜덤으로 1장 뽑아서 플레이어에게 지급
      const reward = legendaryCards[Math.floor(Math.random() * legendaryCards.length)];
      player.chanceCards.push(reward);

      // 2. 상자가 있던 칸을 원래대로 완벽 복구
      cell.hasMagicBox = false;
      cell.type = cell._origType || "normal";
      cell.baseType = cell.type;
      cell.label = cell._origLabel !== undefined ? cell._origLabel : "";
      cell.icon = cell._origIcon !== undefined ? cell._origIcon : "";
      
      this.magicBoxCell = null;
      this.magicBoxTurnCounter = 0;

      // 3. 로그 메시지 이벤트 생성
      magicBoxEvent = { type: "magic_box", message: `🎁 마법 상자 발견! 전설 카드 [${reward.name}] 획득!` };
    }

    const events = applyCellEffect(cell, player, this.players, this.deck);

    // 상자 이벤트가 있었다면 이벤트 목록 맨 앞에 추가하여 클라이언트로 전송
    if (magicBoxEvent) {
      events.unshift(magicBoxEvent);
    }

    // 연금술 타겟 선택
    if (events.find(e => e.type === "alchemy_select")) {
      this.alchemySelectPlayer = player.id;
      return { success:true, events, alchemySelect:true, winner:null };
    }

    // 가마솥
    if (events.find(e => e.type === "cauldron")) {
      this.cauldronPlayer = player.id;
      return { success:true, events, cauldron:true, winner:null };
    }

    // 수정구슬
    if (events.find(e => e.type === "potion")) {
      this.potionChancePlayer = player.id;
      if (this._checkWin(player)) return { success:true, events, winner:player };
      return { success:true, events, potionChance:true, winner:null };
    }

    if (this._checkWin(player)) return { success:true, events, winner:player };
    this._nextTurn();
    return { success:true, events, winner:null };
  }

  // 가마솥: 카드 버리고 1장 드로우
  cauldronDiscard(playerId, cardIndices) {
    if (this.cauldronPlayer !== playerId)
      return { success:false, message:"가마솥 효과가 없습니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };

    const validIndices = [...new Set(cardIndices)]
      .filter(i => i >= 0 && i < player.hand.length)
      .slice(0, 2)
      .sort((a,b) => b - a); // 뒤에서부터 제거

    validIndices.forEach(i => player.hand.splice(i, 1));
    if (this.deck.length > 0) player.hand.push(this.deck.pop());

    this._nextTurn();
    if (this._checkWin(player)) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  alchemyTarget(playerId, targetId) {
    if (this.alchemySelectPlayer !== playerId)
      return { success:false, message:"연금술 권한 없음." };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { success:false, message:"대상 없음" };
    if (target.protected) {
      target.protected = false;
      this._nextTurn();
      return { success:true, message:`🛡️ ${target.name}의 방패! 연금술 무효!` };
    }
    const drawn = [];
    for (let i = 0; i < 2 && this.deck.length > 0; i++) drawn.push(this.deck.pop());
    target.hand.push(...drawn);
    this._nextTurn();
    return { success:true, message:`⚗️ ${target.name}에게 카드 ${drawn.length}장 강제 드로우!` };
  }

  useChanceCard(playerId, cardId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    const idx = player.chanceCards.findIndex(c => c.id === cardId);
    if (idx < 0) return { success:false, message:"보유하지 않은 카드" };
    player.chanceCards.splice(idx, 1);

    switch (cardId) {
      case "thunder_boost": {
        player.pos = (player.pos + 3) % TOTAL_CELLS;
        const cell = this.board[player.pos];
        const events = applyCellEffect(cell, player, this.players, this.deck);
        if (this._checkWin(player)) return { success:true, message:"⚡ 3칸 이동!", winner:player, events };
        return { success:true, message:"⚡ 번개 가속! 3칸 추가 이동!", events };
      }
      case "magic_shield":
        player.protected = true;
        return { success:true, message:"🛡️ 마법 방패 장착!", events:[] };
      case "time_reverse":
        this.timeReversePlayer = playerId;
        return { success:true, message:"🔄 시간 역행! 대상을 선택하세요.", timeReverse:true, events:[] };
      case "alch_boost":
        this.alchBoostPlayer = playerId;
        return { success:true, message:"✨ 연금술 촉진! 버릴 카드를 선택하세요.", alchBoost:true, events:[] };
      // 전설 카드
      case "mana_explosion": {
        const others = this.players.filter(p => p.id !== playerId);
        others.forEach(p => {
          for (let i = 0; i < 2 && this.deck.length > 0; i++) p.hand.push(this.deck.pop());
        });
        return { success:true, message:`💥 광역 폭발! 모든 상대방이 카드 2장 드로우!`, events:[] };
      }
      case "impurity_refine":
        this.impurityPlayer = playerId;
        return { success:true, message:"⚗️ 불순물 정제! 버릴 카드를 최대 2장 선택하세요.", impurity:true, events:[] };
      case "spacetime_leap":
        this.spacetimeLeapPlayer = playerId;
        return { success:true, message:"🌌 시공간 도약! 카드 1장을 내고 이동할 칸을 선택하세요.", spacetimeLeap:true, events:[] };
    }
    return { success:false, message:"알 수 없는 카드" };
  }

  timeReverseTarget(playerId, targetId) {
    if (this.timeReversePlayer !== playerId)
      return { success:false, message:"시간 역행 권한 없음" };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { success:false, message:"대상 없음" };
    if (target.protected) {
      target.protected = false;
      this.timeReversePlayer = null;
      return { success:true, message:`🛡️ ${target.name}의 방패! 시간 역행 무효!` };
    }
    target.pos = ((target.pos - 2) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
    this.timeReversePlayer = null;
    return { success:true, message:`🔄 ${target.name}을(를) 2칸 뒤로!` };
  }

  // 불순물 정제: 최대 2장 버리고 1장 드로우
  impurityDiscard(playerId, cardIndices) {
    if (this.impurityPlayer !== playerId)
      return { success:false, message:"불순물 정제 대기 중이 아닙니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };

    const validIndices = [...new Set(cardIndices)]
      .filter(i => i >= 0 && i < player.hand.length)
      .slice(0, 2)
      .sort((a,b) => b - a);
    validIndices.forEach(i => player.hand.splice(i, 1));
    if (this.deck.length > 0) player.hand.push(this.deck.pop());
    this.impurityPlayer = null;
    if (this._checkWin(player)) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  // 시공간 도약: 카드 내고 원하는 칸으로 이동
  spacetimeLeap(playerId, cardIndex, targetCell) {
    if (this.spacetimeLeapPlayer !== playerId)
      return { success:false, message:"시공간 도약 대기 중이 아닙니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };
    if (targetCell < 0 || targetCell >= TOTAL_CELLS)
      return { success:false, message:"잘못된 칸 번호" };

    player.hand.splice(cardIndex, 1);
    player.pos = targetCell;
    this.spacetimeLeapPlayer = null;

    const cell = this.board[player.pos];
    const events = applyCellEffect(cell, player, this.players, this.deck);
    if (this._checkWin(player)) return { success:true, events, winner:player };
    this._nextTurn();
    return { success:true, events, winner:null,
      message:`🌌 시공간 도약! ${targetCell}번 칸으로 이동!` };
  }

  alchBoostDiscard(playerId, cardIndex) {
    if (this.alchBoostPlayer !== playerId)
      return { success:false, message:"연금술 촉진 대기 중이 아닙니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };
    if (player.hand.length === 1) {
      const missing = this._missingIngredients(player);
      if (missing) return { success:false,
        message:`⚠️ 재료 부족! 필요: ${missing}`, ingredientWarning:true };
    }
    player.hand.splice(cardIndex, 1);
    this.alchBoostPlayer = null;
    if (this._checkWin(player)) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  potionDiscard(playerId, cardIndex) {
    if (this.potionChancePlayer !== playerId)
      return { success:false, message:"수정구슬 찬스 없음" };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };
    if (player.hand.length === 1) {
      const missing = this._missingIngredients(player);
      if (missing) return { success:false,
        message:`⚠️ 재료 부족! 필요: ${missing}`, ingredientWarning:true };
    }
    player.hand.splice(cardIndex, 1);
    this._nextTurn();
    if (this._checkWin(player)) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  clearPotionChance(playerId) {
    if (this.potionChancePlayer === playerId) this._nextTurn();
  }

  drawCard(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { success:false, message:"당신의 턴이 아닙니다." };
    if (this.deck.length === 0)
      return { success:false, message:"덱이 비었습니다." };
    player.hand.push(this.deck.pop());
    this._nextTurn();
    return { success:true };
  }

  doBotTurn() {
    const bot = this.getCurrentPlayer();
    if (!bot || !bot.isBot) return null;

    if (bot.chanceCards.length > 0 && Math.random() < 0.3) {
      const card = bot.chanceCards[Math.floor(Math.random() * bot.chanceCards.length)];
      const result = this.useChanceCard(bot.id, card.id);
      if (result.timeReverse) {
        const others = this.players.filter(p => p.id !== bot.id);
        if (others.length > 0) {
          const t = others[Math.floor(Math.random() * others.length)];
          return this.timeReverseTarget(bot.id, t.id);
        }
      }
      if (result.alchBoost && bot.hand.length > 0)
        return this.alchBoostDiscard(bot.id, Math.floor(Math.random() * bot.hand.length));
      if (result.impurity && bot.hand.length > 0) {
        const count = Math.min(2, bot.hand.length);
        const indices = Array.from({length:count}, (_,i) => i);
        return this.impurityDiscard(bot.id, indices);
      }
      if (result.spacetimeLeap && bot.hand.length > 0) {
        const cardIdx = Math.floor(Math.random() * bot.hand.length);
        const targetCell = Math.floor(Math.random() * 24);
        return this.spacetimeLeap(bot.id, cardIdx, targetCell);
      }
      if (result.events?.length) return result;
    }

    if (bot.hand.length > 0) {
      if (bot.hand.length === 1 && !this._checkWin(bot)) {
        if (this.deck.length > 0) bot.hand.push(this.deck.pop());
        this._nextTurn();
        return { success:true, events:[], winner:null };
      }
      const cardIndex = Math.floor(Math.random() * bot.hand.length);
      const result = this.playCard(bot.id, cardIndex);
      if (result.alchemySelect) {
        const others = this.players.filter(p => p.id !== bot.id);
        if (others.length > 0) {
          const t = others[Math.floor(Math.random() * others.length)];
          return this.alchemyTarget(bot.id, t.id);
        }
        this._nextTurn();
        return { success:true, events:[], winner:null };
      }
      if (result.cauldron) {
        const count = Math.min(2, bot.hand.length);
        return this.cauldronDiscard(bot.id, Array.from({length:count}, (_,i) => i));
      }
      if (result.potionChance && bot.hand.length > 0)
        return this.potionDiscard(bot.id, Math.floor(Math.random() * bot.hand.length));
      return result;
    } else {
      return this.drawCard(bot.id);
    }
  }

  getLobbyState() {
    return {
      roomId: this.id,
      players: this.players.map(p => ({ id:p.id, name:p.name, color:p.color, isBot:p.isBot })),
      started: this.started
    };
  }

  getPublicState() {
    return {
      board: this.board,
      players: this.players.map(p => ({
        id:p.id, name:p.name, pos:p.pos, color:p.color,
        handCount:p.hand.length, reverseNext:p.reverseNext,
        doubleNext:p.doubleNext, protected:p.protected,
        chanceCards:p.chanceCards, ingredients:p.ingredients, isBot:p.isBot
      })),
      currentTurn: this.players[this.currentTurn]?.id || null,
      deckCount: this.deck.length,
      potionChancePlayer: this.potionChancePlayer,
      alchBoostPlayer: this.alchBoostPlayer,
      alchemySelectPlayer: this.alchemySelectPlayer,
      timeReversePlayer: this.timeReversePlayer,
      cauldronPlayer: this.cauldronPlayer,
      spacetimeLeapPlayer: this.spacetimeLeapPlayer,
      impurityPlayer: this.impurityPlayer,
      magicBoxCell: this.magicBoxCell,
    };
  }
}

module.exports = { GameRoom };
