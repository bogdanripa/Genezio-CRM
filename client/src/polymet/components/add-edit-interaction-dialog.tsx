import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeopleSelector from "@/components/ui/people-selector";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CalendarIcon,
  MessageCircle,
  Mail,
  Phone,
  PinIcon,
  ArrowRightIcon,
  CheckSquare,
  Plus,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AccountInteraction,
  AccountStatus,
} from "@/polymet/data/accounts-data";
import AccountStatusBadge from "@/polymet/components/account-status-badge";

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddInteraction: (interaction: Partial<AccountInteraction>) => void;
  onEditInteraction?: (id: string, updates: Partial<AccountInteraction>) => void;
  currentStatus?: AccountStatus;
  initialInteraction?: AccountInteraction;
  accountTeamMembers?: any[];
  accountContacts?: any[];
}

export default function AddEditInteractionDialog({
  open,
  onOpenChange,
  onAddInteraction,
  onEditInteraction,
  currentStatus = "lead",
  initialInteraction,
  accountTeamMembers = [],
  accountContacts = [],
}: AddInteractionDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(
    initialInteraction?.type === "meeting" ||
    initialInteraction?.type === "call" ||
    initialInteraction?.type === "email"
      ? initialInteraction.type
      : initialInteraction?.type
        ? "more"
        : "meeting"
  );
  const [activeSubTab, setActiveSubTab] = useState<string>(
    initialInteraction &&
    initialInteraction.type !== "meeting" &&
    initialInteraction.type !== "call" &&
    initialInteraction.type !== "email"
      ? initialInteraction.type
      : ""
  );
  const [title, setTitle] = useState(initialInteraction?.title || "");
  const [description, setDescription] = useState(initialInteraction?.description || "");
  const [newStatus, setNewStatus] = useState<AccountStatus>(
    initialInteraction?.type === "status_change" && initialInteraction?.metadata?.to
      ? initialInteraction.metadata.to
      : currentStatus
  );
  const [isSticky, setIsSticky] = useState(
    initialInteraction?.type === "sticky_note" && initialInteraction?.isSticky ? true : false
  );
  const [date, setDate] = useState<Date>(
    initialInteraction?.timestamp ? new Date(initialInteraction.timestamp) : new Date()
  );
  const [duration, setDuration] = useState(
    initialInteraction?.metadata?.duration
      ? String(initialInteraction.metadata.duration)
      : "30"
  );
  const [attendees, setAttendees] = useState(
    initialInteraction?.attendees
      ? initialInteraction.attendees
      : []
  );

  const resetForm = () => {
    setActiveTab(
      initialInteraction?.type === "meeting" ||
      initialInteraction?.type === "call" ||
      initialInteraction?.type === "email"
        ? initialInteraction.type
        : initialInteraction?.type
          ? "more"
          : "meeting"
    );
    setActiveSubTab(
      initialInteraction &&
      initialInteraction.type !== "meeting" &&
      initialInteraction.type !== "call" &&
      initialInteraction.type !== "email"
        ? initialInteraction.type
        : ""
    );
    setTitle(initialInteraction?.title || "");
    setDescription(initialInteraction?.description || "");
    setNewStatus(
      initialInteraction?.type === "status_change" && initialInteraction?.metadata?.to
        ? initialInteraction.metadata.to
        : currentStatus
    );
    setIsSticky(
      initialInteraction?.type === "sticky_note" && initialInteraction?.isSticky ? true : false
    );
    setDate(
      initialInteraction?.timestamp ? new Date(initialInteraction.timestamp) : new Date()
    );
    setDuration(
      initialInteraction?.metadata?.duration
        ? String(initialInteraction.metadata.duration)
        : "30"
    );
    setAttendees(
      initialInteraction?.attendees
        ? initialInteraction.attendees
        : []
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleAddInteraction = () => {
    if (!title.trim()) return;

    const baseInteraction: Partial<AccountInteraction> = {
      type: activeTab as any,
      title,
      description: description.trim() || undefined,
      timestamp: date.toISOString(),
    };
    if (activeTab === "more") {
      baseInteraction.type = activeSubTab as any;
    }

    // Add type-specific data
    if (baseInteraction.type === "meeting") {
      baseInteraction.metadata = {
        duration: parseInt(duration),
      };
    } else if (baseInteraction.type === "status_change") {
      baseInteraction.title = `Status changed from ${currentStatus} to ${newStatus}`;
      baseInteraction.metadata = {
        from: currentStatus,
        to: newStatus,
      };
    } else if (baseInteraction.type === "sticky_note") {
      baseInteraction.isSticky = isSticky;
    }

    baseInteraction.attendees = attendees;

    if (initialInteraction?.id) {
      baseInteraction.id = initialInteraction.id;
    }

    if (initialInteraction && onEditInteraction) {
      onEditInteraction(baseInteraction);
    } else {
      onAddInteraction(baseInteraction);
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {initialInteraction ? "Edit Interaction" : "Add Interaction"}
          </DialogTitle>
          <DialogDescription>
            {initialInteraction
              ? "Update this interaction's details"
              : "Record a new interaction with this account"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="meeting" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Meeting</span>
            </TabsTrigger>
            <TabsTrigger value="call" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Call</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="more" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </TabsTrigger>
          </TabsList>

          {/* Meeting Tab */}
          <TabsContent value="meeting" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="meeting-title">Meeting Title</Label>
                <Input
                  id="meeting-title"
                  placeholder="Initial Discovery Call"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  placeholder="Discussed their current software needs and pain points"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="meeting-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={(date) => date && setDate(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="meeting-duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meeting-attendees">Attendees</Label>
                <PeopleSelector
                  teamMembers={accountTeamMembers}
                  contacts={accountContacts}
                  selectedPeople={attendees}
                  onChange={(people) => setAttendees(people)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Call Tab */}
          <TabsContent value="call" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="call-title">Call Title</Label>
                <Input
                  id="call-title"
                  placeholder="Follow-up Call"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="call-description">Description</Label>
                <Textarea
                  id="call-description"
                  placeholder="Discussed next steps and timeline"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="call-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id="call-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="call-duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="call-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-attendees">Attendees</Label>
                <PeopleSelector
                  teamMembers={accountTeamMembers}
                  contacts={accountContacts}
                  selectedPeople={attendees}
                  onChange={(people) => setAttendees(people)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email-title">Email Subject</Label>
                <Input
                  id="email-title"
                  placeholder="Follow-up Email"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email-description">Content</Label>
                <Textarea
                  id="email-description"
                  placeholder="Sent product information and pricing details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id="email-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-attendees">Attendees</Label>
                <PeopleSelector
                  teamMembers={accountTeamMembers}
                  contacts={accountContacts}
                  selectedPeople={attendees}
                  onChange={(people) => setAttendees(people)}
                />
              </div>
            </div>
          </TabsContent>

          {/* More Tab */}
          <TabsContent value="more" className="space-y-4">
            <Tabs defaultValue="whatsapp" className="w-full" onValueChange={setActiveSubTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="status_change">Status Change</TabsTrigger>
                <TabsTrigger value="sticky_note">Note</TabsTrigger>
              </TabsList>

              {/* WhatsApp Tab */}
              <TabsContent value="whatsapp" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="whatsapp-title">Message Title</Label>
                    <Input
                      id="whatsapp-title"
                      placeholder="WhatsApp Message"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="whatsapp-description">Content</Label>
                    <Textarea
                      id="whatsapp-description"
                      placeholder="Quick check-in about contract review progress"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="whatsapp-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="whatsapp-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meeting-attendees">Attendees</Label>
                    <PeopleSelector
                      teamMembers={accountTeamMembers}
                      contacts={accountContacts}
                      selectedPeople={attendees}
                      onChange={(people) => setAttendees(people)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Status Change Tab */}
              <TabsContent value="status_change" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status-from">Current Status</Label>
                    <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                      <AccountStatusBadge status={currentStatus} />
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRightIcon className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status-to">New Status</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) =>
                        setNewStatus(value as AccountStatus)
                      }
                    >
                      <SelectTrigger id="status-to">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="closed-won">Closed Won</SelectItem>
                        <SelectItem value="closed-lost">Closed Lost</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="status-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status-description">Notes</Label>
                    <Textarea
                      id="status-description"
                      placeholder="Reason for status change"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Note Tab */}
              <TabsContent value="sticky_note" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="note-title">Note Title</Label>
                    <Input
                      id="note-title"
                      placeholder="Budget Approval"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="note-description">Content</Label>
                    <Textarea
                      id="note-description"
                      placeholder="Client confirmed they have budget approval for Q3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="note-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="note-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sticky"
                        checked={isSticky}
                        onChange={(e) => setIsSticky(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />

                      <Label htmlFor="sticky" className="flex items-center">
                        <PinIcon className="h-4 w-4 mr-1" />
                        Pin to account
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddInteraction} disabled={!title.trim()}>
            {initialInteraction ? "Update Interaction" : "Add Interaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}