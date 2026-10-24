import { Response } from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { AuthRequest } from "../middleware/auth.js";

// @desc    Get organizer dashboard stats
// @route   GET /api/v1/analytics/dashboard
// @access  Organizer only
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizerId = req.user?._id;

    const [
      totalEvents,
      upcomingEvents,
      completedEvents,
      totalRegistrations,
    ] = await Promise.all([
      Event.countDocuments({ organizer: organizerId }),
      Event.countDocuments({
        organizer: organizerId,
        date: { $gte: new Date() },
        status: { $in: ["published", "closed"] },
      }),
      Event.countDocuments({
        organizer: organizerId,
        status: "completed",
      }),
      Registration.countDocuments({
        event: {
          $in: await Event.find({ organizer: organizerId }).distinct("_id"),
        },
        status: { $ne: "cancelled" },
      }),
    ]);

    // Calculate total capacity and available slots
    const events = await Event.find({ organizer: organizerId });
    const totalCapacity = events.reduce((sum, e) => sum + e.maxCapacity, 0);
    const totalRegistered = events.reduce(
      (sum, e) => sum + e.registeredCount,
      0
    );
    const availableSlots = totalCapacity - totalRegistered;

    // Upcoming events with capacity info
    const upcomingEventsList = await Event.find({
      organizer: organizerId,
      date: { $gte: new Date() },
      status: { $in: ["published", "closed", "draft"] },
    })
      .sort({ date: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        completedEvents,
        totalVolunteers: totalRegistrations,
        availableSlots,
        totalCapacity,
      },
      upcomingEventsList,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get events by category chart data
// @route   GET /api/v1/analytics/events-by-category
// @access  Organizer only
export const getEventsByCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await Event.aggregate([
      { $match: { organizer: req.user?._id } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: data.map((d) => ({ category: d._id, count: d.count })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get registration stats chart data
// @route   GET /api/v1/analytics/registration-stats
// @access  Organizer only
export const getRegistrationStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const events = await Event.find({ organizer: req.user?._id })
      .select("title registeredCount maxCapacity")
      .sort({ registeredCount: -1 })
      .limit(10);

    const data = events.map((e) => ({
      eventTitle: e.title.length > 20 ? e.title.substring(0, 20) + "..." : e.title,
      registered: e.registeredCount,
      capacity: e.maxCapacity,
      utilization: Math.round((e.registeredCount / e.maxCapacity) * 100),
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get volunteer status breakdown
// @route   GET /api/v1/analytics/volunteer-status
// @access  Organizer only
export const getVolunteerStatusBreakdown = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const eventIds = await Event.find({ organizer: req.user?._id }).distinct(
      "_id"
    );

    const data = await Registration.aggregate([
      { $match: { event: { $in: eventIds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: data.map((d) => ({ status: d._id, count: d.count })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Volunteer dashboard stats
// @route   GET /api/v1/analytics/volunteer-dashboard
// @access  Volunteer only
export const getVolunteerDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteerId = req.user?._id;

    const [
      totalRegistrations,
      upcomingRegistrations,
      completedRegistrations,
      cancelledRegistrations,
    ] = await Promise.all([
      Registration.countDocuments({
        volunteer: volunteerId,
        status: { $ne: "cancelled" },
      }),
      Registration.countDocuments({
        volunteer: volunteerId,
        status: { $in: ["registered", "confirmed"] },
      }).then(async (count) => {
        // Only count if event is in the future
        const regs = await Registration.find({
          volunteer: volunteerId,
          status: { $in: ["registered", "confirmed"] },
        }).populate("event", "date");
        return regs.filter((r: any) => new Date(r.event?.date) >= new Date())
          .length;
      }),
      Registration.countDocuments({
        volunteer: volunteerId,
        status: "attended",
      }),
      Registration.countDocuments({
        volunteer: volunteerId,
        status: "cancelled",
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalRegistrations,
        upcomingRegistrations,
        completedRegistrations,
        cancelledRegistrations,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
