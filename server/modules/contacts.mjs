import { getAccount, getAllAccounts } from "./accounts.mjs";
import { sendNotification } from "./notifications.mjs";

export async function addContact(userInfo, parameters) {  
    const accountId = parameters.account_id;
    const account = await getAccount(userInfo, accountId);
    if (!account) {
        const accounts = await getAllAccounts(userInfo);
        const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
        throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
    }
  
    const newContact = {
        id: crypto.randomUUID(),
        name: parameters.name,
        role: parameters.role,
        email: parameters.email,
        phone: parameters.phone,
        notes: parameters.notes,
    };
  
    account.employees.push(newContact);
    
    if (account.owner.id !== userInfo.userId)
        await sendNotification(account.owner.phone, `${userInfo.name} added ${newContact.name} to ${account.name}.`);
  
    await account.save();
  
    return newContact;
}

export async function updateContact(userInfo, parameters) {
    const accountId = parameters.account_id;
    const contactId = parameters.contact_id;
    const account = await getAccount(userInfo, accountId);
    if (!account) {
        const accounts = await getAllAccounts(userInfo);
        const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
        throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
    }
  
    const contact = account.employees.find((contact) => contact.id === contactId);
    if (!contact) {
        const contacts = (account.employees || []).map((m) => `${m.name} (contact id: ${m.id})`).join(", ");
        throw {status: 404, message: `Contact not found. Account contacts are: ${contacts}`}
    }
  
    if (parameters.name !== undefined) contact.name = parameters.name;
    if (parameters.role !== undefined) contact.role = parameters.role;
    if (parameters.email !== undefined) contact.email = parameters.email;
    if (parameters.phone !== undefined) contact.phone = parameters.phone;
    if (parameters.notes !== undefined) contact.notes = parameters.notes;
    
    if (account.owner.id !== userInfo.userId)
        await sendNotification(account.owner.phone, `${userInfo.name} updated ${contact.name}'s details on ${account.name}.`);
    
    await account.save();
  
    return contact;
}

export async function removeContact(userInfo, parameters) {
    const accountId = parameters.account_id;
    const contactId = parameters.contact_id;
    const account = await getAccount(userInfo, accountId);
    if (!account) {
      const accounts = await getAllAccounts(userInfo);
      const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
      throw {status: 404, message: `Account not found. Available accounts: ${accountNames}`}
    }
  
    // Flatten employees
    account.employees = account.employees.map((m) =>
      typeof m.toObject === "function" ? m.toObject() : m
    );
  
    const contactName = account.employees.find((contact) => contact.id === contactId)?.name;
  
    const contactIndex = account.employees.findIndex((contact) => contact.id === contactId);
    if (contactIndex === -1) {
      const contacts = (account.employees || []).map((m) => `${m.name} (contact id: ${m.id})`).join(", ");
      throw {status: 404, message: `Contact not found. Account contacts are: ${contacts}`}
    }
  
    account.employees.splice(contactIndex, 1);
    
    if (account.owner.id !== userInfo.userId)
      await sendNotification(account.owner.phone, `${userInfo.name} removed ${contactName} from ${account.name}.`);
    
    await account.save();
}