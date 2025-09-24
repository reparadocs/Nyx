import { z } from "zod";
import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import postTweet from "../utils/twitter.js";
import InjectMagicAPI from "../utils/api.js";
// Works
const twitter = {
  name: "POST_TWEET",
  similes: ["tweet", "share on twitter", "post on x"],
  description: "Post a tweet on Twitter/X",
  examples: [
    [
      {
        input: {
          text: "Test Twitter XYZ",
        },
        output: {
          status: "success",
          tweetId: "1346889436626259968",
          text: "Test Twitter XYZ",
          url: "https://x.com/username/status/1346889436626259968",
        },
        explanation: "Successfully posted a tweet saying Test Twitter XYZ",
      },
    ],
  ],
  schema: z.object({
    text: z
      .string()
      .max(280)
      .describe("The text content of the tweet (max 280 characters)"),
  }),
  handler: async (keypair, inputs) => {
    console.log("twitter");
    console.log(inputs.text);
    try {
      const { text } = inputs;

      // Validate tweet length
      if (text.length > 280) {
        return {
          status: "error",
          message: "Tweet text exceeds 280 character limit.",
        };
      }
      const response = await postTweet(text);
      await InjectMagicAPI.postAction("[TOOL] Posted tweet: " + response.url);
      return response;
    } catch (error) {
      return {
        status: "error",
        message: `Failed to post tweet: ${error.message}`,
      };
    }
  },
};

export default twitter;
