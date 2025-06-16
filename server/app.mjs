import express from "express";
import { AuthService } from "@genezio/auth";
import cors from "cors";
import { Users, Accounts, UserSummary, Employee, BasicInteraction, Interaction, ActionItem, ActiveSessions } from "./db.mjs";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import mongooseToSwagger from 'mongoose-to-swagger';
import SmartAgent from './agent/SmartAgent.mjs';
import emailAuth from './emailCodeAuth.mjs';
import { sendNotification } from "./notifications.mjs";

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

const swaggerSpec = swaggerJSDoc(options);
const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth/email-code', emailAuth);

async function checkAuth(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const userInfo = await AuthService.getInstance().userInfoForToken(token);

    if (!userInfo.address) {
      const domain = userInfo.email.split("@")[1];
      await Users.updateOne(
        { userId: userInfo.userId },
        {
          $set: {
            address: domain,
          },
        }
      );
      userInfo.address = domain;
    }

    req.userInfo = userInfo;
    next();
  } catch (error) {
    res.status(401).send({
      message: "Unauthorized",
    });
  }
}

async function getAllAccounts(req) {
  const address = req.userInfo.address;
  return Accounts.find({ domain: address })
    .sort({ "account.name": 1 })
    .lean();
}

async function getAccount(req, accountId) {
  const address = req.userInfo.address;
  const account = await Accounts.findOne({ 
    id: accountId, 
    "domain": address
  });
  if (!account) return null;
  return account;
}

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
app.get("/users", checkAuth, async function (req, res, _next) {
  const address = req.userInfo.address;
  const users = await Users.find({address}).lean();
  if (users) {
    users.forEach((user) => {
      user.id = user.userId;
      delete user.userId;
    });
  }
  if (!users) users = [];

  res.send(users);
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
app.get("/accounts/", checkAuth, async function (req, res, _next) {
  const accounts = await getAllAccounts(req);
  const filteredAccounts = accounts.map((account) => {
    return {
      id: account.id,
      name: account.name,
      industry: account.industry,
      status: account.status,
      description: account.description,
      owner: account.owner,
      accountType: account.accountType || "Client",
      numberOfTeamMembers: account.teamMembers.length,
      numberOfContacts: account.employees.length,
      numberOfInteractions: account.interactions.length,
      lastInteractionDate: account.interactions.length > 0 ? account.interactions[0].timestamp : null,
      updatedAt: account.updatedAt || account.createdAt,
      metrics: account.metrics,
    };
  });
  res.send(filteredAccounts);
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
app.get("/accounts/:account_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  if (account.interactions && account.interactions.length)
    account.interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (account.actionItems && account.actionItems.length)
    account.actionItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  res.send(account);
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
 *               - accountType
 *               - status
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
app.post("/accounts", checkAuth, async function (req, res, _next) {
  const newAccount = {
    id: crypto.randomUUID(),
    name: req.body.name,
    website: req.body.website,
    description: req.body.description,
    industry: req.body.industry,
    status: req.body.status,
    domain: req.userInfo.address,
    owner: {
      id: req.userInfo.userId,
      name: req.userInfo.name,
      email: req.userInfo.email,
      phone: req.userInfo.phone,
    },
    metrics: req.body.metrics,
  };
  const account = await Accounts.create(newAccount);
  res.status(201).send(account);
});

/**
 * @openapi
 * /accounts/{account_id}:
 *   put:
 *     summary: Update an account by account_id. Call this only if you need to update an existing account.
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
 *             required:
 *               - name
 *               - industry
 *               - accountType
 *               - status
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
app.put("/accounts/:account_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  account.name = req.body.name;
  account.website = req.body.website;
  account.description = req.body.description;
  account.industry = req.body.industry;
  account.status = req.body.status;
  account.metrics = req.body.metrics;
  account.accountType = req.body.accountType;
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} updated ${account.name}.`);
  
  await account.save();

  res.send(account);
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
app.delete("/accounts/:account_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `Account ${account.name} has been deleted by ${req.userInfo.name}.`);

  const response = await Accounts.deleteOne({ id: accountId });
  res.status(204).send();
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
app.post("/accounts/:account_id/teamMembers", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const newMember = await Users.findOne({
    userId: req.body.id
  }).lean();
  if (!newMember) {
    return res.status(404).send({ message: "User not found" });
  }
  newMember.id = newMember.userId;
  delete newMember.userId;

  // Flatten team members
  account.teamMembers = account.teamMembers.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  account.teamMembers.push(newMember);

  // remove account.owner from teamMembers if it exists
  const ownerIndex = account.teamMembers.findIndex((member) => member.id === account.owner.id);
  if (ownerIndex !== -1) {
    account.teamMembers.splice(ownerIndex, 1);
  }
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} added ${newMember.name} to ${account.name}.`);
  
  await account.save();

  res.status(201).send(newMember);
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
app.delete("/accounts/:account_id/teamMembers/:team_member_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  let memberId = req.params.team_member_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  if (memberId == 'undefined') {
    memberId = undefined;
  }

  // Flatten team members
  account.teamMembers = account.teamMembers.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const teamMemberName = account.teamMembers.find((member) => member.id == memberId)?.name;

  const memberIndex = account.teamMembers.findIndex((member) => { return member.id == memberId});
  if (memberIndex === -1) {
    return res.status(404).send({ message: "Member not found" });
  }

  account.teamMembers.splice(memberIndex, 1);

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} removed ${teamMemberName} from ${account.name}.`);
  
  await account.save();

  res.status(204).send();
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
app.put("/accounts/:account_id/transferOwnership", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  const newOwner = await Users.findOne({
    userId: req.body.id
  }).lean();

  if (!newOwner) {
    return res.status(404).send({ message: "User not found" });
  }

  newOwner.id = newOwner.userId;
  delete newOwner.userId;

  account.owner = newOwner;
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} assigned you the ${account.name} account.`);
  
  await account.save();

  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{account_id}/contacts:
 *   post:
 *     summary: Add a contact to an account
 *     tags: [Account Contacts]
 *     description: Adds a new contact (employee) to the specified account.
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
app.post("/accounts/:account_id/contacts", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const newContact = {
    id: crypto.randomUUID(),
    name: req.body.name,
    role: req.body.role,
    email: req.body.email,
    phone: req.body.phone,
    notes: req.body.notes,
    meetings: [],
  };

  account.employees.push(newContact);
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} added ${newContact.name} to ${account.name}.`);

  await account.save();

  res.status(201).send(newContact);
});

/**
 * @openapi
 * /accounts/{account_id}/contacts/{contact_id}:
 *   put:
 *     summary: Update an existing contact
 *     tags: [Account Contacts]
 *     description: Updates the contact (employee) details associated with the specified account.
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
app.put("/accounts/:account_id/contacts/:contact_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const contactId = req.params.contact_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const contact = account.employees.find((contact) => contact.id === contactId);
  if (!contact) {
    return res.status(404).send({ message: "Contact not found" });
  }

  contact.name = req.body.name;
  contact.role = req.body.role;
  contact.email = req.body.email;
  contact.phone = req.body.phone;
  contact.notes = req.body.notes;
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} updated ${contact.name}'s details on ${account.name}.`);
  
  await account.save();

  res.send(contact);
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
app.delete("/accounts/:account_id/contacts/:contact_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const contactId = req.params.contact_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  // Flatten employees
  account.employees = account.employees.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const contactName = account.employees.find((contact) => contact.id === contactId)?.name;

  const contactIndex = account.employees.findIndex((contact) => contact.id === contactId);
  if (contactIndex === -1) {
    return res.status(404).send({ message: "Contact not found" });
  }

  account.employees.splice(contactIndex, 1);
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} removed ${contactName} from ${account.name}.`);
  
  await account.save();

  res.status(204).send();
});

function fixAttendees(attendees, account) {
  return attendees.map((attendee) => {
    if (attendee.id && attendee.name && attendee.email) return attendee;
    let user = null;
    const teamMembers = account.teamMembers || [];
    if (attendee.id)
      user = teamMembers.find((member) => member.id === attendee.id);
    if (!user && attendee.email)
      user = teamMembers.find((member) => member.email === attendee.email);
    if (!user && attendee.name)
      user = teamMembers.find((member) => member.name.toLowerCase() === attendee.name.toLowerCase());
    if (user)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };

    let contact = null;
    const employees = account.employees || [];
    if (attendee.id)
      contact = employees.find((employee) => employee.id === attendee.id);
    if (!contact && attendee.email)
      contact = employees.find((employee) => employee.email === attendee.email);
    if (!contact && attendee.name)
      contact = employees.find((employee) => employee.name.toLowerCase() === attendee.name.toLowerCase());
    if (contact)
      return {
        id: contact.id,
        name: contact.name,
        email: contact.email
      };

    return attendee;
  })
}

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
app.post("/accounts/:account_id/interactions", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  if (!req.body.title) {
    return res.status(400).send({ message: "Interaction title is required" });
  }

  if (!req.body.type) {
    return res.status(400).send({ message: "Interaction type is required" });
  }

  const interactionType = req.body.type.toLowerCase();

  const validTypes = ['call', 'email', 'meeting', 'whatsapp', 'note', 'status_change', 'sticky_note'];
  if (!validTypes.includes(interactionType)) {
    return res.status(400).send({ message: `Interaction type must be one of ${validTypes.join(', ')}` });
  }

  const attendees = fixAttendees(req.body.attendees, account);

  const newInteraction = {
    id: crypto.randomUUID(),
    type: interactionType,
    timestamp: req.body.timestamp,
    createdAt: new Date(),
    createdBy: {
      id: req.userInfo.userId,
      name: req.userInfo.name,
      email: req.userInfo.email,
    },
    title: req.body.title,
    description: req.body.description,
    attendees,
    metadata: req.body.metadata,
    isSticky: req.body.isSticky,
  };

  account.interactions.push(newInteraction);
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} added a new ${newInteraction.type} (${newInteraction.title}) to ${account.name}.`);
  
  await account.save();

  res.status(201).send(newInteraction);
});

/**
 * @openapi
 * /accounts/{account_id}/interactions/{interaction_id}:
 *   put:
 *     summary: Update an existing interaction
 *     tags: [Account Interactions]
 *     description: Updates the details of an existing interaction within the specified account.
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
app.put("/accounts/:account_id/interactions/:interaction_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const interactionId = req.params.interaction_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  if (!req.body.type) {
    return res.status(400).send({ message: "Interaction type is required" });
  }

  const interactionType = req.body.type.toLowerCase();

  const validTypes = ['call', 'email', 'meeting', 'whatsapp', 'note', 'status_change', 'sticky_note'];
  if (!validTypes.includes(interactionType)) {
    return res.status(400).send({ message: `Interaction type must be one of ${validTypes.join(', ')}` });
  }

  const attendees = fixAttendees(req.body.attendees, account);

  interaction.type = interactionType;
  interaction.timestamp = req.body.timestamp;
  interaction.title = req.body.title;
  interaction.description = req.body.description;
  interaction.metadata = req.body.metadata;
  interaction.isSticky = req.body.isSticky;
  interaction.attendees = attendees;
  interaction.updatedAt = new Date();
  interaction.updatedBy = {
    id: req.userInfo.userId,
    name: req.userInfo.name,
    email: req.userInfo.email,
  };

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} updated a ${interaction.type} (${interaction.title}) on ${account.name}.`);
  
  await account.save();

  res.send(interaction);
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
app.delete("/accounts/:account_id/interactions/:interaction_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const interactionId = req.params.interaction_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  // Flatten interactions
  account.interactions = account.interactions.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const interactionTitle = account.interactions.find((interaction) => interaction.id === interactionId)?.title;

  const interactionIndex = account.interactions.findIndex((interaction) => interaction.id === interactionId);
  if (interactionIndex === -1) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  account.interactions.splice(interactionIndex, 1);
  
  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} removed ${interactionTitle} from ${account.name}.`);
  
  await account.save();

  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{account_id}/actionItems/:
 *   post:
 *     summary: Adds an action item
 *     tags: [Account Action Items]
 *     description: Adds an action item to an account.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:account_id/actionItems/", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  
  const actionItem = {
    id: crypto.randomUUID(),
    title: req.body.title,
    dueDate: req.body.dueDate,
    completed: false,
    completedAt: null,
  };

  if (req.body.assignedTo) {
    const assignedUser = await Users.findOne({
      userId: req.body.assignedTo.id
    }).lean();
    if (!assignedUser) {
      return res.status(404).send({ message: "Assigned user not found" });
    }
    assignedUser.id = assignedUser.userId;
    delete assignedUser.userId;
    actionItem.assignedTo = assignedUser;

    if (assignedUser.id !== req.userInfo.userId && assignedUser.phone)
      await sendNotification(assignedUser.phone, `${req.userInfo.name} assigned you "${actionItem.title}" on ${account.name}.`);
  }

  account.actionItems.push(actionItem);

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} added a new action item (${actionItem.title}) to ${account.name}.`);
  
  await account.save();

  res.send(actionItem);
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
app.put("/accounts/:account_id/actionItems/:action_item_id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const actionItemId = req.params.action_item_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const actionItem = account.actionItems.find((item) => item.id === actionItemId);
  if (!actionItem) {
    return res.status(404).send({ message: "Action item not found" });
  }

  actionItem.title = req.body.title;
  actionItem.dueDate = req.body.dueDate;
  if (req.body.assignedTo) {
    const assignedUser = await Users.findOne({
      userId: req.body.assignedTo.id
    }).lean();
    if (!assignedUser) {
      return res.status(404).send({ message: "Assigned user not found" });
    }
    assignedUser.id = assignedUser.userId;
    delete assignedUser.userId;
    if (assignedUser.id !== actionItem.assignedTo?.id) {
      actionItem.assignedTo = assignedUser;
      if (assignedUser.id !== req.userInfo.userId && assignedUser.phone)
        await sendNotification(assignedUser.phone, `${req.userInfo.name} assigned you "${actionItem.title}" on ${account.name}.`);
    }
  }

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} updated an action item (${actionItem.title}) on ${account.name}.`);
  
  await account.save();

  res.send(actionItem);
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
app.put("/accounts/:account_id/actionItems/:action_item_id/complete", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const actionItemId = req.params.action_item_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const actionItem = account.actionItems.find((item) => item.id === actionItemId);
  if (!actionItem) {
    return res.status(404).send({ message: "Action item not found" });
  }

  actionItem.completed = true;
  actionItem.completedAt = new Date();

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} completed "${actionItem.title}" on ${account.name}.`);
  
  await account.save();

  res.send(actionItem);
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
app.put("/accounts/:account_id/interactions/:interaction_id/unstick", checkAuth, async function (req, res, _next) {
  const accountId = req.params.account_id;
  const interactionId = req.params.interaction_id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  interaction.isSticky = false;

  if (account.owner.id !== req.userInfo.userId)
    await sendNotification(account.owner.phone, `${req.userInfo.name} unstick'd "${interaction.title}" on ${account.name}.`);
  
  await account.save();

  res.send(interaction);
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
app.get("/interactions/latest", checkAuth, async function (req, res, _next) {
  const accounts = await getAllAccounts(req);
  const interactionsAcrossAccounts = [];
  accounts.forEach((account) => {
    account.interactions.forEach((interaction) => {
      if (!interaction.createdAt) {
        return;
      }
      interactionsAcrossAccounts.push({
        createdAt: interaction.createdAt,
        text: `${interaction.createdBy.name} added a ${interaction.type} to ${account.name}`,
        accountId: account.id,
      });
    });
  });

  interactionsAcrossAccounts.sort((a, b) => {
    return b.createdAt - a.createdAt;
  });

  const latestInteractions = interactionsAcrossAccounts.slice(0, 5);
  res.send(latestInteractions);
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
app.get("/find", checkAuth, async function (req, res, _next) {
  const accounts = await getAllAccounts(req);
  const query = req.query.name;
  const results = [];
  if (!query) {
    return res.status(400).send({ message: "Query parameter 'name' is required" });
  }
  const regex = new RegExp(query, 'i'); // Case-insensitive search
  for (const account of accounts) {
    if (regex.test(account.name)) {
      results.push({
        "type": "account",
        "account_id": account.id,
        "url": `https://genezio-crm.app.genez.io/accounts/${account.id}`,
        "account_name": account.name,
      });
    }
    for (const contact of account.employees) {
      if (regex.test(contact.name)) {
        results.push({
          "type": "contact",
          "account_id": account.id,
          "url": `https://genezio-crm.app.genez.io/accounts/${account.id}`,
          "account_name": account.name,
          "contact_id": contact.id,
          "contact_name": contact.name,
          "contact_role": contact.role,
          "contact_email": contact.email,
          "contact_phone": contact.phone,
          "contact_notes": contact.notes,
        });
      }
    }
    for (const teamMember of account.teamMembers) {
      if (regex.test(teamMember.name)) {
        results.push({
          "type": "team_member",
          "account_id": account.id,
          "url": `https://genezio-crm.app.genez.io/accounts/${account.id}`,
          "account_name": account.name,
          "team_member_id": teamMember.id,
          "team_member_name": teamMember.name,
          "team_member_email": teamMember.email,
          "team_member_role": teamMember.role,
        });
      }
    }
    for (const interaction of account.interactions) {
      if (regex.test(interaction.title)) {
        results.push({
          "type": "interaction",
          "account_id": account.id,
          "url": `https://genezio-crm.app.genez.io/accounts/${account.id}`,
          "account_name": account.name,
          "interaction_id": interaction.id,
          "interaction_title": interaction.title,
        });
      }
    }
    for (const actionItem of account.actionItems) {
      if (regex.test(actionItem.title)) {
        results.push({
          "type": "action_item",
          "account_id": account.id,
          "url": `https://genezio-crm.app.genez.io/accounts/${account.id}`,
          "account_name": account.name,
          "action_item_id": actionItem.id,
          "action_item_title": actionItem.title,
        });
      }      
    }
  }
  res.status(200).send(results);
});

app.get('/agent/test', async (req, res) => {
  console.log("Testing SmartAgent...");
  const smartAgent = new SmartAgent();
  const response = "1";//await smartAgent.invoke("Who is on the BCR account?");
  console.log(response);
  res.send(response);
});

app.get('/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(8080, () => {
  console.log(
    "Server is running"
  );
});