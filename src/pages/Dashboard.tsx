import { useLocation } from "react-router-dom";
import { Users, UserX, TrendingUp, DollarSign } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import LeadsTable from "@/components/dashboard/LeadsTable";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { formatCurrencyCompact } from "@/utils/currency";

const Dashboard = () => {
  const location = useLocation();
  const role = (location.state as { role?: "owner" | "manager" | "salesman" })?.role || "manager";

  const stats = [
    {
      title: "Total Leads",
      value: "2,847",
      icon: Users,
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Unassigned Leads",
      value: "24",
      icon: UserX,
      variant: "warning" as const,
    },
    {
      title: "Team Performance",
      value: "87%",
      icon: TrendingUp,
      trend: { value: 5, isPositive: true },
      variant: "success" as const,
    },
    {
      title: "Revenue Projected",
      value: formatCurrencyCompact(1200000),
      icon: DollarSign,
      trend: { value: 8, isPositive: true },
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={role} />
      
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, John!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your sales pipeline today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={stat.title} style={{ animationDelay: `${0.1 * index}s` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>

        {/* Leads Table */}
        <LeadsTable />
      </main>
    </div>
  );
};

export default Dashboard;


