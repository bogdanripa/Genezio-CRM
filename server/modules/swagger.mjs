import express from "express";
import swaggerJSDoc from 'swagger-jsdoc';
import mongooseToSwagger from 'mongoose-to-swagger';
import swaggerUi from 'swagger-ui-express';
import { Accounts, UserSummary, Employee, BasicInteraction, Interaction, ActionItem } from "../db.mjs";

const swaggerRouter = express.Router();

let swaggerSpec = null;

function loadSwagger() {
  if (swaggerSpec) return swaggerSpec;
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Genezio CRM APIs',
      version: '1.0.0',
      description: 'OpenAPI spec for Genezio CRM APIs',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // optional
        },
      },
      schemas: {
        // all your schemas here
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  };
  
  function addIdToSchema(schema) {
    if (!schema.properties.id) {
      schema.properties.id = { type: 'string' };
      if (!schema.required) {
        schema.required = [];
      }
      schema.required.push('id');
    }
    schema = cleanSchema(schema);
    return schema;
  }
  
  function cleanSchema(schema) {
    if (schema.properties._id) {
      delete schema.properties._id;
      if (schema.required && schema.required.includes('_id')) {
        schema.required = schema.required.filter((field) => field !== '_id');
      }
    }
    return schema;
  }
  
  function addSwaggerSchemas() {
    const accountSchema = addIdToSchema(mongooseToSwagger(Accounts));
    const userSummarySchema = addIdToSchema(mongooseToSwagger(UserSummary));
    const employeeSchema = addIdToSchema(mongooseToSwagger(Employee));
    const basicInteractionSchema = mongooseToSwagger(BasicInteraction);
    const interactionSchema = addIdToSchema(mongooseToSwagger(Interaction));
    const actionItemSchema = cleanSchema(mongooseToSwagger(ActionItem));
    
    swaggerDefinition.components.schemas = {
      Account: accountSchema,
      UserSummary: userSummarySchema,
      Employee: employeeSchema,
      BasicInteraction: basicInteractionSchema,
      Interaction: interactionSchema,
      ActionItem: actionItemSchema,
    };
  }
  
  addSwaggerSchemas();
  const options = {
    swaggerDefinition,
    apis: ['./app.mjs'], // adjust paths to where your JSDoc comments are
  };
  
  swaggerSpec = swaggerJSDoc(options);

  return swaggerSpec;
}

function loadSwaggerMiddleware(_req, _res, next) {
    loadSwagger();
    next();
}

swaggerRouter.use(loadSwaggerMiddleware, swaggerUi.serve, (req, res, next) => {
    return swaggerUi.setup(swaggerSpec)(req, res, next);
});

export { loadSwagger, swaggerRouter };