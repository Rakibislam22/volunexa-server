# Volunexa Backend — Agent Instructions

## Architecture
- Express 5 + TypeScript backend with MongoDB (Mongoose)
- Socket.IO for realtime event updates
- JWT authentication with role-based access (Organizer / Volunteer)

## Key Conventions
- ES Module syntax (import/export)
- All routes under `/api/v1/`
- Controllers handle business logic, routes handle HTTP
- Zod for request validation
- Socket.IO events: `event:updated`, `registration:new`, `registration:updated`, `slots:updated`

## Models
- **User**: email, password (hashed), name, role (organizer|volunteer), skills[], bio, avatar
- **Event**: title, description, date, location, category, maxCapacity, registeredCount, requiredSkills[], registrationDeadline, status (draft|published|closed|completed), organizer (ref User)
- **Registration**: event (ref Event), volunteer (ref User), selectedSkill, status (registered|confirmed|attended|cancelled), registeredAt

## Realtime Events (Socket.IO)
- `event:created` — broadcast when new event published
- `event:updated` — broadcast when event details change
- `slots:updated` — broadcast when registration changes available slots
- `registration:new` — notify organizer of new registration
- `registration:statusChanged` — notify volunteer of status change

## Environment
- MongoDB connection string in MONGODB_URI
- JWT secret in JWT_SECRET
- CORS configured for CLIENT_URL
