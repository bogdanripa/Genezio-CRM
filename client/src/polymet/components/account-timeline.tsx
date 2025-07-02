import { useState } from "react";
import { AccountInteraction } from "@/polymet/data/accounts-data";
import InteractionItem from "@/polymet/components/interaction-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface AccountTimelineProps {
  interactions: AccountInteraction[];
  setEditInteraction: (interaction: AccountInteraction) => void;
  deleteInteraction: (id: string) => void;
}

type FilterType =
  | "all"
  | "meeting"
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "status_change"
  | "sticky_note";

export default function AccountTimeline({
  interactions,
  setEditInteraction,
  deleteInteraction,
}: AccountTimelineProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort interactions by timestamp (newest first)
  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter interactions based on type and search query
  const filteredInteractions = sortedInteractions.filter((interaction) => {
    const matchesFilter = filter === "all" || interaction.type === filter;
    const matchesSearch =
      searchQuery === "" ||
      interaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (interaction.description &&
        interaction.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search interactions..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interactions</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="status_change">Status Changes</SelectItem>
            <SelectItem value="sticky_note">Sticky Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInteractions.length > 0 ? (
        <div className="space-y-1">
          {filteredInteractions.map((interaction, index) => (
            <InteractionItem
              key={interaction.id}
              interaction={interaction}
              setEditInteraction={setEditInteraction}
              deleteInteraction={deleteInteraction}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No interactions found matching your criteria.
        </div>
      )}
    </div>
  );
}
