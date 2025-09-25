import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import dotenv from "dotenv";

dotenv.config();

class Twitter {
  constructor() {
    TwitterApiV2Settings.debug = true;

    // Create Twitter API client with OAuth 1.0a authentication
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_SECRET_KEY,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    // Nyx's user ID
    this.userId = "1970223283464503296";
  }

  async postTweet(text) {
    try {
      // Validate tweet length
      if (text.length > 280) {
        return {
          status: "error",
          message: "Tweet text exceeds 280 character limit.",
        };
      }

      // Post the tweet
      const tweet = await this.client.v2.tweet(text);

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
  }

  async getLastTweets() {
    try {
      const timeline = await this.client.v2.userTimeline(this.userId, {
        exclude: "replies",
      });
      return timeline.tweets.map((tweet) => tweet.text);
    } catch (error) {
      console.error(`Failed to get timeline: ${error.message}`);
      return [];
    }
  }

  async getTweetMentions() {
    const mentions = await this.client.v2.userMentionTimeline(this.userId, {});
    console.log(mentions.tweets);
  }
}

// Create and export a singleton instance
const twitter = new Twitter();

// Export both the class and the instance for flexibility
export default twitter;
export { Twitter };
