import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Account, AccountStatus } from "@/polymet/data/accounts-data";
import { Cell, Pie, PieChart } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AccountStatusChartProps {
  accounts: Account[];
}

export default function AccountStatusChart({
  accounts,
}: AccountStatusChartProps) {
  // Count accounts by status
  const statusCounts = accounts.reduce(
    (acc, account) => {
      acc[account.status] = (acc[account.status] || 0) + 1;
      return acc;
    },
    {} as Record<AccountStatus, number>
  );

  // Convert to array for chart
  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead":
        return "hsl(var(--chart-1))";
      case "prospect":
        return "hsl(var(--chart-2))";
      case "qualified":
        return "hsl(var(--chart-3))";
      case "negotiation":
        return "hsl(var(--chart-4))";
      case "closed-won":
        return "hsl(var(--chart-5))";
      case "closed-lost":
        return "hsl(var(--chart-1))";
      case "churned":
        return "hsl(var(--chart-2))";
      default:
        return "hsl(var(--chart-3))";
    }
  };

  // Format status label
  const formatStatus = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Status Distribution</CardTitle>
        <CardDescription>
          Overview of accounts by their current status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="aspect-[none] h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${value} account${value !== 1 ? "s" : ""}`,
                    formatStatus(name as string),
                  ]}
                />
              }
            />

            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ status, count }) =>
                `${formatStatus(status as string)}: ${count}`
              }
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getStatusColor(entry.status)}
                  radius={4}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
