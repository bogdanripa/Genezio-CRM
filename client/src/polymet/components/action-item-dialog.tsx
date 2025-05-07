import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ActionItem } from "@/polymet/data/action-items-data";

interface ActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (actionItem: Partial<ActionItem>) => void;
  actionItem?: ActionItem;
  isNew?: boolean;
}

export default function ActionItemDialog({
  open,
  onOpenChange,
  onSave,
  actionItem,
  isNew = true,
}: ActionItemDialogProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens or actionItem changes
  useEffect(() => {
    if (actionItem) {
      setTitle(actionItem.title);
      setDueDate(new Date(actionItem.dueDate));
    } else {
      // Set default values for new action item
      setTitle("");
      setDueDate(undefined);
    }
    setError(null);
  }, [actionItem, open]);

  const handleSave = () => {
    // Validate form
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!dueDate) {
      setError("Due date is required");
      return;
    }

    // Create action item object
    const updatedActionItem: Partial<ActionItem> = {
      title: title.trim(),
      dueDate: dueDate.toISOString(),
    };

    // If editing, include the id
    if (actionItem?.id) {
      updatedActionItem.id = actionItem.id;
    }

    onSave(updatedActionItem);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Action Item" : "Edit Action Item"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Create a new action item with a title and due date."
              : "Update the action item details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Follow up with client"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  id="dueDate"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
