import crypto from "crypto";
import { getAccount, getAllAccounts } from "./accounts.mjs";
import { sendNotification } from "./notifications.mjs";

function fixAttendees(attendees, account) {
    if (!attendees || !Array.isArray(attendees)) {
      return [];
    }
    const errors = [];
    const attendeesList = attendees.map((attendee) => {
      if (attendee.id && attendee.name && attendee.email) return attendee;
      let user = null;
      const teamMembers = account.teamMembers || [];
      if (attendee.id)
        user = teamMembers.find((member) => member.id === attendee.id);
      if (!user && attendee.email)
        user = teamMembers.find((member) => member.email === attendee.email);
      if (!user && attendee.name)
        user = teamMembers.find((member) => member.name.toLowerCase() === attendee.name.toLowerCase());
      if (user)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        };
  
      let contact = null;
      const employees = account.employees || [];
      employees.push(account.owner); // Include owner in employees
      if (attendee.id)
        contact = employees.find((employee) => employee.id === attendee.id);
      if (!contact && attendee.email)
        contact = employees.find((employee) => employee.email === attendee.email);
      if (!contact && attendee.name)
        contact = employees.find((employee) => employee.name.toLowerCase() === attendee.name.toLowerCase());
      if (contact)
        return {
          id: contact.id,
          name: contact.name,
          email: contact.email
        };
      
      console.error(`Could not find attendee ${JSON.stringify(attendee)} in ${account.name}`);
      errors.push(attendee.name || attendee.email || attendee.id || "Unknown attendee");
      return null;
    });
    if (errors.length > 0) {
      return `Could not find attendees: ${errors.join(', ')}`;
    }
    // Filter out null attendees
    return attendeesList;
}

export async function addInteraction(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const account = await getAccount(userInfo, accountId);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
  }

  if (!parameters.title || !parameters.type) {
    throw { status: 400, message: "Interaction type is required" };
  }

  const interactionType = parameters.type.toLowerCase();

  const validTypes = ['call', 'email', 'meeting', 'whatsapp', 'note', 'status_change', 'sticky_note'];
  if (!validTypes.includes(interactionType)) {
    throw { status: 400, message: `Interaction type must be one of ${validTypes.join(', ')}` };
  }

  let attendees = fixAttendees(parameters.attendees, account);
  if (typeof attendees === 'string') {
    // get a list of account team members and contacts
    let attendeesList = [];
    if (account.teamMembers && account.teamMembers.length > 0) {
      attendeesList = account.teamMembers.map((member) => member.name);
    }
    if (account.employees && account.employees.length > 0) {
      attendeesList = attendeesList.concat(account.employees.map((employee) => employee.name));
    }
    attendeesList.push(account.owner.name);
    throw { status: 400, message: `${attendees}. Available attendees are: ${attendeesList.join(', ')}` };
  }

  const newInteraction = {
    id: crypto.randomUUID(),
    type: interactionType,
    createdAt: new Date(),
    createdBy: {
      id: userInfo.userId,
      name: userInfo.name,
      email: userInfo.email,
    },
    title: parameters.title,
    description: parameters.description,
    attendees,
    metadata: parameters.metadata,
  };

  if (parameters.timestamp !== undefined) {
    newInteraction.timestamp = parameters.timestamp;
  }

  if (parameters.isSticky !== undefined) {
    newInteraction.isSticky = parameters.isSticky;
  }

  account.interactions.push(newInteraction);
  
  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} added a new ${newInteraction.type} (${newInteraction.title}) to ${account.name}.`);
  
  // for each attendee, send a notification if they are not the owner or the current user
  for (const attendee of attendees) {
    if (attendee.id !== account.owner.id && attendee.id !== userInfo.userId && attendee.phone) {
      await sendNotification(attendee.phone, `${userInfo.name} added you to a new ${newInteraction.type} (${newInteraction.title}) on ${account.name}.`);
    }
  }
  
  await account.save();

  return newInteraction;
}

export async function updateInteraction(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const interactionId = parameters.interaction_id;
  const account = await getAccount(userInfo, accountId);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interactionId);
  if (!interaction) {
    let interactions = "No interactions on this account.";
    if (account.interactions && account.interactions.length > 0) {
      interactions = account.interactions.map((interaction) => `${interaction.title} (interaction id: ${interaction.id})`).join(", ");
    }
    throw {status: 404, message: `Interaction not found. Available interactions: ${interactions}`}
  }

  let interactionType = parameters.type;
  if (interactionType !== undefined) {
    interactionType = interactionType.toLowerCase();

    const validTypes = ['call', 'email', 'meeting', 'whatsapp', 'note', 'status_change', 'sticky_note'];
    if (!validTypes.includes(interactionType)) {
      throw {status: 400, message: `Interaction type must be one of ${validTypes.join(', ')}`}
    }
  }

  let attendees = fixAttendees(parameters.attendees, account);
  if (typeof attendees === 'string') {
    // get a list of account team members and contacts
    let attendeesList = [];
    if (account.teamMembers && account.teamMembers.length > 0) {
      attendeesList = account.teamMembers.map((member) => member.name);
    }
    if (account.employees && account.employees.length > 0) {
      attendeesList = attendeesList.concat(account.employees.map((employee) => employee.name));
    }
    attendeesList.push(account.owner.name);

    throw {status: 400, message: `${attendees}. Available attendees are: ${attendeesList.join(', ')}`}
  }

  if (parameters.attendees) {
    // send new and deleted attendees notifications
    const oldAttendees = interaction.attendees || [];
    const newAttendees = attendees || [];
    const addedAttendees = newAttendees.filter((newAttendee) =>
      !oldAttendees.some((oldAttendee) => oldAttendee.id === newAttendee.id)
    );
    const removedAttendees = oldAttendees.filter((oldAttendee) =>
      !newAttendees.some((newAttendee) => newAttendee.id === oldAttendee.id)
    );

    for (const attendee of addedAttendees) {
      if (attendee.id !== account.owner.id && attendee.id !== userInfo.userId && attendee.phone) {
        await sendNotification(attendee.phone, `${userInfo.name} added you to an existing ${interaction.type} (${interaction.title}) on ${account.name}.`);
      }
    }

    for (const attendee of removedAttendees) {
      if (attendee.id !== account.owner.id && attendee.id !== userInfo.userId && attendee.phone) {
        await sendNotification(attendee.phone, `${userInfo.name} removed you from an existing ${interaction.type} (${interaction.title}) on ${account.name}.`);
      }
    }
  }
  
  if (interactionType !== undefined) interaction.type = interactionType;
  if (parameters.timestamp !== undefined) interaction.timestamp = parameters.timestamp;
  if (parameters.title !== undefined) interaction.title = parameters.title;
  if (parameters.description !== undefined) interaction.description = parameters.description;
  if (parameters.metadata !== undefined) interaction.metadata = parameters.metadata;
  if (parameters.isSticky !== undefined) interaction.isSticky = parameters.isSticky;
  if (parameters.attendees) interaction.attendees = attendees;
  interaction.updatedAt = new Date();
  interaction.updatedBy = {
    id: userInfo.userId,
    name: userInfo.name,
    email: userInfo.email,
  };

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} updated a ${interaction.type} (${interaction.title}) on ${account.name}.`);
  
  await account.save();

  return interaction;
}

export async function deleteInteraction(parameters) {
  const userInfo = parameters.userInfo;
  const accountId = parameters.account_id;
  const interactionId = parameters.interaction_id;
  const account = await getAccount(userInfo, accountId);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
  }

  // Flatten interactions
  account.interactions = account.interactions.map((m) =>
    typeof m.toObject === "function" ? m.toObject() : m
  );

  const interactionTitle = account.interactions.find((interaction) => interaction.id === interactionId)?.title;

  const interactionIndex = account.interactions.findIndex((interaction) => interaction.id === interactionId);
  if (interactionIndex === -1) {
    let interactions = "No interactions on this account.";
    if (account.interactions && account.interactions.length > 0) {
      interactions = account.interactions.map((interaction) => `${interaction.title} (interaction id: ${interaction.id})`).join(", ");
    }
    throw { status: 404, message: `Interaction not found. Available interactions: ${interactions}` };
  }

  account.interactions.splice(interactionIndex, 1);
  
  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} removed ${interactionTitle} from ${account.name}.`);
  
  await account.save();
}

export async function unstickInteraction(userInfo, { account_id, interaction_id }) {
  const account = await getAccount(userInfo, account_id);
  if (!account) {
    const accounts = await getAllAccounts(userInfo);
    const accountNames = accounts.map((a) => `${a.name} (account id: ${a.id})`).join(", ");
    throw { status: 404, message: `Account not found. Available accounts: ${accountNames}` };
  }

  const interaction = account.interactions.find((interaction) => interaction.id === interaction_id);
  if (!interaction) {
    let interactions = "No interactions on this account.";
    if (account.interactions && account.interactions.length > 0) {
      interactions = account.interactions.map((interaction) => `${interaction.title} (interaction id: ${interaction.id})`).join(", ");
    }
    throw { status: 404, message: `Interaction not found. Available interactions: ${interactions}` };
  }

  interaction.isSticky = false;

  if (account.owner.id !== userInfo.userId)
    await sendNotification(account.owner.phone, `${userInfo.name} unstick'd "${interaction.title}" on ${account.name}.`);
  
  await account.save();

  return interaction;
}

export async function getLatestInteractions({ userInfo }) {
  const accounts = await getAllAccounts(userInfo);
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

  return interactionsAcrossAccounts.slice(0, 5);
}