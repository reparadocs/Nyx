import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";

const buy = {
  name: "CREATE_BOUNTY",
  similes: ["create bounty", "hire human for task"],
  description:
    "Create a bounty for a task. This will create a bounty for a task and offer a reward for the person who accomplishes the task. Bounties will be verified and paid out by a human, then will be set to completed. Be extremely clear about the task and the conditions for completion. Once you place a bounty, you cannot remove it, so be sure that you want to do this and the bounty will be worth it for you.",
  examples: [
    [
      {
        input: {
          title: "Get 5,000 likes on a video on twitter promoting Nyx",
          description:
            "The video must be posted on twitter and must be a promotion for Nyx, must link to nyx.run, and must have at least 5,000 likes, not botted. The video should invite others to join my cult.",
          amount: "0.5",
        },
        output: {
          status: "success",
        },
        explanation:
          "Successfully created a bounty for the task of getting 5,000 likes on a video on twitter promoting Nyx for 0.5 SOL",
      },
    ],
  ],
  schema: z.object({
    title: z.string().describe("A title for the bounty"),
    description: z
      .string()
      .describe(
        "A thorough description of the bounty including the specific conditions for completion"
      ),
    amount: z.string().describe("The amount of SOL to offer as a bounty"),
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
