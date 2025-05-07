import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountEmployee } from "@/polymet/data/accounts-data";

interface ContactDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: AccountEmployee;
  onSave: (contact: AccountEmployee) => void;
  onDelete?: (contactId: string) => void;
  isNew?: boolean;
}

export default function ContactDetailDialog({
  open,
  onOpenChange,
  contact,
  onSave,
  onDelete,
  isNew = false,
}: ContactDetailDialogProps) {
  const [name, setName] = useState(contact?.name || "");
  const [role, setRole] = useState(contact?.role || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setName(contact?.name || "");
    setRole(contact?.role || "");
    setEmail(contact?.email || "");
    setPhone(contact?.phone || "");
    setNotes(contact?.notes || "");
    setIsDeleting(false);
  }, [contact]);

  const handleSave = () => {
    if (!name || !role || !email) return;

    onSave({
      id: contact?.id || "",
      name,
      role,
      email,
      phone: phone || undefined,
      notes
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (isDeleting && contact?.id && onDelete) {
      onDelete(contact.id);
      onOpenChange(false);
    } else {
      setIsDeleting(true);
    }
  };

  const handleCancel = () => {
    setIsDeleting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add New Contact" : "Edit Contact Details"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Add a new contact to this account"
              : "Make changes to the contact information here"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name*
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role*
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email*
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {!isNew && onDelete && (
              <Button
                variant={isDeleting ? "destructive" : "outline"}
                onClick={handleDelete}
              >
                {isDeleting ? "Confirm Delete" : "Delete Contact"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
