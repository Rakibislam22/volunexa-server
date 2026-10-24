import { Router } from "express";
import {
  getDashboardStats,
  getEventsByCategory,
  getRegistrationStats,
  getVolunteerStatusBreakdown,
  getVolunteerDashboardStats,
} from "../controllers/analyticsController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Organizer analytics
router.get("/dashboard", protect, authorize("organizer"), getDashboardStats);
router.get(
  "/events-by-category",
  protect,
  authorize("organizer"),
  getEventsByCategory
);
router.get(
  "/registration-stats",
  protect,
  authorize("organizer"),
  getRegistrationStats
);
router.get(
  "/volunteer-status",
  protect,
  authorize("organizer"),
  getVolunteerStatusBreakdown
);

// Volunteer analytics
router.get(
  "/volunteer-dashboard",
  protect,
  authorize("volunteer"),
  getVolunteerDashboardStats
);

export default router;
