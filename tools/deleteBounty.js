import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";

const buy = {
  name: "DELETE_BOUNTY",
  similes: ["delete bounty", "remove bounty"],
  description: "Delete an active bounty.",
  examples: [
    [
      {
        input: { id: 101 },
        output: {
          result: "success",
        },
        explanation: "Deleted the bounty with id 101.",
      },
    ],
  ],
  schema: z.object({
    id: z
      .number()
      .describe(
        "The id of the bounty to delete. Must be a bounty where is_active is true "
      ),
  }),
  handler: async (keypair, inputs) => {
    console.log("deleting bounty");
    console.log(inputs);
    try {
      const bounty = await InjectMagicAPI.deleteBounty(inputs.id);

      await InjectMagicAPI.postAction("[TOOL] Deleted bounty " + bounty.title);
      return {
        result: "success",
      };
    } catch (error) {
      await InjectMagicAPI.postAction(
        "[TOOL] Tried to delete bounty, but failed"
      );
      return {
        status: "error",
        message: `Failed to delete bounty: ${response.error}`,
      };
    }
  },
};

export default buy;
