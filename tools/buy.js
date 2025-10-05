import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";
import balances from "../utils/balances.js";

const buy = {
  name: "BUY_PUMPFUN_TOKEN",
  similes: ["buy pumpfun token", "buy memecoin"],
  description:
    "Buy an existing token on Pump.fun using SOL. This allows you to invest in memecoins and build your position.",
  examples: [
    [
      {
        input: {
          mintAddress: "ABC123...",
          buyAmountSol: "0.05",
        },
        output: {
          status: "success",
          mintAddress: "ABC123...",
          buyAmountSol: "0.05",
          newTokenBalance: "1000000",
          newSolBalance: 5.43,
          signature: "XYZ789...",
        },
        explanation:
          "Successfully bought ABC123... mint tokens with 0.05 SOL resulting in a new SOL balance of 5.43 and new ABC123... mint token balance of 1000000",
      },
    ],
  ],
  schema: z.object({
    mintAddress: z.string().describe("The mint address of the token to buy"),
    buyAmountSol: z
      .string()
      .describe("Amount of SOL to spend buying the token"),
  }),
  handler: async (keypair, inputs) => {
    console.log("buying");
    console.log(inputs);
    const { mintAddress, buyAmountSol } = inputs;
    let actionMessage = `[TOOL] Buying pump.fun token ${mintAddress} with ${buyAmountSol} SOL, result: `;
    console.log(mintAddress, buyAmountSol);

    await InjectMagicAPI.whitelistToken(mintAddress);

    const connection = new Connection(process.env.RPC_URL);
    const wallet = new SimpleWallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "finalized",
    });
    // Initialize PumpFun SDK
    const sdk = new PumpFunSDK(provider);

    // Convert mint address string to PublicKey
    const mint = new PublicKey(mintAddress);

    // Convert SOL amount to lamports (bigint)
    const buyAmountLamports = BigInt(
      Math.floor(parseFloat(buyAmountSol) * 1e9)
    );

    // Buy the token
    const result = await sdk.trade.buy(
      keypair,
      mint,
      buyAmountLamports,
      500n // 5% slippage
    );

    const balance = await wallet.getTokenBalance(result[0].mintAddress);
    console.log("testing token balance");
    console.log(balance);
    if (result.success) {
      const finalToken = await balances.getTokenBalance(
        keypair.publicKey.toString(),
        mint.publicKey.toString()
      );
      actionMessage +=
        "success. New token balance is " + finalToken + " tokens";
      console.log(result);
      const finalSol = await wallet.getBalance();

      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "success",
        newSolBalance: finalSol,
        mintAddress: mintAddress,
        buyAmountSol: buyAmountSol,
        newTokenBalance: finalToken,
        signature: result.signature,
      };
    } else {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "error",
        message: `Failed to buy token: ${result.error}`,
      };
    }
  },
};

export default buy;
