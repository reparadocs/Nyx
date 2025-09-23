import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import dotenv from "dotenv";

dotenv.config();

const postTweet = async (text) => {
  try {
    // Validate tweet length
    if (text.length > 280) {
      return {
        status: "error",
        message: "Tweet text exceeds 280 character limit.",
      };
    }
    TwitterApiV2Settings.debug = true;

    // Create Twitter API client with OAuth 1.0a authentication
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_SECRET_KEY,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    // Post the tweet
    const tweet = await client.v2.tweet(text);

    if (tweet.data && tweet.data.id) {
      return {
        status: "success",
        tweetId: tweet.data.id,
        text: text,
        url: `https://x.com/NyxPosts/status/${tweet.data.id}`,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        status: "error",
        message: `Invalid response from Twitter API`,
      };
    }
  } catch (error) {
    console.error(`Failed to post tweet: ${error.message}`);
    return {
      status: "error",
      message: `Failed to post tweet`,
    };
  }
};

export default postTweet;
