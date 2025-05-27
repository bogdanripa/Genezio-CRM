import express from "express";
import { AuthService } from "@genezio/auth";
import cors from "cors";
import { Users, Accounts } from "./db.mjs";

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

app.get("/accounts/", checkAuth, async function (req, res, _next) {
  const accounts = await getAllAccounts(req);
  // keep only name, industry, status, description, owner, number of contacts, number of employees, last updated date
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

app.get("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  res.send(account);
});

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

app.delete("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  const response = await Accounts.deleteOne({ id: accountId });
  res.status(204).send();
});

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
    actionItems: req.body.actionItems,
    attendees: req.body.attendees,
    metadata: req.body.metadata,
    isSticky: req.body.isSticky,
  };

  account.interactions.push(newInteraction);
  await account.save();
  res.status(201).send(newInteraction);
});

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
  interaction.actionItems = req.body.actionItems;
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

app.put("/accounts/:id/interactions/:interactionId/actionItems/:actionItemId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const interactionId = req.params.interactionId;
  const actionItemId = req.params.actionItemId;
  const account = await getAccount(req, accountId);
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    return res.status(404).send({ message: "Interaction not found" });
  }

  const actionItem = interaction.actionItems.find((item) => item.id === actionItemId);
  if (!actionItem) {
    return res.status(404).send({ message: "Action item not found" });
  }

  actionItem.title = req.body.title;
  actionItem.dueDate = req.body.dueDate;
  actionItem.completed = req.body.completed;
  if (req.body.completedAt)
    actionItem.completedAt = new Date();

  await account.save();
  res.send(actionItem);
});

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

app.listen(8080, () => {
  console.log(
    "Server is running"
  );
});
