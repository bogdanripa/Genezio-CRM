import express from "express";
import cors from "cors";
import { Users, Accounts, UserSummary, Employee, BasicInteraction, Interaction, ActionItem } from "./db.mjs";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import mongooseToSwagger from 'mongoose-to-swagger';
import emailAuth from './emailCodeAuth.mjs';
import {processAllAccounts} from "./cron.mjs";

import { getAllUsers } from "./modules/users.mjs";
import { getAllAccountsSummary, getAccountDetails, createAccount, updateAccount, deleteAccount, transferOwnership } from "./modules/accounts.mjs";
import { addActionItem, updateActionItem, completeActionItem } from "./modules/actionItems.mjs";
import { getAllTeamMembersOnAccount, addTeamMember, removeTeamMember } from "./modules/teamMembers.mjs"
import { addContact, updateContact, removeContact } from './modules/contacts.mjs';
import { getLatestInteractions, addInteraction, updateInteraction, deleteInteraction, unstickInteraction } from "./modules/interactions.mjs";
import { findByName } from "./modules/explore.mjs";
import { checkAuth } from "./modules/auth.mjs";

let swaggerSpec = null;

function loadSwagger() {
  if (swaggerSpec) return;
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
}

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth/email-code', emailAuth);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (colleagues) from my organization
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   address:
 *                     type: string
 */
app.get("/users", checkAuth, async function (req, res) {
  try {
    const users = await getAllUsers(req.userInfo);
    res.send(users);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts:
 *   get:
 *     summary: Get all accounts from my organization, including account_id, name, industry, status, description, owner, accountType, numberOfTeamMembers, numberOfContacts, numberOfInteractions, lastInteractionDate, updatedAt
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of account
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 */
app.get("/accounts/", checkAuth, async function (req, res) {
  try {
    const accountsSummary = await getAllAccountsSummary(req.userInfo);
    res.send(accountsSummary);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});
/**
 * @openapi
 * /accounts/{account_id}:
 *   get:
 *     summary: Get account details by account_id, including all interactions (meeting notes, calls, etc), action items, team members, and contacts
 *     tags: [Accounts]
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []  # Optional, if using auth
 *     responses:
 *       200:
 *         description: The account data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 */
app.get("/accounts/:account_id", checkAuth, async function(req, res) {
  try {
    const accountDetails = await getAccountDetails(req.userInfo, { account_id: req.params.account_id });
    res.send(accountDetails);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               website:
 *                 type: string
 *               description:
 *                 type: string
 *               industry:
 *                 type: string
 *                 enum:
 *                   - Technology
 *                   - Finance
 *                   - Healthcare
 *                   - Manufacturing
 *                   - Retail
 *                   - Education
 *                   - Conglomerate
 *                   - Other
 *               accountType:
 *                 type: string
 *                 enum: [Client, Partner]
 *               status:
 *                 type: string
 *                 enum: [Lead, Prospect, Qualified, negotiation, Closed Won, Closed Lost, Churned]
 *               metrics:
 *                 type: object
 *                 properties:
 *                   contractValue:
 *                     type: number
 *                   pocValue:
 *                     type: number
 *                   probability:
 *                     type: number
 *             required:
 *               - name
 *               - industry
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts", checkAuth, async function (req, res) {
  try {
    const account = await createAccount(req.userInfo, req.body);
    res.status(201).send(account);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}:
 *   put:
 *     summary: Update an account by account_id. Call this only if you need to update an existing account. None of the fields except for the account id are required.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               website:
 *                 type: string
 *               description:
 *                 type: string
 *               industry:
 *                 type: string
 *                 enum:
 *                   - Technology
 *                   - Finance
 *                   - Healthcare
 *                   - Manufacturing
 *                   - Retail
 *                   - Education
 *                   - Conglomerate
 *                   - Other
 *               accountType:
 *                 type: string
 *                 enum: [Client, Partner]
 *               status:
 *                 type: string
 *                 enum: [Lead, Prospect, Qualified, negotiation, Closed Won, Closed Lost, Churned]
 *               metrics:
 *                 type: object
 *                 properties:
 *                   contractValue:
 *                     type: number
 *                   pocValue:
 *                     type: number
 *                   probability:
 *                     type: number
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id", checkAuth, async function (req, res) {
  req.body.account_id = req.params.account_id;
  try {
    const account = await updateAccount(req.userInfo, req.body);
    res.status(200).send(account);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi 
 * /accounts/{account_id}:
 *   delete:
 *     summary: Delete an account by account_id
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       404:
 *         description: Account not found
 */
app.delete("/accounts/:account_id", checkAuth, async function (req, res) {
  try {
    await deleteAccount(req.userInfo, { account_id: req.params.account_id });
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers:
 *   get:
 *     summary: Gets the list of team members on an existing account
 *     tags: [Account Team Members]
 *     description: Gets the list of team members - including the account owner - on a specified account, identified by its account_id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The list of team members and a message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Text response
 *                 teamMembers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSummary'
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
app.get("/accounts/:account_id/teamMembers", checkAuth, async function (req, res) {
  try {
    const teamMembers = await getAllTeamMembersOnAccount(req.userInfo, req.params.account_id);
    res.send(teamMembers);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers:
 *   post:
 *     summary: Add a team member to an existing account, identified by its account_id
 *     tags: [Account Team Members]
 *     description: Adds a user as a team member to the specified account. The user must already exist in the system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The userId of the user to be added as a team member
 *     responses:
 *       201:
 *         description: User added to the team members successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSummary'
 *       404:
 *         description: Account or user not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/teamMembers", checkAuth, async function (req, res) {
  try {
    const teamMember = await addTeamMember(req.userInfo, { account_id: req.params.account_id, id: req.body.id });
    res.status(201).send(teamMember);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers/{team_member_id}:
 *   delete:
 *     summary: Remove a team member from an account
 *     tags: [Account Team Members]
 *     description: Deletes a user from the team members list of the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: team_member_id
 *         in: path
 *         required: true
 *         description: The ID of the user to be removed from team members
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Team member removed successfully
 *       404:
 *         description: Account or team member not found
 *       401:
 *         description: Unauthorized
 */
app.delete("/accounts/:account_id/teamMembers/:team_member_id", checkAuth, async function (req, res) {
  try {
    await removeTeamMember(req.userInfo, { account_id: req.params.account_id, team_member_id: req.params.team_member_id });
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/transferOwnership:
 *   put:
 *     summary: Transfers ownership of an account to another user. Call this only if you need to transfer ownership of an existing account.
 *     tags: [Account Team Members]
 *     description: Transfers ownership of an account to another user. Call this only if you need to transfer ownership of an existing account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The userId of the new owner
 *     responses:
 *       204:
 *         description: Ownership transferred successfully
 *       404:
 *         description: Account or user not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/transferOwnership", checkAuth, async function (req, res) {
  try {
    await transferOwnership(req.userInfo, {account_id: req.params.account_id, id: req.params.id});
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts:
 *   post:
 *     summary: Add a contact to an account
 *     tags: [Account Contacts]
 *     description: Adds a new contact (employee) to the specified account. Contact name and role are required fields.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/contacts", checkAuth, async function (req, res) {
  if (!req.body.name || !req.body.role) {
    return res.status(400).send("Name and role are required fields.");
  }
  try {
    req.body.account_id = req.params.account_id;
    const contact = await addContact(req.userInfo, req.body);
    res.status(201).send(contact);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts/{contact_id}:
 *   put:
 *     summary: Update an existing contact
 *     tags: [Account Contacts]
 *     description: Updates the contact (employee) details associated with the specified account. The account and countact IDs are the only required fields.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: contact_id
 *         in: path
 *         required: true
 *         description: The ID of the contact to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Account or contact not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/contacts/:contact_id", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.contact_id = req.params.contact_id;
    const contact = await updateContact(req.userInfo, req.body);
    res.send(contact);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts/{contact_id}:
 *   delete:
 *     summary: Delete a contact from an account
 *     tags: [Account Contacts]
 *     description: Removes an existing contact (employee) from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: contact_id
 *         in: path
 *         required: true
 *         description: The ID of the contact to remove
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Contact removed successfully
 *       404:
 *         description: Account or contact not found
 *       401:
 *         description: Unauthorized
 */
app.delete("/accounts/:account_id/contacts/:contact_id", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.contact_id = req.params.contact_id;
    await removeContact(req.userInfo, req.body);
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions:
 *   post:
 *     summary: Create a new interaction
 *     tags: [Account Interactions]
 *     description: Adds a new interaction to the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BasicInteraction'
 *     responses:
 *       201:
 *         description: Interaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/interactions", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    const interaction = await addInteraction(req.userInfo, req.body);
    res.status(201).send(interaction);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}:
 *   put:
 *     summary: Update an existing interaction
 *     tags: [Account Interactions]
 *     description: Updates the details of an existing interaction within the specified account. None of the fields except for the interaction id are required.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The ID of the interaction to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BasicInteraction'
 *     responses:
 *       200:
 *         description: Interaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Account or interaction not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/interactions/:interaction_id", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.interaction_id = req.params.interaction_id;
    const interaction = await updateInteraction(req.userInfo, req.body);
    res.send(interaction);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}:
 *   delete:
 *     summary: Delete an interaction
 *     tags: [Account Interactions]
 *     description: Removes an interaction from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The ID of the interaction to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Interaction deleted successfully
 *       404:
 *         description: Account or interaction not found
 *       401:
 *         description: Unauthorized
 */
app.delete("/accounts/:account_id/interactions/:interaction_id", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.interaction_id = req.params.interaction_id;
    await deleteInteraction(req.userInfo, req.body);
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/:
 *   post:
 *     summary: Adds an action item
 *     tags: [Account Action Items]
 *     description: Adds an action item to an account. Title and due date are required fields. Optionally, you can assign the action item to a team member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assignedTo:
 *                 type: object
 *                 required:
 *                   - id
 *                 properties:
 *                   id:
 *                     type: string
 *     responses:
 *       200:
 *         description: Action item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionItem'
 *       404:
 *         description: Account or assigned user not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/actionItems/", checkAuth, async function (req, res) {
  if (!req.body.title || !req.body.dueDate) {
    return res.status(400).send("Title and due date are required fields.");
  }
  try {
    req.body.account_id = req.params.account_id;
    const actionItem = await addActionItem(req.userInfo, req.body);
    res.status(201).send(actionItem);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/{action_item_id}:
 *   put:
 *     summary: Update an action item
 *     tags: [Account Action Items]
 *     description: Updates the fields of a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: action_item_id
 *         in: path
 *         required: true
 *         description: The ID of the action item to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assignedTo:
 *                 type: object
 *                 required:
 *                   - id
 *                 properties:
 *                   id:
 *                     type: string 
 *     responses:
 *       200:
 *         description: Action item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionItem'
 *       404:
 *         description: Account or action item not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/actionItems/:action_item_id", checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.action_item_id = req.params.action_item_id;
    const actionItem = await updateActionItem(req.userInfo, req.body);
    res.send(actionItem);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/{action_item_id}/complete:
 *   put:
 *     summary: Completes an action item
 *     tags: [Account Action Items]
 *     description: Completes a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: action_item_id
 *         in: path
 *         required: true
 *         description: The ID of the action item to update
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action item completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionItem'
 *       404:
 *         description: Account or action item not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/actionItems/:action_item_id/complete", checkAuth, async function (req, res) {
  try {
    const actionItem = await completeActionItem(req.userInfo, { account_id: req.params.account_id, action_item_id: req.params.action_item_id});
    res.send(actionItem);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}/unstick:
 *   put:
 *     summary: Unstick an interaction (this was most likely a sticky note)
 *     tags: [Account Interactions]
 *     description: Sets the `isSticky` flag of the specified interaction to `false`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The ID of the interaction to unstick
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interaction unstick successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Account or interaction not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/interactions/:interaction_id/unstick", checkAuth, async function (req, res) {
  try {
    const interaction = await unstickInteraction(req.userInfo, { account_id: req.params.account_id, interaction_id: req.params.interaction_id });
    res.send(interaction);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /interactions/latest:
 *   get:
 *     summary: Get latest interactions across all accounts
 *     tags: [Accounts]
 *     description: Returns a list of recent interactions across all accounts, including the creator, type, account name, and creation time.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of recent interactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   text:
 *                     type: string
 *                     description: A summary of the interaction (e.g. "John added a call to Acme Inc")
 *                   accountId:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
app.get("/interactions/latest", checkAuth, async function (req, res) {
  try {
    const latestInteractions = await getLatestInteractions(req.userInfo);
    res.send(latestInteractions);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /find:
 *   get:
 *     summary: Find accounts, contacts, team members, interactions, and action items by name
 *     tags: [Accounts]
 *     description: Free text search for accounts, contacts, team members, interactions, and action items by name.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: query
 *         required: true
 *         description: The name to search for in accounts, contacts, team members, interactions, and action items.
 *         schema:
 *           type: string
 */
app.get("/find", checkAuth, async function (req, res) {
  const name = req.query.name;
  if (!name) {
    return res.status(400).send("Query parameter 'name' is required");
  }
  try {
    const results = await findByName(req.userInfo, { name });  
    res.send(results);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

app.get('/docs/swagger.json', loadSwagger, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(swaggerSpec, null, 2));
});

app.post('/cron', async (req, res) => {
  console.log("Running cron job...");
  // Here you can call your cron functions
  const accounts = await Accounts.find({}).lean();
  const users = await Users.find().lean();
  const userMessages = await processAllAccounts(users, accounts);
  const promises = [];
  for (const userId in userMessages) {
    const { phone, email, messages } = userMessages[userId];
    if (messages.length === 0) continue;
    if (!phone) {
      console.warn(`No phone number found for user ${userId}.`);
      continue;
    }
    console.log(`Working on user ${userId} (phone: ${phone}):`);
    promises.push(
      sendNotification(phone, messages.join('\n'))
        .then(() => console.log(`Sent ${messages.length} messages to ${phone}`))
        .catch((err) => console.error(`Failed to send messages to ${phone}:`, err))
    );
  }
  await Promise.all(promises);
  res.send("Cron job executed successfully");
});

app.use('/docs', loadSwagger, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(8080, () => {
  console.log(
    "Server is running"
  );
});