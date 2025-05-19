import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UsersIcon } from "lucide-react";
import { SimpleAccount } from "@/polymet/data/accounts-data";
import AccountStatusBadge from "@/polymet/components/account-status-badge";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface AccountCardProps {
  account: SimpleAccount;
}

export default function AccountCard({ account }: AccountCardProps) {
  // Find the most recent interaction timestamp
  const lastInteractionDate = account.lastInteractionDate;

  const lastInteractionText =
    lastInteractionDate
      ? formatDistanceToNow(lastInteractionDate, { addSuffix: true })
      : "No interactions yet";

  return (
    <Link to={`/accounts/${account.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full cursor-pointer">
        <CardHeader className="p-4 pb-2 flex flex-row gap-4 items-center">
          <Avatar className="h-12 w-12">
            <AvatarFallback title={account.name}>
              {account.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg truncate">{account.name}</h3>
              <AccountStatusBadge status={account.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {account.industry || "No industry specified"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 pb-2">
          <div className="text-sm text-muted-foreground">
            {account.description && (
              <p className="line-clamp-2">{account.description}</p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm">
              <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />

              <span className="text-muted-foreground">
                {account.numberOfContacts} employee
                {account.numberOfContacts !== 1 ? "s" : ""},
                &nbsp;
                {account.numberOfTeamMembers} contact
                {account.numberOfTeamMembers !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />

              <span className="text-muted-foreground">
                Last interaction: {lastInteractionText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
