import { getAllAccounts } from "./accounts.mjs";

function findOneTerm(term, accounts) {
    const regex = new RegExp(term, 'i');
    const results = [];
  
    for (const account of accounts) {
      if (regex.test(account.name)) {
        results.push({
          type: "account",
          account_id: account.id,
          url: `https://genezio-crm.app.genez.io/accounts/${account.id}`,
          account_name: account.name,
        });
      }
  
      for (const contact of account.employees) {
        if (regex.test(contact.name)) {
          results.push({
            type: "contact",
            account_id: account.id,
            url: `https://genezio-crm.app.genez.io/accounts/${account.id}`,
            account_name: account.name,
            contact_id: contact.id,
            contact_name: contact.name,
            contact_role: contact.role,
            contact_email: contact.email,
            contact_phone: contact.phone,
            contact_notes: contact.notes,
          });
        }
      }
  
      for (const teamMember of account.teamMembers) {
        if (regex.test(teamMember.name)) {
          results.push({
            type: "team_member",
            account_id: account.id,
            url: `https://genezio-crm.app.genez.io/accounts/${account.id}`,
            account_name: account.name,
            team_member_id: teamMember.id,
            team_member_name: teamMember.name,
            team_member_email: teamMember.email,
            team_member_role: teamMember.role,
          });
        }
      }
  
      for (const interaction of account.interactions) {
        if (regex.test(interaction.title)) {
          results.push({
            type: "interaction",
            account_id: account.id,
            url: `https://genezio-crm.app.genez.io/accounts/${account.id}`,
            account_name: account.name,
            interaction_id: interaction.id,
            interaction_title: interaction.title,
          });
        }
      }
  
      for (const actionItem of account.actionItems) {
        if (regex.test(actionItem.title)) {
          results.push({
            type: "action_item",
            account_id: account.id,
            url: `https://genezio-crm.app.genez.io/accounts/${account.id}`,
            account_name: account.name,
            action_item_id: actionItem.id,
            action_item_title: actionItem.title,
          });
        }
      }
    }
  
    return results;
  }

export async function findByName(userInfo, { name }) {
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