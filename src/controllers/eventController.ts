import { Response } from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { AuthRequest } from "../middleware/auth.js";
import { getIO } from "../socket/index.js";

// @desc    Create event
// @route   POST /api/v1/events
// @access  Organizer only
export const createEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user?._id,
    };

    const event = await Event.create(eventData);

    // Broadcast new event if published
    if (event.status === "published") {
      getIO().emit("event:created", event);
    }

    res.status(201).json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get all published events (public)
// @route   GET /api/v1/events
// @access  Public
export const getEvents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      search,
      category,
      location,
      status,
      dateFilter,
      page = "1",
      limit = "12",
    } = req.query;

    const query: any = {};

    // Default: only published events for public
    if (status) {
      query.status = status;
    } else {
      query.status = "published";
    }

    // Search by title/description
    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category && typeof category === "string") {
      query.category = category;
    }

    // Filter by location
    if (location && typeof location === "string") {
      query.location = { $regex: location, $options: "i" };
    }

    // Filter by date
    if (dateFilter === "upcoming") {
      query.date = { $gte: new Date() };
    } else if (dateFilter === "past") {
      query.date = { $lt: new Date() };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("organizer", "name email")
        .sort({ date: 1 })
        .skip(skip)
        .limit(limitNum),
      Event.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get single event
// @route   GET /api/v1/events/:id
// @access  Public
export const getEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "name email"
    );

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.status(200).json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Update event
// @route   PUT /api/v1/events/:id
// @access  Organizer (owner only)
export const updateEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizer.toString() !== req.user?._id.toString()) {
      res
        .status(403)
        .json({ message: "Not authorized to update this event" });
      return;
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("organizer", "name email");

    // Broadcast update
    getIO().emit("event:updated", event);
    getIO().to(`event:${req.params.id}`).emit("event:details:updated", event);

    res.status(200).json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Delete event
// @route   DELETE /api/v1/events/:id
// @access  Organizer (owner only)
export const deleteEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizer.toString() !== req.user?._id.toString()) {
      res
        .status(403)
        .json({ message: "Not authorized to delete this event" });
      return;
    }

    // Delete all registrations for this event
    await Registration.deleteMany({ event: event._id });
    await event.deleteOne();

    getIO().emit("event:deleted", { eventId: req.params.id });

    res.status(200).json({ success: true, message: "Event deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get organizer's events
// @route   GET /api/v1/events/my-events
// @access  Organizer only
export const getMyEvents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const events = await Event.find({ organizer: req.user?._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, events });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
