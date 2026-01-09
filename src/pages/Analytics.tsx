import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { getLeads } from "@/lib/supabase";

const Analytics = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const { data: leads } = await getLeads();
      
      if (leads && leads.length > 0) {
        // Calculate lead sources from actual data
        const sourceMap = new Map();
        leads.forEach((l: any) => {
          const source = l.source || 'Direct';
          sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
        });
        const total = leads.length;
        const sources = Array.from(sourceMap.entries()).map(([name, count], idx) => ({
          name,
          value: Math.round(((count as number) / total) * 100),
          color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][idx % 5]
        }));
        
        // Calculate conversion funnel from actual data
        const statusCounts = {
          total: leads.length,
          new: leads.filter((l: any) => l.status === 'new').length,
          qualified: leads.filter((l: any) => l.status === 'qualified').length,
          proposal: leads.filter((l: any) => l.status === 'proposal').length,
          closedWon: leads.filter((l: any) => l.status === 'closed_won').length,
        };
        
        setLeadSourceData(sources.length > 0 ? sources : fallbackLeadSources);
        setConversionFunnel([
          { stage: 'Leads', count: statusCounts.total },
          { stage: 'Qualified', count: statusCounts.qualified },
          { stage: 'In Proposal', count: statusCounts.proposal },
          { stage: 'Closed Won', count: statusCounts.closedWon },
        ]);
        setMonthlyRevenue(fallbackMonthlyRevenue); // Keep fallback for monthly
      } else {
        setMonthlyRevenue(fallbackMonthlyRevenue);
        setLeadSourceData(fallbackLeadSources);
        setConversionFunnel(fallbackConversionFunnel);
      }
      
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  const fallbackMonthlyRevenue = [
    { month: 'Jan', revenue: 420, target: 380, deals: 12 },
    { month: 'Feb', revenue: 485, target: 420, deals: 15 },
    { month: 'Mar', revenue: 550, target: 450, deals: 18 },
    { month: 'Apr', revenue: 615, target: 500, deals: 21 },
    { month: 'May', revenue: 680, target: 550, deals: 24 },
    { month: 'Jun', revenue: 745, target: 600, deals: 26 },
  ];

  const fallbackLeadSources = [
    { name: 'Website', value: 35, color: '#3b82f6' },
    { name: 'Referral', value: 25, color: '#8b5cf6' },
    { name: 'Cold Call', value: 20, color: '#ec4899' },
    { name: 'LinkedIn', value: 15, color: '#f59e0b' },
    { name: 'Email', value: 5, color: '#10b981' },
  ];

  const fallbackConversionFunnel = [
    { stage: 'Leads', count: 450 },
    { stage: 'Qualified', count: 320 },
    { stage: 'In Proposal', count: 180 },
    { stage: 'Closed Won', count: 68 },
  ];
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardSidebar role="owner" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Deep insights into your sales performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                +24%
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-white">$745K</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                +15%
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold text-white">15.1%</div>
          </div>

          <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 backdrop-blur-sm border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">Active Deals</div>
            <div className="text-2xl font-bold text-white">274</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-red-400 text-sm">
                <TrendingDown className="w-4 h-4" />
                -3%
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">Avg Deal Size</div>
            <div className="text-2xl font-bold text-white">$28.6K</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue vs Target</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
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
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue ($K)" />
                <Line type="monotone" dataKey="target" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Target ($K)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Lead Sources</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {leadSourceData.map((source) => (
                <div key={source.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                  <span className="text-sm text-slate-300">{source.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sales Funnel</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="stage" type="category" stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
};

export default Analytics;


