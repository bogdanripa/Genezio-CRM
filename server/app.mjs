import express from "express";
import { AuthService } from "@genezio/auth";
import cors from "cors";
import { Users, Accounts, UserSummary, Employee, BasicInteraction, Interaction, ActionItem } from "./db.mjs";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import mongooseToSwagger from 'mongoose-to-swagger';
import SmartAgent from './agent/SmartAgent.mjs';

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
  return Accounts.find({ "domain": address}).lean();
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
 *     summary: Get all users
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
 *     summary: Get all accounts
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
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     parameters:
 *       - name: id
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
app.get("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
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
    },
    metrics: req.body.metrics,
  };
  const account = await Accounts.create(newAccount);
  res.status(201).send(account);
});

/**
 * @openapi
 * /accounts/{id}:
 *   put:
 *     summary: Update an account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.put("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
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
  await account.save();
  res.send(account);
});

/**
 * @openapi 
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.delete("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  const response = await Accounts.deleteOne({ id: accountId });
  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{id}/teamMembers:
 *   post:
 *     summary: Add a team member to an account
 *     tags: [Account Team Members]
 *     description: Adds a user as a team member to the specified account. The user must already exist in the system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.post("/accounts/:id/teamMembers", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
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
  await account.save();

  res.status(201).send(newMember);
});

/**
 * @openapi
 * /accounts/{id}/teamMembers/{memberId}:
 *   delete:
 *     summary: Remove a team member from an account
 *     tags: [Account Team Members]
 *     description: Deletes a user from the team members list of the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: memberId
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
app.delete("/accounts/:id/teamMembers/:memberId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  let memberId = req.params.memberId;
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

  const memberIndex = account.teamMembers.findIndex((member) => { return member.id == memberId});
  if (memberIndex === -1) {
    return res.status(404).send({ message: "Member not found" });
  }

  account.teamMembers.splice(memberIndex, 1);
  await account.save();
  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{id}/transferOwnership:
 *   put:
 *     summary: Transfer account ownership
 *     tags: [Account Team Members]
 *     description: Transfers ownership of an account to another user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.put("/accounts/:id/transferOwnership", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
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
  await account.save();
  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{id}/contacts:
 *   post:
 *     summary: Add a contact to an account
 *     tags: [Account Contacts]
 *     description: Adds a new contact (employee) to the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.post("/accounts/:id/contacts", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
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
  await account.save();
  res.status(201).send(newContact);
});

/**
 * @openapi
 * /accounts/{id}/contacts/{contactId}:
 *   put:
 *     summary: Update an existing contact
 *     tags: [Account Contacts]
 *     description: Updates the contact (employee) details associated with the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: contactId
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
app.put("/accounts/:id/contacts/:contactId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const contactId = req.params.contactId;
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
  await account.save();
  res.send(contact);
});

/**
 * @openapi
 * /accounts/{id}/contacts/{contactId}:
 *   delete:
 *     summary: Delete a contact from an account
 *     tags: [Account Contacts]
 *     description: Removes an existing contact (employee) from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: contactId
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
app.delete("/accounts/:id/contacts/:contactId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const contactId = req.params.contactId;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  // Flatten employees
  account.employees = account.employees.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const contactIndex = account.employees.findIndex((contact) => contact.id === contactId);
  if (contactIndex === -1) {
    return res.status(404).send({ message: "Contact not found" });
  }

  account.employees.splice(contactIndex, 1);
  await account.save();
  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{id}/interactions:
 *   post:
 *     summary: Create a new interaction
 *     tags: [Account Interactions]
 *     description: Adds a new interaction to the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
app.post("/accounts/:id/interactions", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const newInteraction = {
    id: crypto.randomUUID(),
    type: req.body.type,
    timestamp: req.body.timestamp,
    createdAt: new Date(),
    createdBy: {
      id: req.userInfo.userId,
      name: req.userInfo.name,
      email: req.userInfo.email,
    },
    title: req.body.title,
    description: req.body.description,
    attendees: req.body.attendees,
    metadata: req.body.metadata,
    isSticky: req.body.isSticky,
  };

  account.interactions.push(newInteraction);
  // if (req.body.actionItems) {
  //   for (const actionIntem of req.body.actionItems) {
  //     const newActionItem = {
  //       id: crypto.randomUUID(),
  //       title: actionIntem.title,
  //       dueDate: actionIntem.dueDate,
  //     };
  //     account.actionItems.push(newActionItem);
  //   }
  // }
  await account.save();
  res.status(201).send(newInteraction);
});

/**
 * @openapi
 * /accounts/{id}/interactions/{interactionId}:
 *   put:
 *     summary: Update an existing interaction
 *     tags: [Account Interactions]
 *     description: Updates the details of an existing interaction within the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interactionId
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
app.put("/accounts/:id/interactions/:interactionId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const interactionId = req.params.interactionId;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  interaction.type = req.body.type;
  interaction.timestamp = req.body.timestamp;
  interaction.title = req.body.title;
  interaction.description = req.body.description;
  interaction.metadata = req.body.metadata;
  interaction.isSticky = req.body.isSticky;
  interaction.attendees = req.body.attendees;
  interaction.updatedAt = new Date();
  interaction.updatedBy = {
    id: req.userInfo.userId,
    name: req.userInfo.name,
    email: req.userInfo.email,
  };

  await account.save();
  res.send(interaction);
});

/**
 * @openapi
 * /accounts/{id}/interactions/{interactionId}:
 *   delete:
 *     summary: Delete an interaction
 *     tags: [Account Interactions]
 *     description: Removes an interaction from the specified account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interactionId
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
app.delete("/accounts/:id/interactions/:interactionId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const interactionId = req.params.interactionId;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  // Flatten interactions
  account.interactions = account.interactions.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const interactionIndex = account.interactions.findIndex((interaction) => interaction.id === interactionId);
  if (interactionIndex === -1) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  account.interactions.splice(interactionIndex, 1);
  await account.save();
  res.status(204).send();
});

/**
 * @openapi
 * /accounts/{id}/actionItems/:
 *   post:
 *     summary: Adds an action item
 *     tags: [Account Action Items]
 *     description: Adds an action item to an account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Action item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionItem'
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
app.post("/accounts/:id/actionItems/", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
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
  }

  account.actionItems.push(actionItem);

  await account.save();
  res.send(actionItem);
});

/**
 * @openapi
 * /accounts/{id}/actionItems/{actionItemId}:
 *   put:
 *     summary: Update an action item
 *     tags: [Account Action Items]
 *     description: Updates the fields of a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: actionItemId
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
 *               completed:
 *                 type: boolean
 *               completedAt:
 *                 type: string
 *                 format: date-time
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
app.put("/accounts/:id/actionItems/:actionItemId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const actionItemId = req.params.actionItemId;
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
    actionItem.assignedTo = assignedUser;
  }

  await account.save();
  res.send(actionItem);
});

/**
 * @openapi
 * /accounts/{id}/actionItems/{actionItemId}/complete:
 *   put:
 *     summary: Completes an action item
 *     tags: [Account Action Items]
 *     description: Completes a specific action item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: actionItemId
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
app.put("/accounts/:id/actionItems/:actionItemId/complete", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const actionItemId = req.params.actionItemId;
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

  await account.save();
  res.send(actionItem);
});

/**
 * @openapi
 * /accounts/{id}/interactions/{interactionId}/unstick:
 *   put:
 *     summary: Unstick an interaction (this was most likely a sticky note)
 *     tags: [Account Interactions]
 *     description: Sets the `isSticky` flag of the specified interaction to `false`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the account
 *         schema:
 *           type: string
 *       - name: interactionId
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
app.put("/accounts/:id/interactions/:interactionId/unstick", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const interactionId = req.params.interactionId;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  interaction.isSticky = false;

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