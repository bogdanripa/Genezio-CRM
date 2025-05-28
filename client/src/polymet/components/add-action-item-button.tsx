import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface AddActionItemButtonProps {
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function AddInteractionButton({
  onClick,
  variant = "default",
  size = "default",
}: AddActionItemButtonProps) {
  return (
    <Button onClick={onClick} variant={variant} size={size}>
      <PlusIcon className="mr-2 h-4 w-4" />
      Action Item
    </Button>
  );
}
