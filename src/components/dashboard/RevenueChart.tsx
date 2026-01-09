import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { getLeads } from '@/lib/supabase';
import { Loader } from 'lucide-react';

interface ChartDataPoint {
  month: string;
  revenue: number;
  target: number;
}

const RevenueChart = () => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: leads } = await getLeads();

        // Group revenue by month from leads
        const monthlyRevenue: { [key: string]: number } = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize months for the last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthKey = monthNames[date.getMonth()];
          monthlyRevenue[monthKey] = 0;
        }

        // Aggregate leads revenue
        if (leads) {
          leads.forEach((lead: any) => {
            if (lead.status === 'closed_won' && lead.created_at) {
              const date = new Date(lead.created_at);
              const monthKey = monthNames[date.getMonth()];
              monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (lead.value || 0);
            }
          });
        }

        // Convert to chart data format (last 6 months only)
        // Target quota is 300k per month (standard benchmark)
        const chartData = Object.keys(monthlyRevenue)
          .slice(-6)
          .map(month => ({
            month,
            revenue: Math.round(monthlyRevenue[month] / 1000), // Convert to thousands
            target: 300, // 300k standard target
          }));

        setData(chartData.length > 0 ? chartData : [
          { month: 'Jan', revenue: 400, target: 300 },
          { month: 'Feb', revenue: 450, target: 320 },
          { month: 'Mar', revenue: 520, target: 350 },
          { month: 'Apr', revenue: 680, target: 400 },
          { month: 'May', revenue: 750, target: 450 },
          { month: 'Jun', revenue: 890, target: 500 },
        ]);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
        // Fallback to default data
        setData([
          { month: 'Jan', revenue: 400, target: 300 },
          { month: 'Feb', revenue: 450, target: 320 },
          { month: 'Mar', revenue: 520, target: 350 },
          { month: 'Apr', revenue: 680, target: 400 },
          { month: 'May', revenue: 750, target: 450 },
          { month: 'Jun', revenue: 890, target: 500 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
        <h2 className="text-xl font-semibold text-foreground mb-4">Revenue Trend</h2>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading revenue data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
      <h2 className="text-xl font-semibold text-foreground mb-4">Revenue Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis stroke="var(--color-muted-foreground)" />
          <YAxis stroke="var(--color-muted-foreground)" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: 'var(--color-primary)' }} />
          <Line type="monotone" dataKey="target" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
