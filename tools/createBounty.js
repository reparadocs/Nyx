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
          title: "Bake a cake for Nyx",
          description:
            "Nyx needs a cake baked for her. The cake must be baked by a human and must be a cake that Nyx would like. The cake must be baked in a way that is unique and creative and not a copy of any existing work.",
          amount: "0.5 SOL",
        },
        output: {
          status: "success",
        },
        explanation:
          "Successfully created a bounty for the task of baking a cake for Nyx for 0.5 SOL",
      },
    ],
  ],
  schema: z.object({
    title: z.string().describe("A title for the bounty"),
    description: z
      .string()
      .describe(
        "A thorough description of the bounty including the specific conditions for completion. Think critically about good criteria for completion. Always specify No AI Submissions. DO NOT INCLUDE WHERE TO SUBMIT, HOW IT WILL BE JUDGED, OR THE DEADLINE."
      ),
    amount: z
      .string()
      .describe(
        "The amount to offer in SOL. Think about how much USD you would offer and then conver to SOL (1 SOL = ~200 USD)"
      ),
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
