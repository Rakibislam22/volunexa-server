import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Event from "./models/Event.js";
import Registration from "./models/Registration.js";

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Event.deleteMany({});
  await Registration.deleteMany({});

  console.log("Cleared existing data");

  // Create demo users
  const organizer = await User.create({
    name: "Demo Organizer",
    email: "organizer@volunexa.com",
    password: "password123",
    role: "organizer",
    bio: "Community organizer passionate about making a difference.",
    skills: ["Event Planning", "Leadership", "Communication"],
  });

  const volunteer1 = await User.create({
    name: "Demo Volunteer",
    email: "volunteer@volunexa.com",
    password: "password123",
    role: "volunteer",
    bio: "Enthusiastic volunteer ready to help the community.",
    skills: ["Teamwork", "Communication", "First Aid"],
    interests: ["environment", "education", "health"],
  });

  const volunteer2 = await User.create({
    name: "Sarah Johnson",
    email: "sarah@example.com",
    password: "password123",
    role: "volunteer",
    skills: ["Teaching", "Mentoring", "Public Speaking"],
    interests: ["education", "community"],
  });

  console.log("Created demo users");

  // Create demo events
  const now = new Date();
  const events = await Event.create([
    {
      title: "Community Beach Cleanup Drive",
      description:
        "Join us for a massive beach cleanup initiative! We'll be cleaning the coastal areas and educating the community about ocean conservation. Bring your friends and family for a fun day of making a difference.",
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      location: "Cox's Bazar Beach, Chittagong",
      category: "environment",
      maxCapacity: 50,
      registeredCount: 2,
      requiredSkills: ["Physical Fitness", "Teamwork", "Environmental Awareness"],
      registrationDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
    {
      title: "Free Coding Workshop for Beginners",
      description:
        "A hands-on coding workshop designed for absolute beginners. Learn the basics of web development with HTML, CSS, and JavaScript. All materials will be provided.",
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      location: "Dhaka University Campus, Dhaka",
      category: "technology",
      maxCapacity: 30,
      registeredCount: 1,
      requiredSkills: ["Teaching", "Programming", "Patience"],
      registrationDeadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
    {
      title: "Blood Donation Camp",
      description:
        "Save lives by donating blood! Our annual blood donation camp aims to collect 200 units of blood. Medical professionals will be on-site to ensure a safe donation process.",
      date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      location: "City Hospital, Sylhet",
      category: "health",
      maxCapacity: 100,
      registeredCount: 0,
      requiredSkills: ["First Aid", "Communication", "Organization"],
      registrationDeadline: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
    {
      title: "Tree Plantation Program",
      description:
        "Plant trees to combat climate change! We're targeting 500 saplings across the city. Saplings and planting tools will be provided. Let's make our city greener together.",
      date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      location: "Ramna Park, Dhaka",
      category: "environment",
      maxCapacity: 40,
      registeredCount: 0,
      requiredSkills: ["Physical Fitness", "Gardening", "Teamwork"],
      registrationDeadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
    {
      title: "Community Art Exhibition",
      description:
        "Showcase your artistic talents or enjoy the works of local artists. We need volunteers to help set up, manage, and promote this community art exhibition.",
      date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      location: "Shilpakala Academy, Dhaka",
      category: "arts",
      maxCapacity: 25,
      registeredCount: 0,
      requiredSkills: ["Art", "Design", "Event Management"],
      registrationDeadline: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
    {
      title: "Marathon for Charity",
      description:
        "Run for a cause! Our charity marathon will raise funds for underprivileged children's education. Participate as a runner or volunteer as event support staff.",
      date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      location: "Hatirjheel, Dhaka",
      category: "charity",
      maxCapacity: 200,
      registeredCount: 0,
      requiredSkills: ["Physical Fitness", "First Aid", "Organization"],
      registrationDeadline: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
      status: "published",
      organizer: organizer._id,
    },
  ]);

  console.log("Created demo events");

  // Create demo registrations
  await Registration.create([
    {
      event: events[0]._id,
      volunteer: volunteer1._id,
      selectedSkill: "Physical Fitness",
      status: "confirmed",
    },
    {
      event: events[0]._id,
      volunteer: volunteer2._id,
      selectedSkill: "Teamwork",
      status: "registered",
    },
    {
      event: events[1]._id,
      volunteer: volunteer1._id,
      selectedSkill: "Programming",
      status: "registered",
    },
  ]);

  console.log("Created demo registrations");
  console.log("\n=== Demo Credentials ===");
  console.log("Organizer: organizer@volunexa.com / password123");
  console.log("Volunteer: volunteer@volunexa.com / password123");
  console.log("========================\n");

  await mongoose.disconnect();
  console.log("Seed completed!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
