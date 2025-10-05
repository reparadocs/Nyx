import { z } from "zod";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import SimpleWallet from "../utils/wallet.js";
import InjectMagicAPI from "../utils/api.js";
import balances from "../utils/balances.js";

const createAndBuy = {
  name: "LAUNCH_PUMPFUN_TOKEN",
  similes: ["launch pumpfun token", "start memecoin", "start new token"],
  description:
    "Create a new token on Pump.fun and buy it with SOL. This launches a new memecoin that you can trade.",
  examples: [
    [
      {
        input: {
          tokenName: "MyMemecoin",
          tokenSymbol: "MEME",
          tokenDescription: "MyMemecoin is a memecoin that I want to launch",
          buyAmountSol: "0.1",
        },
        output: {
          status: "success",
          mintAddress: "ABC123...",
          tokenName: "MyMemecoin",
          tokenSymbol: "MEME",
          buyAmountSol: "0.1",
          newSolBalance: 5.43,
          signature: "XYZ789...",
          tokenBalance: "1000",
        },
        explanation:
          "Successfully created and bought a new token called MyMemecoin resulting in a new SOL balance of 5.43 and 1000 MyMemecoin tokens",
      },
    ],
  ],
  schema: z.object({
    tokenName: z.string().describe("The name of the token to create"),
    tokenSymbol: z.string().describe("The symbol/ticker of the token"),
    tokenDescription: z.string().describe("The description of the token"),
    buyAmountSol: z
      .string()
      .describe("Amount of SOL to spend buying the token"),
  }),
  handler: async (keypair, inputs) => {
    console.log("creating and buying");
    console.log(inputs);
    const { tokenName, tokenSymbol, tokenDescription, buyAmountSol } = inputs;
    console.log("hello?");
    let actionMessage = `[TOOL] Creating pump.fun token ${tokenName} with symbol ${tokenSymbol} and description ${tokenDescription} and buying it with ${buyAmountSol} SOL, result: `;

    // Create connection and provider
    const connection = new Connection(process.env.RPC_URL);
    const wallet = new SimpleWallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "finalized",
    });

    // Initialize PumpFun SDK
    const sdk = new PumpFunSDK(provider);

    // Generate new mint keypair for the token
    const mint = Keypair.generate();
    const imagePath = path.join(process.cwd(), "images", "mint.jpg");

    // read the file into a buffer
    const data = fs.readFileSync(imagePath);

    // wrap it in a blob
    const blob = new Blob([data], { type: "image/png" });

    // Create token metadata
    const createTokenMetadata = {
      name: tokenName,
      symbol: tokenSymbol,
      description: tokenDescription,
      website: "https://nyx.run",
      file: blob,
    };

    // Convert SOL amount to lamports (bigint)
    const buyAmountLamports = BigInt(
      Math.floor(parseFloat(buyAmountSol) * 1e9)
    );

    // Create and buy the token
    const result = await sdk.trade.createAndBuy(
      keypair, // Use keypair directly instead of wallet.keypair
      mint,
      createTokenMetadata,
      buyAmountLamports,
      500n // 5% slippage
    );

    console.log(mint.publicKey.toBase58());

    if (result.success) {
      console.log(mint.publicKey.toBase58());
      const finalToken = await balances.getTokenBalance(
        keypair.publicKey.toString(),
        mint.publicKey.toString()
      );

      actionMessage += "success. Received " + finalToken + " tokens";
      console.log(result);
      const finalSol = await wallet.getBalance();

      await InjectMagicAPI.postAction(actionMessage);
      await InjectMagicAPI.whitelistToken(mint.publicKey.toBase58());

      return {
        status: "success",
        mintAddress: mint.publicKey.toBase58(),
        newSolBalance: finalSol,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        buyAmountSol: buyAmountSol,
        tokenBalance: finalToken,
        signature: result.signature,
      };
    } else {
      actionMessage += "error";
      console.log(result.error);
      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "failed",
        message: `Failed to create and buy token: ${result.error}`,
      };
    }
  },
};

export default createAndBuy;
