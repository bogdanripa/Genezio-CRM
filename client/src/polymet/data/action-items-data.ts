import axios from './axios';

import { Account } from "./accounts-data";

export interface ActionItem {
  id?: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

// Helper function to extract action items from interactions
export const getActionItemsFromAccount = (
  account: Account
): ActionItem[] => {
  if (!account.actionItems) {
    return [];
  }
  // Sort action items by due date
  return account.actionItems
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
};

// Helper function to get only incomplete action items
export const getIncompleteActionItems = (
  actionItems: ActionItem[]
): ActionItem[] => {
  return actionItems.filter((item) => !item.completed);
};

// Helper function to get only completed action items
export const getCompletedActionItems = (
  actionItems: ActionItem[]
): ActionItem[] => {
  return actionItems.filter((item) => item.completed);
};

// Helper function to mark an action item as complete
export const completeActionItem = async (
  accountId: string,
  actionItemId: string
): Promise<ActionItem> => {
  const response = await axios.put(`/accounts/${accountId}/actionItems/${actionItemId}/complete`);
  return response.data as ActionItem;
};

export const deleteActionItem = async (
  accountId: string,
  actionItemId: string
) => {
  await axios.delete(`/accounts/${accountId}/actionItems/${actionItemId}`);
}

// Helper function to update an action item
export const updateActionItem = async (
  accountId: string,
  actionItemId: string,
  updates: Partial<ActionItem>
): Promise<ActionItem> => {
    const response =  await axios.put(`/accounts/${accountId}/actionItems/${actionItemId}`, updates);
    return response.data as ActionItem;
};

export const addActionItem = async (
  accountId: string,
  actionItem: Partial<ActionItem>
): Promise<ActionItem> => {
  const response = await axios.post(`/accounts/${accountId}/actionItems`, actionItem);
  return response.data as ActionItem;
};