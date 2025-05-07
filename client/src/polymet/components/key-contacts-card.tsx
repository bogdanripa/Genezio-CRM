import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import { Account, AccountEmployee, addContactToAccount, removeContactFromAccount, updateAccountContact } from "@/polymet/data/accounts-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ContactDetailDialog from "@/polymet/components/contact-detail-dialog";
import { toast } from "@/hooks/use-toast";

interface KeyContactsCardProps {
  account: Account;
  onUpdateEmployees: (employees: AccountEmployee[]) => void;
}

export default function KeyContactsCard({
  account,
  onUpdateEmployees,
}: KeyContactsCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<
    AccountEmployee | undefined
  >(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewContact, setIsNewContact] = useState(false);

  const filteredEmployees = account.employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = () => {
    setSelectedContact(undefined);
    setIsNewContact(true);
    setIsDialogOpen(true);
  };

  const handleEditContact = (employee: AccountEmployee) => {
    setSelectedContact(employee);
    setIsNewContact(false);
    setIsDialogOpen(true);
  };

  const handleSaveContact = (updatedContact: AccountEmployee) => {
    let updatedEmployees: AccountEmployee[];

    if (isNewContact) {
      addContactToAccount(account.id, updatedContact).then(updatedContact => {
        updatedEmployees = [...account.employees, updatedContact];
        toast({
          title: "Contact added",
          description: `${updatedContact.name} has been added to the contacts.`,
        });
        onUpdateEmployees(updatedEmployees);
      });
    } else {
      updateAccountContact(account.id, updatedContact).then(updatedContact => {
        updatedEmployees = account.employees.map((emp) =>
          emp.id === updatedContact.id ? updatedContact : emp
        );
        toast({
          title: "Contact updated",
          description: `${updatedContact.name}'s information has been updated.`,
        });
        onUpdateEmployees(updatedEmployees);
      });
    }

  };

  const handleDeleteContact = (contactId: string) => {
    removeContactFromAccount(account.id, contactId).then(() => {
      const updatedEmployees = account.employees.filter(
        (emp) => emp.id !== contactId
      );

      const deletedContact = account.employees.find(
        (emp) => emp.id === contactId
      );

      toast({
        title: "Contact deleted",
        description: `${deletedContact?.name || "Contact"} has been removed.`,
        variant: "destructive",
      });

      onUpdateEmployees(updatedEmployees);
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>People working at {account.name}</CardDescription>
          </div>
          <Button onClick={handleAddContact}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Search contacts..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredEmployees.length > 0 ? (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleEditContact(employee)}
                >
                  <Avatar className="h-10 w-10">
                    {employee.avatar ? (
                      <AvatarImage src={employee.avatar} alt={employee.name} />
                    ) : (
                      <AvatarFallback>
                        {employee.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">
                        {employee.name}
                      </div>
                      {employee.meetings.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {employee.meetings.length} meeting
                          {employee.meetings.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {employee.role}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <MailIcon className="mr-1 h-3 w-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center">
                          <PhoneIcon className="mr-1 h-3 w-3" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>
                    {employee.details && (
                      <div className="mt-1 text-xs italic text-muted-foreground truncate">
                        {employee.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-2 text-lg font-medium">No contacts found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Add contacts to keep track of your relationships"}
              </p>
              {searchQuery ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              ) : (
                <Button className="mt-4" onClick={handleAddContact}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add First Contact
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contact={selectedContact}
        onSave={handleSaveContact}
        onDelete={handleDeleteContact}
        isNew={isNewContact}
      />
    </>
  );
}
