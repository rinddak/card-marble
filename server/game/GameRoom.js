const { createShuffledDeck } = require("./Deck");
const { createBoard, applyCellEffect } = require("./Board");

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
  }

  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }

  _nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
    this.potionChancePlayer = null;
    this.alchBoostPlayer = null;
    this.alchemySelectPlayer = null;
    this.timeReversePlayer = null;
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

    // 마지막 카드 버릴 때 재료 체크
    if (player.hand.length === 1) {
      const missing = this._missingIngredients(player);
      if (missing) {
        return { success:false,
          message:`⚠️ 재료가 부족합니다! 필요한 재료: ${missing}`,
          ingredientWarning:true };
      }
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    let move = card.move;
    if (player.doubleNext) { move *= 2; player.doubleNext = false; }
    if (player.reverseNext) { move = -move; player.reverseNext = false; }

    player.pos = ((player.pos + move) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
    const cell = this.board[player.pos];
    const events = applyCellEffect(cell, player, this.players, this.deck);

    // 연금술 타겟 선택 대기
    if (events.find(e => e.type === "alchemy_select")) {
      this.alchemySelectPlayer = player.id;
      return { success:true, events, alchemySelect:true, winner:null };
    }

    // 수정구슬 카드 버리기 선택
    if (events.find(e => e.type === "potion")) {
      this.potionChancePlayer = player.id;
      if (this._checkWin(player)) return { success:true, events, winner:player };
      return { success:true, events, potionChance:true, winner:null };
    }

    if (this._checkWin(player)) return { success:true, events, winner:player };
    this._nextTurn();
    return { success:true, events, potionChance:false, winner:null };
  }

  alchemyTarget(playerId, targetId) {
    if (this.alchemySelectPlayer !== playerId)
      return { success:false, message:"연금술 선택 권한이 없습니다." };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { success:false, message:"대상 플레이어 없음" };

    if (target.protected) {
      target.protected = false;
      this._nextTurn();
      return { success:true, message:`🛡️ ${target.name}의 마법 방패 발동! 연금술 무효화!` };
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
    if (idx < 0) return { success:false, message:"보유하지 않은 찬스 카드" };

    player.chanceCards.splice(idx, 1);

    switch (cardId) {
      case "thunder_boost": {
        player.pos = (player.pos + 3) % TOTAL_CELLS;
        const cell = this.board[player.pos];
        const events = applyCellEffect(cell, player, this.players, this.deck);
        if (this._checkWin(player))
          return { success:true, message:"⚡ 번개 가속! 3칸 추가 이동!", winner:player, events };
        return { success:true, message:"⚡ 번개 가속! 3칸 추가 이동!", events };
      }
      case "magic_shield":
        player.protected = true;
        return { success:true, message:"🛡️ 마법 방패! 다음 공격을 막습니다.", events:[] };
      case "time_reverse":
        this.timeReversePlayer = playerId;
        return { success:true, message:"🔄 시간 역행! 대상을 선택하세요.", timeReverse:true, events:[] };
      case "alch_boost":
        this.alchBoostPlayer = playerId;
        return { success:true, message:"✨ 연금술 촉진! 버릴 카드를 선택하세요.", alchBoost:true, events:[] };
    }
    return { success:false, message:"알 수 없는 카드" };
  }

  timeReverseTarget(playerId, targetId) {
    if (this.timeReversePlayer !== playerId)
      return { success:false, message:"시간 역행 권한이 없습니다." };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { success:false, message:"대상 없음" };

    if (target.protected) {
      target.protected = false;
      this.timeReversePlayer = null;
      return { success:true, message:`🛡️ ${target.name}의 마법 방패 발동! 시간 역행 무효화!` };
    }
    target.pos = ((target.pos - 2) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
    this.timeReversePlayer = null;
    return { success:true, message:`🔄 ${target.name}을(를) 2칸 뒤로!` };
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
        message:`⚠️ 재료가 부족합니다! 필요한 재료: ${missing}`,
        ingredientWarning:true };
    }

    player.hand.splice(cardIndex, 1);
    this.alchBoostPlayer = null;
    if (this._checkWin(player)) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  potionDiscard(playerId, cardIndex) {
    if (this.potionChancePlayer !== playerId)
      return { success:false, message:"수정구슬 찬스가 없습니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };

    if (player.hand.length === 1) {
      const missing = this._missingIngredients(player);
      if (missing) return { success:false,
        message:`⚠️ 재료가 부족합니다! 필요한 재료: ${missing}`,
        ingredientWarning:true };
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
      return { success:false, message:"덱이 비어 있습니다." };
    player.hand.push(this.deck.pop());
    this._nextTurn();
    return { success:true };
  }

  doBotTurn() {
    const bot = this.getCurrentPlayer();
    if (!bot || !bot.isBot) return null;

    // 찬스 카드 30% 확률 사용
    if (bot.chanceCards.length > 0 && Math.random() < 0.3) {
      const card = bot.chanceCards[Math.floor(Math.random() * bot.chanceCards.length)];
      const result = this.useChanceCard(bot.id, card.id);
      if (result.timeReverse) {
        const others = this.players.filter(p => p.id !== bot.id);
        if (others.length > 0) {
          const target = others[Math.floor(Math.random() * others.length)];
          return this.timeReverseTarget(bot.id, target.id);
        }
      }
      if (result.alchBoost && bot.hand.length > 0) {
        const idx = Math.floor(Math.random() * bot.hand.length);
        return this.alchBoostDiscard(bot.id, idx);
      }
      if (result.events?.length) return result;
    }

    // 카드 내기
    if (bot.hand.length > 0) {
      // 마지막 카드인데 재료 없으면 드로우
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
          const target = others[Math.floor(Math.random() * others.length)];
          return this.alchemyTarget(bot.id, target.id);
        }
        this._nextTurn();
        return { success:true, events:[], winner:null };
      }
      if (result.potionChance) {
        if (bot.hand.length > 0) {
          const idx = Math.floor(Math.random() * bot.hand.length);
          return this.potionDiscard(bot.id, idx);
        }
        this.clearPotionChance(bot.id);
      }
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
        chanceCards:p.chanceCards, ingredients:p.ingredients,
        isBot:p.isBot
      })),
      currentTurn: this.players[this.currentTurn]?.id || null,
      deckCount: this.deck.length,
      potionChancePlayer: this.potionChancePlayer,
      alchBoostPlayer: this.alchBoostPlayer,
      alchemySelectPlayer: this.alchemySelectPlayer,
      timeReversePlayer: this.timeReversePlayer,
    };
  }
}

module.exports = { GameRoom };
