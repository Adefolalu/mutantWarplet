import { GoogleGenAI } from "@google/genai";

export interface ImageGenerationOptions {
  prompt?: string;
  imageUrl?: string;
  strength?: number; // 0-1, how much to transform (0.3 = subtle, 0.8 = heavy)
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  service: "gemini";
  metadata?: {
    model: string;
    mimeType: string;
    strength: number;
    mutationLevel: string;
    mutationPercent: number;
    preservePercent: number;
  };
}

interface MutationConfig {
  level: "subtle" | "moderate" | "heavy";
  mutationPercent: number;
  preservePercent: number;
}

export class ImageGenerationService {
  private geminiAI: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private readonly MODEL = "gemini-2.5-flash-image";

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
    if (this.apiKey) {
      this.geminiAI = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Determines mutation configuration based on strength value
   */
  private getMutationConfig(strength: number): MutationConfig {
    if (strength < 0.4) {
      return { level: "subtle", mutationPercent: 30, preservePercent: 70 };
    }
    if (strength < 0.7) {
      return { level: "moderate", mutationPercent: 60, preservePercent: 40 };
    }
    return { level: "heavy", mutationPercent: 90, preservePercent: 10 };
  }

  /**
   * Builds the default negative prompt
   */
  private getDefaultNegativePrompt(): string {
    return `Avoid creating images that are blurry, low-quality, distorted, or deformed.
Do not include extra or missing limbs, duplicated or disfigured features, or unrealistic anatomy.
Avoid cartoonish, anime, or sketch-like styles.
Exclude any watermarks, text, signatures, or logos.
Ensure the background, color theme, and subject remain consistent with the original image.`;
  }

  /**
   * Builds the transformation prompt
   */
  private buildPrompt(config: MutationConfig, negativePrompt?: string): string {
    const mainPrompt = `Transform this character into a cyberpunk mutant with ${config.level} modifications.
Add realistic cybernetic enhancements, biopunk textures, and glowing neon tech details.
Preserve the exact background, lighting, color palette, and original pose.
Apply a mutation intensity of ${config.mutationPercent}%, keeping approximately ${config.preservePercent}% of original features recognizable.
Render in a high-resolution, photorealistic, cinematic, gritty dystopian style.`;

    const negative = negativePrompt || this.getDefaultNegativePrompt();
    
    return `${mainPrompt}\n${negative}`;
  }

  /**
   * Converts image URL to base64 data
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{
    base64: string;
    mimeType: string;
  }> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      base64,
      mimeType: blob.type || "image/jpeg",
    };
  }

  /**
   * Extracts image data from Gemini response stream
   */
  private async extractImageFromStream(response: any): Promise<{
    data: string;
    mimeType: string;
  }> {
    for await (const chunk of response) {
      if (!chunk.candidates?.[0]?.content?.parts) {
        continue;
      }

      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      if (inlineData?.data && inlineData?.mimeType) {
        return {
          data: inlineData.data,
          mimeType: inlineData.mimeType,
        };
      }
    }

    throw new Error("No image data found in Gemini response stream");
  }

  /**
   * Generate mutated image using Gemini's native image generation
   */
  async generateMutatedImage(
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    if (!this.geminiAI) {
      throw new Error("Gemini API not available - check VITE_GEMINI_API_KEY");
    }

    if (!options.imageUrl) {
      throw new Error("Image URL is required");
    }

    try {
      console.log("🎨 Generating mutated image with Gemini...");

      // Determine mutation settings
      const strength = options.strength ?? 0.6;
      const mutationConfig = this.getMutationConfig(strength);
      const prompt = options.prompt || this.buildPrompt(mutationConfig, options.negativePrompt);

      // Fetch and convert image
      const { base64, mimeType } = await this.fetchImageAsBase64(
        options.imageUrl
      );

      // Build request
      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ];

      // Generate image
      const response = await this.geminiAI.models.generateContentStream({
        model: this.MODEL,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
        },
        contents,
      });

      // Extract result
      const imageData = await this.extractImageFromStream(response);
      const dataUrl = `data:${imageData.mimeType};base64,${imageData.data}`;

      console.log(
        `✅ Image generated successfully! (${mutationConfig.level} - ${mutationConfig.mutationPercent}%)`
      );

      return {
        imageUrl: dataUrl,
        service: "gemini",
        metadata: {
          model: this.MODEL,
          mimeType: imageData.mimeType,
          strength,
          mutationLevel: mutationConfig.level,
          mutationPercent: mutationConfig.mutationPercent,
          preservePercent: mutationConfig.preservePercent,
        },
      };
    } catch (error) {
      console.error("❌ Gemini image generation failed:", error);
      throw error;
    }
  }

  /**
   * Check if Gemini image generation is available
   */
  isGeminiAvailable(): boolean {
    return !!this.geminiAI;
  }
}