import { Response } from "express";
import mongoose from "mongoose";
import Notification, { INotification } from "../models/Notification.js";
import { AuthRequest } from "../middleware/auth.js";
import { getIO } from "../socket/index.js";

interface CreateNotificationParams {
  recipient: string | mongoose.Types.ObjectId;
  sender?: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "alert";
  relatedEvent?: string | mongoose.Types.ObjectId;
  relatedRegistration?: string | mongoose.Types.ObjectId;
}

// Utility function to create and broadcast a persistent notification in real-time
export const createAndSendNotification = async (
  params: CreateNotificationParams
): Promise<INotification | null> => {
  try {
    const notification = await Notification.create({
      recipient: params.recipient,
      sender: params.sender,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      relatedEvent: params.relatedEvent,
      relatedRegistration: params.relatedRegistration,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email role")
      .populate("relatedEvent", "title date location");

    // Realtime emission to target user/role rooms
    try {
      const io = getIO();
      const recIdStr = params.recipient.toString();
      io.to(`user:${recIdStr}`)
        .to(`organizer:${recIdStr}`)
        .to(`volunteer:${recIdStr}`)
        .emit("notification:push", populatedNotification || notification);

      // Backwards compatibility event
      io.to(`user:${recIdStr}`)
        .to(`organizer:${recIdStr}`)
        .to(`volunteer:${recIdStr}`)
        .emit("notification:new", populatedNotification || notification);
    } catch (socketErr) {
      console.warn("Socket emission warning:", socketErr);
    }

    return populatedNotification || notification;
  } catch (error) {
    console.error("Error creating and sending notification:", error);
    return null;
  }
};

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications
// @access  Private (all authenticated users)
export const getUserNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 30;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .populate("sender", "name email role")
        .populate("relatedEvent", "title date location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/v1/notifications/mark-read
// @access  Private
export const markNotificationsAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { ids } = req.body;

    if (Array.isArray(ids) && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids }, recipient: userId },
        { $set: { isRead: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Notifications updated successfully",
      unreadCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Delete single notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      res.status(404).json({ success: false, message: "Notification not found" });
      return;
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Notification removed",
      unreadCount,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Clear all notifications for user
// @route   DELETE /api/v1/notifications/clear-all
// @access  Private
export const clearAllNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await Notification.deleteMany({ recipient: userId });

    res.status(200).json({
      success: true,
      message: "All notifications cleared",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

