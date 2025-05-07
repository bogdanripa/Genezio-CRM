import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AccountStatus =
  | "lead"
  | "prospect"
  | "qualified"
  | "negotiation"
  | "closed-won"
  | "closed-lost"
  | "churned";

interface AccountStatusBadgeProps {
  status: AccountStatus;
  className?: string;
}

export default function AccountStatusBadge({
  status,
  className,
}: AccountStatusBadgeProps) {
  const getStatusConfig = (status: AccountStatus) => {
    switch (status) {
      case "lead":
        return {
          label: "Lead",
          variant:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        };
      case "prospect":
        return {
          label: "Prospect",
          variant:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        };
      case "qualified":
        return {
          label: "Qualified",
          variant:
            "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
        };
      case "negotiation":
        return {
          label: "Negotiation",
          variant:
            "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
        };
      case "closed-won":
        return {
          label: "Closed Won",
          variant:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        };
      case "closed-lost":
        return {
          label: "Closed Lost",
          variant: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
      case "churned":
        return {
          label: "Churned",
          variant:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        };
      default:
        return {
          label:
            status.charAt(0).toUpperCase() + status.slice(1).replace("-", " "),
          variant:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", config.variant, className)}
    >
      {config.label}
    </Badge>
  );
}
