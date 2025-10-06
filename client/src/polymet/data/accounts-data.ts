import axios from './axios';
import { ActionItem } from '@/polymet/data/action-items-data';

export type AccountEmployee = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  notes?: string;
  avatar?: string; // URL to the employee's avatar image
  //meetings?: string[]; // IDs of meetings they've attended
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
  };
  title: string;
  description?: string;
  attendees?: {
    id: string;
    name: string;
    email: string;
  }[]
  metadata?: Record<string, any>;
  isSticky?: boolean;
};

export type Account = {
  id?: string;
  name: string;
  domain?: string;
  logo?: string;
  description?: string;
  industry?: string;
  accountType?: "Client" | "Partner";
  website?: string;
  createdAt?: string;
  updatedAt?: string;
  status: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  teamMembers?: {
    id: string;
    name: string;
    email: string;
  }[];
  employees?: AccountEmployee[];
  interactions?: AccountInteraction[];
  actionItems?: ActionItem[];
  metrics?: {
    contractValue?: number;
    pocValue?: number;
    probability?: number;
  };
};

export type SimpleAccount = {
  id: string;
  name: string;
  status: string;
  description: string;
  industry: string;
  accountType: "Client" | "Partner";
  numberOfContacts: number;
  numberOfInteractions: number;
  numberOfTeamMembers: number;
  updatedAt: Date;
  lastInteractionDate?: Date;
  metrics?: {
    contractValue?: number;
    pocValue?: number;
    probability?: number;
  }
}


export type User = {
  id: string;
  name: string;
  email: string;
};

// Mock users data
let USERS: User[] | undefined = undefined;

// Helper function to filter accounts by domain
export const getAccounts = async (): Promise<SimpleAccount[]> => {
  const response = await axios.get('/accounts');
  return response.data as SimpleAccount[];
};

// Helper function to get an account by ID
export const getAccountById = async (id: string): Promise<Account> => {
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
  return response.data as Account;
}

export const updateAccount = async (account: Account): Promise<Account> => {
  const response = await axios.put(`/accounts/${account.id}`, account);
  return response.data as Account;
}

export const deleteAccount = async (id: string): Promise<void> => {
  await axios.delete(`/accounts/${id}`);
}

export const addTeamMemberToAccount = async(accountId: string, team_member_id: string): Promise<void> => {
  const response = await axios.post(`/accounts/${accountId}/teamMembers`, { team_member_id });
  return response.data;
}

export const removeTeamMemberFromAccount = async(accountId: string, team_member_id: string): Promise<void> => {
  await axios.delete(`/accounts/${accountId}/teamMembers/${team_member_id}`);
}

export const transferAccountOwnership = async(accountId: string, id: string): Promise<void> => {
  const response = await axios.put(`/accounts/${accountId}/transferOwnership`, { id });
  return response.data;
}

export const addContactToAccount = async(accountId: string, contact: AccountEmployee): Promise<AccountEmployee> => {
  const response = await axios.post(`/accounts/${accountId}/contacts`, contact);
  return response.data;
}

export const updateAccountContact = async(accountId: string, contact: AccountEmployee): Promise<AccountEmployee> => {
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

export const finalizeSignUp = async(s: string): Promise<void> => {
  const response = await axios.put(`/finalizeSignUp`, { s });
  return response.data;
}