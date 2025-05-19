import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
} from "lucide-react";
import { AccountEmployee } from "@/polymet/data/accounts-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface EmployeeCardProps {
  employee: AccountEmployee;
  onViewMeetings?: (employeeId: string) => void;
  onEdit?: (employeeId: string) => void;
  onDelete?: (employeeId: string) => void;
}

export default function EmployeeCard({
  employee,
  onViewMeetings,
  onEdit,
  onDelete,
}: EmployeeCardProps) {
  const [details, setDetails] = useState(employee.details || "");

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {employee.avatar ? (
              <AvatarImage src={employee.avatar} alt={employee.name} />
            ) : (
              <AvatarFallback title={employee.name}>
                {employee.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold">{employee.name}</h3>
            <p className="text-sm text-muted-foreground">{employee.role}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(employee.id)}>
              <EditIcon className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(employee.id)}>
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        <div className="flex items-center text-sm">
          <MailIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <a
            href={`mailto:${employee.email}`}
            className="text-muted-foreground hover:text-primary"
          >
            {employee.email}
          </a>
        </div>
        {employee.phone && (
          <div className="flex items-center text-sm">
            <PhoneIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${employee.phone}`}
              className="text-muted-foreground hover:text-primary"
            >
              {employee.phone}
            </a>
          </div>
        )}
        <div className="mt-3">
          <label
            htmlFor={`employee-details-${employee.id}`}
            className="text-sm font-medium mb-1 block"
          >
            Notes
          </label>
          <Textarea
            id={`employee-details-${employee.id}`}
            placeholder="Add notes about this employee..."
            className="resize-none text-sm"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-between items-center">
        <div className="flex items-center text-sm">
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {employee.meetings.length} meeting
            {employee.meetings.length !== 1 ? "s" : ""}
          </span>
        </div>
        {employee.meetings.length > 0 && (
          <Badge
            variant="secondary"
            onClick={() => onViewMeetings?.(employee.id)}
            className="cursor-pointer"
          >
            Last meeting: {new Date().toLocaleDateString()}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
