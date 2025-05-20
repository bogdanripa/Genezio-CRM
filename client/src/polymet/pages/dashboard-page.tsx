import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusIcon } from "lucide-react";
import {
  SimpleAccount,
  getAccounts,
  getLatestInteractions,
} from "@/polymet/data/accounts-data";
import AccountMetrics from "@/polymet/components/account-metrics";
import AccountStatusChart from "@/polymet/components/account-status-chart";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestInteractions, setLatestInteractions] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const userAccounts = await getAccounts();
        setAccounts(userAccounts);
        setLatestInteractions(await getLatestInteractions());
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button asChild>
          <Link to="/accounts/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Account
          </Link>
        </Button>
      </div>

      <AccountMetrics accounts={accounts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AccountStatusChart accounts={accounts} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across your accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {latestInteractions.map((interaction) => (
                    <div
                    className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0 cursor-pointer"
                    onClick={() => {
                      if (interaction.accountId) {
                        window.location.href = `/accounts/${interaction.accountId}`;
                      }
                    }}
                    >
                    <div className="bg-primary/10 rounded-full p-2">
                      <PlusIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                      {interaction.text}
                      </p>
                      <p className="text-sm text-muted-foreground">
                      on {new Date(interaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2" asChild>
                <Link to="/accounts">View all accounts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
