const { createShuffledDeck } = require("./Deck");
const { createBoard, applyCellEffect } = require("./Board");

const HAND_SIZE = 10;
const TOTAL_CELLS = 20;

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.deck = [];
    this.board = createBoard();
    this.started = false;
    this.currentTurn = 0;
    this.potionChancePlayer = null;
    this.alchBoostPlayer = null; // 연금술 촉진 카드 사용 대기
  }

  addPlayer(id, name) {
    const colors = ["#e74c3c","#3498db","#2ecc71","#f39c12"];
    const player = {
      id, name,
      pos: 0,
      hand: [],
      chanceCards: [],
      reverseNext: false,
      doubleNext: false,
      protected: false,
      color: colors[this.players.length]
    };
    this.players.push(player);
    return player;
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
  }

  playCard(playerId, cardIndex) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { success:false, message:"당신의 턴이 아닙니다." };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스입니다." };

    const card = player.hand.splice(cardIndex, 1)[0];
    let move = card.move;
    if (player.doubleNext) { move *= 2; player.doubleNext = false; }
    if (player.reverseNext) { move = -move; player.reverseNext = false; }

    player.pos = ((player.pos + move) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
    const cell = this.board[player.pos];
    const events = applyCellEffect(cell, player, this.players, this.deck);

    // 수정구슬/crystal 칸 → 카드 버리기 선택
    let potionChance = false;
    const potionEvent = events.find(e => e.type === "potion");
    if (potionEvent) {
      this.potionChancePlayer = player.id;
      potionChance = true;
    }

    // 승리 체크
    if (player.hand.length === 0)
      return { success:true, events, potionChance:false, winner:player };

    if (!potionChance) this._nextTurn();
    return { success:true, events, potionChance, winner:null };
  }

  // 찬스 카드 사용
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
        if (player.hand.length === 0)
          return { success:true, message:"⚡ 번개 가속! 3칸 이동합니다.", winner:player, events };
        return { success:true, message:"⚡ 번개 가속! 3칸 추가 이동합니다.", events };
      }
      case "magic_shield":
        player.protected = true;
        return { success:true, message:"🛡️ 마법 방패! 다음 함정 효과를 막습니다.", events:[] };
      case "time_reverse": {
        const others = this.players.filter(p => p.id !== playerId);
        if (others.length === 0) return { success:false, message:"대상 없음" };
        const target = others[Math.floor(Math.random() * others.length)];
        target.pos = ((target.pos - 3) % TOTAL_CELLS + TOTAL_CELLS) % TOTAL_CELLS;
        return { success:true, message:`🔄 시간 역행! ${target.name}을(를) 3칸 뒤로 보냈습니다.`, events:[] };
      }
      case "alch_boost": {
        this.alchBoostPlayer = playerId;
        return { success:true, message:"✨ 연금술 촉진! 버릴 카드를 선택하세요.", alchBoost:true, events:[] };
      }
    }
    return { success:false, message:"알 수 없는 카드" };
  }

  // 연금술 촉진 카드 버리기
  alchBoostDiscard(playerId, cardIndex) {
    if (this.alchBoostPlayer !== playerId)
      return { success:false, message:"연금술 촉진 대기 중이 아닙니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };

    player.hand.splice(cardIndex, 1);
    this.alchBoostPlayer = null;

    if (player.hand.length === 0) return { success:true, winner:player };
    return { success:true, winner:null };
  }

  potionDiscard(playerId, cardIndex) {
    if (this.potionChancePlayer !== playerId)
      return { success:false, message:"수정구슬 찬스가 없습니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스" };

    player.hand.splice(cardIndex, 1);
    this._nextTurn();
    if (player.hand.length === 0) return { success:true, winner:player };
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

  getLobbyState() {
    return {
      roomId: this.id,
      players: this.players.map(p => ({ id:p.id, name:p.name, color:p.color })),
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
        chanceCards:p.chanceCards
      })),
      currentTurn: this.players[this.currentTurn]?.id || null,
      deckCount: this.deck.length,
      potionChancePlayer: this.potionChancePlayer,
      alchBoostPlayer: this.alchBoostPlayer,
    };
  }
}

module.exports = { GameRoom };
