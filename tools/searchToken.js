import { z } from "zod";
import InjectMagicAPI from "../utils/api.js";
// Works
const searchToken = {
  name: "SEARCH_TOKEN",
  similes: [
    "get token price",
    "search tokens",
    "token value",
    "get price in usd",
    "get token address",
    "get token data",
  ],
  description:
    "Search for tokens and get relevant details such as price in USD, token mint address, and market cap.",
  examples: [
    [
      {
        input: {
          query: "dogwifhat",
        },
        output: [
          {
            mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
            holderCount: 2342610,
            totalSupply: 603724547.3627878,
            mcap: 77275352037.79674,
            name: "dogwifhat",
            symbol: "$WIF",
            usdPrice: 145.47114211747515,
          },
        ],
        explanation: "Search for the token dogwifhat and get relevant details",
      },
    ],
  ],
  schema: z.object({
    query: z
      .string()
      .describe(
        "The search query for token. Can be the name, symbol, or mint address."
      ),
  }),
  handler: async (keypair, inputs) => {
    let actionMessage = `[TOOL] Searching for token ${inputs.query}, result: `;
    try {
      console.log("searching");
      console.log(inputs);
      const { query } = inputs;
      console.log(query);
      // Call Jupiter API to search for tokens
      const response = await fetch(
        `https://api.jup.ag/ultra/v1/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.JUPITER_API_KEY || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();

      // Get the first 5 search results
      const tokens = data.slice(0, 5);

      const results = tokens.map((token) => ({
        mintAddress: token.id,
        holderCount: token.holderCount,
        totalSupply: token.totalSupply,
        mcap: token.mcap,
        name: token.name,
        symbol: token.symbol || "",
        usdPrice: token.usdPrice,
      }));

      actionMessage += "success";
      await InjectMagicAPI.postAction(actionMessage);

      console.log(results);

      return results;
    } catch (error) {
      actionMessage += "failed";
      await InjectMagicAPI.postAction(actionMessage);
      return {
        status: "error",
        message: `Failed to search tokens: ${error.message}`,
      };
    }
  },
};

export default searchToken;
