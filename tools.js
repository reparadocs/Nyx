import balances from "./tools/balances.js";
import createAndBuy from "./tools/createAndBuy.js";
import buy from "./tools/buy.js";
import sell from "./tools/sell.js";
import twitter from "./tools/twitter.js";
import retrieveBounties from "./tools/retrieveBounties.js";
import createBounty from "./tools/createBounty.js";
import searchToken from "./tools/searchToken.js";
import memory from "./tools/memory.js";
import tradeTokens from "./tools/trade.js";
import { tool } from "@langchain/core/tools";
import {
  SolanaAgentKit,
  createLangchainTools,
  KeypairWallet,
} from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import InjectMagicAPI from "./utils/api.js";

const TOOLS = [
  //balances,
  createAndBuy,
  buy,
  sell,
  memory,
  twitter,
  searchToken,
  tradeTokens,
  retrieveBounties,
  createBounty,
];

const generateSingleTool = (
  handler,
  name,
  description,
  similes,
  examples,
  schema,
  keypair
) => {
  return tool(
    async (inputs) => {
      const output = JSON.stringify(await handler(keypair, inputs));
      console.log(output);
      return output;
    },
    {
      name: name,
      description: `
    ${description}

    Similes: ${similes.map(
      (simile) => `
      ${simile}
    `
    )}

    Examples: ${examples.map(
      (example) => `
      Input: ${JSON.stringify(example[0].input)}
      Output: ${JSON.stringify(example[0].output)}
      Explanation: ${example[0].explanation}
    `
    )}`,
      schema: schema,
    }
  );
};

const generateTools = (keypair) => {
  const wallet = new KeypairWallet(keypair, process.env.RPC_URL);

  const solanaKit = new SolanaAgentKit(wallet, process.env.RPC_URL, {}).use(
    TokenPlugin
  );
  const _transferTool = solanaKit.actions.filter(
    (action) => action.name === "TRANSFER"
  )[0];
  const transferHandler = async (keypair, inputs) => {
    console.log("transferring");
    let result;
    try {
      result = await _transferTool.handler(solanaKit, inputs);
    } catch (error) {
      console.error("Error transferring:", error);
      return {
        status: "error",
        message: `Failed to transfer: ${error.message}`,
      };
    }
    const actionMessage = `[TOOL] Transfer ${result.amount} ${
      result.mint ? result.mint : "SOL"
    } to ${result.recipient}, result: ${result.status}`;
    await InjectMagicAPI.postAction(actionMessage);
    return result;
  };

  const transferTool = generateSingleTool(
    transferHandler,
    _transferTool.name,
    _transferTool.description,
    _transferTool.similes,
    _transferTool.examples,
    _transferTool.schema,
    keypair
  );
  const customTools = TOOLS.map((t) =>
    generateSingleTool(
      t.handler,
      t.name,
      t.description,
      t.similes,
      t.examples,
      t.schema,
      keypair
    )
  );
  return [...customTools, transferTool];
};

export default generateTools;
