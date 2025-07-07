const tools = [];

function cleanupSchema(obj) {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i];
      if (typeof item === "object" && item !== null) {
        cleanupSchema(item);
      }
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const key of Object.keys(obj)) {
      const val = obj[key];

      // Remove or fix invalid 'required'
      if (key === "required") {
        if (!Array.isArray(val)) {
          delete obj[key];
          continue;
        }
      }

      // Recurse into nested objects
      if (typeof val === "object" && val !== null) {
        cleanupSchema(val);
      }
    }
  }
}

function loadTools(swaggerSpec) {
  for (const path in swaggerSpec.paths) {
    const methods = swaggerSpec.paths[path];

    for (const method in methods) {
      const operation = methods[method];
      let operationId = operation.operationId || `${method}_${path}`;
      operationId = operationId.replace(/{\w+}$/g, "id");
      operationId = operationId.replace(/{\w+}/g, "");
      operationId = operationId.replace(/\W+/g, "_");
      operationId = operationId.replace(/_+/g, '_');
      operationId = operationId.replace(/_$/g, '');
      const summary = operation.summary;
      const description = operation.description;
      const parameters = operation.parameters || [];
      const shape = {
        required: [],
        properties: {}
      };

      if (parameters.length > 0) {
        shape.type = "object";
        for (const param of parameters) {
          if (!param.name) continue;
          const paramSchema = param.schema || { type: "string" };
          shape.properties[param.name] = paramSchema;
          if (param.description)
            shape.properties[param.name].description = param.description;
          if (param.required)
            shape.required.push(param.name);
        }
      }

      if (
        operation.requestBody &&
        operation.requestBody.content &&
        operation.requestBody.content["application/json"] && 
        operation.requestBody.content["application/json"].schema
      ) {
          shape.type = "object";
          let requestBodySchema = operation.requestBody.content["application/json"].schema;
          if (requestBodySchema['$ref']) {
            const refPath = requestBodySchema['$ref'].replace('#/components/schemas/', '');
            const refSchema = swaggerSpec.components.schemas[refPath];
            requestBodySchema = refSchema || {};
          }
          shape.required.push(...(requestBodySchema.required || []));
          cleanupSchema(requestBodySchema.properties)
          shape.properties = {
            ...shape.properties,
            ...requestBodySchema.properties
          };
      }

      if (shape.required.length === 0)
        delete shape.required;

      if (Object.keys(shape.properties).length === 0)
        delete shape.properties;

      const inputSchema = shape;

      // 5. Build the tool
      const tool = {
        name: operationId,
        title: summary,
        description: description
      };
      if (Object.keys(inputSchema).length > 0)
        tool.inputSchema = inputSchema;

      tools.push(tool);
    }
  }
  return tools;
}

const authTools = [
  {
    name: "initAuth",
    title: "Initiates the authentication for a given user",
    description: `Initiates the authentication for a given user. This function will find the user by email and, of found, will send a auth code to the users' email that they have to enter later on.`,
    inputSchema: {
      type: "object",
      required: ["email"],
      properties: {
        "email": {
          type: "string",
          description: "The user's email address, as provided by the user.",
        }
      },
      "type": "object"
    }
  },
  {
    name: "authenticate",
    title: "Authenticates a given user",
    description: `Authenticates a given user. Receives the user's email and a auth code and returns a auth token.`,
    inputSchema: {
      type: "object",
      required: ["email", "authCode"],
      properties: {
        "email": {
          type: "string",
          description: "The user's email address, as provided by the user.",
        },
        "authCode": {
          type: "string",
          description: "The auth code, as provided back by the user."
        }
      }
    }
  }
]

export {authTools, loadTools};