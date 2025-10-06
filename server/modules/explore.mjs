import { getAllAccounts } from "./accounts.mjs";

function findOneTerm(term, accounts) {
  const regex = new RegExp(term, 'i');
  const results = [];

  for (const account of accounts) {
    if (regex.test(account.name)) {
      results.push({
        type: "account",
        account_id: account.id,
        url: `https://app.mayacrm.ai/accounts/${account.id}`,
        name: account.name
      });
    }

    for (const contact of account.employees) {
      if (regex.test(contact.name)) {
        results.push({
          type: "contact",
          contact_id: contact.id,
          name: contact.name,
          role: contact.role,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
          account: {
            account_id: account.id,
            name: account.name,
            url: `https://app.mayacrm.ai/accounts/${account.id}`,
          },
        });
      }
    }

    for (const teamMember of account.teamMembers) {
      if (regex.test(teamMember.name)) {
        results.push({
          type: "team_member",
          team_member_id: teamMember.id,
          name: teamMember.name,
          email: teamMember.email,
          role: teamMember.role,
          account: {
            account_id: account.id,
            name: account.name,
            url: `https://app.mayacrm.ai/accounts/${account.id}`,
          },
        });
      }
    }

    for (const interaction of account.interactions) {
      if (regex.test(interaction.title)) {
        results.push({
          interaction_id: interaction.id,
          type: "interaction",
          title: interaction.title,
          account: {
            account_id: account.id,
            name: account.name,
            url: `https://app.mayacrm.ai/accounts/${account.id}`,
          },
        });
      }
    }

    for (const actionItem of account.actionItems) {
      if (regex.test(actionItem.title)) {
        results.push({
          type: "action_item",
          action_item_id: actionItem.id,
          title: actionItem.title,
          account: {
            account_id: account.id,
            name: account.name,
            url: `https://app.mayacrm.ai/accounts/${account.id}`,
          },
        });
      }
    }
  }

  return results;
}

export async function findByName({ userInfo, name, query }) {
  if (!name) name = query;
  const terms = name.trim().split(/\s+/);
  const accounts = await getAllAccounts(userInfo);

  const combinedResults = [];

  for (const term of terms) {
    const resultsForTerm = findOneTerm(term, accounts);
    combinedResults.push(...resultsForTerm);
  }

  // Optional: deduplicate by type + id
  const seen = new Set();
  const deduplicated = combinedResults.filter(result => {
    const key = `${result.type}-${result[result.type + "_id"]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduplicated;
}