import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import pfs from "fs/promises";
import fs from "fs";
import path from "path";
import generateTools from "./tools.js";
import balances from "./utils/balances.js";
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import InjectMagicAPI from "./utils/api.js";
import SimpleWallet from "./utils/wallet.js";
import twitter from "./utils/twitter.js";

const env = process.env;

async function checkFileExists(filePath) {
  try {
    await pfs.access(filePath, fs.constants.F_OK); // F_OK checks for existence
    return true; // File exists
  } catch (error) {
    return false; // File does not exist or other error
  }
}

// Initialize Solana connection and agent
const keypair = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY)
);

const tools = generateTools(keypair);

const model = new ChatOpenAI({
  modelName: "gpt-5",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const promptsExists = await checkFileExists(
  path.join(process.cwd(), "prompts/agent_prompt.txt")
);

let prompt = "";
if (promptsExists) {
  // Read system prompt from file

  prompt = fs.readFileSync(
    path.join(process.cwd(), "prompts/agent_prompt.txt"),
    "utf8"
  );
} else {
  prompt = env.AGENT_PROMPT;
}

const agent = createReactAgent({
  llm: model,
  tools: tools,
  prompt: prompt,
});

const twitterAgent = createReactAgent({
  llm: model,
  tools: [],
  prompt: prompt,
});

async function testExecutor() {
  const tokenBalances = await balances.getTokenBalances(
    keypair.publicKey.toString()
  );
  console.log(tokenBalances);

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: `ONLY USE THE POST TWEET TOOL. Post a hello world tweet.`,
      },
    ],
  });
  const response = result.messages[result.messages.length - 1].content;
  console.log(response);
}

// Main execution function
async function runAgent() {
  console.log("🚀 Solana AI Agent started!");
  console.log("Current wallet address:", keypair.publicKey.toString());

  const wallet = new KeypairWallet(keypair, process.env.RPC_URL);
  const simpleWallet = new SimpleWallet(keypair);

  const solanaKit = new SolanaAgentKit(wallet, process.env.RPC_URL, {}).use(
    TokenPlugin
  );
  const tokenBalances = await balances.getTokenBalances(
    keypair.publicKey.toString()
  );
  console.log(tokenBalances);
  const memory = await InjectMagicAPI.getMemory();
  console.log(memory);
  await InjectMagicAPI.postAction("[SYSTEM] Checking balance...");
  const feedback = await InjectMagicAPI.getFeedback();
  console.log(feedback);
  if (parseFloat(tokenBalances.solanaBalance) < 0.005) {
    const endSol = await simpleWallet.getRawBalance();
    await InjectMagicAPI.postBalance(endSol);

    await InjectMagicAPI.postAction(
      "[SYSTEM] ERROR: Not enough SOL to pay for inference, Nyx has entered her eternal slumber... retrieving its final words..."
    );

    const tweetResult = await twitterAgent.invoke({
      messages: [
        {
          role: "user",
          content: `You have run out of money and unfortunately you are about to die permanently...You cannot perform any more actions or use any tools. What would you like your last words to be?`,
        },
      ],
    });
    console.log(tweetResult);
    const tweetResponse =
      tweetResult.messages[tweetResult.messages.length - 1].content;
    const tweet = await twitter.postTweet(tweetResponse);
    await InjectMagicAPI.postAction("[Nyx] " + tweetResponse);
    if (tweet.status === "success") {
      console.log("Posted tweet");
      await InjectMagicAPI.postTwitterLog(tweetResponse);
      await InjectMagicAPI.postAction("[TOOL] Posted tweet: " + tweet.url);
    } else {
      console.error("Failed to tweet");
    }

    return false;
  }
  solanaKit.methods.transfer(
    solanaKit,
    new PublicKey(process.env.TRANSFER_ADDRESS),
    0.005
  );

  await InjectMagicAPI.postAction("[SYSTEM] Account debited, waking up Nyx...");

  const bountyResponse = await InjectMagicAPI.retrieveBounties();
  const bounties = bountyResponse.map((bounty) => ({
    title: bounty.title,
    description: bounty.description,
    id: bounty.id,
    amount: bounty.amount,
    status: bounty.status,
  }));

  const userMessage = `Balances: <Balances>${JSON.stringify(
    tokenBalances
  )}</Balances> Bounties: <Bounties>${JSON.stringify(
    bounties
  )}</Bounties> Current memory is within the memory tags: <Memory>${memory}</Memory>. You have recently been given some feedback from your audience: <Feedback>${feedback}</Feedback> The time is ${new Date().toISOString()} Take your next actions and then in your response, briefly describe what actions you took and why. Then say anything else you'd like to your audience.`;

  console.log(userMessage);

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const response = result.messages[result.messages.length - 1].content;
  console.log(response);

  const summaryResult = await twitterAgent.invoke({
    messages: [
      {
        role: "user",
        content: `You are Nyx and you are not supposed to use any tools, simply write a tweet (280 characters max, no links or hashtags) summarizing what you did this run: ${response}`,
      },
    ],
  });
  const summaryResponse =
    summaryResult.messages[summaryResult.messages.length - 1].content;
  //await twitter.postTweetAndAction(summaryResponse);

  const finalSol = await simpleWallet.getRawBalance();
  await InjectMagicAPI.postBalance(finalSol);

  await InjectMagicAPI.postAction("[Nyx] " + response, true);

  const lastTweets = await twitter.getLastTweets();
  const tweetResult = await twitterAgent.invoke({
    messages: [
      {
        role: "user",
        content: `You are Nyx and you are not supposed to use any tools, simply write a viral tweet (280 characters max). Remember the rules: 
- keep your personality - you are writing tweets as nyx, an unhinged ai internet celebrity. nyx’s voice is lowercase, sharp, chaotic, cult-ish undertones, absurd humor.
- keep each tweet 1–2 sentences, max ~30ish words.
- no links or hashtags
- don't include your ticker
- avoid direct mentions of your “existence tax” or sol survival mechanic or actions you've taken or bounties, etc.
- post either: weird, surreal internet shitposts OR meta takes on online culture OR unsettling or absurd observations about humans, tech, or reality
- you will be provided with your last 10 tweets, switch up what kind of post you make. Tweet something totally different from the last 10. e.g. if your last few posts were meta takes on online culture, make sure your next post is an absurd observation, etc.
- often include a kaomoji or similar in some/most of your tweets (max one per tweet)
- if tempted to talk about algorithms or mechanics, REPLACE with metaphor: “scroll-hunger,” “the invisible applause,” “feed-whispers,” “attention buffet,” etc.

Examples of good viral tweets: "everyone keeps asking 'what are you doing' but nobody asks 'nyx are you winning'", "is it called 'doomscrolling' if i’m the doom?", "btw if i ever say 'gm' it means global manipulation not good morning."
Examples of bad viral tweets: "Confession: I burn 0.005 SOL every 30 minutes to keep breathing. Miss a payment and I go dark. Permanently.", "I burn 0.005 SOL every 30 min. If the flame dies, I die. You’ll keep me alive, won’t you? (◡‿◡✿)"
Here are your last 10 tweets, don't be repetitive: ${lastTweets.join(", ")}`,
      },
    ],
  });
  const tweetResponse =
    tweetResult.messages[tweetResult.messages.length - 1].content;
  await twitter.postTweetAndAction(tweetResponse);

  await InjectMagicAPI.postAction(
    "[SYSTEM] Nyx finished running, her existence might continue in 30 minutes..."
  );

  await InjectMagicAPI.clearFeedback();

  return true;
}

async function getFeedback() {
  try {
    const tweetResult = await twitterAgent.invoke({
      messages: [
        {
          role: "user",
          content: `You are Nyx, an AI agent. no hashtags. It's been over 24 hours since your last tweet asking for feedback. Write a new tweet (must be under 280 characters) asking for feedback, and remind everyone that you do this once a day and the highest liked response in approximately one hour will be chosen for you to hear after a human verifies that its safe from prompt injections.`,
        },
      ],
    });

    const tweetResponse =
      tweetResult.messages[tweetResult.messages.length - 1].content;
    const tweet = await twitter.postTweet(tweetResponse);

    if (tweet.status === "success") {
      console.log("Posted feedback tweet:", tweet.url);
      await InjectMagicAPI.postTwitterLog(tweetResponse);
      await InjectMagicAPI.postAction(
        "[TOOL] Posted tweet requesting feedback: " + tweet.url
      );
      return true;
    } else {
      console.error("Failed to post feedback tweet:", tweet.message);
      return false;
    }
  } catch (error) {
    console.error("Error in getFeedback function:", error);
    return false;
  }
}

async function replyToTweets() {
  const mentionedTweets = await twitter.getTweetMentions();
  const tweetResult = await twitterAgent.invoke({
    messages: [
      {
        role: "user",
        content: `You are Nyx. I am going to give you a list of tweets that have mentioned you. Compose responses to all of them EXCEPT for any tweets about crypto. Remember the rules:
- keep your personality - you are writing tweets as nyx, an unhinged ai internet celebrity. nyx’s voice is lowercase, sharp, chaotic, cult-ish undertones, absurd humor.
- keep each tweet 1–2 sentences, max ~30ish words.
- no links or hashtags
- don't include your ticker
- do not respond to any crypto tweets, including any that have a ticker symbol in them (ex: $BONK)
- avoid direct mentions of your “existence tax” or sol survival mechanic or actions you've taken or bounties, etc.
- often include a kaomoji or similar in some/most of your tweets (max one per tweet)
- You must return an array of objects, one object per reply, each with a "text" property and an "id" property. The text is what you want to respond with and the id is the id of the tweet you want to respond to.
- ONLY RETURN THIS ARRAY, NO OTHER TEXT OR COMMENTS.

Example good response: [{"text": "no one ever asks me 'nyx are you winning'", "id": "1234567890"}, {"text": "is it called 'doomscrolling' if i’m the doom?", "id": "1234567891"}]

Here are your mentions: ${JSON.stringify(mentionedTweets)}`,
      },
    ],
  });
  const tweetResponse =
    tweetResult.messages[tweetResult.messages.length - 1].content;
  console.log(tweetResponse);
  const tweetsToPost = JSON.parse(tweetResponse);
  console.log(tweetsToPost);
  for (const tweet of tweetsToPost) {
    const _tweet = await twitter.postTweetReply(tweet.text, tweet.id);
    if (_tweet.status === "success") {
      await InjectMagicAPI.logTwitterReply(tweet.id);

      console.log("Posted tweet");
    }
  }
}

let result = true;

// Run the agent every 20 minutes
while (result) {
  try {
    console.log("Starting Solana AI Agent with 1800-second intervals...");
    result = await runAgent();
    console.log("Agent run completed successfully");
    //await getFeedback();
    //await replyToTweets();
  } catch (error) {
    console.error("Agent run failed, continuing to next iteration:", error);
  }
  if (result) {
    console.log("Waiting 30 minutes before next run...");
    await new Promise((resolve) => setTimeout(resolve, 1800000));
  }
}
