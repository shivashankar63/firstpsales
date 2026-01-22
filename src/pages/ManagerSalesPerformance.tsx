import { useState, useEffect } from "react";
import { Loader, TrendingUp, Target, Users, DollarSign, Award, AlertCircle, Clock, LogIn, LogOut } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentUser, getUsers, getLeads, getUserSessions } from "@/lib/supabase";

interface SalesPersonPerformance {
  id: string;
  name: string;
  email: string;
  leads: {
    total: number;
    closed_won: number;
    not_interested: number;
    proposal: number;
    new: number;
  };
  revenue: number;
  quota: number;
  achievement: number;
  avgDealValue: number;
  winRate: number;
}

interface UserSession {
  id: string;
  user_id: string;
  login_time: string;
  logout_time: string | null;
  session_duration_minutes: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  projects_worked?: string[];
}

const ManagerSalesPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [salesTeam, setSalesTeam] = useState<SalesPersonPerformance[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<SalesPersonPerformance | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const manager = await getCurrentUser();
        if (!manager) {
          setLoading(false);
          return;
        }

        const [usersRes, leadsRes] = await Promise.all([
          getUsers(),
          getLeads(),
        ]);

        const users = usersRes.data || [];
        const leads = leadsRes.data || [];

        // Filter for salesman role
        const salespeople = users.filter((u: any) =>
          String(u.role || "").toLowerCase().includes("sales")
        );

        // Calculate performance metrics for each salesman
        const performance = salespeople.map((salesman: any) => {
          const salesmanLeads = leads.filter((l: any) => l.assigned_to === salesman.id);
          const closedWonLeads = salesmanLeads.filter((l: any) => l.status === "closed_won");
          const notInterestedLeads = salesmanLeads.filter((l: any) => l.status === "not_interested");
          const proposalLeads = salesmanLeads.filter((l: any) => l.status === "proposal");
          const newLeads = salesmanLeads.filter((l: any) => l.status === "new");

          const revenue = closedWonLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
          const quota = 150000; // Standard quota - can be customized per salesman
          const winRate = salesmanLeads.length > 0 ? Math.round((closedWonLeads.length / salesmanLeads.length) * 100) : 0;
          const avgDealValue = salesmanLeads.length > 0 ? Math.round(revenue / (closedWonLeads.length || 1)) : 0;

          return {
            id: salesman.id,
            name: salesman.full_name || salesman.email?.split("@")[0] || "Unknown",
            email: salesman.email,
            leads: {
              total: salesmanLeads.length,
              closed_won: closedWonLeads.length,
              not_interested: notInterestedLeads.length,
              proposal: proposalLeads.length,
              new: newLeads.length,
            },
            revenue,
            quota,
            achievement: quota > 0 ? Math.round((revenue / quota) * 100) : 0,
            avgDealValue,
            winRate,
          };
        });

        setSalesTeam(performance.sort((a, b) => b.achievement - a.achievement));
      } catch (error) {
        console.error("Error fetching sales performance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return "text-green-600";
    if (achievement >= 75) return "text-blue-600";
    if (achievement >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getAchievementBg = (achievement: number) => {
    if (achievement >= 100) return "bg-green-50 border-green-200 text-green-700";
    if (achievement >= 75) return "bg-blue-50 border-blue-200 text-blue-700";
    if (achievement >= 50) return "bg-orange-50 border-orange-200 text-orange-700";
    return "bg-red-50 border-red-200 text-red-700";
  };

  const totalRevenue = salesTeam.reduce((sum, s) => sum + s.revenue, 0);
  const totalQuota = salesTeam.reduce((sum, s) => sum + s.quota, 0);
  const avgWinRate = Math.round(
    salesTeam.reduce((sum, s) => sum + s.winRate, 0) / (salesTeam.length || 1)
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading sales performance...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />

      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-1 sm:mb-2">Sales Performance Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600">Monitor team performance, quotas, and pipeline metrics</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-slate-600 text-xs sm:text-sm mb-1 font-medium">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">${(totalRevenue / 1000000).toFixed(2)}M</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 sm:w-6 h-5 sm:h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-slate-600 text-xs sm:text-sm mb-1 font-medium">Total Quota</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">${(totalQuota / 1000000).toFixed(2)}M</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-slate-600 text-xs sm:text-sm mb-1 font-medium">Team Size</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{salesTeam.length}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 sm:w-6 h-5 sm:h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-slate-600 text-xs sm:text-sm mb-1 font-medium">Avg Win Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{avgWinRate}%</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Award className="w-5 sm:w-6 h-5 sm:h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Team Performance Table */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6">Sales Team Performance</h2>

          {salesTeam.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No salespeople assigned yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {salesTeam.map((salesman) => (
                <div
                  key={salesman.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3 sm:gap-0"
                  onClick={async () => {
                    setSelectedSalesman(salesman);
                    setShowDetailsModal(true);
                    setLoadingSessions(true);
                    setUserSessions([]);
                    try {
                      console.log('Fetching sessions for user:', salesman.id);
                      const result = await getUserSessions(salesman.id, 100);
                      console.log('Sessions result:', result);
                      if (result.error) {
                        console.error('Error fetching user sessions:', result.error);
                      }
                      setUserSessions(result.data || []);
                    } catch (error) {
                      console.error('Exception fetching user sessions:', error);
                      setUserSessions([]);
                    } finally {
                      setLoadingSessions(false);
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {salesman.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-slate-900 font-semibold text-base sm:text-lg leading-tight">{salesman.name}</h3>
                        <p className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-none">{salesman.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
                      <div className={`text-xl sm:text-2xl font-bold ${getAchievementColor(salesman.achievement)}`}>{salesman.achievement}%</div>
                      <p className="text-xs text-slate-500 font-medium">of quota</p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mt-2">
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 flex flex-col items-center">
                      <p className="text-[11px] sm:text-xs text-slate-600 mb-1 font-medium">Revenue</p>
                      <p className="font-bold text-green-600 text-sm">${(salesman.revenue / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 flex flex-col items-center">
                      <p className="text-[11px] sm:text-xs text-slate-600 mb-1 font-medium">Quota</p>
                      <p className="font-bold text-slate-900 text-sm">${(salesman.quota / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 flex flex-col items-center">
                      <p className="text-[11px] sm:text-xs text-slate-600 mb-1 font-medium">Closed Won</p>
                      <p className="font-bold text-slate-900 text-sm">{salesman.leads.closed_won}</p>
                    </div>
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 flex flex-col items-center hidden sm:flex">
                      <p className="text-[11px] sm:text-xs text-slate-600 mb-1 font-medium">Win Rate</p>
                      <p className="font-bold text-orange-600 text-sm">{salesman.winRate}%</p>
                    </div>
                    <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 flex flex-col items-center hidden sm:flex">
                      <p className="text-[11px] sm:text-xs text-slate-600 mb-1 font-medium">Avg Deal</p>
                      <p className="font-bold text-slate-900 text-sm">${(salesman.avgDealValue / 1000).toFixed(0)}K</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 sm:mt-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          salesman.achievement >= 100
                            ? "bg-green-500"
                            : salesman.achievement >= 75
                            ? "bg-blue-500"
                            : salesman.achievement >= 50
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(salesman.achievement, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Lead Pipeline */}
                  <div className="mt-2 sm:mt-4 flex gap-2 flex-wrap">
                    {salesman.leads.new > 0 && (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">New: {salesman.leads.new}</Badge>
                    )}
                    {salesman.leads.proposal > 0 && (
                      <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                        In Proposal: {salesman.leads.proposal}
                      </Badge>
                    )}
                    {salesman.leads.closed_won > 0 && (
                      <Badge className="bg-green-50 text-green-700 border-green-200">Closed Won: {salesman.leads.closed_won}</Badge>
                    )}
                    {salesman.leads.not_interested > 0 && (
                      <Badge className="bg-red-50 text-red-700 border-red-200">Not Interested: {salesman.leads.not_interested}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="text-xl text-slate-900">Performance Details</DialogTitle>
            </DialogHeader>
            {selectedSalesman && (
              <div className="space-y-6 pb-4">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedSalesman.name}</h3>
                      <p className="text-slate-600 text-sm mt-2">📧 {selectedSalesman.email}</p>
                    </div>
                    <Badge className={`${getAchievementBg(selectedSalesman.achievement)} text-sm px-3 py-1 border`}>
                      {selectedSalesman.achievement}% Achievement
                    </Badge>
                  </div>
                </div>

                {/* Revenue Info */}
                <div>
                  <h4 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Revenue Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <span className="text-xs font-semibold text-green-700 block mb-2 uppercase tracking-wide">💰 Total Revenue</span>
                      <span className="text-lg sm:text-xl font-bold text-green-600">${(selectedSalesman.revenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <span className="text-xs font-semibold text-blue-700 block mb-2 uppercase tracking-wide">📊 Quota</span>
                      <span className="text-lg sm:text-xl font-bold text-blue-600">${(selectedSalesman.quota / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                      <span className="text-xs font-semibold text-purple-700 block mb-2 uppercase tracking-wide">💎 Avg Deal Value</span>
                      <span className="text-lg sm:text-xl font-bold text-purple-600">${(selectedSalesman.avgDealValue / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>

                {/* Deal Stats */}
                <div>
                  <h4 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Deal Pipeline
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{selectedSalesman.leads.total}</p>
                      <p className="text-xs text-slate-600 mt-1">Total Leads</p>
                    </div>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-slate-700">{selectedSalesman.leads.new}</p>
                      <p className="text-xs text-slate-600 mt-1">New</p>
                    </div>
                    <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-orange-600">{selectedSalesman.leads.proposal}</p>
                      <p className="text-xs text-slate-600 mt-1">In Proposal</p>
                    </div>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-green-600">{selectedSalesman.leads.closed_won}</p>
                      <p className="text-xs text-slate-600 mt-1">Closed Won</p>
                    </div>
                    <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-red-600">{selectedSalesman.leads.not_interested}</p>
                      <p className="text-xs text-slate-600 mt-1">Not Interested</p>
                    </div>
                  </div>
                </div>

                {/* Win Rate */}
                <div>
                  <h4 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                      <span className="text-xs font-semibold text-orange-700 block mb-2 uppercase tracking-wide">🎯 Win Rate</span>
                      <p className="text-lg sm:text-xl font-bold text-orange-600">{selectedSalesman.winRate}%</p>
                      <div className="w-full bg-orange-100 h-2 rounded-full mt-2 sm:mt-3 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${selectedSalesman.winRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <span className="text-xs font-semibold text-green-700 block mb-2 uppercase tracking-wide">📈 Quota Achievement</span>
                      <p className="text-lg sm:text-xl font-bold text-green-600">{selectedSalesman.achievement}%</p>
                      <div className="w-full bg-green-100 h-2 rounded-full mt-2 sm:mt-3 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(selectedSalesman.achievement, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Login/Logout History */}
                <div>
                  <h4 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Login/Logout History
                  </h4>
                  {loadingSessions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-slate-600" />
                      <span className="ml-2 text-slate-600">Loading session history...</span>
                    </div>
                  ) : userSessions.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 text-sm">No session history available</p>
                      <p className="text-xs text-slate-500 mt-2">Sessions will appear after login/logout</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse bg-white border border-slate-200 rounded-lg">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                              Login Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                              Logout Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                              Duration
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Projects Worked
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {userSessions.map((session, index) => {
                            const loginDate = new Date(session.login_time);
                            const logoutDate = session.logout_time ? new Date(session.logout_time) : null;
                            const duration = session.session_duration_minutes;
                            const isActive = !session.logout_time;
                            const projectsWorked = session.projects_worked || [];
                            
                            return (
                              <tr
                                key={session.id}
                                className={`hover:bg-slate-50 ${
                                  isActive ? 'bg-blue-50/30' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                }`}
                              >
                                <td className="px-4 py-3 text-sm text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                  {loginDate.toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <LogIn className="w-4 h-4 text-green-600" />
                                    {loginDate.toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                  {logoutDate ? (
                                    <div className="flex items-center gap-2">
                                      <LogOut className="w-4 h-4 text-red-600" />
                                      {logoutDate.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      })}
                                    </div>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                      Active
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                  {duration !== null ? (
                                    <span className="font-medium">
                                      {Math.floor(duration / 60)}h {duration % 60}m
                                    </span>
                                  ) : isActive ? (
                                    <span className="text-slate-400">-</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {projectsWorked.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {projectsWorked.map((project, idx) => (
                                        <Badge
                                          key={idx}
                                          className="bg-purple-100 text-purple-700 border-purple-200 text-xs"
                                        >
                                          {project}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">No projects</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerSalesPerformance;


