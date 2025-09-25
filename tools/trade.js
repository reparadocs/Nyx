import { z } from "zod";
import { VersionedTransaction } from "@solana/web3.js";
import InjectMagicAPI from "../utils/api.js";
import SimpleWallet from "../utils/wallet.js";

const tradeTokens = {
  name: "TRADE_TOKENS",
  similes: ["trade tokens", "buy tokens", "sell tokens", "swap tokens"],
  description:
    "Trade tokens on the solana blockchain using Jupiter. You can swap tokens for other tokens at current market price.",
  examples: [
    [
      {
        input: {
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
          inputAmount: "0.1",
        },
        output: {
          status: "success",
          newSolBalance: 5.43,
          inputMint: "So11111111111111111111111111111111111111112",
          inputAmount: "0.1",
          outputMint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
          outputAmount: "1274698",
        },
        explanation:
          "Swap 0.1 SOL for 1274698 WI resulting in a new SOL balance of 5.43",
      },
    ],
  ],
  schema: z.object({
    inputMint: z
      .string()
      .describe("The token mint address of the token you want to swap"),
    outputMint: z
      .string()
      .describe("The token mint address of the token you want to swap to"),
    inputAmount: z
      .string()
      .describe(
        "The amount of the input token to swap (in SOL for SOL, or raw units for other tokens)"
      ),
  }),
  handler: async (keypair, inputs) => {
    console.log("trading");
    console.log(inputs);
    const { inputMint, outputMint, inputAmount } = inputs;

    const wallet = new SimpleWallet(keypair);

    let actionMessage = `[TOOL] Trading ${inputAmount} ${inputMint} for ${outputMint}, result: `;
    try {
      // Convert SOL amounts to lamports if input is SOL
      let amountToSend = inputAmount;
      if (inputMint === "So11111111111111111111111111111111111111112") {
        // Convert SOL to lamports
        amountToSend = (parseFloat(inputAmount) * 1e9).toString();
      }
      console.log(amountToSend);
      // Step 1: Generate order using Jupiter API
      const orderUrl = new URL("https://api.jup.ag/ultra/v1/order");
      orderUrl.searchParams.append("inputMint", inputMint);
      orderUrl.searchParams.append("outputMint", outputMint);
      orderUrl.searchParams.append("amount", amountToSend);
      orderUrl.searchParams.append("taker", keypair.publicKey.toBase58());

      const orderResponse = await fetch(orderUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.JUPITER_API_KEY || "",
        },
      });

      if (!orderResponse.ok) {
        throw new Error(`Jupiter order API error: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      console.log(orderData);
      const { transaction, requestId } = orderData;

      if (!transaction || !requestId) {
        throw new Error("Invalid response from Jupiter order API");
      }

      const txBytes = Buffer.from(transaction, "base64");
      const tx = VersionedTransaction.deserialize(txBytes);

      tx.sign([keypair]);

      const signedB64 = Buffer.from(tx.serialize()).toString("base64");

      // Step 2: Execute the order with signed transaction
      const executeResponse = await fetch(
        "https://api.jup.ag/ultra/v1/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.JUPITER_API_KEY || "",
          },
          body: JSON.stringify({
            signedTransaction: signedB64,
            requestId,
          }),
        }
      );

      if (!executeResponse.ok) {
        throw new Error(`Jupiter execute API error: ${executeResponse.status}`);
      }

      const executeData = await executeResponse.json();
      console.log(executeData);
      if (executeData.status === "Success") {
        const finalSol = await wallet.getBalance();
        // Return the results in the expected format
        actionMessage +=
          "success. Received " +
          executeData.outputAmountResult +
          " " +
          outputMint;
        await InjectMagicAPI.postAction(actionMessage);
        await InjectMagicAPI.whitelistToken(outputMint);
        return {
          newSolBalance: finalSol,
          status: "success",
          inputMint: inputMint,
          inputAmount: inputAmount, // Return original user input
          outputMint: outputMint,
          outputAmount: executeData.outputAmountResult,
        };
      }
      return { status: "error", message: executeData };
    } catch (error) {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "error",
        message: `Failed to swap tokens: ${error.message}`,
      };
    }
  },
};

export default tradeTokens;
