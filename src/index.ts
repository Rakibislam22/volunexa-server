import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import connectDB from "./config/db.js";
import { initializeSocket } from "./socket/index.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import registrationRoutes from "./routes/registrations.js";
import analyticsRoutes from "./routes/analytics.js";
import aiRoutes from "./routes/ai.js";
import favoriteRoutes from "./routes/favorites.js";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/favorites", favoriteRoutes);

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready for connections`);
  });
});

export { app, io };
