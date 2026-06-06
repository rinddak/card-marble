const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { GameRoom } = require("./game/GameRoom");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'client')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin:"*", methods:["GET","POST"] } });

const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("create-room", ({ playerName }) => {
    const roomId = generateRoomId();
    rooms[roomId] = new GameRoom(roomId);
    const player = rooms[roomId].addPlayer(socket.id, playerName);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit("room-created", { roomId, player });
    io.to(roomId).emit("room-updated", rooms[roomId].getLobbyState());
  });

  socket.on("join-room", ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", { message:"방을 찾을 수 없습니다." });
    if (room.started) return socket.emit("error", { message:"이미 시작된 게임입니다." });
    if (room.players.length >= 4) return socket.emit("error", { message:"방이 가득 찼습니다." });
    const player = room.addPlayer(socket.id, playerName);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit("room-joined", { player });
    io.to(roomId).emit("room-updated", room.getLobbyState());
  });

  socket.on("start-game", () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    if (room.players.length < 2) return socket.emit("error", { message:"최소 2명 필요합니다." });
    room.startGame();
    io.to(room.id).emit("game-started", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
  });

  socket.on("play-card", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.started) return;
    const result = room.playCard(socket.id, cardIndex);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    if (result.events?.length) io.to(room.id).emit("cell-events", { events:result.events });
    if (result.potionChance) socket.emit("potion-chance");
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id];
    }
  });

  socket.on("potion-discard", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.potionDiscard(socket.id, cardIndex);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id];
    }
  });

  socket.on("potion-pass", () => {
    const room = rooms[socket.data.roomId];
    if (room) room.clearPotionChance(socket.id);
    if (room) io.to(room.id).emit("game-updated", room.getPublicState());
  });

  // 찬스 카드 사용
  socket.on("use-chance-card", ({ cardId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.useChanceCard(socket.id, cardId);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    if (result.events?.length) io.to(room.id).emit("cell-events", { events:result.events });
    if (result.alchBoost) socket.emit("alch-boost-chance");
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id];
    } else {
      io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
    }
  });

  // 연금술 타겟 지정
  socket.on("alchemy-target", ({ targetId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.alchemyTarget(socket.id, targetId);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
  });

  // 시간 역행 타겟 지정
  socket.on("time-reverse-target", ({ targetId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.timeReverseTarget(socket.id, targetId);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
  });

  // 연금술 촉진 카드 버리기
  socket.on("alch-boost-discard", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.alchBoostDiscard(socket.id, cardIndex);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id];
    }
  });

  // 아이템 구매
  socket.on("buy-item", ({ itemId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.buyItem(socket.id, itemId);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
  });

  // 상점 패스
  socket.on("skip-shop", () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    room.skipShop(socket.id);
    io.to(room.id).emit("game-updated", room.getPublicState());
  });

  // 아이템 사용 (인벤토리에서)
  socket.on("use-item", ({ itemId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.useItem(socket.id, itemId);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
  });

  socket.on("draw-card", () => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.started) return;
    const result = room.drawCard(socket.id);
    if (!result.success) return socket.emit("error", { message:result.message });
    io.to(room.id).emit("game-updated", room.getPublicState());
    room.players.forEach(p => io.to(p.id).emit("hand-updated", { hand:p.hand }));
  });

  socket.on("disconnect", () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    room.removePlayer(socket.id);
    if (room.players.length === 0) {
      delete rooms[socket.data.roomId];
    } else {
      io.to(room.id).emit("room-updated", room.getLobbyState());
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`카드마블 서버: http://localhost:${PORT}`));
