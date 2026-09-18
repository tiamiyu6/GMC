#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// An MCP server is just a program that answers two kinds of questions from an AI model:
// "what tools do you have?" and "please run this tool with these inputs."
// It never "thinks" itself -- it's a translator between the AI and some real capability
// (here: rolling dice and picking a fortune). Claude decides *when* to call these;
// this file only defines *what happens* when it does.

const server = new McpServer({
  name: "mcp-demo-server",
  version: "1.0.0",
});

const FORTUNES = [
  "A bug you fix today will teach you something tomorrow.",
  "Your next commit will be a good one.",
  "Refactor with courage; tests have your back.",
  "The answer you need is already in the docs.",
  "Ship it. Iterate later.",
];

server.registerTool(
  "roll_dice",
  {
    title: "Roll Dice",
    description:
      "Rolls a number of dice with a given number of sides and returns the results. " +
      "Example: sides=6, count=2 rolls two six-sided dice.",
    inputSchema: {
      sides: z
        .number()
        .int()
        .min(2)
        .max(1000)
        .default(6)
        .describe("Number of sides per die (e.g. 6 for a standard die)"),
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(1)
        .describe("How many dice to roll"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ sides, count }) => {
    const rolls = Array.from(
      { length: count },
      () => Math.floor(Math.random() * sides) + 1
    );
    const total = rolls.reduce((a, b) => a + b, 0);

    return {
      content: [
        {
          type: "text",
          text: `Rolled ${count}d${sides}: [${rolls.join(", ")}] = ${total}`,
        },
      ],
      structuredContent: { rolls, total },
    };
  }
);

server.registerTool(
  "get_fortune",
  {
    title: "Get Fortune",
    description: "Returns a short, random fortune-cookie-style message.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async () => {
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    return {
      content: [{ type: "text", text: fortune }],
    };
  }
);

server.registerTool(
  "flip_coin",
  {
    title: "Flip Coin",
    description: "Flips one or more coins and returns heads or tails for each.",
    inputSchema: {
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(1)
        .describe("How many coins to flip"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ count }) => {
    const flips = Array.from({ length: count }, () =>
      Math.random() < 0.5 ? "heads" : "tails"
    );

    return {
      content: [
        {
          type: "text",
          text: `Flipped ${count} coin(s): [${flips.join(", ")}]`,
        },
      ],
      structuredContent: { flips },
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-demo-server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting mcp-demo-server:", error);
  process.exit(1);
});
