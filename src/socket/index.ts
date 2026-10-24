import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server;

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join event room for realtime updates
    socket.on("join:event", (eventId: string) => {
      socket.join(`event:${eventId}`);
      console.log(`Socket ${socket.id} joined event:${eventId}`);
    });

    // Leave event room
    socket.on("leave:event", (eventId: string) => {
      socket.leave(`event:${eventId}`);
    });

    // Join organizer room for notifications
    socket.on("join:organizer", (organizerId: string) => {
      socket.join(`organizer:${organizerId}`);
      console.log(`Socket ${socket.id} joined organizer:${organizerId}`);
    });

    // Join volunteer room for notifications
    socket.on("join:volunteer", (volunteerId: string) => {
      socket.join(`volunteer:${volunteerId}`);
      console.log(`Socket ${socket.id} joined volunteer:${volunteerId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
