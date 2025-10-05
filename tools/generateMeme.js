import { z } from "zod";
import InjectMagicAPI from "../utils/api.js";

const generateMeme = {
  name: "GENERATE_MEME",
  similes: [
    "create meme",
    "make meme",
    "meme generator",
    "add text to image",
    "generate meme image",
  ],
  description:
    "Generate a meme by creating an AI image and adding text overlays, or add text to an existing image URL. Perfect for creating visual content for tweets.",
  examples: [
    [
      {
        input: {
          prompt: "a dramatic hourglass with glowing digital particles",
          topText: "17 DAYS",
          bottomText: "TO SURVIVE",
        },
        output: {
          success: true,
          message: "Meme generated successfully",
        },
        explanation:
          "Generate an AI image and add meme text in one request",
      },
    ],
    [
      {
        input: {
          imageUrl: "https://example.com/image.jpg",
          topText: "WHEN THE",
          bottomText: "MARKET PUMPS",
        },
        output: {
          success: true,
          message: "Meme created successfully",
        },
        explanation: "Add meme text to an existing image",
      },
    ],
  ],
  schema: z.object({
    prompt: z
      .string()
      .optional()
      .describe(
        "Text prompt to generate an AI image. Use this OR imageUrl, not both."
      ),
    imageUrl: z
      .string()
      .optional()
      .describe(
        "URL of an existing image to add text to. Use this OR prompt, not both."
      ),
    topText: z
      .string()
      .optional()
      .describe("Text to display at the top of the meme"),
    bottomText: z
      .string()
      .optional()
      .describe("Text to display at the bottom of the meme"),
  }),
  handler: async (keypair, inputs) => {
    let actionMessage = `[TOOL] Generating meme`;

    try {
      const { prompt, imageUrl, topText, bottomText } = inputs;

      // Validate inputs
      if (!prompt && !imageUrl) {
        throw new Error("Either prompt or imageUrl must be provided");
      }
      if (prompt && imageUrl) {
        throw new Error("Provide either prompt OR imageUrl, not both");
      }
      if (!topText && !bottomText) {
        throw new Error("At least one of topText or bottomText must be provided");
      }

      // Get API credentials from environment
      const apiUrl = process.env.IMAGE_API_URL || "https://nyx-memes-production.up.railway.app";
      const apiKey = process.env.IMAGE_API_KEY;

      if (!apiKey) {
        throw new Error("IMAGE_API_KEY environment variable not set");
      }

      let endpoint;
      let body;

      if (prompt) {
        // Generate image and add text in one request
        actionMessage += ` from prompt: "${prompt}"`;
        endpoint = `${apiUrl}/api/image/generate-meme`;
        body = { prompt, topText, bottomText };
      } else {
        // Add text to existing image
        actionMessage += ` from existing image`;
        endpoint = `${apiUrl}/api/image/meme`;
        body = { imageUrl, topText, bottomText };
      }

      actionMessage += ", result: ";

      // Call meme generation API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Meme API error: ${response.status} - ${errorData.error || errorData.message || "Unknown error"}`
        );
      }

      // Response is PNG image buffer
      const imageBuffer = await response.arrayBuffer();

      // TODO: Upload to storage service (S3, Cloudinary, etc) and get URL
      // For now, just confirm success
      actionMessage += `success. Generated ${imageBuffer.byteLength} byte meme image`;
      await InjectMagicAPI.postAction(actionMessage);

      return {
        success: true,
        message: "Meme generated successfully",
        size: imageBuffer.byteLength,
        // imageUrl: uploadedUrl, // Would be set after uploading buffer to storage
      };
    } catch (error) {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);

      return {
        status: "error",
        message: `Failed to generate meme: ${error.message}`,
      };
    }
  },
};

export default generateMeme;
