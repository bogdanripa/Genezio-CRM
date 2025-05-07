import axios from './axios';

import { AccountInteraction } from "./accounts-data";

export interface ActionItem {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  interactionId: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

// Helper function to extract action items from interactions
export const getActionItemsFromInteractions = (
  interactions: AccountInteraction[]
): ActionItem[] => {
  return interactions
    .filter((interaction) => interaction.actionItems?.length > 0)
    .flatMap((interaction) => interaction.actionItems || [])
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
export const completeActionItem = (
  accountId: string,
  interactions: AccountInteraction[],
  actionItemId: string
): AccountInteraction[] => {
  return interactions.map((interaction) => {
    if (!interaction.actionItems) return interaction;

    const updatedActionItems = interaction.actionItems.map((item) => {
      if (item.id === actionItemId) {
        const newItem = {
          ...item,
          completed: true,
          completedAt: new Date().toISOString(),
        };
        axios.put(`/accounts/${accountId}/interactions/${interaction.id}/actionItems/${actionItemId}`, newItem);
        return newItem;
      }
      return item;
    });

    return {
      ...interaction,
      actionItems: updatedActionItems,
    };
  });
};

// Helper function to update an action item
export const updateActionItem = (
  accountId: string,
  interactions: AccountInteraction[],
  actionItemId: string,
  updates: Partial<ActionItem>
): AccountInteraction[] => {
  return interactions.map((interaction) => {
    if (!interaction.actionItems) return interaction;

    const updatedActionItems = interaction.actionItems.map((item) => {
      if (item.id === actionItemId) {
        const updatedItem = {
          ...item,
          ...updates,
        };
        axios.put(`/accounts/${accountId}/interactions/${interaction.id}/actionItems/${actionItemId}`, updatedItem);
        return updatedItem;
      }
      return item;
    });

    return {
      ...interaction,
      actionItems: updatedActionItems,
    };
  });
};
