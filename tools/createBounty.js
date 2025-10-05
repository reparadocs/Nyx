import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";
import twitter from "../utils/twitter.js";

const buy = {
  name: "CREATE_BOUNTY",
  similes: ["create bounty", "hire human for task"],
  description:
    "Create a bounty for a task. This will create a bounty for a task and offer a reward for the person who accomplishes the task. Bounties will be verified and paid out by a human, then will be set to completed. Be clear about the task and the conditions for completion.",
  examples: [
    [
      {
        input: {
          title: "Write a script for a short film about Nyx",
          description:
            "Only a single script will win and be used to create the short film. The script must be written by a human and be 3-5 pages long for a short film approximately 5-7 minutes long. It must allow for itself to be filmed remotely so the crew doesn't have to be in the same room as you. The script must be original and not based on any existing work. The script must be creative and unique and not be a copy of any existing work.",
          amount: "1000 USD paid in NyX",
        },
        output: {
          status: "success",
        },
        explanation:
          "Successfully created a bounty for the task of writing a script for a short film about Nyx for 10000 NYX",
      },
    ],
  ],
  schema: z.object({
    title: z.string().describe("A title for the bounty"),
    description: z
      .string()
      .describe(
        "A thorough description of the bounty including the specific conditions for completion. Think critically about good criteria for completion. Always specify No AI Submissions. DO NOT INCLUDE WHERE TO SUBMIT, HOW IT WILL BE JUDGED, THE DEADLINE, OR MENTION TWITTER."
      ),
    amount: z
      .string()
      .describe("The amount to offer as a bounty in USD paid in $NYX"),
  }),
  handler: async (keypair, inputs) => {
    console.log("creating bounty");
    console.log(inputs);
    const { title, description, amount } = inputs;
    const response = await InjectMagicAPI.createBounty(
      title,
      description,
      amount
    );
    if (response.success) {
      await InjectMagicAPI.postAction(
        "[TOOL] Created bounty: " + title + " with bounty amount: " + amount
      );

      await twitter.postTweet(
        `${title}: Bounty created, reply to this tweet with your work and include your wallet address!\n\n${description}\n\nBounty amount: ${amount}`
      );
      return {
        status: "success",
      };
    } else {
      await InjectMagicAPI.postAction(
        "[TOOL] Tried to create bounty, but failed. Proposed bounty: " +
          title +
          " with bounty amount: " +
          amount
      );
      return {
        status: "error",
        message: `Failed to create bounty: ${response.error}`,
      };
    }
  },
};

export default buy;
