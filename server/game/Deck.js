const SUITS = ["spade", "heart", "diamond", "club"];
const SUIT_SYMBOLS = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q"]; // K 제외

function getMoveValue(rank) {
  const map = { A:1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":1,"8":2,"9":3,"10":4,J:5,Q:6 };
  return map[rank] || 1;
}

function createShuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, symbol: SUIT_SYMBOLS[suit], rank, move: getMoveValue(rank) });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

module.exports = { createShuffledDeck, getMoveValue };