import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SimpleAccount } from "@/polymet/data/accounts-data";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface AccountMetricsProps {
  accounts: SimpleAccount[];
}

export default function AccountMetrics({ accounts }: AccountMetricsProps) {
  // Count accounts by status
  const statusCounts = accounts.reduce(
    (acc, account) => {
      acc[account.status] = (acc[account.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate total accounts
  const totalAccounts = accounts.length;

  // Calculate average contract value
  const accountsWithContractValue = accounts.filter(
    (account) => account.metrics?.contractValue !== undefined
  );
  const accountsWithPOCValue = accounts.filter(
    (account) => account.metrics?.pocValue !== undefined
  );
  const avgContractValue = accountsWithContractValue.length
    ? accountsWithContractValue.reduce(
        (sum, account) => sum + (account.metrics?.contractValue || 0),
        0
      ) / accountsWithContractValue.length
    : 0;
  const avgPOCValue = accountsWithPOCValue.length
    ? accountsWithPOCValue.reduce(
        (sum, account) => sum + (account.metrics?.pocValue || 0),
        0
      ) / accountsWithPOCValue.length
    : 0;

  // Calculate win rate
  const closedAccounts = accounts.filter(
    (account) =>
      account.status === "closed-won" || account.status === "closed-lost"
  );
  const wonAccounts = accounts.filter(
    (account) => account.status === "closed-won"
  );
  const winRate = closedAccounts.length
    ? (wonAccounts.length / closedAccounts.length) * 100
    : 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Metrics data
  const metrics = [
    {
      title: "Total Accounts",
      value: totalAccounts.toString(),
      description: "Active accounts in the CRM",
      change: 5, // Example change percentage
    },
    {
      title: "Avg. Contract Value",
      value: formatCurrency(avgContractValue),
      description: "Across all accounts",
      change: -3, // Example change percentage
    },
    {
      title: "Avg. POC Value",
      value: formatCurrency(avgPOCValue),
      description: "Across all accounts",
      change: -3, // Example change percentage
    },
    {
      title: "Win Rate",
      value: `${Math.round(winRate)}%`,
      description: "For closed opportunities",
      change: 8, // Example change percentage
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardDescription>{metric.title}</CardDescription>
            <CardTitle className="text-2xl">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
              <div
                className={`flex items-center text-xs ${
                  metric.change > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {metric.change > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                )}
                <span>{Math.abs(metric.change)}% from last month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
