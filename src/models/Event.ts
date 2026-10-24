import mongoose, { Document, Schema } from "mongoose";

export type EventStatus = "draft" | "published" | "closed" | "completed";
export type EventCategory =
  | "environment"
  | "education"
  | "health"
  | "community"
  | "sports"
  | "arts"
  | "technology"
  | "charity"
  | "other";

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  location: string;
  category: EventCategory;
  maxCapacity: number;
  registeredCount: number;
  requiredSkills: string[];
  registrationDeadline: Date;
  status: EventStatus;
  organizer: mongoose.Types.ObjectId;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Event location is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "environment",
        "education",
        "health",
        "community",
        "sports",
        "arts",
        "technology",
        "charity",
        "other",
      ],
      required: [true, "Event category is required"],
    },
    maxCapacity: {
      type: Number,
      required: [true, "Maximum capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredSkills: [{ type: String, trim: true }],
    registrationDeadline: {
      type: Date,
      required: [true, "Registration deadline is required"],
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed", "completed"],
      default: "draft",
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: { type: String },
  },
  { timestamps: true }
);

eventSchema.virtual("availableSlots").get(function () {
  return this.maxCapacity - this.registeredCount;
});

eventSchema.virtual("isFull").get(function () {
  return this.registeredCount >= this.maxCapacity;
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ title: "text", description: "text", location: "text" });

const Event = mongoose.model<IEvent>("Event", eventSchema);
export default Event;
