import { GoogleGenerativeAI } from "@google/generative-ai";
import { ImageGenerationService } from "./imageGeneration";

export interface UserProfile {
  username: string;
  displayName?: string;
  bio?: string;
  pfpUrl?: string;
}

export class DonutService {
  private genAI: GoogleGenerativeAI;
  private imageService: ImageGenerationService;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.imageService = new ImageGenerationService(this.apiKey);
  }

  async generateDonut(profile: UserProfile, baseImageUrl: string) {
    // 1. Generate the donut description based on the profile
    const donutDescription = await this.generateDonutDescription(profile);

    // 2. Generate the image using the description
    // We prepend instructions to ensure the base image is respected
    const finalPrompt = `
    Transform the attached base donut image.
    Maintain the exact shape, perspective, and lighting of the original donut.
    Replace the existing textures with the following style:
    ${donutDescription}
    `;

    return this.imageService.generateMutatedImage({
      prompt: donutDescription,
      imageUrl: baseImageUrl,
      strength: 0.85, // High strength to ensure significant changes to glaze/toppings while keeping donut shape
      customPrompt: finalPrompt,
    });
  }

  private async generateDonutDescription(
    profile: UserProfile
  ): Promise<string> {
    let imagePart = null;
    if (profile.pfpUrl) {
      try {
        const response = await fetch(profile.pfpUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });

        imagePart = {
          inlineData: {
            data: base64,
            mimeType: blob.type || "image/jpeg",
          },
        };
      } catch (e) {
        console.warn("Failed to fetch PFP for analysis", e);
      }
    }

    const prompt = `
    You are a master baker at a high-end artisanal donut shop. Design a unique, custom donut based on this user's profile${
      imagePart ? " and their profile picture" : ""
    }.
    
    User Profile:
    Username: ${profile.username}
    Display Name: ${profile.displayName || "N/A"}
    Bio: ${profile.bio || "N/A"}
    
    ${
      imagePart
        ? "Analyze the attached profile picture. Extract the dominant colors and the overall 'vibe' (e.g., warm, cool, energetic, calm)."
        : ""
    }

    Based on this, describe a delicious, edible donut.
    STRICTLY NO CYBERPUNK, NO SCI-FI, NO TECH THEMES.
    This is a bakery. Use food metaphors.

    1. Glaze: Use the colors from the profile picture. Describe the flavor and texture (e.g., strawberry cream, blueberry jam, matcha glaze, dark chocolate ganache).
    2. Toppings: Complementary edible toppings (e.g., crushed nuts, fruit zest, cookie crumbles, edible flowers, sprinkles).
    3. Dough: Flavor/Color (e.g., brioche, old-fashioned, chocolate cake).
    4. Background: A plain, solid color background derived from the user's profile picture palette. It should be a solid, flat color that contrasts well with the donut. Keep it simple, clean, and minimal. No patterns or complex scenes.

    The output should be a single paragraph image generation prompt describing the visual appearance of the donut.
    Start with "A delicious artisanal donut with..."
    Make it appetizing, realistic, and visually cohesive.
    `;

    try {
      // Try primary model
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });
      const result = await model.generateContent([
        prompt,
        ...(imagePart ? [imagePart] : []),
      ]);
      const response = await result.response;
      const text = response.text();
      console.log(
        "🍩 Generated Donut Description (based on PFP colors):",
        text
      );
      return text;
    } catch (error: any) {
      // Fallback to 1.5-flash if 2.5 is overloaded (503) or not found (404)
      if (error.message?.includes("503") || error.message?.includes("404")) {
        console.warn("Primary model failed, switching to fallback model...");
        const fallbackModel = this.genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
        });
        const result = await fallbackModel.generateContent([
          prompt,
          ...(imagePart ? [imagePart] : []),
        ]);
        const response = await result.response;
        const text = response.text();
        console.log("🍩 Generated Donut Description (Fallback):", text);
        return text;
      }
      throw error;
    }
  }
}
