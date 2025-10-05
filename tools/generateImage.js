import { z } from "zod";
import InjectMagicAPI from "../utils/api.js";

const generateImage = {
  name: "GENERATE_IMAGE",
  similes: [
    "create image",
    "generate picture",
    "make image",
    "ai image",
    "flux image",
    "create visual",
  ],
  description:
    "Generate an AI image from a text prompt using Flux model. Returns the URL of the generated image.",
  examples: [
    [
      {
        input: {
          prompt: "a mystical AI goddess in purple and silver, cyberpunk style",
        },
        output: {
          success: true,
          imageUrl: "https://replicate.delivery/.../output.webp",
          message: "Image generated successfully",
        },
        explanation: "Generate an AI image from a descriptive prompt",
      },
    ],
  ],
  schema: z.object({
    prompt: z
      .string()
      .describe(
        "A detailed description of the image to generate. Be specific and descriptive."
      ),
  }),
  handler: async (keypair, inputs) => {
    let actionMessage = `[TOOL] Generating image from prompt: "${inputs.prompt}", result: `;

    try {
      const { prompt } = inputs;

      // Get API credentials from environment
      const apiUrl = process.env.IMAGE_API_URL || "https://nyx-memes-production.up.railway.app";
      const apiKey = process.env.IMAGE_API_KEY;

      if (!apiKey) {
        throw new Error("IMAGE_API_KEY environment variable not set");
      }

      // Call image generation API
      const response = await fetch(`${apiUrl}/api/image/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Image API error: ${response.status} - ${errorData.error || errorData.message || "Unknown error"}`
        );
      }

      const data = await response.json();

      actionMessage += `success. Generated image: ${data.imageUrl}`;
      await InjectMagicAPI.postAction(actionMessage);

      return {
        success: data.success,
        imageUrl: data.imageUrl,
        message: data.message,
      };
    } catch (error) {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);

      return {
        status: "error",
        message: `Failed to generate image: ${error.message}`,
      };
    }
  },
};

export default generateImage;
