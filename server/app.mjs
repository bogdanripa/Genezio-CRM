import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { Users, Accounts} from "./db.mjs";
import {processAllAccounts} from "./cron.mjs";
import * as userModule from "./modules/users.mjs";
import * as accountModule from "./modules/accounts.mjs";
import * as actionItemsModule from "./modules/actionItems.mjs";
import * as teamMembersModule from "./modules/teamMembers.mjs";
import * as cotactsModule from './modules/contacts.mjs';
import * as interactionModule from "./modules/interactions.mjs";
import * as exploreModule from "./modules/explore.mjs";
import * as authModule from "./modules/auth.mjs";
import emailAuthRouter from './emailCodeAuth.mjs';
import {swaggerRouter, loadSwagger} from './modules/swagger.mjs'
import { loadMCPTools, mcpRouter } from "./modules/mcp.mjs";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use('/auth/email-code', emailAuthRouter);
app.use('/docs', swaggerRouter);

const toolsMap = {
  ...authModule,
  ...userModule,
  ...accountModule,
  ...actionItemsModule,
  ...teamMembersModule,
  ...cotactsModule,
  ...interactionModule,
  ...exploreModule
}
loadMCPTools(toolsMap);
app.use('/mcp', mcpRouter)


app.put("/finalizeSignUp", authModule.checkAuth, async function (req, res) {
  try {
    await authModule.finalizeSignUp({email: req.userInfo.email, s: req.body.s});
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});


/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (colleagues) from my organization
 *     tags: [Users]
 *     operationId: getAllUsers
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
app.get("/users", authModule.checkAuth, async function (req, res) {
  try {
    const users = await userModule.getAllUsers({ userInfo: req.userInfo });
    res.send(users);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts:
 *   get:
 *     operationId: getAllAccountsSummary
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
app.get("/accounts/", authModule.checkAuth, async function (req, res) {
  try {
    const accountsSummary = await accountModule.getAllAccountsSummary({ userInfo: req.userInfo });
    res.send(accountsSummary);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});
/**
 * @openapi
 * /accounts/{account_id}:
 *   get:
 *     operationId: getAccountDetails
 *     summary: Get account details by account_id, including all interactions (meeting notes, calls, etc), action items, team members, and contacts
 *     tags: [Accounts]
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.get("/accounts/:account_id", authModule.checkAuth, async function(req, res) {
  try {
    const accountDetails = await accountModule.getAccountDetails({ userInfo: req.userInfo, account_id: req.params.account_id });
    res.send(accountDetails);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts:
 *   post:
 *     operationId: createAccount
 *     summary: This will create a new account. Name and Industry are required fields, the rest are optional. accountType defaults to Client and can be either Client or Partner.
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
app.post("/accounts", authModule.checkAuth, async function (req, res) {
  try {
    req.body.userInfo = req.userInfo;
    const account = await accountModule.createAccount(req.body);
    res.status(201).send(account);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}:
 *   put:
 *     summary: Update an account by account_id. Call this only if you need to update an existing account. None of the fields except for the Account ID are required.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.put("/accounts/:account_id", authModule.checkAuth, async function (req, res) {
  req.body.account_id = req.params.account_id;
  try {
    req.body.userInfo = req.userInfo;
    const account = await accountModule.updateAccount(req.body);
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
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       404:
 *         description: Account not found
 */
app.delete("/accounts/:account_id", authModule.checkAuth, async function (req, res) {
  try {
    await accountModule.deleteAccount({ userInfo: req.userInfo, account_id: req.params.account_id });
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers:
 *   get:
 *     operationId: getAllTeamMembersOnAccount
 *     summary: Gets the list of team members on an existing account
 *     tags: [Account Team Members]
 *     description: Gets the list of team members - including the account owner - on a specified account, identified by its account_id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.get("/accounts/:account_id/teamMembers", authModule.checkAuth, async function (req, res) {
  try {
    const teamMembers = await teamMembersModule.getAllTeamMembersOnAccount(req.userInfo, req.params.account_id);
    res.send(teamMembers);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers:
 *   post:
 *     operationId: addTeamMember
 *     summary: Add a team member to an existing account, identified by its account_id
 *     tags: [Account Team Members]
 *     description: Adds a user as a team member to the specified account. The user must already exist in the system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team_member_id
 *             properties:
 *               team_member_id:
 *                 type: string
 *                 description: The team member id of the user to be added as a team member
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
app.post("/accounts/:account_id/teamMembers", authModule.checkAuth, async function (req, res) {
  try {
    const teamMember = await teamMembersModule.addTeamMember({ userInfo: req.userInfo, account_id: req.params.account_id, team_member_id: req.body.team_member_id });
    res.status(201).send(teamMember);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/teamMembers/{team_member_id}:
 *   delete:
 *     operationId: removeTeamMember
 *     summary: Remove a team member from an account
 *     tags: [Account Team Members]
 *     description: Deletes a user from the team members list of the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.delete("/accounts/:account_id/teamMembers/:team_member_id", authModule.checkAuth, async function (req, res) {
  try {
    await teamMembersModule.removeTeamMember({ userInfo: req.userInfo, account_id: req.params.account_id, team_member_id: req.params.team_member_id });
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/transferOwnership:
 *   put:
 *     operationId: transferOwnership
 *     summary: Transfers ownership of an account to another user. Call this only if you need to transfer ownership of an existing account.
 *     tags: [Account Team Members]
 *     description: Transfers ownership of an account to another user. Call this only if you need to transfer ownership of an existing account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.put("/accounts/:account_id/transferOwnership", authModule.checkAuth, async function (req, res) {
  try {
    await accountModule.transferOwnership({ userInfo: req.userInfo, account_id: req.params.account_id, id: req.body.id});
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts:
 *   post:
 *     operationId: addContact
 *     summary: Add a contact to an account
 *     tags: [Account Contacts]
 *     description: Adds a new contact (employee) to the specified account. Name and role are required fields.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
 *                 description: The name of the contact
 *               role:
 *                 type: string
 *                 description: The contact's role in the company
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *                 description: Notes you might have on the contact
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
app.post("/accounts/:account_id/contacts", authModule.checkAuth, async function (req, res) {
  if (!req.body.name || !req.body.role) {
    return res.status(400).send("Name and role are required fields.");
  }
  try {
    req.body.account_id = req.params.account_id;
    req.body.userInfo = req.userInfo;
    const contact = await cotactsModule.addContact(req.body);
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
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.put("/accounts/:account_id/contacts/:contact_id", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.contact_id = req.params.contact_id;
    req.body.userInfo = req.userInfo;
    const contact = await cotactsModule.updateContact(req.body);
    res.send(contact);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts/{contact_id}:
 *   delete:
 *     operationId: removeContact
 *     summary: Delete a contact from an account
 *     tags: [Account Contacts]
 *     description: Removes an existing contact (employee) from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.delete("/accounts/:account_id/contacts/:contact_id", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.contact_id = req.params.contact_id;
    req.body.userInfo = req.userInfo;
    await cotactsModule.removeContact(req.body);
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/contacts/{contact_id}/field:
 *   put:
 *     operationId: updateContactField
 *     summary: Update an existing contact's field
 *     tags: [Account Contacts]
 *     description: Update a specific field for the contact (employee) details associated with the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
 *               field_name:
 *                 type: string
 *                 enum: ["name", "role", "email", "phone", "notes"]
 *                 description: The field name to update
 *               field_value:
 *                 type: string
 *                 description: The new value for the field
 *             required:
 *               - field_name
 *               - field_value
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
app.put('/accounts/{account_id}/contacts/{contact_id}/field', authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.contact_id = req.params.contact_id;
    req.body.userInfo = req.userInfo;
    const contact = await cotactsModule.updateContactField(req.body);
    res.send(contact);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions:
 *   post:
 *     operationId: addInteraction
 *     summary: Create a new interaction
 *     tags: [Account Interactions]
 *     description: Adds a new interaction to the specified Account ID. You can specify the type, timestamp, title, description and attendees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.post("/accounts/:account_id/interactions", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.userInfo = req.userInfo;
    const interaction = await interactionModule.addInteraction(req.body);
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
 *     description: Updates the details of an existing interaction id within the specified Account ID. None of the fields except for the Account ID and the interaction id are required, but you can specify the type, timestamp, title, description and attendees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The interaction id. You can get a list of interaction ids by calling getAccountDetails with the Account ID
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
app.put("/accounts/:account_id/interactions/:interaction_id", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.interaction_id = req.params.interaction_id;
    req.body.userInfo = req.userInfo;
    const interaction = await interactionModule.updateInteraction(req.body);
    res.send(interaction);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}/attendees:
 *   post:
 *     operationId: addInteractionAttendee
 *     summary: Add an attendee to an interaction
 *     tags: [Account Interactions]
 *     description: Adds an attendee to the specified interaction within the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The interaction id. You can get a list of interaction ids by calling getAccountDetails with the Account ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attendee:
 *                 type: string
 *                 description: The attendee to add (can be a team member id, contact id, name, or email).
 *             required: ["attendee"]
 *     responses:
 *       200:
 *         description: Attendee added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Invalid attendee or attendee already exists
 *       404:
 *         description: Account or interaction not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/interactions/:interaction_id/attendees", authModule.checkAuth, async function (req, res) {
  try {
    const userInfo = req.userInfo;
    const { account_id, interaction_id } = req.params;
    const { attendee } = req.body;
    if (!attendee) {
      return res.status(400).send("Attendee is required");
    }
    const interaction = await interactionModule.addAttendee({ userInfo, account_id, interaction_id, attendee });
    res.send(interaction);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}/attendees/{attendee_id}:
 *   delete:
 *     operationId: removeInteractionAttendee
 *     summary: Remove an attendee from an interaction
 *     tags: [Account Interactions]
 *     description: Removes an attendee from the specified interaction within the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The interaction id. You can get a list of interaction ids by calling getAccountDetails with the Account ID
 *         schema:
 *           type: string
 *       - name: attendee_id
 *         in: path
 *         required: true
 *         description: The attendee id to remove.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendee removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Account, interaction, or attendee not found
 *       401:
 *         description: Unauthorized
 */
app.delete("/accounts/:account_id/interactions/:interaction_id/attendees/:attendee_id", authModule.checkAuth, async function (req, res) {
  try {
    const userInfo = req.userInfo;
    const { account_id, interaction_id, attendee_id } = req.params;
    const interaction = await interactionModule.removeAttendee({ userInfo, account_id, interaction_id, attendee_id });
    res.send(interaction);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});


/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}:
 *   delete:
 *     operationId: deleteInteraction
 *     summary: Delete an interaction
 *     tags: [Account Interactions]
 *     description: Removes an interaction from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The interaction id. You can get a list of interaction ids by calling getAccountDetails with the Account ID
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
app.delete("/accounts/:account_id/interactions/:interaction_id", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.interaction_id = req.params.interaction_id;
    req.body.userInfo = req.userInfo;
    await interactionModule.deleteInteraction(req.body);
    res.status(204).send();
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}/field:
 *   put:
 *     operationId: updateInteractionField
 *     summary: Update a single field of an interaction
 *     tags: [Account Interactions]
 *     description: Update a specific field (title, timestamp, or description) of an interaction for the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
 *             type: object
 *             required:
 *               - field_name
 *               - field_value
 *             properties:
 *               field_name:
 *                 type: string
 *                 enum: ["title", "timestamp", "description"]
 *                 description: The name of the field to update. Only "title", "timestamp", or "description" are allowed.
 *               field_value:
 *                 type: string
 *                 description: The new value for the field. If updating "timestamp", use a date-time string.
 *     responses:
 *       200:
 *         description: Interaction field updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Invalid field name or value
 *       404:
 *         description: Account or interaction not found
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/interactions/:interaction_id/field", authModule.checkAuth, async function (req, res) {
  try {
    const { field_name, field_value } = req.body;
    if (!field_name) {
      return res.status(400).send("field_name is required");
    }
    const interaction = await interactionModule.updateInteractionField({
      userInfo: req.userInfo,
      account_id: req.params.account_id,
      interaction_id: req.params.interaction_id,
      field_name,
      field_value
    });
    res.send(interaction);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});


/**
 * @openapi
 * /accounts/{account_id}/actionItems/:
 *   post:
 *     operationId: addActionItem
 *     summary: Adds an action item
 *     tags: [Account Action Items]
 *     description: Adds an action item to an account. Title and due date are required fields. Optionally, you can assign the action item to a team member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
 *                     description: The team member id
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
app.post("/accounts/:account_id/actionItems/", authModule.checkAuth, async function (req, res) {
  if (!req.body.title || !req.body.dueDate) {
    return res.status(400).send("Title and due date are required fields.");
  }
  try {
    req.body.account_id = req.params.account_id;
    req.body.userInfo = req.userInfo;
    const actionItem = await actionItemsModule.addActionItem(req.body);
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
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.put("/accounts/:account_id/actionItems/:action_item_id", authModule.checkAuth, async function (req, res) {
  try {
    req.body.account_id = req.params.account_id;
    req.body.action_item_id = req.params.action_item_id;
    req.body.userInfo = req.userInfo;
    const actionItem = await actionItemsModule.updateActionItem(req.body);
    res.send(actionItem);
  } catch(e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/{action_item_id}/complete:
 *   put:
 *     operationId: completeActionItem
 *     summary: Completes an action item
 *     tags: [Account Action Items]
 *     description: Completes a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
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
app.put("/accounts/:account_id/actionItems/:action_item_id/complete", authModule.checkAuth, async function (req, res) {
  try {
    const actionItem = await actionItemsModule.completeActionItem({ userInfo: req.userInfo, account_id: req.params.account_id, action_item_id: req.params.action_item_id});
    res.send(actionItem);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/{action_item_id}/field:
 *   put:
 *     operationId: updateActionItemField

*     summary: "Updates a single field of an action item"
 *     tags: [Account Action Items]
 *     description: "Updates a specific field of a specific action item. The field name is the name of the field to update, and the field value is the new value for the field."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: "The Account ID. The Account ID can be found by calling findByName."
 *         schema:
 *           type: string
 *       - name: action_item_id
 *         in: path
 *         required: true
 *         description: "The ID of the action item to update"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field_name
 *               - field_value
 *             properties:
 *               field_name:
 *                 type: string
 *                 enum: ["title", "dueDate"]
 *                 description: "The name of the field to update. The field name can be one of the following: title, dueDate. If you are sneding a dureDate, make sure to format it as a date-time string."
 *               field_value:
 *                 type: string
 *                 description: "The new value for the field"
 *     responses:
 *       200:
 *         description: "Action item field updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionItem'
 *       404:
 *         description: "Account or action item not found"
 *       401:
 *         description: Unauthorized
 */
app.put("/accounts/:account_id/actionItems/:action_item_id/field", authModule.checkAuth, async function (req, res) {
  try {
    const { field_name, field_value } = req.body;
    if (!field_name) {
      return res.status(400).send("field_name is required");
    }
    const actionItem = await actionItemsModule.updateActionItemField({
      userInfo: req.userInfo,
      account_id: req.params.account_id,
      action_item_id: req.params.action_item_id,
      field_name,
      field_value
    });
    res.send(actionItem);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/{action_item_id}:
 *   delete:
 *     operationId: deleteActionItem
 *     summary: Deletes an action item
 *     tags: [Account Action Items]
 *     description: Deletes a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: action_item_id
 *         in: path
 *         required: true
 *         description: The ID of the action item to update
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Action item deleted successfully
 *       404:
 *         description: Account or action item not found
 *       401:
 *         description: Unauthorized
 */
app.delete("/accounts/:account_id/actionItems/:action_item_id", authModule.checkAuth, async function (req, res) {
  try {
    await actionItemsModule.deleteActionItem({ userInfo: req.userInfo, account_id: req.params.account_id, action_item_id: req.params.action_item_id});
    res.status(204).send();
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}/unstick:
 *   put:
 *     operationId: unstickInteraction
 *     summary: Unstick an interaction (this was most likely a sticky note)
 *     tags: [Account Interactions]
 *     description: Sets the `isSticky` flag of the specified interaction to `false`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: The Account ID. The Account ID can be found by calling findByName.
 *         schema:
 *           type: string
 *       - name: interaction_id
 *         in: path
 *         required: true
 *         description: The interaction id. You can get a list of interaction ids by calling getAccountDetails with the Account ID
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
app.put("/accounts/:account_id/interactions/:interaction_id/unstick", authModule.checkAuth, async function (req, res) {
  try {
    const interaction = await interactionModule.unstickInteraction({ userInfo: req.userInfo, account_id: req.params.account_id, interaction_id: req.params.interaction_id });
    res.send(interaction);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});

/**
 * @openapi
 * /interactions/latest:
 *   get:
 *     operationId: getLatestInteractions
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
app.get("/interactions/latest", authModule.checkAuth, async function (req, res) {
  try {
    const latestInteractions = await interactionModule.getLatestInteractions({ userInfo: req.userInfo });
    res.send(latestInteractions);
  } catch (e) {
    res.status(e.status || 500).send(e.message || "Internal Server Error");
  }
});



/**
 * @openapi
 * /find:
 *   get:
 *     operationId: findByName
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
app.get("/find", authModule.checkAuth, async function (req, res) {
  const name = req.query.name;
  if (!name) {
    return res.status(400).send("Query parameter 'name' is required");
  }
  try {
    const results = await exploreModule.findByName({ userInfo: req.userInfo, name });  
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

app.listen(8080, () => {
  console.log(
    "Server is running"
  );
});