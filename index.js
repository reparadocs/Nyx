import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";
import generateTools from "./tools.js";
import balances from "./utils/balances.js";
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import InjectMagicAPI from "./utils/api.js";
import SimpleWallet from "./utils/wallet.js";
import postTweet from "./utils/twitter.js";

const env = process.env;

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK); // F_OK checks for existence
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
    const tweet = await postTweet(tweetResponse);
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

  const userMessage = `Balances: <Balances>${JSON.stringify(
    tokenBalances
  )}</Balances> Current memory is within the memory tags: <Memory>${memory}</Memory> The time is ${new Date().toISOString()} Take your next actions and then in your response, briefly describe what actions you took and why. Then say anything else you'd like to your audience.`;

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

  const finalSol = await simpleWallet.getRawBalance();
  await InjectMagicAPI.postBalance(finalSol);

  await InjectMagicAPI.postAction("[Nyx] " + response, true);

  await InjectMagicAPI.postAction(
    "[SYSTEM] Nyx finished running, her existence might continue in 30 minutes..."
  );

  return true;
}

let result = true;
// Run the agent every 20 minutes
while (result) {
  try {
    console.log("Starting Solana AI Agent with 1800-second intervals...");
    result = await testExecutor();
    //test the post tweet tool
    console.log("Agent run completed successfully");
  } catch (error) {
    console.error("Agent run failed, continuing to next iteration:", error);
  }
  if (result) {
    console.log("Waiting 30 minutes before next run...");
    await new Promise((resolve) => setTimeout(resolve, 1800000));
  }
}
