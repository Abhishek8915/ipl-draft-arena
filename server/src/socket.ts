import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import type { ActionAck } from "../../shared/types";
import {
  activePlayerId, cancelTrade, closeRoom, closeTradeWindow, createRoom, finishSpin, getPlayer,
  joinRoom, openTradeWindow, pickPlayer, proposeTrade, removeLobbyPlayer, reorderSquad,
  resolveTrade, rooms, safeSnapshot, setConnected, spin, spinAgain, startDraft,
  updateRoles, validateEvaluationStart
} from "./gameEngine";
import { evaluateRoom } from "./services/evaluationService";

const codeSchema = z.string().regex(/^\d{6}$/);
const emptySchema = z.object({}).strict();
const nameSchema = z.string().trim().min(2).max(18);
const pickSchema = z.object({ playerId: z.string().min(1) }).strict();
const tradeSchema = z.object({ offeredPlayerId: z.string().min(1), targetPlayerId: z.string().min(1) }).strict();
const orderSchema = z.object({ playerIds: z.array(z.string()) }).strict();
const rolesSchema = z.object({
  captain: z.string().min(1), viceCaptain: z.string().min(1), wicketkeeper: z.string().min(1)
}).strict();
const roomNameSchema = z.object({ name: nameSchema }).strict();
const joinSchema = z.object({ code: codeSchema, name: nameSchema }).strict();

interface SocketContext {
  roomCode?: string;
  playerId?: string;
}

type Ack = (result: ActionAck) => void;
const activeSockets = new Map<string, Socket>();
const contextKey = (roomCode: string, playerId: string) => `${roomCode}:${playerId}`;

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()) ?? "http://localhost:5173", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e6
  });

  io.on("connection", (socket) => {
    const auth = socket.handshake.auth as { sessionId?: unknown; roomCode?: unknown };
    if (typeof auth.sessionId === "string" && typeof auth.roomCode === "string") {
      bindExisting(socket, auth.roomCode, auth.sessionId);
    }

    socket.on("room:create", (payload: unknown, ack?: Ack) => {
      run(socket, ack, () => {
        const parsed = roomNameSchema.parse(payload);
        const { room, playerId } = createRoom(parsed.name);
        bind(socket, room.code, playerId);
        sendState(room.code);
        return { roomCode: room.code, playerId };
      });
    });

    socket.on("room:join", (payload: unknown, ack?: Ack) => {
      run(socket, ack, () => {
        const parsed = joinSchema.parse(payload);
        const { room, playerId } = joinRoom(parsed.code, parsed.name);
        bind(socket, room.code, playerId);
        sendState(room.code);
        return { roomCode: room.code, playerId };
      });
    });

    socket.on("room:resume", (payload: unknown, ack?: Ack) => {
      run(socket, ack, () => {
        const schema = z.object({ code: codeSchema, playerId: z.string().uuid() }).strict();
        const parsed = schema.parse(payload);
        const room = rooms.get(parsed.code);
        if (!room) throw new Error("This room has expired or the server restarted.");
        const player = getPlayer(room, parsed.playerId);
        if (room.phase === "lobby" && room.players.some((other) => other.id !== player.id &&
          other.name.toLocaleLowerCase() === player.name.toLocaleLowerCase() && other.connected)) {
          throw new Error("That player session is already connected elsewhere.");
        }
        bind(socket, room.code, player.id);
        sendState(room.code);
        return { roomCode: room.code, playerId: player.id };
      });
    });

    socket.on("room:leave", (payload: unknown, ack?: Ack) => {
      run(socket, ack, () => {
        emptySchema.parse(payload ?? {});
        const room = getBoundRoom(socket);
        const playerId = getBoundPlayerId(socket);
        if (room.phase === "lobby") {
          removeLobbyPlayer(room, playerId);
          if (rooms.has(room.code)) sendState(room.code);
          else io.to(room.code).emit("room:closed", { message: "The room is empty." });
        } else {
          setConnected(room, playerId, false);
          sendState(room.code);
        }
        socket.leave(room.code);
        clearSocketContext(socket);
        return {};
      });
    });

    socket.on("lobby:start", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      startDraft(room, getBoundPlayerId(socket));
      sendState(room.code);
      return {};
    }));

    socket.on("draft:spin", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      const franchiseId = spin(room, getActingPlayerId(room, socket));
      sendState(room.code);
      setTimeout(() => {
        if (rooms.get(room.code) !== room) return;
        finishSpin(room);
        sendState(room.code);
      }, 1_850).unref();
      return { franchiseId };
    }));

    socket.on("draft:spin-again", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      spinAgain(room, getActingPlayerId(room, socket));
      sendState(room.code);
      return {};
    }));

    socket.on("draft:pick", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      const parsed = pickSchema.parse(payload);
      const room = getBoundRoom(socket);
      pickPlayer(room, getActingPlayerId(room, socket), parsed.playerId);
      sendState(room.code);
      return {};
    }));

    socket.on("trade:open", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      openTradeWindow(room, getBoundPlayerId(socket));
      sendState(room.code);
      return {};
    }));

    socket.on("trade:propose", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      const parsed = tradeSchema.parse(payload);
      const room = getBoundRoom(socket);
      proposeTrade(room, getBoundPlayerId(socket), parsed.offeredPlayerId, parsed.targetPlayerId);
      sendState(room.code);
      return {};
    }));

    socket.on("trade:accept", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      resolveTrade(room, getBoundPlayerId(socket), "accept");
      sendState(room.code);
      return {};
    }));

    socket.on("trade:reject", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      resolveTrade(room, getBoundPlayerId(socket), "reject");
      sendState(room.code);
      return {};
    }));

    socket.on("trade:cancel", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      cancelTrade(room, getBoundPlayerId(socket));
      sendState(room.code);
      return {};
    }));

    socket.on("trade:close", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      closeTradeWindow(room, getBoundPlayerId(socket));
      sendState(room.code);
      return {};
    }));

    socket.on("squad:reorder", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      const parsed = orderSchema.parse(payload);
      const room = getBoundRoom(socket);
      reorderSquad(room, getBoundPlayerId(socket), parsed.playerIds);
      sendState(room.code);
      return {};
    }));

    socket.on("squad:roles:update", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      const parsed = rolesSchema.parse(payload);
      const room = getBoundRoom(socket);
      updateRoles(room, getBoundPlayerId(socket), parsed);
      sendState(room.code);
      return {};
    }));

    socket.on("evaluation:start", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      validateEvaluationStart(room, getBoundPlayerId(socket));
      sendState(room.code);
      void evaluateRoom(room).then((result) => {
        if (rooms.get(room.code) !== room || room.phase !== "evaluating") return;
        room.evaluation = result;
        room.phase = "results";
        room.lastActivityAt = Date.now();
        sendState(room.code);
      }).catch((error: unknown) => {
        console.error("Unexpected evaluation service failure:", error);
      });
      return {};
    }));

    socket.on("room:close", (payload: unknown, ack?: Ack) => run(socket, ack, () => {
      emptySchema.parse(payload ?? {});
      const room = getBoundRoom(socket);
      closeRoom(room, getBoundPlayerId(socket));
      io.to(room.code).emit("room:closed", { message: "The host closed this room." });
      setTimeout(() => io.in(room.code).disconnectSockets(true), 100).unref();
      return {};
    }));

    socket.on("disconnect", () => {
      const context = socket.data.context as SocketContext | undefined;
      if (!context?.roomCode || !context.playerId) return;
      const key = contextKey(context.roomCode, context.playerId);
      if (activeSockets.get(key) !== socket) return;
      activeSockets.delete(key);
      const room = rooms.get(context.roomCode);
      if (room) {
        setConnected(room, context.playerId, false);
        sendState(room.code);
      }
    });
  });

  const ttlMinutes = Number(process.env.ROOM_TTL_MINUTES) || 60;
  setInterval(() => {
    const cutoff = Date.now() - ttlMinutes * 60_000;
    for (const [code, room] of rooms) {
      if (room.lastActivityAt < cutoff) {
        rooms.delete(code);
        io.to(code).emit("room:closed", { message: "This room expired after being inactive." });
        io.in(code).disconnectSockets(true);
      }
    }
  }, 60_000).unref();
  return io;

  function sendState(code: string): void {
    const room = rooms.get(code);
    if (room) io.to(code).emit("room:state", safeSnapshot(room));
  }

  function bind(socket: Socket, roomCode: string, playerId: string): void {
    const room = rooms.get(roomCode);
    if (!room) throw new Error("This room is no longer available.");
    getPlayer(room, playerId);
    const key = contextKey(roomCode, playerId);
    const previous = activeSockets.get(key);
    if (previous && previous !== socket) previous.disconnect(true);
    activeSockets.set(key, socket);
    socket.data.context = { roomCode, playerId } satisfies SocketContext;
    socket.join(roomCode);
    setConnected(room, playerId, true);
  }

  function bindExisting(socket: Socket, roomCode: string, playerId: string): void {
    const room = rooms.get(roomCode);
    if (!room || !room.players.some((player) => player.id === playerId)) return;
    bind(socket, roomCode, playerId);
    sendState(roomCode);
  }
}

function run(socket: Socket, ack: Ack | undefined, callback: () => Record<string, unknown>): void {
  try {
    const result = callback();
    ack?.({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    socket.emit("room:error", { message });
    ack?.({ ok: false, error: message });
  }
}

function getBoundRoom(socket: Socket) {
  const context = socket.data.context as SocketContext | undefined;
  if (!context?.roomCode) throw new Error("Join a room before taking this action.");
  const room = rooms.get(context.roomCode);
  if (!room) throw new Error("This room is no longer available.");
  getBoundPlayerId(socket);
  return room;
}

function getBoundPlayerId(socket: Socket): string {
  const context = socket.data.context as SocketContext | undefined;
  if (!context?.playerId) throw new Error("Your player session is not connected to this room.");
  return context.playerId;
}

function getActingPlayerId(room: ReturnType<typeof getBoundRoom>, socket: Socket): string {
  const identity = getBoundPlayerId(socket);
  const active = activePlayerId(room);
  const activePlayer = active ? room.players.find((player) => player.id === active) : undefined;
  if (identity === room.hostPlayerId && activePlayer && !activePlayer.connected) return activePlayer.id;
  return identity;
}

function clearSocketContext(socket: Socket): void {
  const context = socket.data.context as SocketContext | undefined;
  if (context?.roomCode && context.playerId && activeSockets.get(contextKey(context.roomCode, context.playerId)) === socket) {
    activeSockets.delete(contextKey(context.roomCode, context.playerId));
  }
  delete socket.data.context;
}
