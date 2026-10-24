import { Response } from "express";
import Favorite from "../models/Favorite.js";
import { AuthRequest } from "../middleware/auth.js";

// @desc    Toggle favorite
// @route   POST /api/v1/favorites/:eventId
// @access  Authenticated
export const toggleFavorite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user?._id;

    const existing = await Favorite.findOne({
      user: userId,
      event: eventId,
    });

    if (existing) {
      await existing.deleteOne();
      res.status(200).json({ success: true, isFavorited: false });
    } else {
      await Favorite.create({ user: userId, event: eventId });
      res.status(201).json({ success: true, isFavorited: true });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get user favorites
// @route   GET /api/v1/favorites
// @access  Authenticated
export const getFavorites = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const favorites = await Favorite.find({ user: req.user?._id })
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      favorites: favorites.filter((f) => f.event !== null),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Check if event is favorited
// @route   GET /api/v1/favorites/check/:eventId
// @access  Authenticated
export const checkFavorite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const exists = await Favorite.findOne({
      user: req.user?._id,
      event: req.params.eventId,
    });

    res.status(200).json({ success: true, isFavorited: !!exists });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
