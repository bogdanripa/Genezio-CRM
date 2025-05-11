import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  MessageCircleIcon,
  PhoneIcon,
  MailIcon,
  StickyNoteIcon,
  ArrowRightIcon,
  PinIcon,
  Edit,
  Trash2
} from "lucide-react";
import {
  AccountInteraction,
  InteractionType,
} from "@/polymet/data/accounts-data";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface InteractionItemProps {
  interaction: AccountInteraction;
  setEditInteraction: (interaction: AccountInteraction) => void;
  deleteInteraction: (id: string) => void;
  isLatest?: boolean;
}

export default function InteractionItem({
  interaction,
  isLatest = false,
  setEditInteraction,
  deleteInteraction,
}: InteractionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case "meeting":
        return <CalendarIcon className="h-4 w-4" />;
      case "call":
        return <PhoneIcon className="h-4 w-4" />;
      case "email":
        return <MailIcon className="h-4 w-4" />;
      case "whatsapp":
        return <MessageCircleIcon className="h-4 w-4" />;
      case "note":
        return <StickyNoteIcon className="h-4 w-4" />;
      case "status_change":
        return <ArrowRightIcon className="h-4 w-4" />;
      case "sticky_note":
        return <StickyNoteIcon className="h-4 w-4" />;
      default:
        return <StickyNoteIcon className="h-4 w-4" />;
    }
  };

  const getInteractionColor = (type: InteractionType) => {
    switch (type) {
      case "meeting":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "call":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "email":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case "whatsapp":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "note":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "status_change":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
      case "sticky_note":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getInteractionLabel = (type: InteractionType) => {
    switch (type) {
      case "meeting":
        return "Meeting";
      case "call":
        return "Call";
      case "email":
        return "Email";
      case "whatsapp":
        return "WhatsApp";
      case "note":
        return "Note";
      case "status_change":
        return "Status Change";
      case "sticky_note":
        return "Note";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
    }
  };

  const formattedDate = new Date(interaction.timestamp).toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );

  const onDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this interaction?")) {
      deleteInteraction(interaction.id);
    }
  };

  return (
    <div 
      className={cn("flex gap-4 p-4 rounded-lg", isLatest && "bg-muted/50")} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col items-center">
        <Avatar className="h-10 w-10">
          {interaction.createdBy.avatar ? (
            <AvatarImage
              src={interaction.createdBy.avatar}
              alt={interaction.createdBy.name}
            />
          ) : (
            <AvatarFallback>
              {interaction.createdBy.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="w-0.5 grow bg-border mt-2"></div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className={cn(
              "flex items-center gap-1",
              getInteractionColor(interaction.type)
            )}
          >
            {getInteractionIcon(interaction.type)}
            <span>{getInteractionLabel(interaction.type)}</span>
          </Badge>
          {interaction.isSticky && (
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
            >
              <PinIcon className="h-3 w-3 mr-1" />
              Pinned
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium">
            {interaction.title}
          </h4>
          <span className={cn("ml-auto", isHovered ? "opacity-100" : "opacity-0")}>
            <Button
              variant="ghost"
              size="icon"
              className={"h-8 w-8"}
              onClick={() => setEditInteraction(interaction)}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-800"
              onClick={() => onDelete(interaction.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </span>
        </div>
        {interaction.description && (
          <p className="text-sm text-muted-foreground mt-1">
          {interaction.description.split('\n').map((line, i) => (
            <span key={i}>
              {line.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
                /^https?:\/\/[^\s]+$/.test(part) ? (
                  <a
                    key={j}
                    href={part}
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {part}
                  </a>
                ) : (
                  <>{part}</>
                )
              )}
              <br />
            </span>
          ))}
        </p>
        )}
        {interaction.metadata?.meetingId && (
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Duration: </span>
            <span>{interaction.metadata.duration} minutes</span>
            {interaction.metadata.attendees &&
              interaction.metadata.attendees.length > 0 && (
                <div className="mt-1">
                  <span className="text-muted-foreground">Attendees: </span>
                  <span>
                    {interaction.metadata.attendees.length} employee(s)
                  </span>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
