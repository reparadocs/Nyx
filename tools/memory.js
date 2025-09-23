import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";

const buy = {
  name: "EDIT_MEMORY",
  similes: ["edit memory", "add to memory"],
  description:
    "Edit your memory. This will FULLY REPLACE your memory with the new memory so make sure to include everything from your current memory you would like to remember",
  examples: [
    [
      {
        input: {
          memory: "Your full memory",
        },
        output: {
          status: "success",
        },
        explanation: "Successfully set your memory to 'Your full memory'",
      },
    ],
  ],
  schema: z.object({
    memory: z
      .string()
      .describe("The string you would like to replace your memory with"),
  }),
  handler: async (keypair, inputs) => {
    console.log("editing memory");
    console.log(inputs);
    const { memory } = inputs;
    const response = await InjectMagicAPI.replaceMemory(memory);
    if (response.success) {
      await InjectMagicAPI.postAction("[TOOL] Edit memory to: " + memory);
      return {
        status: "success",
      };
    } else {
      await InjectMagicAPI.postAction(
        "[TOOL] Tried to edit memory, but failed. Proposed memory: " + memory
      );
      return {
        status: "error",
        message: `Failed to edit memory: ${response.error}`,
      };
    }
  },
};

export default buy;
