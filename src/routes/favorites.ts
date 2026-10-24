import { Router } from "express";
import {
  toggleFavorite,
  getFavorites,
  checkFavorite,
} from "../controllers/favoriteController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/:eventId", protect, toggleFavorite);
router.get("/", protect, getFavorites);
router.get("/check/:eventId", protect, checkFavorite);

export default router;
