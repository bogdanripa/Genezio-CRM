import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare } from "lucide-react";
import {
  ActionItem,
  getActionItemsFromInteractions,
  getCompletedActionItems,
  getIncompleteActionItems,
} from "@/polymet/data/action-items-data";
import { Account } from "@/polymet/data/accounts-data";
import ActionItemComponent from "@/polymet/components/action-item";
import ActionItemDialog from "@/polymet/components/action-item-dialog";

interface ActionItemsCardProps {
  account: Account;
  onCompleteActionItem: (actionItemId: string) => void;
  onUpdateActionItem: (
    actionItemId: string,
    updates: Partial<ActionItem>
  ) => void;
  onAddActionItem?: (actionItem: Partial<ActionItem>) => void;
}

export default function ActionItemsCard({
  account,
  onCompleteActionItem,
  onUpdateActionItem,
  onAddActionItem,
}: ActionItemsCardProps) {
  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(
    null
  );

  // Get all action items from interactions
  const allActionItems = getActionItemsFromInteractions(account.interactions);
  const incompleteItems = getIncompleteActionItems(allActionItems);
  const completedItems = getCompletedActionItems(allActionItems);

  const handleEditActionItem = (actionItemId: string) => {
    const actionItem = allActionItems.find((item) => item.id === actionItemId);
    if (actionItem) {
      setEditingActionItem(actionItem);
    }
  };

  const handleSaveActionItem = (actionItem: Partial<ActionItem>) => {
    if (editingActionItem) {
      onUpdateActionItem(editingActionItem.id, actionItem);
      setEditingActionItem(null);
    } else if (onAddActionItem) {
      onAddActionItem(actionItem);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Action Items
            {incompleteItems.length > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {incompleteItems.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Tasks that need to be completed for this account
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active" className="flex items-center gap-1">
                Active
                {incompleteItems.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {incompleteItems.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex items-center gap-1"
              >
                Completed
                {completedItems.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">
                    {completedItems.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-4">
            {incompleteItems.length > 0 ? (
              <div className="space-y-3">
                {incompleteItems.map((item) => (
                  <ActionItemComponent
                    key={item.id}
                    item={item}
                    onComplete={onCompleteActionItem}
                    onEdit={handleEditActionItem}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-2 text-sm font-medium">
                  No active action items
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a new action item to get started.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedItems.length > 0 ? (
              <div className="space-y-3">
                {completedItems.map((item) => (
                  <ActionItemComponent
                    key={item.id}
                    item={item}
                    onComplete={onCompleteActionItem}
                    onEdit={handleEditActionItem}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-2 text-sm font-medium">
                  No completed action items
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete action items to see them here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Action Item Dialog */}
      {editingActionItem && (
        <ActionItemDialog
          open={!!editingActionItem}
          onOpenChange={(open) => !open && setEditingActionItem(null)}
          onSave={handleSaveActionItem}
          actionItem={editingActionItem}
          isNew={false}
        />
      )}
    </Card>
  );
}
