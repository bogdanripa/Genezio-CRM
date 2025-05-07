import { Button, ButtonProps } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface AccountEditButtonProps extends ButtonProps {
  accountId: string;
}

export default function AccountEditButton({
  accountId,
  variant = "outline",
  size = "default",
  ...props
}: AccountEditButtonProps) {
  return (
    <Button variant={variant} size={size} asChild {...props}>
      <Link to={`/accounts/${accountId}/edit`}>
        <PencilIcon className="h-4 w-4 mr-2" />
        Edit Account
      </Link>
    </Button>
  );
}
