import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeftIcon, ClipboardIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Account,
  getAccountById,
  AccountInteraction,
  addTeamMemberToAccount,
  removeTeamMemberFromAccount,
  transferAccountOwnership,
  addInteractionToAccount,
  updateInteractionInAccount,
  deleteInteractionFromAccount,
  unStickNote
} from "@/polymet/data/accounts-data";
import AccountStatusBadge from "@/polymet/components/account-status-badge";
import AccountTimeline from "@/polymet/components/account-timeline";
import StickyNote from "@/polymet/components/sticky-note";
import TeamMembersCard from "@/polymet/components/team-members-card";
import KeyContactsCard from "@/polymet/components/key-contacts-card";
import AddInteractionButton from "@/polymet/components/add-interaction-button";
import AddEditInteractionDialog from "@/polymet/components/add-edit-interaction-dialog";
import AccountEditButton from "@/polymet/components/account-edit-button";
import ActionItemsCard from "@/polymet/components/action-items-card";
import {
  ActionItem,
  completeActionItem,
  updateActionItem,
} from "@/polymet/data/action-items-data";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function AccountDetailPage() {
  const { accountId = "" } = useParams();
  const [addInteractionDialogOpen, setAddInteractionDialogOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [editInteraction, setEditInteraction] = useState<AccountInteraction | undefined>(undefined);

  useEffect(() => {
    const fetchAccount = async () => {
      setAccount(await getAccountById(accountId));
    };
    fetchAccount();
  }, [accountId]);

  if (account === null) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <p className="mb-4">Fetching account details, please wait.</p>
      </div>
    );
  }

  if (!account?.id) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Account not found</h1>
        <p className="mb-4">
          The account you're looking for doesn't exist or you don't have access
          to it.
        </p>
        <Button asChild>
          <Link to="/accounts">Back to Accounts</Link>
        </Button>
      </div>
    );
  }

  // Find the most recent interaction timestamp
  const lastInteractionDate =
    account.interactions.length > 0
      ? new Date(
          Math.max(
            ...account.interactions.map((i) => new Date(i.timestamp).getTime())
          )
        )
      : new Date(account.updatedAt);

  const lastInteractionText =
    account.interactions.length > 0
      ? formatDistanceToNow(lastInteractionDate, { addSuffix: true })
      : "No interactions yet";

  const handleAddInteraction = (interaction: AccountInteraction) => {
    addInteractionToAccount(accountId, interaction).then((newInteraction) => {
      // Update account with new interaction
      const updatedAccount = {
        ...account,
        interactions: [newInteraction, ...account.interactions],
        updatedAt: new Date().toISOString(),
      };

      // If this is a status change interaction, update the account status
      if (interaction.type === "status_change" && interaction.title) {
        const statusMatch = interaction.title.match(/to\s+(\S+)$/);
        if (statusMatch && statusMatch[1]) {
          const newStatus = statusMatch[1].toLowerCase().replace(/\s+/g, "-");
          updatedAccount.status = newStatus as any;
          toast({
            title: "Status Updated",
            description: `Account status changed to ${newStatus}`,
          });
        }
      }

     setAccount(updatedAccount);
      toast({
        title: "Interaction Added",
        description: `${interaction.type?.charAt(0).toUpperCase() + interaction.type?.slice(1).replace("_", " ")} has been added`,
      });
    });
  };

  const handleEditInteraction = (interaction: AccountInteraction) => {
      updateInteractionInAccount(accountId, interaction).then((updatedInteraction) => {
        const updatedInteractions = account.interactions.map((i) =>
          i.id === updatedInteraction.id ? updatedInteraction : i
        );

        // If this is a status change interaction, update the account status
        if (updatedInteraction.type === "status_change" && updatedInteraction.title) {
          const statusMatch = updatedInteraction.title.match(/to\s+(\S+)$/);
          if (statusMatch && statusMatch[1]) {
            const newStatus = statusMatch[1].toLowerCase().replace(/\s+/g, "-");
            account.status = newStatus as any;
            toast({
              title: "Status Updated",
              description: `Account status changed to ${newStatus}`,
            });
          }
        }

        setAccount({
          ...account,
          interactions: updatedInteractions,
        });
        toast({
          title: "Interaction Updated",
          description: `${interaction.type?.charAt(0).toUpperCase() + interaction.type?.slice(1).replace("_", " ")} has been updated`,
        });
    });
  };

  const deleteInteraction = (interactionId: string) => {
    deleteInteractionFromAccount(accountId, interactionId).then(() => {
      const updatedInteractions = account.interactions.filter(
        (interaction) => interaction.id !== interactionId
      );

      setAccount({
        ...account,
        interactions: updatedInteractions,
      });

      toast({
        title: "Interaction Deleted",
        description: "The interaction has been deleted",
      });
    });
  };

  const handleUpdateEmployees = (employees) => {
    setAccount({
      ...account,
      employees,
    });
  };

  const handleAddMember = (id: string) => {
    // In a real app, this would make an API call
    // For now, we'll just use the first user as a placeholder

    addTeamMemberToAccount(accountId, id).then((newMember) => {
      setAccount({
        ...account,
        teamMembers: [...account.teamMembers, newMember],
      });

      toast({
        title: "Team Member Added",
        description: `${newMember.name} has been added to the team`,
      });
    });
  };

  const handleRemoveMember = (id: string) => {

    removeTeamMemberFromAccount(accountId, id).then(() => {
      setAccount({
        ...account,
        teamMembers: account.teamMembers.filter((member) => member.id !== id),
      });

      toast({
        title: "Team Member Removed",
        description: "The team member has been removed from this account",
      });
    });
  };

  const handleTransferOwnership = (id: string) => {
    const newOwner = account.teamMembers.find((member) => member.id === id);
    if (!newOwner) return;

    transferAccountOwnership(accountId, id).then(() => {
      setAccount({
        ...account,
        owner: newOwner,
      });

      toast({
        title: "Ownership Transferred",
        description: `Account ownership has been transferred to ${newOwner.name}`,
      });
    });
  };

  const handleUnstickNote = (noteId: string) => {
    const updatedInteractions = account.interactions.map((interaction) => {
      if (interaction.id === noteId) {
        unStickNote(account.id, noteId);
        return { ...interaction, isSticky: false };
      }
      return interaction;
    });

    setAccount({
      ...account,
      interactions: updatedInteractions,
    });

    toast({
      title: "Note Unstuck",
      description: "The note has been removed from sticky notes",
    });
  };

  const handleCompleteActionItem = (actionItemId: string) => {
    const updatedInteractions = completeActionItem(
      account.id,
      account.interactions,
      actionItemId
    );

    setAccount({
      ...account,
      interactions: updatedInteractions,
    });

    toast({
      title: "Action Item Completed",
      description: "The action item has been marked as complete",
    });
  };

  const handleUpdateActionItem = (
    actionItemId: string,
    updates: Partial<ActionItem>
  ) => {
    const updatedInteractions = updateActionItem(
      account.id,
      account.interactions,
      actionItemId,
      updates
    );

    setAccount({
      ...account,
      interactions: updatedInteractions,
    });

    toast({
      title: "Action Item Updated",
      description: "The action item has been updated",
    });
  };

  const handleAddActionItem = (actionItem: Partial<ActionItem>) => {
    // Create a new note interaction with the action item
    const newInteraction: Partial<AccountInteraction> = {
      type: "note",
      title: "Action Item Added",
      description: `Added action item: ${actionItem.title}`,
      timestamp: new Date().toISOString(),
      actionItems: [
        {
          id: `action-${Date.now()}`,
          title: actionItem.title || "",
          dueDate: actionItem.dueDate || new Date().toISOString(),
          completed: false,
          createdAt: new Date().toISOString(),
          interactionId: `interaction-${Date.now()}`,
        },
      ],
    };

    handleAddInteraction(newInteraction);
  };

  const stickyNotes = account.interactions.filter(
    (interaction) => interaction.type === "sticky_note" && interaction.isSticky
  );

  return (
    <div className="container mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/accounts">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <AccountStatusBadge status={account.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(account.website || "");
              toast({
                title: "Copied to clipboard",
                description: "Website URL has been copied to clipboard",
              });
            }}
            className="h-9 w-9"
          >
            <ClipboardIcon className="h-4 w-4" />
          </Button>
          <AccountEditButton accountId={account.id} />

          <AddInteractionButton
            onClick={() => setAddInteractionDialogOpen(true)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Account details and timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details Card */}
            <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                <div className="space-y-4">
                  { account.description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Description
                      </h4>
                      <p className="mt-1">
                        {account.description || "No description available"}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Last Interaction
                      </h4>
                      <div className="mt-1 flex items-center">
                        <span className="mr-2">🕒</span>
                        {lastInteractionText}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Website
                      </h4>
                      <div className="mt-1 flex items-center">
                        <span className="mr-2">🔗</span>
                        <a
                          href={account.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {account.website?.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Industry
                      </h4>
                      <div className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        {account.industry || "Unknown"}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Created on
                      </h4>
                      <p className="mt-1 text-sm">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Contract Value
                      </h4>
                      <p className="mt-1 text-lg font-semibold">
                        $
                        {account.metrics?.contractValue?.toLocaleString() ||
                          "0"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        POC Value
                      </h4>
                      <p className="mt-1 text-lg font-semibold">
                        $
                        {account.metrics?.pocValue?.toLocaleString() ||
                          "0"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Probability
                      </h4>
                      <p className="mt-1 text-lg font-semibold">
                        {account.metrics?.probability || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Timeline */}
            <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Account Timeline</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  History of interactions with this account
                </p>
                <AccountTimeline
                  interactions={account.interactions}
                  setEditInteraction={setEditInteraction}
                  deleteInteraction={deleteInteraction}
                />
              </div>
            </div>
          </div>

          {/* Right column - Sticky notes, action items, and team members */}
          <div className="space-y-6">
            {/* Sticky Notes */}
            <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Sticky Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      Important notes for this account
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {stickyNotes.length > 0 ? (
                    stickyNotes.map((note) => (
                      <StickyNote
                        key={note.id}
                        note={note}
                        onUnstick={handleUnstickNote}
                      />
                    ))
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No sticky notes yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Items */}
            <ActionItemsCard
              account={account}
              onCompleteActionItem={handleCompleteActionItem}
              onUpdateActionItem={handleUpdateActionItem}
              onAddActionItem={handleAddActionItem}
            />

            {/* Team Members */}
            <TeamMembersCard
              account={account}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onTransferOwnership={handleTransferOwnership}
            />

            {/* Key Contacts */}
            <KeyContactsCard
              account={account}
              onUpdateEmployees={handleUpdateEmployees}
            />
          </div>
        </div>
      </div>

      {/* Add Interaction Dialog */}
      <AddEditInteractionDialog
        open={addInteractionDialogOpen}
        onOpenChange={setAddInteractionDialogOpen}
        onAddInteraction={handleAddInteraction}
        currentStatus={account.status}
        accountTeamMembers={[account.owner, ...account.teamMembers]}
        accountContacts={account.employees}
      />

      <AddEditInteractionDialog
        open={!!editInteraction}
        key={editInteraction?.id}
        onOpenChange={() => setEditInteraction(undefined)}
        onEditInteraction={handleEditInteraction}
        currentStatus={account.status}
        initialInteraction={editInteraction}
        accountTeamMembers={[account.owner, ...account.teamMembers]}
        accountContacts={account.employees}
      />
    </div>
  );
}
