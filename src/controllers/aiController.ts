import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";

// @desc    Generate event description using AI
// @route   POST /api/v1/ai/generate-description
// @access  Organizer only
export const generateEventDescription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventIdea } = req.body;

    if (!eventIdea || typeof eventIdea !== "string") {
      res.status(400).json({ message: "Please provide an event idea" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== "your_gemini_api_key_here") {
      // Use Gemini API
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an event planning assistant for a community volunteer platform called Volunexa. Based on the following event idea, generate a structured response in JSON format with these fields:
- "description": A compelling 2-3 paragraph event description (string)
- "volunteerRoles": An array of 3-5 suggested volunteer roles (strings)
- "requiredSkills": An array of 3-5 required skills (strings)
- "promotionalMessage": A short 2-3 sentence promotional message (string)
- "suggestedCategory": One of: environment, education, health, community, sports, arts, technology, charity, other

Event idea: "${eventIdea}"

Return ONLY valid JSON, no markdown or code blocks.`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = (await response.json()) as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          try {
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            res.status(200).json({ success: true, generated: parsed, source: "ai" });
            return;
          } catch {
            // If parsing fails, fall through to mock
          }
        }
      } catch (apiError) {
        console.error("Gemini API error:", apiError);
        // Fall through to mock response
      }
    }

    // Mock AI response
    const mockResponses: Record<string, any> = {
      default: {
        description: `Join us for an exciting community event: "${eventIdea}". This event brings together passionate volunteers who want to make a real difference in our community. Whether you're a seasoned volunteer or just starting your journey, there's a role for everyone.\n\nWe're looking for dedicated individuals who can contribute their time and skills to make this event a success. Together, we can create lasting impact and build stronger community bonds.`,
        volunteerRoles: [
          "Event Coordinator",
          "Team Leader",
          "Registration Manager",
          "Logistics Support",
          "Community Outreach",
        ],
        requiredSkills: [
          "Communication",
          "Teamwork",
          "Organization",
          "Leadership",
          "Problem Solving",
        ],
        promotionalMessage: `🌟 Be part of something amazing! We're organizing "${eventIdea}" and we need YOUR help. Join our team of passionate volunteers and make a difference in your community today!`,
        suggestedCategory: "community",
      },
    };

    // Simple keyword matching for better mock responses
    const idea = eventIdea.toLowerCase();
    let category = "community";
    if (idea.includes("tree") || idea.includes("plant") || idea.includes("clean") || idea.includes("environment") || idea.includes("beach")) {
      category = "environment";
    } else if (idea.includes("teach") || idea.includes("school") || idea.includes("education") || idea.includes("tutor")) {
      category = "education";
    } else if (idea.includes("health") || idea.includes("medical") || idea.includes("blood") || idea.includes("hospital")) {
      category = "health";
    } else if (idea.includes("sport") || idea.includes("run") || idea.includes("marathon") || idea.includes("game")) {
      category = "sports";
    } else if (idea.includes("tech") || idea.includes("code") || idea.includes("hack") || idea.includes("workshop")) {
      category = "technology";
    } else if (idea.includes("art") || idea.includes("paint") || idea.includes("music") || idea.includes("dance")) {
      category = "arts";
    } else if (idea.includes("donat") || idea.includes("charit") || idea.includes("fund")) {
      category = "charity";
    }

    const response = { ...mockResponses.default, suggestedCategory: category };
    res.status(200).json({ success: true, generated: response, source: "mock" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
