import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { rooms } from "./gameEngine";
import { attachSocketServer } from "./socket";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3001;
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()) ?? ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));
app.get("/health", (_request, response) => {
  response.json({ status: "ok", activeRooms: rooms.size, timestamp: new Date().toISOString() });
});

attachSocketServer(httpServer);
httpServer.listen(port, () => {
  console.log(`IPL Draft Arena server listening on http://localhost:${port}`);
});
