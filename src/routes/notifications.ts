import { Router } from "express";
import {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// All notification routes are protected for authenticated users (volunteers, organizers, admins)
router.use(protect);

router.get("/", getUserNotifications);
router.put("/mark-read", markNotificationsAsRead);
router.delete("/clear-all", clearAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
