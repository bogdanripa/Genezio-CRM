import { useEffect, useState } from "react";
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
import { User, getUsers } from "@/polymet/data/accounts-data";
import { get } from "http";

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMember: (userId: string) => void;
  currentTeamMemberIds: string[];
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export default function TeamMemberDialog({
  open,
  onOpenChange,
  onAddMember,
  currentTeamMemberIds,
  title = "Add Team Member",
  description = "Add a team member to this account",
  confirmLabel = "Add Member",
}: TeamMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    const getAvailableUsers = async () => {
      const allUsers = await getUsers();
      const au = allUsers.filter(
        (user) => !currentTeamMemberIds.includes(user.userId)
      );
      setAvailableUsers(au);
    }
    getAvailableUsers();
  }, []);

  const handleConfirm = () => {
    if (selectedUserId) {
      onAddMember(selectedUserId);
      setSelectedUserId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user" className="text-right">
              User
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length > 0 ? (
                  availableUsers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-users" disabled>
                    No available users
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
          <Button onClick={handleConfirm} disabled={!selectedUserId}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
