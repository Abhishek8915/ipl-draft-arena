import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const initialSessionId = sessionStorage.getItem("ipl-player-id");
const initialRoomCode = sessionStorage.getItem("ipl-room-code");

export const socket = io(serverUrl, {
  autoConnect: true,
  auth: initialSessionId && initialRoomCode ? { sessionId: initialSessionId, roomCode: initialRoomCode } : {}
});
