import { Router } from "express";
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
} from "../controllers/eventController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Public routes
router.get("/", getEvents);
router.get("/:id", getEvent);

// Organizer routes
router.post("/", protect, authorize("organizer"), createEvent);
router.get("/organizer/my-events", protect, authorize("organizer"), getMyEvents);
router.put("/:id", protect, authorize("organizer"), updateEvent);
router.delete("/:id", protect, authorize("organizer"), deleteEvent);

export default router;
