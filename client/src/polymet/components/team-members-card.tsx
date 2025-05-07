import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, PlusIcon, UserIcon } from "lucide-react";
import { Account } from "@/polymet/data/accounts-data";
import TeamMemberDialog from "@/polymet/components/team-member-dialog";
import TransferOwnershipDialog from "@/polymet/components/transfer-ownership-dialog";

interface TeamMembersCardProps {
  account: Account;
  onAddMember?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}

export default function TeamMembersCard({
  account,
  onAddMember = () => {},
  onRemoveMember = () => {},
  onTransferOwnership = () => {},
}: TeamMembersCardProps) {
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [transferOwnershipDialogOpen, setTransferOwnershipDialogOpen] =
    useState(false);

  // Get current team member IDs for filtering in the add member dialog
  const currentTeamMemberIds = account.teamMembers.map((member) => member.userId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People from your organization working on this account
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Owner */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Avatar>
            {account.owner.avatar ? (
              <AvatarImage
                src={account.owner.avatar}
                alt={account.owner.name}
              />
            ) : (
              <AvatarFallback>
                {account.owner.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{account.owner.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {account.owner.email}
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Account Owner
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-amber-600 dark:text-amber-400"
                onClick={() => setTransferOwnershipDialogOpen(true)}
              >
                Transfer Ownership
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Team Members */}
        {account.teamMembers?
          .filter((member) => member.userId !== account.owner?.userId)
          .map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-4 p-4 rounded-lg border"
            >
              <Avatar>
                {member.avatar ? (
                  <AvatarImage src={member.avatar} alt={member.name} />
                ) : (
                  <AvatarFallback>
                    {member.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {member.email}
                </div>
              </div>
              <Badge variant="outline" className="ml-auto">
                Team Member
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemoveMember(member.userId)}
                  >
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

        {account.teamMembers.length <= 1 && (
          <div className="text-center py-6 text-muted-foreground">
            <UserIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No team members added yet</p>
            <p className="text-sm">
              Add team members to collaborate on this account
            </p>
          </div>
        )}
      </CardContent>

      {/* Add Member Dialog */}
      <TeamMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        onAddMember={onAddMember}
        currentTeamMemberIds={currentTeamMemberIds}
      />

      {/* Transfer Ownership Dialog */}
      <TransferOwnershipDialog
        open={transferOwnershipDialogOpen}
        onOpenChange={setTransferOwnershipDialogOpen}
        onTransferOwnership={onTransferOwnership}
        account={account}
      />
    </Card>
  );
}
