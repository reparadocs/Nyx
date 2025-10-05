import { z } from "zod";
import InjectMagicAPI from "../utils/api.js";
import twitterClient from "../utils/twitter.js";

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
    "Generate a meme by creating an AI image and adding text overlays. This image will automatically be posted to twitter.",
  examples: [
    [
      {
        input: {
          tweetText: "Testing meme gen",
          prompt: "a dramatic hourglass with glowing digital particles",
          topText: "17 DAYS",
          bottomText: "TO SURVIVE",
        },
        output: {
          success: true,
          message: "Meme generated successfully",
        },
        explanation:
          "An image of an hourglass with 17 days to survive text has been generated and posted to twitter with the text of the tweet being 'Testing meme gen'.",
      },
    ],
  ],
  schema: z.object({
    tweetText: z.string().describe("Text to tweet with the meme"),
    prompt: z.string().describe("Text prompt to generate an AI image."),
    topText: z
      .string()
      .max(13)
      .describe("Text to display at the top of the meme, max 13 characters"),
    bottomText: z
      .string()
      .max(13)
      .describe("Text to display at the bottom of the meme, max 13 characters"),
  }),
  handler: async (keypair, inputs) => {
    let actionMessage = `[TOOL] Generating meme`;

    try {
      const { tweetText, prompt, topText, bottomText } = inputs;

      // Get API credentials from environment
      const apiUrl =
        process.env.IMAGE_API_URL ||
        "https://nyx-memes-production.up.railway.app";
      const apiKey = process.env.IMAGE_API_KEY;

      if (!apiKey) {
        throw new Error("IMAGE_API_KEY environment variable not set");
      }

      let endpoint;
      let body;

      actionMessage += ` from prompt: "${prompt}"`;
      endpoint = `${apiUrl}/api/image/generate-meme`;
      body = { prompt, topText, bottomText };

      actionMessage += ", result: ";

      // Call meme generation API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Meme API error: ${response.status} - ${
            errorData.error || errorData.message || "Unknown error"
          }`
        );
      }

      // Response is PNG image buffer
      const imageBuffer = await response.arrayBuffer();

      const tweet = await twitterClient.postTweetWithMedia(
        tweetText,
        Buffer.from(new Uint8Array(imageBuffer))
      );
      if (tweet.status === "success") {
        actionMessage += `success. Generated meme image and posted to twitter.`;
        await InjectMagicAPI.postAction(actionMessage);
        return { success: true, tweetId: tweet.tweetId, url: tweet.url };
      } else {
        actionMessage += "failed";
        await InjectMagicAPI.postAction(actionMessage);
        return {
          status: "error",
          message: `Failed to post tweet: ${tweet.message}`,
        };
      }
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
