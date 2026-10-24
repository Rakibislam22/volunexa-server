import { Router } from "express";
import { generateEventDescription } from "../controllers/aiController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.post(
  "/generate-description",
  protect,
  authorize("organizer"),
  generateEventDescription
);

export default router;
