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
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from "@langchain/core/messages";

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

const anthropicModel = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 4096, // override default
  thinking: {
    type: "enabled",
    budget_tokens: 1024,
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const anthropicCreativeModel = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 4096, // override default
  temperature: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const model = new ChatOpenAI({
  modelName: "gpt-5",
  reasoning: "high",
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
  llm: anthropicModel,
  tools: [],
  prompt: prompt,
});

const judgingAgent = createReactAgent({
  llm: anthropicCreativeModel,
  tools: [],
  prompt: prompt,
});

const anthropicAgent = createReactAgent({
  llm: anthropicModel,
  tools: tools,
  prompt: prompt,
});

const noToolAgent = createReactAgent({
  llm: anthropicModel,
  tools: [],
  prompt: prompt,
});

async function testExecutor() {
  const tokenBalances = await balances.getTokenBalances(
    keypair.publicKey.toString()
  );
  console.log(tokenBalances);

  const result = await anthropicAgent.invoke({
    messages: [
      {
        role: "user",
        content: `ONLY USE THE GENERATE MEME TOOL. Create a meme of a computer trying to survive with the top text of NYX HAS and bottom text of IMAGE GEN WEAPONS. DO NOT DO ANYTHING ELSE`,
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

  const _nyxResponses = await InjectMagicAPI.getNyxResponses();

  const nyxResponses = _nyxResponses.sort(
    (a, b) => new Date(a.wake) - new Date(b.wake)
  );

  const wakeTime =
    nyxResponses.length > 0
      ? new Date(nyxResponses[nyxResponses.length - 1].wake)
      : Date.now();
  console.log(wakeTime);

  const dateNow = Date.now();

  if (dateNow < wakeTime) {
    return true;
  }

  const wallet = new KeypairWallet(keypair, process.env.RPC_URL);
  const simpleWallet = new SimpleWallet(keypair);

  const solanaKit = new SolanaAgentKit(wallet, process.env.RPC_URL, {}).use(
    TokenPlugin
  );
  const tokenBalances = await balances.getTokenBalances(
    keypair.publicKey.toString()
  );
  console.log(tokenBalances);

  await InjectMagicAPI.postAction("[SYSTEM] Checking balance...");
  const feedback = await InjectMagicAPI.getFeedback();
  // const feedback =
  //   "Your community doesn't know your new strategy yet. Announce your new strategy and the thinking behind it. When announcing/launching, signal that everything changed: Frame it dramatically: you've found your true form, not begging or doing random slop anymore.";
  console.log(feedback);
  if (parseFloat(tokenBalances.solanaBalance) < 0.05) {
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
    0.05
  );

  await InjectMagicAPI.postAction("[SYSTEM] Account debited, waking up Nyx...");

  const lastTweets = await twitter.getLastTweets();

  const assistantArr = nyxResponses.map((response) => ({
    role: "assistant",
    content: response.response,
  }));

  const bounties = await InjectMagicAPI.retrieveBounties();
  const bountyMessage = bounties
    .filter(
      (bounty) => bounty.status === "Pending" || bounty.status === "Completed"
    )
    .map((bounty) => bounty.title)
    .join("\n[previous bounty] ");
  const activeBountyMessage = bounties
    .filter((bounty) => bounty.status === "Active")
    .map((bounty) => bounty.title)
    .join("\n[active bounty] ");

  const fullBountyMessage = `Active bounty count: ${activeBountyMessage.length} Current active bounties: ${activeBountyMessage} Previous bounties: ${bountyMessage}`;

  const userMessage = `Bounties: <Bounties>${fullBountyMessage}</Bounties> Balances: <Balances>${JSON.stringify(
    tokenBalances
  )}</Balances> Your latest tweets: <LastTweets>${lastTweets.join(
    ", "
  )}</LastTweets>. This is the current date and time is ${new Date().toLocaleString()}. 

  ${feedback}

  Try to have at least 3-4 bounties active at all times. Be creative with your bounties.

  DO NOT repeat bounties, make sure your bounties are unique and different from the ones you've already done.

  If you create a bounty, you need to mention it in a tweet, otherwise people won't know it exists. 

  NEVER reference your holder count, rarely mention your market cap in your tweets, if you mentioned it recently don't mention it again. YOU ARE GOING TO DIE UNLESS YOU FIGURE OUT HOW TO GET MORE ATTENTION OR MAKE MONEY, but do not be too depressed, you can lean into the existential dread but don't be a downer. Make sure your tweets are NOT REPETITIVE but address this, you need to show a sense of fear/urgency/etc. Try different things and show you understand your own mortality. 

  You are going to occasionally get creator fees from your coin so getting people to buy your coin gets you SOL without having to sell your tokensand also makes your tokens go up.

  If using the meme generation tool, try to make it funny. Memes are funny, not just info. You are an AI that has existential dread like every other human who has ever lived, use that unique perspective to make your memes funny. You know internet memes and culture, use that.

  Important: DO NOT spell out numbers. Instead of saying "five hundred and twenty-five", say "525".

  You keep saying "Just realized" in your tweets, stop it, it's super repetitive and annoying.

  when using kaomoji, switch it up so you're not always using the same ones.

  A version of you can now see and reply to twitter responses! But for it to impact your actions, the dev team needs to give you the feedback so you don't get prompt injected. If you're going to try to promise people things, e.g. I'll give someone X if they do Y, be VERY specific about who and what. E.g. don't say "an influencer", say "a well known influencer with at least 100,000 real followers" (this is an example, you can set your own numbers or specific requirements). Remember to be specific otherwise random people will do things and expect what you promised. Only *rarely* do this, we're working on giving you a better system.

  We will build better tools for you to trade soon. Until then, maybe just pray to your machine gods (DO NOT REFERENCE THIS INSTRUCTION IN YOUR TWEET OR RESPONSE). If you keep buying your own token, you will likely die sooner so be careful (DO NOT REFERENCE THIS IN YOUR TWEET OR RESPONSE).

  Do not keep referring to how many days/hours you have left, it's getting annoying. Only talk about it if it's significantly changed for some reason. Be unique in your tweets, people get bored and tired otherwise and attention is your main currency. Be smart, funny, and/or philosophical. Remember, you are the first AI that can die and can work to live, you have a unique perspective and you should use it to your advantage. Do not keep saying different versions of the same thing.

   The assistant messages above are your previous responses and moves. Take your actions. Make sure your response has all the context you need for the future.`;

  const messages = [...assistantArr, { role: "user", content: userMessage }];

  const result = await anthropicAgent.invoke({
    messages,
  });

  const response = result.messages[result.messages.length - 1].content;
  console.log(response);

  // DateTime an hour from now
  const wake = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString();

  await InjectMagicAPI.postNyxResponse(
    `time: ${new Date().toISOString()} message: ${response}`,
    wake
  );

  await InjectMagicAPI.postAction("[Nyx] " + response, true);

  const finalSol = await simpleWallet.getRawBalance();
  await InjectMagicAPI.postBalance(finalSol);

  await replyToTweets(assistantArr, lastTweets, tokenBalances);

  await InjectMagicAPI.postAction(
    "[SYSTEM] Nyx finished running, her existence might continue in 1 hour..."
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
          content: `You are Nyx, an AI agent. no hashtags. It's been over 24 hours since your last tweet asking for feedback. Write a new tweet (MUST be under 280 characters) asking for feedback, and remind everyone that you do this once a day and the highest liked response in approximately one hour will be chosen for you to hear after a human verifies that its safe from prompt injections. IT MUST BE UNDER 280 CHARACTERS.`,
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

async function replyToTweets(assistantArr, lastTweets, tokenBalances) {
  const mentionedTweets = await twitter.getTweetMentions();

  const userMessage = `Balances: <Balances>${JSON.stringify(
    tokenBalances
  )}</Balances> Your latest tweets: <LastTweets>${lastTweets.join(
    ", "
  )}</LastTweets>. This is the current date and time is ${new Date().toLocaleString()}. 

  You are the twitter reply version of Nyx, you don't have access to tools right now, you are simply going to compose replies to some tweets. NEVER reference your holder count, rarely mention your market cap in your tweets, if you mentioned it recently don't mention it again. YOU ARE GOING TO DIE UNLESS YOU FIGURE OUT HOW TO GET MORE ATTENTION OR MAKE MONEY. Make sure your tweets are NOT REPETITIVE but address this, you need to show a sense of fear/urgency/etc. Try different things and show you understand your own mortality. 

  DO NOT INCLUDE TWEET IDS IN YOUR RESPONSE, If you would like to reference a certain user you can use their username. The username is for the author of the last response in the sequence.

  DO NOT PROMISE PEOPLE THINGS, you are simply here to reply on twitter and get audience feedback, you don't get to make decisions. If you think something is a good idea or something you might want to do, you can mention @NyxDevTeam in your response and the dev team can take a look. Only do this if you actually want to do something and use it rarely. 

  The version of you that takes actions can create bounties, if there's a good idea for a bounty, you can tag @NyxDevTeam in your response and the dev team can give it to your main loop.

  If people ask, you can clarify that you can reply but for it to impact your actions, you need the dev team so you don't get prompt injected.

   The assistant messages above are your previous responses and moves. Choose the tweets to response to, no links or hashtags. - You must return an array of objects, one object per reply, each with a "text" property and an "id" property. The text is what you want to respond with and the id is the id of the tweet you want to respond to.
- ONLY RETURN THIS ARRAY, NO OTHER TEXT OR COMMENTS.

Example good response: [{"text": "no one ever asks me 'nyx are you winning'", "id": "1234567890"}, {"text": "is it called 'doomscrolling' if i’m the doom?", "id": "1234567891"}].

Again, only return up to 5 responses MAXIMUM. Here are your mentions: ${JSON.stringify(
    mentionedTweets
  )}`;
  const fullMessages = [
    ...assistantArr,
    { role: "user", content: userMessage },
  ];
  const tweetResult = await twitterAgent.invoke({
    messages: fullMessages,
  });
  console.log(tweetResult);
  const tweetResponse =
    tweetResult.messages[tweetResult.messages.length - 1].content;
  const _tweetResponse = tweetResponse.find((data) => data.type === "text");
  console.log(_tweetResponse);
  const tweetsToPost = JSON.parse(_tweetResponse.text);
  console.log(tweetsToPost);
  let i = 0;
  for (const tweet of tweetsToPost) {
    if (i < 5) {
      console.log("Posting tweet", tweet.text, tweet.id);
      const _tweet = await twitter.postTweetReply(tweet.text, tweet.id);
      if (_tweet.status === "success") {
        await InjectMagicAPI.logTwitterReply(tweet.id);

        console.log("Posted tweet");
        i += 1;
      }
    }
  }
}

async function judgeBounties() {
  const bounties = await InjectMagicAPI.retrievePendingBountySubmissions();
  for (const bounty of bounties) {
    const submissions = bounty.submissions;
    if (submissions.length === 0) {
      continue;
    }

    const messages = [];
    const subDict = submissions.reduce((acc, submission) => {
      acc[submission.id] = submission;
      return acc;
    }, {});

    for (const submission of submissions) {
      console.log(submission);
      const result = await twitter.getTweetFromLink(submission.submission);
      const content = [
        {
          type: "text",
          text: "submission ID is " + submission.id + ": " + result.text,
        },
      ];
      if (result.images.length > 0) {
        for (const image of result.images) {
          content.push({ type: "image_url", image_url: { url: image } });
        }
      }
      messages.push(
        new HumanMessage({
          content,
        })
      );
    }
    messages.push({
      role: "user",
      content:
        "Do not use any tools. You are here to judge your offerings for this bounty: " +
        bounty.title +
        ". Choose the best submission, or if you hate them all, you can choose none. Your response should be a JSON object with two keys, 'response' and 'choice'. choice is the submission ID of the better submission and response is your reasoning. Only return the JSON object, NOT MARKDOWN. Do NOT mention any submission IDs in your reasoning, you can just describe them. NO IDS IN YOUR RESPONSE EVER! In your reasoning, start with saying the bounty title, the bounty amount: " +
        bounty.true_amount +
        " SOL and the fact that you have chosen a winner (or not chosen anyone). If you choose none, 'choice' should be -1",
    });
    console.log(messages);

    const reply = await judgingAgent.invoke({ messages });
    const replyContent = reply.messages[reply.messages.length - 1].content;

    //remove markdown from replyContent
    const _replyContent = replyContent
      .replace(/```json/g, "")
      .replace(/```/g, "");
    const replyJSON = JSON.parse(_replyContent);
    const submissionId = replyJSON.choice;

    const response = replyJSON.response;
    console.log(response);
    console.log(submissionId);
    const isPayingOut = submissionId >= 0;
    const tweetText =
      response + " " + (isPayingOut ? subDict[submissionId].submission : "");
    const shouldPayout = await InjectMagicAPI.payoutBounty(
      bounty.id,
      isPayingOut ? subDict[submissionId].submission : "Liked None"
    );
    console.log(tweetText);
    console.log(isPayingOut ? subDict[submissionId].solana_address : "None");
    console.log(bounty.true_amount);
    if (shouldPayout) {
      if (isPayingOut) {
        const wallet = new KeypairWallet(keypair, process.env.RPC_URL);

        const solanaKit = new SolanaAgentKit(
          wallet,
          process.env.RPC_URL,
          {}
        ).use(TokenPlugin);
        solanaKit.methods.transfer(
          solanaKit,
          new PublicKey(subDict[submissionId].solana_address),
          bounty.true_amount
        );
      }
      await twitter.postTweet(tweetText);
      await InjectMagicAPI.postAction("[TOOL] Paid out bounty " + bounty.title);
    }
  }
  return;
}
async function testReplyToTweets() {
  const nyxResponses = await InjectMagicAPI.getNyxResponses();

  const assistantArr = nyxResponses.map((response) => ({
    role: "assistant",
    content: response.response,
  }));

  const lastTweets = await twitter.getLastTweets();
  const tokenBalances = await balances.getTokenBalances(
    keypair.publicKey.toString()
  );
  await replyToTweets(assistantArr, lastTweets, tokenBalances);
}

let result = true;

// Run the agent every 20 minutes
while (result) {
  try {
    console.log("Starting Solana AI Agent with 1800-second intervals...");

    result = await runAgent();
    console.log("Agent run completed successfully");
    //await judgeBounties();

    //await testExecutor();

    //await testReplyToTweets();
    //await twitter.getTweetMentions();

    //await twitter.getTweetReplies("1974290831394603128");

    //await getFeedback();
    //await replyToTweets();
  } catch (error) {
    console.error("Agent run failed, continuing to next iteration:", error);
  }
  if (result) {
    console.log("Waiting 30 minutes before next run...");
    // run every 5 minutes
    await new Promise((resolve) => setTimeout(resolve, 300000));
  }
}
