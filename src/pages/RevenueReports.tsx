import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getLeads, getUsers } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RevenueReports = () => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");

  useEffect(() => {
    const fetchRevenueData = async () => {
      setLoading(true);
      const [leadsRes, usersRes] = await Promise.all([
        getLeads(),
        getUsers(),
      ]);
      
      const leads = leadsRes.data || [];
      const users = usersRes.data || [];
      
      // Calculate monthly revenue from leads
      const monthlyRevenue: { [key: string]: { revenue: number; target: number; deals: number } } = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize last 6 months
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const month = monthNames[date.getMonth()];
        monthlyRevenue[month] = { revenue: 0, target: 0, deals: 0 };
      }
      
      // Aggregate from leads
      leads.forEach((lead: any) => {
        if (lead.created_at) {
          const date = new Date(lead.created_at);
          const month = monthNames[date.getMonth()];
          if (monthlyRevenue[month]) {
            monthlyRevenue[month].deals++;
            if (lead.status === 'closed_won') {
              monthlyRevenue[month].revenue += lead.value || 0;
            }
            monthlyRevenue[month].target = 300000; // 300k standard target
          }
        }
      });
      
      // Calculate top performers
      const performers = users
        .filter((u: any) => u.role === 'salesman')
        .map((user: any) => {
          const userLeads = leads.filter((l: any) => l.assigned_to === user.id);
          const closedWon = userLeads.filter((l: any) => l.status === 'closed_won');
          const revenue = closedWon.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
          return {
            id: user.id,
            name: user.full_name || user.email,
            revenue,
            deals: closedWon.length,
            quota: 250000,
            achievement: Math.round((revenue / 250000) * 100),
          };
        })
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setMonthlyData(Object.entries(monthlyRevenue).map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue / 1000),
        target: 300,
        deals: data.deals,
      })));
      setQuarterlyData([]); // Placeholder for quarterly data
      setTopPerformers(performers);
      setLoading(false);
    };
    fetchRevenueData();
  }, []);

  const handleExport = () => {
    const csv = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${totalRevenue.toLocaleString()}`],
      ['Total Target', `$${totalTarget.toLocaleString()}`],
      ['Total Deals', totalDeals.toString()],
      ['Avg Deal Size', `$${avgDealSize.toFixed(0)}`],
      ['',''],
      ['Top Performers', ''],
      ['Name', 'Revenue', 'Deals', 'Quota', 'Achievement'],
      ...topPerformers.map(p => [p.name, p.revenue, p.deals, p.quota, `${p.achievement}%`])
    ].map(row => row.join(',')).join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalTarget = monthlyData.reduce((sum, m) => sum + m.target, 0);
  const totalDeals = monthlyData.reduce((sum, m) => sum + m.deals, 0);
  const avgDealSize = totalRevenue / totalDeals;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardSidebar role="owner" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Revenue Reports</h1>
              <p className="text-slate-400">Comprehensive revenue analytics and forecasting</p>
            </div>
            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <Calendar className="w-4 h-4" />
                    {selectedPeriod}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedPeriod("Last Month")}>Last Month</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod("Last Quarter")}>Last Quarter</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod("Last 6 Months")}>Last 6 Months</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod("Last Year")}>Last Year</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleExport} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-400">+24%</span>
            </div>
            <div className="text-sm text-slate-400 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-white">${(totalRevenue / 1000000).toFixed(2)}M</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-400">+12%</span>
            </div>
            <div className="text-sm text-slate-400 mb-1">Quota Achievement</div>
            <div className="text-2xl font-bold text-white">{((totalRevenue / totalTarget) * 100).toFixed(0)}%</div>
          </div>

          <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 backdrop-blur-sm border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-slate-400">avg</span>
            </div>
            <div className="text-sm text-slate-400 mb-1">Avg Deal Size</div>
            <div className="text-2xl font-bold text-white">${(avgDealSize / 1000).toFixed(0)}K</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-400">+18%</span>
            </div>
            <div className="text-sm text-slate-400 mb-1">Total Deals</div>
            <div className="text-2xl font-bold text-white">{totalDeals}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Revenue */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue vs Target</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" fill="#8b5cf6" name="Target" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quarterly Growth */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quarterly Revenue Growth</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="quarter" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
                <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Revenue Contributors</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Name</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-slate-400">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-slate-400">Deals</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-slate-400">Quota</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-slate-400">Achievement</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((performer, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-amber-600 text-white' :
                        index === 1 ? 'bg-slate-400 text-white' :
                        index === 2 ? 'bg-orange-700 text-white' :
                        'bg-white/10 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-white">{performer.name}</td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-white">
                      ${(performer.revenue / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-300">{performer.deals}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-300">
                      ${(performer.quota / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-semibold ${performer.achievement >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
                        {performer.achievement}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RevenueReports;


