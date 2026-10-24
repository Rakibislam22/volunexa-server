import { Router } from "express";
import {
  registerForEvent,
  getEventRegistrations,
  updateRegistrationStatus,
  getMyRegistrations,
  cancelRegistration,
  checkRegistration,
} from "../controllers/registrationController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Volunteer routes
router.post("/", protect, authorize("volunteer"), registerForEvent);
router.get(
  "/my-registrations",
  protect,
  authorize("volunteer"),
  getMyRegistrations
);
router.put(
  "/:id/cancel",
  protect,
  authorize("volunteer"),
  cancelRegistration
);
router.get(
  "/check/:eventId",
  protect,
  authorize("volunteer"),
  checkRegistration
);

// Organizer routes
router.get(
  "/event/:eventId",
  protect,
  authorize("organizer"),
  getEventRegistrations
);
router.put(
  "/:id/status",
  protect,
  authorize("organizer"),
  updateRegistrationStatus
);

export default router;
