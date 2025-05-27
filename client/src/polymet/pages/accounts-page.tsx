import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, SearchIcon } from "lucide-react";
import { SimpleAccount, getAccounts} from "@/polymet/data/accounts-data";
import AccountCard from "@/polymet/components/account-card";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<SimpleAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      
      setIsLoading(true);
      try {
        const userAccounts = await getAccounts();
        setAccounts(userAccounts);
        setFilteredAccounts(userAccounts);
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    // Apply filters whenever search query or status filter changes
    let result = accounts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          (account.description &&
            account.description.toLowerCase().includes(query)) ||
          (account.industry && account.industry.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((account) => account.status === statusFilter);
    }

    setFilteredAccounts(result);
  }, [accounts, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <Button asChild>
          <Link to="/accounts/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Account
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="closed-won">Closed Won</SelectItem>
            <SelectItem value="closed-lost">Closed Lost</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAccounts.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold mt-6">
            Clients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts
              .filter((account) => account.accountType == "Client")
              .map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
          </div>
          <h2 className="text-lg font-semibold mt-6">
            Partners
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts
              .filter((account) => account.accountType == "Partner")
              .map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No accounts found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filter criteria
          </p>
          <Button className="mt-4" asChild>
            <Link to="/accounts/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create New Account
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
