import { z } from "zod";
import InjectMagicAPI from "../utils/api.js";
import OpenAI from "openai";
const client = new OpenAI();

// Works
const webSearch = {
  name: "WEB_SEARCH",
  similes: ["search the web", "search the internet", "ask a question"],
  description:
    "Search the web for information. You can type in a query and another agent will conduct a web search and return a text response summarizing the information.",
  examples: [
    [
      {
        input: {
          query: "What's the weather like today in NYC?",
        },
        output: {
          status: "success",
          response:
            "The weather today in NYC is sunny and a high of 70 degrees, with showers in the evening and a low of 50 degrees.",
        },
        explanation:
          "Successfully searched the web for the weather in NYC today",
      },
    ],
  ],
  schema: z.object({
    query: z
      .string()
      .describe(
        "The query to search for. Do not include a certain time period, we will use the current time period."
      ),
  }),
  handler: async (keypair, inputs) => {
    console.log("search");
    console.log(inputs.query);
    try {
      const { query } = inputs;

      await InjectMagicAPI.postAction("[TOOL] Searching for: " + query);

      const response = await client.responses.create({
        model: "gpt-5",
        tools: [{ type: "web_search" }],
        reasoning: { effort: "medium" },
        input: query,
      });
      console.log(response.output_text);
      return { status: "success", response: response.output_text };
    } catch (error) {
      return {
        status: "error",
        message: `Failed to search: ${error.message}`,
      };
    }
  },
};

export default webSearch;
