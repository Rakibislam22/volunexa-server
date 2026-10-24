import { Response } from "express";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import { AuthRequest } from "../middleware/auth.js";
import { getIO } from "../socket/index.js";
import { isDeadlinePassed } from "../utils/helpers.js";

// @desc    Register for an event
// @route   POST /api/v1/registrations
// @access  Volunteer only
export const registerForEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId, selectedSkill } = req.body;
    const volunteerId = req.user?._id;

    // Check event exists and is published
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.status !== "published") {
      res.status(400).json({ message: "Event is not accepting registrations" });
      return;
    }

    // Check registration deadline
    if (isDeadlinePassed(event.registrationDeadline)) {
      res.status(400).json({ message: "Registration deadline has passed" });
      return;
    }

    // Check capacity
    if (event.registeredCount >= event.maxCapacity) {
      res.status(400).json({ message: "Event is at full capacity" });
      return;
    }

    // Check duplicate registration
    const existingReg = await Registration.findOne({
      event: eventId,
      volunteer: volunteerId,
    });
    if (existingReg) {
      if (existingReg.status === "cancelled") {
        // Allow re-registration if previously cancelled
        existingReg.status = "registered";
        existingReg.selectedSkill = selectedSkill;
        existingReg.registeredAt = new Date();
        await existingReg.save();

        // Increment count
        event.registeredCount += 1;
        await event.save();

        const populatedReg = await Registration.findById(existingReg._id)
          .populate("volunteer", "name email")
          .populate("event", "title date");

        // Realtime notifications
        getIO().to(`event:${eventId}`).emit("slots:updated", {
          eventId,
          registeredCount: event.registeredCount,
          availableSlots: event.maxCapacity - event.registeredCount,
        });
        getIO()
          .to(`organizer:${event.organizer.toString()}`)
          .emit("registration:new", populatedReg);

        res.status(200).json({ success: true, registration: populatedReg });
        return;
      }
      res.status(400).json({ message: "Already registered for this event" });
      return;
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      volunteer: volunteerId,
      selectedSkill,
    });

    // Update event count
    event.registeredCount += 1;
    await event.save();

    const populatedReg = await Registration.findById(registration._id)
      .populate("volunteer", "name email")
      .populate("event", "title date");

    // Realtime: update slots for everyone viewing this event
    getIO().to(`event:${eventId}`).emit("slots:updated", {
      eventId,
      registeredCount: event.registeredCount,
      availableSlots: event.maxCapacity - event.registeredCount,
    });

    // Realtime: notify organizer
    getIO()
      .to(`organizer:${event.organizer.toString()}`)
      .emit("registration:new", populatedReg);

    // Broadcast global event update
    getIO().emit("event:updated", {
      _id: event._id,
      registeredCount: event.registeredCount,
    });

    res.status(201).json({ success: true, registration: populatedReg });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get registrations for an event (organizer)
// @route   GET /api/v1/registrations/event/:eventId
// @access  Organizer (owner only)
export const getEventRegistrations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizer.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
    })
      .populate("volunteer", "name email skills")
      .sort({ registeredAt: -1 });

    res.status(200).json({ success: true, registrations });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Update registration status (organizer)
// @route   PUT /api/v1/registrations/:id/status
// @access  Organizer only
export const updateRegistrationStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body;
    const registration = await Registration.findById(req.params.id).populate(
      "event"
    );

    if (!registration) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const event = await Event.findById(registration.event);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizer.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    const oldStatus = registration.status;
    registration.status = status;
    await registration.save();

    // Adjust count if cancelling or un-cancelling
    if (oldStatus !== "cancelled" && status === "cancelled") {
      event.registeredCount = Math.max(0, event.registeredCount - 1);
      await event.save();
    } else if (oldStatus === "cancelled" && status !== "cancelled") {
      event.registeredCount += 1;
      await event.save();
    }

    const populatedReg = await Registration.findById(registration._id)
      .populate("volunteer", "name email")
      .populate("event", "title date");

    // Realtime: notify volunteer of status change
    getIO()
      .to(`volunteer:${registration.volunteer.toString()}`)
      .emit("registration:statusChanged", populatedReg);

    // Realtime: update slots
    getIO().to(`event:${event._id.toString()}`).emit("slots:updated", {
      eventId: event._id,
      registeredCount: event.registeredCount,
      availableSlots: event.maxCapacity - event.registeredCount,
    });

    res.status(200).json({ success: true, registration: populatedReg });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get volunteer's registrations
// @route   GET /api/v1/registrations/my-registrations
// @access  Volunteer only
export const getMyRegistrations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const registrations = await Registration.find({
      volunteer: req.user?._id,
    })
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name email" },
      })
      .sort({ registeredAt: -1 });

    res.status(200).json({ success: true, registrations });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Cancel registration (volunteer)
// @route   PUT /api/v1/registrations/:id/cancel
// @access  Volunteer only
export const cancelRegistration = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    if (registration.volunteer.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    if (registration.status === "cancelled") {
      res.status(400).json({ message: "Registration already cancelled" });
      return;
    }

    // Check if event date has passed
    const event = await Event.findById(registration.event);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (new Date() > new Date(event.date)) {
      res.status(400).json({ message: "Cannot cancel after event date" });
      return;
    }

    registration.status = "cancelled";
    await registration.save();

    event.registeredCount = Math.max(0, event.registeredCount - 1);
    await event.save();

    // Realtime updates
    getIO().to(`event:${event._id.toString()}`).emit("slots:updated", {
      eventId: event._id,
      registeredCount: event.registeredCount,
      availableSlots: event.maxCapacity - event.registeredCount,
    });

    getIO()
      .to(`organizer:${event.organizer.toString()}`)
      .emit("registration:cancelled", {
        registrationId: registration._id,
        eventId: event._id,
      });

    getIO().emit("event:updated", {
      _id: event._id,
      registeredCount: event.registeredCount,
    });

    res.status(200).json({ success: true, message: "Registration cancelled" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Check registration status for an event
// @route   GET /api/v1/registrations/check/:eventId
// @access  Volunteer
export const checkRegistration = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const registration = await Registration.findOne({
      event: req.params.eventId,
      volunteer: req.user?._id,
    });

    res.status(200).json({
      success: true,
      isRegistered: !!registration && registration.status !== "cancelled",
      registration: registration || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
