import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircleIcon } from "lucide-react";
import { Account } from "@/polymet/data/accounts-data";

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferOwnership: (userId: string) => void;
  account: Account;
}

export default function TransferOwnershipDialog({
  open,
  onOpenChange,
  onTransferOwnership,
  account,
}: TransferOwnershipDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Filter out the current owner and get team members who could become owner
  const eligibleTeamMembers = account.teamMembers?.filter(
    (member) => member.userId !== account.owner?.userId
  );

  const handleConfirm = () => {
    if (selectedUserId) {
      onTransferOwnership(selectedUserId);
      setSelectedUserId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Account Ownership</DialogTitle>
          <DialogDescription>
            Transfer ownership of {account.name} to another team member
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-md">
            <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              This action will transfer all ownership rights and cannot be
              undone.
            </p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-owner" className="text-right">
              New Owner
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="col-span-3" id="new-owner">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {eligibleTeamMembers.length > 0 ? (
                  eligibleTeamMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-members" disabled>
                    No eligible team members
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedUserId || eligibleTeamMembers.length === 0}
          >
            Transfer Ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
