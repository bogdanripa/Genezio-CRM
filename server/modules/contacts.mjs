import crypto from "crypto";
import { getAccount, getAllAccounts } from "./accounts.mjs";
import { sendNotification } from "./notifications.mjs";

export async function addContact(parameters) {  
    const userInfo = parameters.userInfo;
    const accountId = parameters.account_id;
    const account = await getAccount(userInfo, accountId);
  
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

export async function updateContact(parameters) {
    const userInfo = parameters.userInfo;
    const accountId = parameters.account_id;
    const contactId = parameters.contact_id;
    const account = await getAccount(userInfo, accountId);
  
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

export async function updateContactField(parameters) {
    const userInfo = parameters.userInfo;
    const accountId = parameters.account_id;
    const contactId = parameters.contact_id;
    const fieldName = parameters.field_name;
    const fieldValue = parameters.field_value;

    const account = await getAccount(userInfo, accountId);
  
    const contact = account.employees.find((contact) => contact.id === contactId);
    if (!contact) {
        const contacts = (account.employees || []).map((m) => `${m.name} (contact id: ${m.id})`).join(", ");
        throw {status: 404, message: `Contact not found. Account contacts are: ${contacts}`}
    }

    // validate field name
    const validFieldNames = ["name", "role", "email", "phone", "notes"];
    if (!validFieldNames.includes(fieldName)) {
        throw {status: 400, message: `Invalid field name. Valid field names are: ${validFieldNames.join(", ")}`};
    }

    contact[fieldName] = fieldValue;

    await account.save();

    return contact;
}

export async function removeContact(parameters) {
    const userInfo = parameters.userInfo;
    const accountId = parameters.account_id;
    const contactId = parameters.contact_id;
    const account = await getAccount(userInfo, accountId);
      
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