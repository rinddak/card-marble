const { createShuffledDeck } = require("./Deck");
const { createBoard, applyCellEffect } = require("./Board");

const HAND_SIZE = 7;

const ITEMS = {
  double:  { id:"double",  name:"두배 물약",    icon:"🔴", desc:"다음 이동 칸수 2배" },
  swap:    { id:"swap",    name:"위치 이동 물약", icon:"🟣", desc:"랜덤 플레이어와 위치 교환" },
  protect: { id:"protect", name:"보호 물약",     icon:"🔵", desc:"다음 나쁜 칸 효과 1회 무효" },
};

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.deck = [];
    this.board = createBoard();
    this.started = false;
    this.currentTurn = 0;
    this.potionChancePlayer = null;
    this.shopPlayer = null; // 상점 대기 중인 플레이어
  }

  addPlayer(id, name) {
    const colors = ["#e74c3c","#3498db","#2ecc71","#f39c12"];
    const player = {
      id, name,
      pos: 0,
      hand: [],
      items: [],          // 보유 아이템
      reverseNext: false,
      doubleNext: false,  // 두배 물약 효과
      protected: false,   // 보호 물약 효과
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
      p.items = [];
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
    this.shopPlayer = null;
  }

  playCard(playerId, cardIndex) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { success:false, message:"당신의 턴이 아닙니다." };
    if (cardIndex < 0 || cardIndex >= player.hand.length)
      return { success:false, message:"잘못된 카드 인덱스입니다." };

    const card = player.hand.splice(cardIndex, 1)[0];

    // 두배 물약 효과 적용
    let move = card.move;
    if (player.doubleNext) {
      move *= 2;
      player.doubleNext = false;
    }

    // 역류 적용
    if (player.reverseNext) {
      move = -move;
      player.reverseNext = false;
    }

    player.pos = ((player.pos + move) % 36 + 36) % 36;
    const cell = this.board[player.pos];

    // 보호 물약: 나쁜 칸 효과 무효
    const BAD_CELLS = ["trap","thunder","alchemy","reverse"];
    let events = [];
    if (player.protected && BAD_CELLS.includes(cell.type)) {
      player.protected = false;
      events.push({ type:"protect_used", playerId:player.id,
        message:`🔵 보호 물약 발동! ${cell.label} 효과가 무효화됩니다.` });
    } else {
      events = applyCellEffect(cell, player, this.players, this.deck);
    }

    // 상점 칸 처리
    let shopChance = false;
    if (cell.type === "shop") {
      this.shopPlayer = player.id;
      shopChance = true;
    }

    // 물약 찬스 (potion, crystal 칸)
    let potionChance = false;
    const potionEvent = events.find(e => e.type === "potion");
    if (potionEvent && cell.type !== "shop") {
      this.potionChancePlayer = player.id;
      potionChance = true;
    }

    // 승리 체크
    if (player.hand.length === 0) {
      return { success:true, events, potionChance:false, shopChance:false, winner:player };
    }

    if (!potionChance && !shopChance) this._nextTurn();

    return { success:true, events, potionChance, shopChance, winner:null };
  }

  // 아이템 상점 구매
  buyItem(playerId, itemId) {
    if (this.shopPlayer !== playerId)
      return { success:false, message:"상점 이용 권한이 없습니다." };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    if (!ITEMS[itemId]) return { success:false, message:"없는 아이템입니다." };

    // swap 아이템은 즉시 발동
    if (itemId === "swap") {
      const others = this.players.filter(p => p.id !== playerId);
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        const tempPos = player.pos;
        player.pos = target.pos;
        target.pos = tempPos;
        this._nextTurn();
        return { success:true, immediate:true,
          message:`🟣 위치 이동 물약! ${target.name}과(와) 위치가 바뀌었습니다.` };
      }
    }

    // double, protect 는 인벤토리에 보관
    player.items.push(ITEMS[itemId]);
    this._nextTurn();
    return { success:true, immediate:false,
      message:`${ITEMS[itemId].icon} ${ITEMS[itemId].name}을(를) 획득했습니다!` };
  }

  // 상점 패스
  skipShop(playerId) {
    if (this.shopPlayer === playerId) this._nextTurn();
  }

  // 아이템 사용 (인벤토리에서)
  useItem(playerId, itemId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success:false, message:"플레이어 없음" };
    const idx = player.items.findIndex(i => i.id === itemId);
    if (idx < 0) return { success:false, message:"보유하지 않은 아이템" };

    player.items.splice(idx, 1);

    if (itemId === "double") {
      player.doubleNext = true;
      return { success:true, message:"🔴 두배 물약 사용! 다음 이동이 2배가 됩니다." };
    }
    if (itemId === "protect") {
      player.protected = true;
      return { success:true, message:"🔵 보호 물약 사용! 다음 나쁜 칸 효과를 막습니다." };
    }
    if (itemId === "swap") {
      const others = this.players.filter(p => p.id !== playerId && p.hand.length > 0);
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        const tempPos = player.pos;
        player.pos = target.pos;
        target.pos = tempPos;
        return { success:true, message:`🟣 위치 이동 물약! ${target.name}과(와) 위치가 바뀌었습니다.` };
      }
    }
    return { success:false, message:"효과 발동 실패" };
  }

  potionDiscard(playerId, cardIndex) {
    if (this.potionChancePlayer !== playerId)
      return { success:false, message:"물약 찬스가 없습니다." };
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
        items:p.items
      })),
      currentTurn: this.players[this.currentTurn]?.id || null,
      deckCount: this.deck.length,
      potionChancePlayer: this.potionChancePlayer,
      shopPlayer: this.shopPlayer,
      shopItems: Object.values(ITEMS),
    };
  }
}

module.exports = { GameRoom };