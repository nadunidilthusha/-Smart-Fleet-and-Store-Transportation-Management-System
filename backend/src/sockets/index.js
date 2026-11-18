import { Server } from "socket.io";
import { env } from "../config/env.js";
import { ROLES } from "../config/constants.js";
import { verifyToken } from "../utils/token.js";
import logger from "../utils/logger.js";

/*
  Real-time updates (the frontends have src/api/socket.js and src/hooks/useSocket.js ready).
  Rooms:   "admin"            -> every SYSTEM_ADMIN
           "store:<storeId>"  -> staff of one store
  Events:  booking:updated, trip:updated, trip:location, notification:new
  Emit from any service:  emitToAdmins("booking:updated", booking)
*/
let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.corsOrigins, credentials: true } });

  // The frontend sends the same JWT: io(url, { auth: { token } })
  io.use((socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      socket.data.user = { id: payload.sub, role: payload.role, storeId: payload.storeId };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { role, storeId } = socket.data.user;
    if (role === ROLES.SYSTEM_ADMIN) socket.join("admin");
    if (storeId) socket.join(`store:${storeId}`);
    logger.info(`Socket connected (${role})`);
  });

  return io;
}

export const emitToAdmins = (event, payload) => io?.to("admin").emit(event, payload);
export const emitToStore = (storeId, event, payload) => io?.to(`store:${storeId}`).emit(event, payload);
