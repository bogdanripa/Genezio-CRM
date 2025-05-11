import axios from './axios';

export type AccountEmployee = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  notes?: string;
  meetings?: string[]; // IDs of meetings they've attended
};

export type InteractionType =
  | "meeting"
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "status_change"
  | "sticky_note";

export type AccountInteraction = {
  id: string;
  type: InteractionType;
  timestamp: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isSticky?: boolean;
};

export type AccountStatus =
  | "lead"
  | "prospect"
  | "qualified"
  | "negotiation"
  | "closed-won"
  | "closed-lost"
  | "churned";

export type Account = {
  id?: string;
  name: string;
  domain?: string;
  logo?: string;
  description?: string;
  industry?: string;
  website?: string;
  createdAt?: string;
  updatedAt?: string;
  status: string;
  owner?: {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
  };
  teamMembers?: {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
  employees?: AccountEmployee[];
  interactions?: AccountInteraction[];
  metrics?: {
    contractValue?: number;
    probability?: number;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
};

// Mock users data
let USERS: User[] | undefined = undefined;

// Mock accounts data
let ACCOUNTS: Account[] | undefined = undefined;;

// Helper function to filter accounts by domain
export const getAccounts = async (): Promise<Account[]> => {
  if (ACCOUNTS) return ACCOUNTS;
  const response = await axios.get('/accounts');
  ACCOUNTS = response.data as Account[];
  return ACCOUNTS;
};

// Helper function to get an account by ID
export const getAccountById = async (id: string): Promise<Account | undefined> => {
  try {
    const response = await axios.get(`/accounts/${id}`);
    return response.data as Account;
  } catch (error) {
    console.error(`Error fetching account with ID ${id}:`, error);
    return {name: 'Account not found'} as Account;
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (USERS) return USERS;
  const response = await axios.get('/users');
  USERS = response.data as User[];
  return USERS;
}

export const createAccount = async (account: Account): Promise<Account> => {
  const response = await axios.post('/accounts', account);
  ACCOUNTS = undefined;
  return response.data as Account;
}

export const updateAccount = async (account: Account): Promise<Account> => {
  const response = await axios.put(`/accounts/${account.id}`, account);
  ACCOUNTS = undefined;
  return response.data as Account;
}

export const deleteAccount = async (id: string): Promise<void> => {
  await axios.delete(`/accounts/${id}`);
  ACCOUNTS = undefined;
}

export const addTeamMemberToAccount = async(accountId: string, userId: string): Promise<void> => {
  const response = await axios.post(`/accounts/${accountId}/teamMembers`, { userId });
  return response.data;
}

export const removeTeamMemberFromAccount = async(accountId: string, userId: string): Promise<void> => {
  await axios.delete(`/accounts/${accountId}/teamMembers/${userId}`);
}

export const transferAccountOwnership = async(accountId: string, userId: string): Promise<void> => {
  const response = await axios.put(`/accounts/${accountId}/transferOwnership`, { userId });
  return response.data;
}

export const addContactToAccount = async(accountId: string, contact: AccountEmployee): Promise<void> => {
  const response = await axios.post(`/accounts/${accountId}/contacts`, contact);
  return response.data;
}

export const updateAccountContact = async(accountId: string, contact: AccountEmployee): Promise<void> => {
  const response = await axios.put(`/accounts/${accountId}/contacts/${contact.id}`, contact);
  return response.data;
}

export const removeContactFromAccount = async(accountId: string, contactId: string): Promise<void> => {
  const response = await axios.delete(`/accounts/${accountId}/contacts/${contactId}`);
  return response.data;
}

export const addInteractionToAccount = async(accountId: string, interaction: AccountInteraction): Promise<void> => {
  const response = await axios.post(`/accounts/${accountId}/interactions`, interaction);
  return response.data;
}

export const updateInteractionInAccount = async(accountId: string, interaction: AccountInteraction): Promise<void> => {
  const response = await axios.put(`/accounts/${accountId}/interactions/${interaction.id}`, interaction);
  return response.data;
}

export const deleteInteractionFromAccount = async(accountId: string, interactionId: string): Promise<void> => {
  await axios.delete(`/accounts/${accountId}/interactions/${interactionId}`);
}

export const unStickNote = async(accountId: string, interactionId: string): Promise<void> => {
  const response = await axios.put(`/accounts/${accountId}/interactions/${interactionId}/unstick`);
  return response.data;
}

export const getLatestInteractions = async(): Promise<any[]> => {
  const response = await axios.get('/interactions/latest');
  return response.data;
}