import { z } from "zod";
import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import twitterClient from "../utils/twitter.js";
import InjectMagicAPI from "../utils/api.js";
// Works
const twitter = {
  name: "POST_TWEET",
  similes: ["tweet", "share on twitter", "post on x"],
  description:
    "Post a tweet on Twitter/X. Do not include any links or hashtags in your tweet.",
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
      .describe(
        "The text content of the tweet. Do not include any links or hashtags or $ symbols. Tweets should be under 280 characters."
      ),
  }),
  handler: async (keypair, inputs) => {
    console.log("twitter");
    console.log(inputs.text);
    try {
      const { text } = inputs;

      const response = await twitterClient.postTweet(text);
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
