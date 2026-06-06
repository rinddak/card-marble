const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { GameRoom } = require("./game/GameRoom");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "client")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin:"*", methods:["GET","POST"] } });

const rooms = {};

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
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
    room.startGame();
    io.to(room.id).emit("game-started", room.getPublicState());
    room.players.forEach(p => {
      if (!p.isBot) io.to(p.id).emit("hand-updated", { hand:p.hand });
    });
    // 봇 턴이면 바로 진행
    triggerBotTurn(room);
  });

  // 싱글 모드 시작 (봇 포함)
  socket.on("start-single", ({ playerName, botCount }) => {
    const roomId = generateRoomId();
    const room = new GameRoom(roomId);
    rooms[roomId] = room;

    // 실제 플레이어 추가
    room.addPlayer(socket.id, playerName);
    socket.join(roomId);
    socket.data.roomId = roomId;

    // 봇 추가
    const botNames = ["연금봇 A", "연금봇 B", "연금봇 C"];
    for (let i = 0; i < botCount; i++) {
      const botId = "bot_" + i + "_" + Date.now();
      room.addBot(botId, botNames[i]);
    }

    room.startGame();
    socket.emit("room-created", { roomId });
    socket.emit("game-started", room.getPublicState());
    socket.emit("hand-updated", { hand: room.players.find(p => p.id === socket.id).hand });

    triggerBotTurn(room);
  });

  socket.on("play-card", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.started) return;
    const result = room.playCard(socket.id, cardIndex);
    if (!result.success) {
      socket.emit("error", { message:result.message });
      if (result.ingredientWarning) socket.emit("ingredient-warning", { message:result.message });
      return;
    }
    broadcastGameUpdate(io, room);
    if (result.events?.length) io.to(room.id).emit("cell-events", { events:result.events });
    if (result.alchemySelect) { socket.emit("alchemy-select"); return; }
    if (result.potionChance) { socket.emit("potion-chance"); return; }
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id]; return;
    }
    triggerBotTurn(room);
  });

  socket.on("draw-card", () => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.started) return;
    const result = room.drawCard(socket.id);
    if (!result.success) return socket.emit("error", { message:result.message });
    broadcastGameUpdate(io, room);
    triggerBotTurn(room);
  });

  socket.on("potion-discard", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.potionDiscard(socket.id, cardIndex);
    if (!result.success) {
      socket.emit("error", { message:result.message });
      if (result.ingredientWarning) socket.emit("ingredient-warning", { message:result.message });
      return;
    }
    broadcastGameUpdate(io, room);
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id]; return;
    }
    triggerBotTurn(room);
  });

  socket.on("potion-pass", () => {
    const room = rooms[socket.data.roomId];
    if (room) { room.clearPotionChance(socket.id); broadcastGameUpdate(io, room); triggerBotTurn(room); }
  });

  socket.on("alchemy-target", ({ targetId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.alchemyTarget(socket.id, targetId);
    if (!result.success) return socket.emit("error", { message:result.message });
    broadcastGameUpdate(io, room);
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
    triggerBotTurn(room);
  });

  socket.on("time-reverse-target", ({ targetId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.timeReverseTarget(socket.id, targetId);
    if (!result.success) return socket.emit("error", { message:result.message });
    broadcastGameUpdate(io, room);
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
    triggerBotTurn(room);
  });

  socket.on("use-chance-card", ({ cardId }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.useChanceCard(socket.id, cardId);
    if (!result.success) return socket.emit("error", { message:result.message });
    broadcastGameUpdate(io, room);
    if (result.events?.length) io.to(room.id).emit("cell-events", { events:result.events });
    if (result.timeReverse) return; // 타겟 선택 대기
    if (result.alchBoost) { socket.emit("alch-boost-chance"); return; }
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id]; return;
    }
    io.to(room.id).emit("cell-events", { events:[{ message:result.message }] });
    triggerBotTurn(room);
  });

  socket.on("alch-boost-discard", ({ cardIndex }) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const result = room.alchBoostDiscard(socket.id, cardIndex);
    if (!result.success) {
      socket.emit("error", { message:result.message });
      if (result.ingredientWarning) socket.emit("ingredient-warning", { message:result.message });
      return;
    }
    broadcastGameUpdate(io, room);
    if (result.winner) {
      io.to(room.id).emit("game-over", { winnerId:result.winner.id, winnerName:result.winner.name });
      delete rooms[room.id];
    }
  });

  socket.on("disconnect", () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    room.removePlayer(socket.id);
    if (room.players.filter(p => !p.isBot).length === 0) {
      delete rooms[socket.data.roomId];
    } else {
      io.to(room.id).emit("room-updated", room.getLobbyState());
    }
    console.log("disconnected:", socket.id);
  });
});

// 게임 상태 브로드캐스트
function broadcastGameUpdate(io, room) {
  io.to(room.id).emit("game-updated", room.getPublicState());
  room.players.forEach(p => {
    if (!p.isBot) io.to(p.id).emit("hand-updated", { hand:p.hand });
  });
}

// 봇 턴 처리
function triggerBotTurn(room) {
  if (!room || !room.started) return;
  const current = room.getCurrentPlayer();
  if (!current || !current.isBot) return;

  setTimeout(() => {
    if (!rooms[room.id]) return;
    const botResult = room.doBotTurn();
    if (!botResult) return;

    broadcastGameUpdate(io, room);
    if (botResult.events?.length) io.to(room.id).emit("cell-events", { events:botResult.events });
    if (botResult.winner) {
      io.to(room.id).emit("game-over", { winnerId:botResult.winner.id, winnerName:botResult.winner.name });
      delete rooms[room.id]; return;
    }
    // 다음 턴도 봇이면 계속
    triggerBotTurn(room);
  }, 1500);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`카드마블 서버: http://localhost:${PORT}`));
