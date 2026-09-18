# mcp-demo-server

A tiny example MCP (Model Context Protocol) server, built to learn the shape of
one. It exposes two toy tools to any AI assistant that connects to it:

- `roll_dice({ sides, count })` — rolls dice, returns the results
- `get_fortune()` — returns a random fortune-cookie message

## What this is

An MCP server is not an AI. It's a small program that speaks a standard
protocol (JSON-RPC over stdio here) so an AI model like Claude can:

1. Ask "what tools do you have?" → server replies with a list and schemas
2. Say "run `roll_dice` with `{sides: 6, count: 2}`" → server runs real code
   and replies with the result

The AI decides *when* to call a tool. The server just does the work.

## Run it

```bash
npm install
npm run build
npm start
```

It talks JSON-RPC over stdin/stdout, so running it directly in a terminal
just looks like it's hanging — that's normal, it's waiting for a client.

## Try it with the MCP Inspector (visual tester)

```bash
npm run inspect
```

This opens a browser UI where you can list the tools and call them by hand.

## Connect it to Claude Code

Add to your MCP config (e.g. `.mcp.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "demo": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-demo-server/build/index.js"]
    }
  }
}
```

Restart Claude Code and ask it to roll some dice or get your fortune.
