import { useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { Calendar, CheckCircle, Clock, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionItem } from "@/polymet/data/action-items-data";
import { cn } from "@/lib/utils";

interface ActionItemProps {
  item: ActionItem;
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ActionItemComponent({
  item,
  onComplete,
  onEdit,
  onDelete,
}: ActionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Format the due date
  const dueDate = parseISO(item.dueDate);
  const formattedDueDate = format(dueDate, "MMM d, yyyy");

  // Check if the due date is in the past and the item is not completed
  const isOverdue = isPast(dueDate) && !item.completed;

  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        item.completed
          ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
          : isOverdue
            ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
            : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="flex items-center">
                  <Clock
                    className={cn(
                      "h-5 w-5",
                      isOverdue ? "text-red-500" : "text-blue-500"
                    )}
                  />
                </div>
              )}
              <h3
                className={cn(
                  "font-medium text-sm", 
                  item.completed && "line-through text-muted-foreground"
                )}
              >
                {item.title}
              </h3>
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formattedDueDate}</span>
              </div>

              {isOverdue && !item.completed && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}

              {item.completed && item.completedAt && (
                <span className="text-xs">
                  Completed {format(parseISO(item.completedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>

            {item.assignedTo && (
              <div className="mt-2 flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  {item.assignedTo.avatar ? (
                    <AvatarImage
                      src={item.assignedTo.avatar}
                      alt={item.assignedTo.name}
                    />
                  ) : (
                    <AvatarFallback title={item.assignedTo.name} />
                  )}
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {item.assignedTo.name}
                </span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex items-center gap-1 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {!item.completed && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(item.id)}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                  onClick={() => onComplete(item.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="sr-only">Complete</span>
                </Button>
              </>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                onClick={() => onDelete(item.id)}
              >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
