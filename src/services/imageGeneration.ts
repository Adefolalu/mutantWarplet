import Replicate from "replicate";

export interface ImageGenerationOptions {
  prompt: string;
  imageUrl?: string;
  strength?: number; // 0-1, how much to transform (0.3 = subtle, 0.8 = heavy)
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  service: "replicate" | "fallback";
  metadata?: any;
}

export class ImageGenerationService {
  private replicate: Replicate | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_REPLICATE_API_KEY || null;
    if (this.apiKey) {
      this.replicate = new Replicate({
        auth: this.apiKey,
      });
    }
  }

  /**
   * Generate mutated image using Stable Diffusion img2img
   */
  async generateMutatedImage(
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const { prompt, imageUrl, strength = 0.75, negativePrompt } = options;

    // If we have Replicate API, use it
    if (this.replicate && imageUrl) {
      try {
        console.log("🎨 Generating mutated image with Replicate...");

        const output = (await this.replicate.run(
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          {
            input: {
              image: imageUrl,
              prompt: `${prompt}, masterpiece, best quality, highly detailed, professional digital art`,
              negative_prompt:
                negativePrompt ||
                "blurry, low quality, distorted, deformed, ugly, bad anatomy",
              num_inference_steps: 30,
              guidance_scale: 7.5,
              strength: strength,
              scheduler: "K_EULER",
            },
          }
        )) as string[];

        if (output && output.length > 0) {
          return {
            imageUrl: output[0],
            service: "replicate",
            metadata: {
              model: "stable-diffusion-xl",
              strength,
            },
          };
        }

        throw new Error("No output from Replicate");
      } catch (error) {
        console.error("❌ Replicate generation failed:", error);
        console.log("⚠️ Falling back to canvas transformation");
      }
    }

    // Fallback: Use canvas-based transformation
    if (imageUrl) {
      return this.generateCanvasMutation(imageUrl, options);
    }

    throw new Error("No image URL provided for mutation");
  }

  /**
   * Fallback: Generate mutation using canvas filters
   */
  private async generateCanvasMutation(
    imageUrl: string,
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;

          // Apply various filters based on mutation type
          const mutationType = this.detectMutationType(options.prompt);

          ctx.drawImage(img, 0, 0);

          // Apply different effects based on mutation
          switch (mutationType) {
            case "cyberpunk":
              this.applyCyberpunkEffect(ctx, canvas);
              break;
            case "zombie":
              this.applyZombieEffect(ctx, canvas);
              break;
            case "cosmic":
              this.applyCosmicEffect(ctx, canvas);
              break;
            case "dragon":
              this.applyDragonEffect(ctx, canvas);
              break;
            case "crystal":
              this.applyCrystalEffect(ctx, canvas);
              break;
            case "void":
              this.applyVoidEffect(ctx, canvas);
              break;
            default:
              this.applyGenericEffect(ctx, canvas);
          }

          const dataUrl = canvas.toDataURL("image/png");

          resolve({
            imageUrl: dataUrl,
            service: "fallback",
            metadata: {
              type: "canvas-filter",
              mutationType,
            },
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for canvas mutation"));
      };

      img.src = imageUrl;
    });
  }

  private detectMutationType(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes("cyberpunk")) return "cyberpunk";
    if (lower.includes("zombie") || lower.includes("undead")) return "zombie";
    if (lower.includes("cosmic") || lower.includes("horror")) return "cosmic";
    if (lower.includes("dragon")) return "dragon";
    if (lower.includes("crystal")) return "crystal";
    if (lower.includes("void")) return "void";
    return "generic";
  }

  private applyCyberpunkEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    // Neon glow effect
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Increase blue and reduce red for cyber effect
      data[i] = data[i] * 0.7; // R
      data[i + 1] = data[i + 1] * 1.2; // G
      data[i + 2] = data[i + 2] * 1.5; // B

      // Add contrast
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (avg > 128) {
        data[i] = Math.min(255, data[i] * 1.3);
        data[i + 1] = Math.min(255, data[i + 1] * 1.3);
        data[i + 2] = Math.min(255, data[i + 2] * 1.3);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add scanlines
    ctx.globalAlpha = 0.1;
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.globalAlpha = 1.0;
  }

  private applyZombieEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Desaturate and add green tint
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg * 0.7; // R
      data[i + 1] = avg * 1.2; // G (greenish)
      data[i + 2] = avg * 0.6; // B

      // Reduce brightness
      data[i] = data[i] * 0.7;
      data[i + 1] = data[i + 1] * 0.8;
      data[i + 2] = data[i + 2] * 0.7;
    }

    ctx.putImageData(imageData, 0, 0);

    // Add decay texture
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1.0;
  }

  private applyCosmicEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Purple/blue cosmic colors
      data[i] = data[i] * 0.8; // R
      data[i + 1] = data[i + 1] * 0.7; // G
      data[i + 2] = data[i + 2] * 1.5; // B (more blue)
    }

    ctx.putImageData(imageData, 0, 0);

    // Add stars
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      ctx.fillRect(x, y, size, size);
    }
  }

  private applyDragonEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Warm, fiery colors
      data[i] = Math.min(255, data[i] * 1.4); // R (more red)
      data[i + 1] = data[i + 1] * 1.1; // G
      data[i + 2] = data[i + 2] * 0.7; // B (less blue)
    }

    ctx.putImageData(imageData, 0, 0);

    // Add golden shimmer
    ctx.globalAlpha = 0.15;
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#ff8800");
    gradient.addColorStop(1, "#ffdd00");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
  }

  private applyCrystalEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Increase saturation and brightness
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i] = Math.min(255, data[i] + (max - data[i]) * 0.5);
      data[i + 1] = Math.min(255, data[i + 1] + (max - data[i + 1]) * 0.5);
      data[i + 2] = Math.min(255, data[i + 2] + (max - data[i + 2]) * 0.5);

      // Brighten
      data[i] = Math.min(255, data[i] * 1.3);
      data[i + 1] = Math.min(255, data[i + 1] * 1.3);
      data[i + 2] = Math.min(255, data[i + 2] * 1.3);
    }

    ctx.putImageData(imageData, 0, 0);

    // Add prismatic effect
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = "screen";
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#88ccff");
    gradient.addColorStop(1, "#ff88ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
  }

  private applyVoidEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Dark purple/black void colors
      data[i] = data[i] * 0.5; // R
      data[i + 1] = data[i + 1] * 0.3; // G
      data[i + 2] = data[i + 2] * 0.9; // B (purple tint)

      // Darken overall
      data[i] = data[i] * 0.6;
      data[i + 1] = data[i + 1] * 0.6;
      data[i + 2] = data[i + 2] * 0.8;
    }

    ctx.putImageData(imageData, 0, 0);

    // Add void energy tendrils
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#9900ff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  private applyGenericEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    // Generic mutation - increase contrast and saturation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Increase contrast
      const factor = 1.3;
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
      data[i + 1] = Math.min(
        255,
        Math.max(0, (data[i + 1] - 128) * factor + 128)
      );
      data[i + 2] = Math.min(
        255,
        Math.max(0, (data[i + 2] - 128) * factor + 128)
      );
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Check if Replicate API is available
   */
  isReplicateAvailable(): boolean {
    return !!this.replicate;
  }
}

// Get Replicate API key from environment
export function getReplicateApiKey(): string | null {
  return import.meta.env.VITE_REPLICATE_API_KEY || null;
}
