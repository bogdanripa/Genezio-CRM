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
    req.userInfo = userInfo;
    next();
  } catch (error) {
    res.status(401).send({
      message: "Unauthorized",
    });
  }
}

async function getAllusers() {
  const users = await Users.find();
  if (!users) return [];
  // replace userId with id
  users.forEach((user) => {
    user.id = user.userId;
    delete user.userId;
  });
  return users;
}



app.get("/users", checkAuth, async function (_req, res, _next) {
  const users = await getAllusers();
  res.send(users);
});

app.get("/accounts/", checkAuth, async function (req, res, _next) {
  const accounts = await Accounts.find();
  res.send(accounts);
});

app.get("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  // replace userId with id
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
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  account.name = req.body.name;
  account.website = req.body.website;
  account.description = req.body.description;
  account.industry = req.body.industry;
  account.status = req.body.status;
  account.metrics = req.body.metrics;
  await account.save();
  res.send(account);
});

app.delete("/accounts/:id", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const response = await Accounts.deleteOne({ id: accountId });
  if (response.deletedCount === 0) {
    return res.status(404).send({ message: "Account not found" });
  }
  res.status(204).send();
});

app.post("/accounts/:id/teamMembers", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const newMember = await Users.findOne({
    userId: req.body.userId
  });
  newMember.id = newMember.userId;
  delete newMember.userId;
  account.teamMembers.push(newMember);
  await account.save();
  res.status(201).send(newMember);
});

app.delete("/accounts/:id/teamMembers/:memberId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const memberId = req.params.memberId;
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const memberIndex = account.teamMembers.findIndex((member) => member.id === memberId);
  if (memberIndex === -1) {
    return res.status(404).send({ message: "Member not found" });
  }

  account.teamMembers.splice(memberIndex, 1);
  await account.save();
  res.status(204).send();
});

app.put("/accounts/:id/transferOwnership", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }
  const newOwner = await Users.findOne({
    userId: req.body.userId
  });

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
  const account = await Accounts.findOne({ id: accountId });
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
  const account = await Accounts.findOne({ id: accountId });
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
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

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
  const account = await Accounts.findOne({ id: accountId });
  if (!account) {
    return res.status(404).send({ message: "Account not found" });
  }

  const newInteraction = {
    id: crypto.randomUUID(),
    type: req.body.type,
    timestamp: new Date().toISOString(),
    createdBy: {
      id: req.userInfo.userId,
      name: req.userInfo.name,
      email: req.userInfo.email,
    },
    title: req.body.title,
    description: req.body.description,
    actionItems: req.body.actionItems,
    metadata: req.body.metadata,
    isSticky: req.body.isSticky,
  };

  account.interactions.push(newInteraction);
  await account.save();
  res.status(201).send(newInteraction);
});

app.put("/accounts/:id/interactions/:interactionId/actionItems/:actionItemId", checkAuth, async function (req, res, _next) {
  const accountId = req.params.id;
  const interactionId = req.params.interactionId;
  const actionItemId = req.params.actionItemId;
  const account = await Accounts.findOne({ id: accountId });
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
  const account = await Accounts.findOne({ id: accountId });
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

app.listen(8080, () => {
  console.log(
    "Server is running on port 8080. Check the app on http://localhost:8080"
  );
});
