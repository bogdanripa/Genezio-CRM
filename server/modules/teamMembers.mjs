import { getAccount, getAllAccounts } from "./accounts.mjs";
import { sendNotification } from "./notifications.mjs";

export async function addTeamMember({ userInfo, account_id, id }) {
  const account = await getAccount(userInfo, account_id);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
  }

  const newMember = await Users.findOne({
    userId: id
  }).lean();

  
  if (!newMember) {
    const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
    throw {status: 404, message: `User not found. Account team members are: ${teamMembers}`}
  }
  newMember.id = newMember.userId;
  delete newMember.userId;

  // check if this is not the account owner
  if (account.owner.id == newMember.id) {
    return newMember;
  }

  // Flatten team members
  account.teamMembers = account.teamMembers.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  // if the team member is already present, skip
  if (!account.teamMembers.some((member) => member.id == newMember.id)) {
    account.teamMembers.push(newMember);
  } else {
    return newMember;
  }

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} added ${newMember.name} to ${account.name}.`);
  
  await account.save();

  return newMember;
}

export async function removeTeamMember({ userInfo, account_id, team_member_id }) {
  const account = await getAccount(userInfo, account_id);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
  }

  if (team_member_id == 'undefined') {
    team_member_id = undefined;
  }

  // Flatten team members
  account.teamMembers = account.teamMembers.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const teamMemberName = account.teamMembers.find((member) => member.id == team_member_id)?.name;

  const memberIndex = account.teamMembers.findIndex((member) => { return member.id == memberId});
  if (memberIndex === -1) {
    const teamMembers = (account.teamMembers || []).map((m) => `${m.name} (team member id: ${m.id})`).join(", ");
    throw {status: 404, message: `Team member not found. Account team members are: ${teamMembers}`}
  }

  account.teamMembers.splice(memberIndex, 1);

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} removed ${teamMemberName} from ${account.name}.`);
  
  await account.save();
}

export async function getAllTeamMembersOnAccount({ userInfo, account_id }) {
  const account = await getAccount(userInfo, account_id);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
  }

  // Get all team members, including the owner, with name, email, and id
  const teamMembers = [
    {
      id: account.owner.id,
      name: account.owner.name,
      email: account.owner.email
    },
    ...(account.teamMembers || []).map(member => {
      // If member is a Mongoose document, convert to plain object
      const m = typeof member.toObject === "function" ? member.toObject() : member;
      return {
        id: m.id,
        name: m.name,
        email: m.email
      };
    })
  ];

  return {
    message: `List of team members for ${account.name}, including the account owner`,
    teamMembers
  }
}