let tools = [];

function addAdditionalPropertiesRecursively(schema) {
  if (!schema || typeof schema !== "object") return;

  if (schema.additionalProperties === undefined && schema.properties) {
    schema.additionalProperties = true;
  }

  // mark all properties as required
  // if (schema.properties) {
  //   schema.required = [];
  //   for (const key of Object.keys(schema.properties)) {
  //     schema.required.push(key);
  //   }
  // }

  // Recurse into properties
  if (schema.properties && typeof schema.properties === "object") {
    for (const key of Object.keys(schema.properties)) {
      addAdditionalPropertiesRecursively(schema.properties[key]);
    }
  }
}

function ensureObjectSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: { additionalProperties: true } };
  }
  const out = { ...schema };
  if (out.type !== "object") out.type = "object";
  if (!out.properties || typeof out.properties !== "object") {
    out.properties = {};
  }
  if (out.required && !Array.isArray(out.required)) {
    out.required = [];
  }
  addAdditionalPropertiesRecursively(out);
  return out;
}

function sanitizeOperationId(raw) {
  let id = (raw || "op").replace(/{\w+}$/g, "id")
    .replace(/{\w+}/g, "")
    .replace(/\W+/g, "_")
    .replace(/_+/g, "_")
    .replace(/_$/g, "");
  if (!id) id = "op";
  if (id.length > 64) id = id.slice(0, 64);
  return id;
}


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
  tools = [];
  for (const path in swaggerSpec.paths) {
    const methods = swaggerSpec.paths[path];

    for (const method in methods) {
      const operation = methods[method];
      const name = sanitizeOperationId(
        operation.operationId || `${method}_${path}`
      );

      const description = operation.description || operation.summary || "No description provided";
      const parameters = operation.parameters || [];
      const shape = { type: "object", required: [], properties: {} };

      if (parameters.length > 0) {
        for (const param of parameters) {
          if (!param.name) continue;
          const paramSchema =
            (param.schema && typeof param.schema === "object")
              ? { ...param.schema }
              : { type: "string" };
          if (param.description) paramSchema.description = param.description;
          shape.properties[param.name] = paramSchema;
          if (param.required) shape.required.push(param.name);
        }
      }

      if (
        operation.requestBody &&
        operation.requestBody.content &&
        operation.requestBody.content["application/json"] && 
        operation.requestBody.content["application/json"].schema
      ) {
          let requestBodySchema = operation.requestBody.content["application/json"].schema;
          if (requestBodySchema['$ref']) {
            const refPath = requestBodySchema['$ref'].replace('#/components/schemas/', '');
            const refSchema = swaggerSpec.components.schemas[refPath];
            requestBodySchema = refSchema || {};
          }
          if (requestBodySchema && typeof requestBodySchema === "object") {
            if (requestBodySchema.required) {
              shape.required.push(...(requestBodySchema.required || []));
            }
            if (requestBodySchema.properties && typeof requestBodySchema.properties === "object") {
              cleanupSchema(requestBodySchema.properties);
              shape.properties = {
                ...shape.properties,
                ...requestBodySchema.properties
              };
            }
          }
      }

      if (Array.isArray(shape.required) && shape.required.length) {
        shape.required = [...new Set(shape.required)];
      } else {
        delete shape.required;
      }
      if (!shape.properties || Object.keys(shape.properties).length === 0) {
        delete shape.properties;
      }

      const parametersSchema = ensureObjectSchema(shape);

      // Build the tool
      tools.push({
        type: "function",
        name,
        description,
        parameters: parametersSchema
      });
    }
  }
  return tools;
}

const authTools = [
  {
    type: "function",
    name: "initAuth",
    description: `Initiates the authentication for a given user. This function will find the user by email and, of found, will send a auth code to the users' email that they have to enter later on.`,
    parameters: ensureObjectSchema({
      type: "object",
      required: ["email"],
      properties: {
        "email": {
          type: "string",
          description: "The user's email address, as provided by the user.",
        }
      },
    })
  },
  {
    type: "function",
    name: "authenticate",
    description: `Authenticates a given user. Receives the user's email and a auth code and returns an auth token.`,
    parameters: ensureObjectSchema({
      type: "object",
      required: ["email", "auth_code"],
      properties: {
        "email": {
          type: "string",
          description: "The user's email address, as provided by the user.",
        },
        "auth_code": {
          type: "string",
          description: "The auth code, as provided back by the user."
        }
      },
    }),
  },
  {
    type: "function",
    name: "getUserDataFromToken",
    description: "Gets user details - like their name and email from an auth token",
    parameters: ensureObjectSchema({
      type: "object",
      required: ["auth_token"],
      properties: {
        "auth_token": {
          type: "string",
          description: "the auth token"
        }
      },
    })
  }
]

export {authTools, loadTools};