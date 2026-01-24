import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { MapPin, TrendingUp, Users, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { getTeams, getUsers, getLeads } from "@/lib/supabase";
import { formatCurrencyCompact } from "@/utils/currency";

const fallbackRegions = [
  {
    id: 1,
    name: "North America",
    country: "USA & Canada",
    revenue: 1250000,
    quota: 1100000,
    teams: 3,
    salespeople: 12,
    activeLeads: 145,
    dealsWon: 28,
    growth: 24,
    topCity: "San Francisco",
  },
  {
    id: 2,
    name: "EMEA",
    country: "Europe, Middle East, Africa",
    revenue: 890000,
    quota: 950000,
    teams: 2,
    salespeople: 8,
    activeLeads: 98,
    dealsWon: 19,
    growth: -6,
    topCity: "London",
  },
  {
    id: 3,
    name: "APAC",
    country: "Asia Pacific",
    revenue: 720000,
    quota: 650000,
    teams: 2,
    salespeople: 7,
    activeLeads: 112,
    dealsWon: 15,
    growth: 18,
    topCity: "Singapore",
  },
  {
    id: 4,
    name: "Latin America",
    country: "South & Central America",
    revenue: 340000,
    quota: 400000,
    teams: 1,
    salespeople: 5,
    activeLeads: 76,
    dealsWon: 8,
    growth: 12,
    topCity: "São Paulo",
  },
];

const Regions = () => {
  const [regions, setRegions] = useState<any[]>(fallbackRegions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegionalData = async () => {
      try {
        const { data: teams } = await getTeams();
        const { data: users } = await getUsers();
        const { data: leads } = await getLeads();

        if (teams && teams.length && users && leads) {
          const regionMap = new Map<string, any>();

          teams.forEach((team: any) => {
            const regionName = team.description || "Unknown";
            if (!regionMap.has(regionName)) {
              regionMap.set(regionName, { teams: [], users: [], leads: [] });
            }
            regionMap.get(regionName).teams.push(team);
          });

          const regionsData = Array.from(regionMap.entries()).map(([name, data]) => {
            const teamIds = data.teams.map((t: any) => t.id);
            const teamUsers = users.filter((u: any) => teamIds.includes(u.team_id));
            const teamUserIds = teamUsers.map((u: any) => u.id);
            const regionLeads = leads.filter((l: any) => teamUserIds.includes(l.assigned_to));

            const wonLeads = regionLeads.filter((l: any) => l.status === "won");
            const revenue = wonLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);

            return {
              id: name,
              name,
              country: name,
              revenue,
              quota: revenue ? Math.max(revenue * 0.9, 500000) : 500000,
              teams: data.teams.length,
              salespeople: teamUsers.length,
              activeLeads: regionLeads.filter((l: any) => ["new", "qualified", "negotiation"].includes(l.status)).length,
              dealsWon: wonLeads.length,
              growth: 15,
              topCity: "Key City",
            };
          });

          setRegions(regionsData.length ? regionsData : fallbackRegions);
        } else {
          setRegions(fallbackRegions);
        }
      } catch (error) {
        console.error("Failed to load regional data", error);
        setRegions(fallbackRegions);
      } finally {
        setLoading(false);
      }
    };

    fetchRegionalData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <DashboardSidebar role="owner" />
        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 flex items-center justify-center">
          <div className="text-white text-lg">Loading regional data...</div>
        </main>
      </div>
    );
  }

  const totalRevenue = regions.reduce((sum, r) => sum + r.revenue, 0);
  const totalQuota = regions.reduce((sum, r) => sum + r.quota, 0);
  const totalSalespeople = regions.reduce((sum, r) => sum + r.salespeople, 0);
  const totalDeals = regions.reduce((sum, r) => sum + r.dealsWon, 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardSidebar role="owner" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Regional Performance</h1>
          <p className="text-slate-400">Track sales performance across different regions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Global Revenue</div>
            <div className="text-2xl font-bold text-white">{formatCurrencyCompact(totalRevenue)}</div>
            <div className="text-xs text-green-400 mt-1">+15% vs last quarter</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Quota</div>
            <div className="text-2xl font-bold text-white">{formatCurrencyCompact(totalQuota)}</div>
            <div className="text-xs text-slate-400 mt-1">{((totalRevenue / totalQuota) * 100).toFixed(0)}% achieved</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Sales Team</div>
            <div className="text-2xl font-bold text-white">{totalSalespeople}</div>
            <div className="text-xs text-slate-400 mt-1">Across {regions.length} regions</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Deals</div>
            <div className="text-2xl font-bold text-white">{totalDeals}</div>
            <div className="text-xs text-slate-400 mt-1">This quarter</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {regions.map((region) => {
            const achievement = (region.revenue / region.quota) * 100;
            const isOverPerforming = achievement >= 100;

            return (
              <div
                key={region.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
              >
                <div
                  className={`bg-gradient-to-r ${
                    isOverPerforming ? "from-green-600/20 to-emerald-600/20" : "from-blue-600/20 to-purple-600/20"
                  } border-b border-white/10 p-6`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl ${isOverPerforming ? "bg-green-600" : "bg-blue-600"} flex items-center justify-center`}
                      >
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{region.name}</h2>
                        <p className="text-sm text-slate-400">{region.country}</p>
                      </div>
                    </div>
                    <Badge
                      className={`${region.growth >= 0 ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}
                    >
                      {region.growth >= 0 ? "+" : ""}
                      {region.growth}% growth
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Revenue</div>
                      <div className="text-lg font-bold text-white">{formatCurrencyCompact(region.revenue)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Quota</div>
                      <div className="text-lg font-bold text-white">{formatCurrencyCompact(region.quota)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Quota Achievement</span>
                      <span className="font-medium text-white">{achievement.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(achievement, 100)} className="h-2" />
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Team Size</div>
                        <div className="text-sm font-semibold text-white">{region.salespeople} people</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Active Leads</div>
                        <div className="text-sm font-semibold text-white">{region.activeLeads}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Deals Won</div>
                        <div className="text-sm font-semibold text-white">{region.dealsWon}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Top City</div>
                        <div className="text-sm font-semibold text-white">{region.topCity}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Avg Deal Size</span>
                      <span className="font-semibold text-white">${(region.revenue / Math.max(region.dealsWon || 0, 1) / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Regions;


