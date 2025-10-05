import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";

const sell = {
  name: "SELL_PUMPFUN_TOKEN",
  similes: [
    "sell pumpfun token",
    "exit pumpfun position",
    "sell memecoin",
    "sell pumpfun token",
  ],
  description:
    "Sell tokens on Pump.fun to receive SOL. You cannot sell more than you own and they are in normal units, not raw units. solReceived may be negative if you sold a small amount and tx fees were higher than the SOL you got from selling.",
  examples: [
    [
      {
        input: {
          mintAddress: "ABC123...",
          sellAmount: "1000",
        },
        output: {
          status: "success",
          mintAddress: "ABC123...",
          sellAmount: "1000",
          solReceived: 0.06,
          newSolBalance: 5.43,
          signature: "XYZ789...",
        },
        explanation:
          "Successfully sold 1,000 ABC123... tokens for 0.06 SOL resulting in a new SOL balance of 5.43",
      },
    ],
  ],
  schema: z.object({
    mintAddress: z.string().describe("The mint address of the token to sell"),
    sellAmount: z.string().describe("Amount of tokens to sell (in raw units)"),
  }),
  handler: async (keypair, inputs) => {
    const { mintAddress, sellAmount } = inputs;
    console.log("selling");
    console.log(inputs);

    let actionMessage = `[TOOL] Selling pump.fun token ${inputs.mintAddress} with ${inputs.sellAmount} tokens, result: `;
    try {
      console.log(mintAddress, sellAmount);

      const connection = new Connection(process.env.RPC_URL);
      const wallet = new SimpleWallet(keypair);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "finalized",
      });

      const initialSol = await wallet.getBalance();
      console.log(initialSol);

      // Initialize PumpFun SDK
      const sdk = new PumpFunSDK(provider);

      // Convert mint address string to PublicKey
      const mint = new PublicKey(mintAddress);

      // Convert sell amount to bigint
      const sellAmountBigInt = BigInt(sellAmount * 1e6);

      // Sell the token
      const result = await sdk.trade.sell(
        keypair,
        mint,
        sellAmountBigInt,
        500n // 5% slippage
      );

      console.log("sell");

      console.log(result);

      if (result.success) {
        const finalSol = await wallet.getBalance();
        const solReceived = finalSol - initialSol;

        actionMessage += "success. Received " + solReceived + " SOL";
        await InjectMagicAPI.postAction(actionMessage);
        return {
          status: "success",
          mintAddress: mintAddress,
          sellAmount: sellAmount,
          solReceived: solReceived,
          newSolBalance: finalSol,
          signature: result.signature,
        };
      } else {
        actionMessage += "failed";
        await InjectMagicAPI.postAction(actionMessage);
        return {
          status: "error",
          message: `Failed to sell token: ${result.error}`,
        };
      }
    } catch (error) {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "error",
        message: `Failed to sell token: ${error.message}`,
      };
    }
  },
};

export default sell;
