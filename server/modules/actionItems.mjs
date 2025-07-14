import crypto from "crypto";
import { getAccount, getAllAccounts } from "./accounts.mjs";
import { sendNotification } from "./notifications.mjs";
import { Users } from "../db.mjs";

function fixTeamMember(teamMember, account) {
    if (!teamMember) return null;
    if (teamMember.id && teamMember.name && teamMember.email) return teamMember;
    let user = null;
    const teamMembers = account.teamMembers || [];
    if (teamMember.id)
      user = teamMembers.find((member) => member.id === teamMember.id);
    if (!user && teamMember.email)
      user = teamMembers.find((member) => member.email === teamMember.email);
    if (!user && teamMember.name)
      user = teamMembers.find((member) => member.name.toLowerCase() === teamMember.name.toLowerCase());
    if (user)
      return {
        id: user.id,
        name: user.name,
        email: user.email
      };
    console.error(`Could not find team member ${JSON.stringify(teamMember)} in ${account.name}`);
    return null;
}

export async function addActionItem(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const account = await getAccount(userInfo, accountId);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
  }
  
  const actionItem = {
    id: crypto.randomUUID(),
    title: parameters.title,
    dueDate: parameters.dueDate,
    completed: false,
    completedAt: null,
  };

  if (parameters.assignedTo !== undefined) {
    const assignedTo = fixTeamMember(parameters.assignedTo, account);
    actionItem.assignedTo = assignedTo;

    if (!assignedTo) {
      // get a list of team members
      const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
      throw {status: 404, message: `Assigned user not found. Account team members are: ${teamMembers}`}
    }

    const assignedUser = await Users.findOne({
      userId: assignedTo.id
    }).lean();

    if (!assignedUser) {
      const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
      throw {status: 404, message: `Assigned user not found. Account team members are: ${teamMembers}`}
    }

    if (assignedUser.userId !== userInfo.userId && assignedUser.phone)
      await sendNotification(assignedUser.phone, `${userInfo.name} assigned you "${actionItem.title}" on ${account.name}.`);
  }

  account.actionItems.push(actionItem);

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} added a new action item (${actionItem.title}) to ${account.name}.`);
  
  await account.save();

  return actionItem;
}

export async function updateActionItem(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const actionItemId = parameters.action_item_id;
  const account = await getAccount(userInfo, accountId);
  if (!account) {
      const accounts = await getAllAccounts(userInfo);
      const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
      throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
  }
  
  const actionItem = account.actionItems.find((item) => item.id === actionItemId);
  if (!actionItem) {
      let actionItems = "No action items on this account.";
      if (account.actionItems && account.actionItems.length > 0) {
      actionItems = account.actionItems.map((item) => `${item.title} (action item id: ${item.id})`).join(", ");
      }
      throw {status: 404, message: `Action item not found. Available action items: ${actionItems}`}
  }
  
  if (parameters.title !== undefined) actionItem.title = parameters.title;
  if (parameters.dueDate !== undefined) actionItem.dueDate = parameters.dueDate;
  if (parameters.assignedTo !== undefined) {
      const assignedTo = fixTeamMember(parameters.assignedTo, account);
      if (!assignedTo) {
      const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
      throw {status: 404, message: `Assigned user not found. Account team members are: ${teamMembers}`}
      }
  
      if (assignedTo.id !== actionItem.assignedTo?.id) {
      const assignedUser = await Users.findOne({
          userId: assignedTo.id
      }).lean();
  
      if (!assignedUser) {
          const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
          throw {status: 404, message: `Assigned user not found. Account team members are: ${teamMembers}`}
      }
      if (assignedTo.id !== userInfo.userId && assignedUser.phone)
          await sendNotification(assignedUser.phone, `${userInfo.name} assigned you "${actionItem.title}" on ${account.name}.`);
      }
      actionItem.assignedTo = assignedTo;
  }
  
  if (account.owner.id !== userInfo.userId)
      await sendNotification(account.owner.phone, `${userInfo.name} updated an action item (${actionItem.title}) on ${account.name}.`);
  
  await account.save();
  
  return actionItem;
}

export async function completeActionItem({userInfo, account_id, action_item_id }) {
    const account = await getAccount(userInfo, account_id);
    if (!account) {
      const accounts = await getAllAccounts(userInfo);
      const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
      throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
    }
  
    const actionItem = account.actionItems.find((item) => item.id === action_item_id);
    if (!actionItem) {
      let actionItems = "No action items on this account.";
      if (account.actionItems && account.actionItems.length > 0) {
        actionItems = account.actionItems.map((item) => `${item.title} (action item id: ${item.id})`).join(", ");
      }
      throw { status: 404, message: `Action item not found. Available action items: ${actionItems}` };
    }
  
    actionItem.completed = true;
    actionItem.completedAt = new Date();
  
    if (account.owner.id !== userInfo.userId)
      await sendNotification(account.owner.phone, `${userInfo.name} completed "${actionItem.title}" on ${account.name}.`);
    
    await account.save();

    return actionItem;
}

export async function deleteActionItem({userInfo, account_id, action_item_id }) {
  const account = await getAccount(userInfo, account_id);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
  }

  const actionItem = account.actionItems.find((item) => item.id === action_item_id);
  if (!actionItem) {
    let actionItems = "No action items on this account.";
    if (account.actionItems && account.actionItems.length > 0) {
      actionItems = account.actionItems.map((item) => `${item.title} (action item id: ${item.id})`).join(", ");
    }
    throw { status: 404, message: `Action item not found. Available action items: ${actionItems}` };
  }

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} deleted "${actionItem.title}" on ${account.name}.`);
  
  account.actionItems = account.actionItems?.filter(item => item.id !== action_item_id);
  await account.save();
}