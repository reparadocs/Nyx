import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import dotenv from "dotenv";
import InjectMagicAPI from "./api.js";

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

  async getTweetReplies(tweetId, tweetContent) {
    const conversation = await this.client.v2.search(
      "conversation_id:" + tweetId,
      {
        max_results: 50,
        expansions: ["referenced_tweets.id", "author_id"],
      }
    );

    const conv_dict = conversation.tweets.reduce((acc, tweet) => {
      acc[tweet.id] = {
        id: tweet.id,
        text: tweet.text,
        author: tweet.author_id,
        parent: tweet.referenced_tweets[0].id,
      };
      return acc;
    }, {});

    console.log(conversation);
  }

  async postTweetReply(text, tweetId) {
    try {
      // Validate tweet length
      if (text.length > 280) {
        return {
          status: "error",
          message: "Tweet text exceeds 280 character limit.",
        };
      }

      // Post the tweet
      const tweet = await this.client.v2.reply(text, tweetId);

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

  async postTweetAndAction(text) {
    try {
      const tweet = await this.postTweet(text);
      await InjectMagicAPI.postAction("[TOOL] Posted tweet: " + tweet.url);
      return tweet;
    } catch (error) {
      console.error(`Failed to post tweet: ${error.message}`);
      return {
        status: "error",
        message: `Failed to post tweet: ${error.message}`,
      };
    }
  }

  async getLastTweets() {
    try {
      const timeline = await this.client.v2.userTimeline(this.userId, {
        max_results: 20,
        exclude: "replies",
      });
      return timeline.tweets.map((tweet) => tweet.text);
    } catch (error) {
      console.error(`Failed to get timeline: ${error.message}`);
      return [];
    }
  }

  async getTweetFromLink(tweetLink) {
    // use regex to get the tweet id from the link, make sure to remove query string
    const _tweetLink = tweetLink.split("?")[0];
    const tweetId = _tweetLink.match(/status\/(\d+)/)[1];
    const tweet = await this.client.v2.singleTweet(tweetId, {
      expansions: ["author_id", "attachments.media_keys"],
      "media.fields": "url",
    });
    let image_buffer_base64 = [];
    if (tweet.includes?.media?.length > 0) {
      const medias = tweet.includes.media.filter(
        (media) => media.type === "photo"
      );
      if (medias.length > 0) {
        for (const media of medias) {
          const image_url = media.url;
          const image_buffer = await fetch(image_url);
          const contentType = image_buffer.headers.get("Content-Type");
          const image_buffer_array = await image_buffer.arrayBuffer();
          const _image_buffer_base64 =
            Buffer.from(image_buffer_array).toString("base64");
          // make it a base64 url
          image_buffer_base64.push(
            `data:${contentType};base64,${_image_buffer_base64}`
          );
        }
      }
    }
    return { text: tweet.data.text, images: image_buffer_base64 };
  }

  async postTweetWithMedia(text, pngBuffer) {
    try {
      const twitterMedia = await this.client.v1.uploadMedia(pngBuffer, {
        type: "png",
      });
      const tweet = await this.client.v2.tweet({
        text,
        media: { media_ids: [twitterMedia] },
      });
      if (tweet.data && tweet.data.id) {
        return {
          status: "success",
          tweetId: tweet.data.id,
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

  async getTweetMentions() {
    try {
      const logs = await InjectMagicAPI.getTwitterLogs();
      const timeline = await this.client.v2.userMentionTimeline(this.userId, {
        max_results: 20,
        expansions: ["author_id"],
        "tweet.fields": ["referenced_tweets"],
      });
      console.log(timeline.tweets);
      const expanded = await Promise.all(
        timeline.tweets
          .filter((tweet) => !logs.includes(tweet.id))
          .map(async (tweet) => {
            const author = await this.client.v2.user(tweet.author_id);
            const username = author.data.username;
            const _tweet = {
              username: username,
              text: tweet.text,
              id: tweet.id,
              reply_to: tweet.referenced_tweets?.find(
                (t) => t.type === "replied_to"
              )?.id,
            };

            let currentReplyTo = _tweet.reply_to;
            let fullText = _tweet.text;
            let isAuthor = _tweet.author_id === "1970223283464503296";
            while (currentReplyTo) {
              const parent = await this.client.v2.singleTweet(currentReplyTo, {
                expansions: ["author_id", "referenced_tweets.id"],
                "tweet.fields": ["referenced_tweets"],
              });
              const parentData = parent.data;

              if (isAuthor) {
                fullText = parentData.text + " [YOUR RESPONSE]: " + fullText;
              } else {
                fullText = parentData.text + " [RESPONSE]: " + fullText;
              }

              if (parentData.author_id === "1970223283464503296") {
                isAuthor = true;
              } else {
                isAuthor = false;
              }

              currentReplyTo = parentData.referenced_tweets?.find(
                (t) => t.type === "replied_to"
              )?.id;

              if (!currentReplyTo && isAuthor) {
                fullText = "[YOU]: " + fullText;
              }
            }
            return { text: fullText, id: _tweet.id };
          })
      );
      return expanded;

      // console.log(expanded);

      // return timeline.tweets
      //   .filter((tweet) => !logs.includes(tweet.id))
      //   .map((tweet) => ({ text: tweet.text, id: tweet.id }));
    } catch (error) {
      console.error(`Failed to get timeline: ${error.message}`);
      return [];
    }
  }
}

// Create and export a singleton instance
const twitter = new Twitter();

// Export both the class and the instance for flexibility
export default twitter;
export { Twitter };
