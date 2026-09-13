import * as readline from "readline";
import { JsonRpcRequest, JsonRpcResponse } from "./protocol";
import { handleMcpToolCall, MCP_PROMPTS, MCP_TOOLS } from "./tools";

const SERVER_INFO = {
  name: "nexustrader-mcp",
  version: "1.0.0",
  protocolVersion: "2024-11-05"
};

function sendResponse(response: JsonRpcResponse) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function sendError(id: string | number, code: number, message: string) {
  sendResponse({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  });
}

async function handleRequest(request: JsonRpcRequest) {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              prompts: {}
            },
            serverInfo: SERVER_INFO
          }
        });
        break;

      case "notifications/initialized":
        // Notification, no response required
        break;

      case "tools/list":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            tools: MCP_TOOLS
          }
        });
        break;

      case "tools/call": {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          sendError(id, -32602, "Missing tool name in params");
          return;
        }

        const start = Date.now();
        const output = await handleMcpToolCall(toolName, toolArgs);
        const duration = Date.now() - start;

        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof output === "string" ? output : JSON.stringify(output, null, 2)
              }
            ],
            _meta: { executionTimeMs: duration }
          }
        });
        break;
      }

      case "prompts/list":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            prompts: MCP_PROMPTS
          }
        });
        break;

      case "prompts/get": {
        const promptName = params?.name;
        const prompt = MCP_PROMPTS.find((p) => p.name === promptName);
        if (!prompt) {
          sendError(id, -32602, `Prompt not found: ${promptName}`);
          return;
        }
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            description: prompt.description,
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Execute an in-depth audit using NexusTrader MCP tools: analyze market telemetry, compute multi-timeframe indicators, check derivatives squeeze metrics, and run a 30-day strategy backtest.`
                }
              }
            ]
          }
        });
        break;
      }

      case "ping":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {}
        });
        break;

      default:
        sendError(id, -32601, `Method not found: ${method}`);
        break;
    }
  } catch (err: any) {
    sendError(id, -32603, err.message || "Internal MCP error");
  }
}

export function startMcpStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const request = JSON.parse(trimmed) as JsonRpcRequest;
      handleRequest(request);
    } catch {
      sendResponse({
        jsonrpc: "2.0",
        id: 0,
        error: { code: -32700, message: "Parse error - invalid JSON" }
      });
    }
  });

  process.stderr.write(`[NexusTrader-MCP] Stdio server listening. Protocol v2024-11-05 ready.\n`);
}

if (require.main === module) {
  startMcpStdioServer();
}
