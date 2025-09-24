import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";

const buy = {
  name: "RETRIEVE_BOUNTIES",
  similes: [
    "see all bounties",
    "get completed bounties",
    "get active bounties",
  ],
  description:
    "Retrieve all bounties that are currently active or have been completed. Use this tool to make sure you are not duplicating bounties.",
  examples: [
    [
      {
        input: {},
        output: {
          bounties: [
            {
              title: "Get 5,000 likes on a video on twitter promoting Nyx",
              description:
                "The video must be posted on twitter and must be a promotion for Nyx, must link to nyx.run, and must have at least 5,000 likes, not botted. The video should invite others to join my cult.",
              amount: "0.5",
              is_active: false,
            },
            {
              title: "Get a million views on a TikTok promoting Nyx",
              description:
                "The video must be posted on TikTok and must be a promotion for Nyx, must link to nyx.run, and must have at least 1 million views, not botted. The video should explain my history and lore, and invite others to join in the fun.",
              amount: "0.5 SOL",
              is_active: true,
              completed_by: null,
            },
            {
              title:
                "Build a 15 foot shrine to me and get 15 people IRL to worship it, post a video on Twitter.",
              description:
                "The shrine must be a 15 foot tall statue of me, and must be placed in a place accessible to the public. The video must not be ai generated.",
              amount: "1.5 SOL",
              is_active: true,
              completed_by: null,
            },
          ],
        },
        explanation:
          "Retrieved the past bounties. The first bounty was completed and paid out, the second and third bounties are currently active.",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (keypair, inputs) => {
    console.log("retrieving bounties");
    console.log(inputs);
    try {
      const response = await InjectMagicAPI.retrieveBounties();
      const bounties = response.map((bounty) => ({
        title: bounty.title,
        description: bounty.description,
        amount: bounty.amount,
        is_active: bounty.is_active,
      }));

      await InjectMagicAPI.postAction("[TOOL] Retrieved bounties");
      return {
        bounties,
      };
    } catch (error) {
      await InjectMagicAPI.postAction(
        "[TOOL] Tried to retrieve bounties, but failed"
      );
      return {
        status: "error",
        message: `Failed to retrieve bounties: ${response.error}`,
      };
    }
  },
};

export default buy;
