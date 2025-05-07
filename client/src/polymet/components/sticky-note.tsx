import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PinIcon, XIcon } from "lucide-react";
import { AccountInteraction } from "@/polymet/data/accounts-data";
import { cn } from "@/lib/utils";

interface StickyNoteProps {
  note: AccountInteraction;
  onUnstick?: (noteId: string) => void;
  className?: string;
}

export default function StickyNote({
  note,
  onUnstick,
  className,
}: StickyNoteProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formattedDate = new Date(note.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleUnstick = () => {
    if (onUnstick) {
      onUnstick(note.id);
    }
  };

  return (
    <Card
      className={cn(
        "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
        "hover:shadow-md transition-all",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {note.createdBy.avatar ? (
              <AvatarImage
                src={note.createdBy.avatar}
                alt={note.createdBy.name}
              />
            ) : (
              <AvatarFallback>
                {note.createdBy.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">{note.createdBy.name}</span>
        </div>
        <div
          className="flex items-center h-6" // Fixed height to prevent layout shift
        >
          <PinIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />

          {onUnstick && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 ml-1 text-muted-foreground hover:text-destructive",
                "opacity-0 transition-opacity",
                isHovered && "opacity-100"
              )}
              onClick={handleUnstick}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <h3 className="font-medium mb-1">{note.title}</h3>
        {note.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {note.description}
          </p>
        )}
        <div className="text-xs text-muted-foreground">{formattedDate}</div>
      </CardContent>
    </Card>
  );
}
