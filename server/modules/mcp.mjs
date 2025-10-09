import express from "express";
import { JSONRPCServer } from "json-rpc-2.0";
import * as authModule from "./auth.mjs";
import { loadTools, authTools } from "../tools.mjs";
import { loadSwagger } from './swagger.mjs'

const mcpRouter = express.Router();
let tools = [];

let toolsMap = {};
function loadMCPTools(tm) {
    toolsMap = tm;
}

const rpc = new JSONRPCServer();
rpc.addMethod("initialize", ({ protocolVersion, clientInfo }) => ({
  protocolVersion,
  capabilities: { tools: {} },
  serverInfo: { name: "MyMCPServer", version: "1.0.0" },
}));

// Notify client ready
rpc.addMethod("notifications/initialized", () => null);

// 2️⃣ tools/list (tool discovery)
rpc.addMethod("tools/list", function ({ name, arguments: args }) {
    args = args ?? {};
    if (args.userInfo) {
        if (tools.length == 0) {
            const swaggerSpec = loadSwagger();
            tools = loadTools(swaggerSpec);
        }
        return {
            tools
        }
    } else {
        return  {
            tools: authTools
        }
    }
});

function httpStatusToJsonRpcErrorCode(status) {
  if (status >= 500) {
      return -32099; // Internal Server Error
  }
  switch (status) {
      case 400: return -32000; // Bad Request
      case 401: return -32001; // Unauthorized
      case 402: return -32002; // Payment Required (rare)
      case 403: return -32003; // Forbidden
      case 404: return -32004; // Not Found
      case 405: return -32005; // Method Not Allowed
      case 408: return -32008; // Request Timeout
      case 409: return -32009; // Conflict
      case 410: return -32010; // Gone
      case 429: return -32029; // Too Many Requests
      default:
          if (status >= 400 && status < 500) {
              return -32040; // Generic client error
          }
          return -32099; // Generic server error
  }
}
// 3️⃣ tools/call (invoke a tool)
rpc.addMethod("tools/call", async function ({ name, arguments: args }) {
    args = args ?? {};
    console.log(`tools/call calling ${name} with ${JSON.stringify(args)}`);
    let toolObj = null; 
    if (args.userInfo) {
        if (tools.length === 0) {
            const swaggerSpec = loadSwagger();
            tools = loadTools(swaggerSpec);
        }
        toolObj = tools.find(tool => tool.name === name);
    } else {
        toolObj = authTools.find(tool => tool.name === name);
    }

  if (!toolObj || !toolsMap[name]) {
    console.error(`tools/call error in ${name}: Tool not found`);
    throw {
          code: -32601,
          message: `Tool not found: ${name}`
      };
  }

  try {
        const result = await toolsMap[name](args);
        console.log(`tools/call tesult: ${JSON.stringify(result)}`)
        const content = [(
            typeof result === "string"
            ? { type: "text", text: result }
            : { type: "json", json: result ?? null }
        )];
  
        return { content };
    } catch (err) {
        console.error(`tools/call error in ${name}: ${JSON.stringify(err)}`);
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: err.message || "Internal Server Error"
                }
            ]
        };
  }
});

mcpRouter.post("/", async (req, res) => {
  const json = req.body;
  if (!json.params) json.params = {};
  if (!json.params.arguments) json.params.arguments = {};
  if (req.headers?.authorization) {
    await authModule.checkAuth(req, res);
    if (!req.userInfo) return;
    json.params.arguments.userInfo = req.userInfo;
  }

  const response = await rpc.receive(json);
  if (response) res.json(response);
  else res.sendStatus(204);
});

export { loadMCPTools, mcpRouter }