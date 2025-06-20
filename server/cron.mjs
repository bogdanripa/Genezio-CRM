export async function processAllAccounts(users, accounts) {
  const userMessages = {};
  for (const user of users) {
    userMessages[user.userId] = {
      phone: user.phone,
      email: user.email,
      messages: [],
    };
  }

  for (const account of accounts) {
    // check for action items
    for (const actionItem of account.actionItems) {
      if (!actionItem.completed && new Date(actionItem.dueDate) < new Date()) {
        const userId = actionItem.assignedTo?.id || account.owner.id;
        userMessages[userId].messages.push(
          `Your action item "${actionItem.title}" is overdue for account "${account.name}". It was due on ${actionItem.dueDate}.`
        );
        if (userId != account.owner.id) {
          userMessages[account.owner.id].messages.push(
            `Action item "${actionItem.title}" is overdue for account "${account.name}". It is assigned to ${actionItem.assignedTo.name} and was due on ${actionItem.dueDate}.`
          );
        }
      }
    }
    // Check if the account does not have any new interactions in the last 7 days
    if (account.interactions && account.interactions.length > 0) {
      const lastInteraction = account.interactions[account.interactions.length - 1];
      if (new Date(lastInteraction.date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        userMessages[account.owner.id].messages.push(
          `Account "${account.name}" has no new interactions in the last 7 days.`
        );
      }
    }
  }
  return userMessages;
}