import crypto from "crypto";
import { Accounts } from "../db.mjs";
import { sendNotification } from "./notifications.mjs";

export async function getAllAccounts(userInfo) {
    const address = userInfo.address;
    return Accounts.find({ domain: address })
      .sort({ "name": 1 })
      .collation({ locale: 'en', strength: 1 })  // case-insensitive
      .lean();
}
  
export async function getAccount(userInfo, accountId) {
  const address = userInfo.address;
  const account = await Accounts.findOne({ 
    id: accountId,
    "domain": address
  });

  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (Account ID: ${a.id})`).join(", ");
    if (!accountId) {
      throw { status: 400, message: "Account ID (account_id) is required. Available accounts: ${accountNames}" };
    }
    throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`};
  }
  
  return account;
}

export async function getAllAccountsSummary({ userInfo }) {
    const accounts = await getAllAccounts(userInfo);
    const filteredAccounts = accounts.map((account) => {
        // Filter out interactions with a future timestamp
        const pastInteractions = account.interactions.filter(
            (interaction) => !interaction.timestamp || new Date(interaction.timestamp) <= new Date()
        );
        const lastInteractionDate = pastInteractions.length > 0
            ? pastInteractions[pastInteractions.length - 1].timestamp
            : null;
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
            lastInteractionDate,
            updatedAt: account.updatedAt || account.createdAt,
            metrics: account.metrics,
        };
    });
    return filteredAccounts;
}

export async function getAccountDetails(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const account = await getAccount(userInfo, accountId);
  if (account.interactions && account.interactions.length)
      account.interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (account.actionItems && account.actionItems.length)
      account.actionItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return account;
}

export async function createAccount(parameters) {
  const userInfo = parameters.userInfo;
  const newAccount = {
    id: crypto.randomUUID(),
    name: parameters.name,
    website: parameters.website,
    description: parameters.description,
    industry: parameters.industry,
    domain: userInfo.address,
    owner: {
    id: userInfo.userId,
    name: userInfo.name,
    email: userInfo.email,
    phone: userInfo.phone,
    },
    metrics: parameters.metrics,
  };

  if (parameters.status !== undefined) newAccount.status = parameters.status;
  if (parameters.accountType !== undefined) newAccount.accountType = parameters.accountType;

  const account = await Accounts.create(newAccount);
  return account;
}

export async function updateAccount(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const account = await getAccount(userInfo, accountId);

  if (parameters.name !== undefined) account.name = parameters.name;
  if (parameters.website !== undefined) account.website = parameters.website;
  if (parameters.description !== undefined) account.description = parameters.description;
  if (parameters.industry !== undefined) account.industry = parameters.industry;
  if (parameters.status !== undefined) account.status = parameters.status;
  if (parameters.metrics !== undefined) account.metrics = parameters.metrics;
  if (parameters.accountType !== undefined) account.accountType = parameters.accountType;
  
  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} updated ${account.name}.`);
  
  await account.save();

  return account;
}

export async function deleteAccount({ userInfo, account_id }) {
  const account = await getAccount(userInfo, account_id);
  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `Account ${account.name} has been deleted by ${userInfo.name}.`);

  await Accounts.deleteOne({ id: account_id });
}

export async function transferOwnership({ userInfo, account_id, id } ) {
  const account = await getAccount(userInfo, account_id);
  const newOwner = await Users.findOne({
    userId: id
  }).lean();

  if (!newOwner) {
    const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
    throw {status: 404, message: `User not found. Account team members are: ${teamMembers}`}
  }

  newOwner.id = newOwner.userId;
  delete newOwner.userId;

  account.owner = newOwner;
  
  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} assigned you the ${account.name} account.`);
  
  await account.save();
}