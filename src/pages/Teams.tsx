import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Users, TrendingUp, Target, Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTeams, getUsers } from "@/lib/supabase";
import { formatCurrencyCompact } from "@/utils/currency";

const Teams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        getTeams(),
        getUsers(),
      ]);
      const teams = teamsRes.data || [];
      const users = usersRes.data || [];
      
      // Enrich teams with their members
      const enrichedTeams = teams.map((team: any) => ({
        ...team,
        members: users.filter((u: any) => u.team_id === team.id),
      }));
      
      setTeams(enrichedTeams);
      setLoading(false);
    };
    fetchTeams();
  }, []);

  const fallbackTeams = [
  {
    id: 1,
    name: "North America Sales",
    manager: "Mark Manager",
    members: [
      { id: 1, name: "Sally Seller", email: "sally@salesflow.com", phone: "+1-555-0001", role: "salesman", quota: 150000, achieved: 125000, deals: 8 },
      { id: 2, name: "Sam Seller", email: "sam@salesflow.com", phone: "+1-555-0002", role: "salesman", quota: 180000, achieved: 195000, deals: 12 },
      { id: 3, name: "Steve Sales", email: "steve@salesflow.com", phone: "+1-555-0003", role: "salesman", quota: 160000, achieved: 140000, deals: 7 },
    ],
    revenue: 460000,
    quota: 490000,
    region: "North America"
  },
  {
    id: 2,
    name: "EMEA Team",
    manager: "Emily Manager",
    members: [
      { id: 4, name: "Oliver Ops", email: "oliver@salesflow.com", phone: "+44-555-0001", role: "salesman", quota: 140000, achieved: 155000, deals: 9 },
      { id: 5, name: "Emma Expert", email: "emma@salesflow.com", phone: "+44-555-0002", role: "salesman", quota: 150000, achieved: 130000, deals: 6 },
    ],
    revenue: 285000,
    quota: 290000,
    region: "Europe/Middle East"
  },
];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <DashboardSidebar role="owner" />
        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 flex items-center justify-center">
          <div className="text-white text-lg">Loading teams...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardSidebar role="owner" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Teams</h1>
              <p className="text-slate-400">Manage your sales teams and track performance</p>
            </div>
            <Button onClick={() => alert('Create Team feature coming soon!')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Teams</div>
            <div className="text-2xl font-bold text-white">{teams.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Team Members</div>
            <div className="text-2xl font-bold text-white">{teams.reduce((sum, t) => sum + t.members.length, 0)}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-white">{formatCurrencyCompact(teams.reduce((sum, t) => sum + t.revenue, 0))}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Avg Achievement</div>
            <div className="text-2xl font-bold text-white">
              {((teams.reduce((sum, t) => sum + t.revenue, 0) / teams.reduce((sum, t) => sum + t.quota, 0)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="flex justify-end gap-2 p-2 bg-transparent">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => alert(`Edit team '${team.name}' feature coming soon!`)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete team '${team.name}'?`)) {
                      alert(`Delete team '${team.name}' feature coming soon!`);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
              {/* Team Header */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{team.name}</h2>
                      <p className="text-sm text-slate-400">{team.region}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                    {team.members.length} members
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Team Revenue</div>
                    <div className="text-lg font-bold text-white">${(team.revenue / 1000).toFixed(0)}K</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Team Quota</div>
                    <div className="text-lg font-bold text-white">${(team.quota / 1000).toFixed(0)}K</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Achievement</div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-white">{((team.revenue / team.quota) * 100).toFixed(0)}%</div>
                      <TrendingUp className={`w-4 h-4 ${team.revenue >= team.quota ? 'text-green-400' : 'text-amber-400'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4">TEAM MEMBERS</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {team.members.map((member) => (
                    <div key={member.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-600 text-white font-medium">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-white">{member.name}</div>
                            <div className="text-xs text-slate-400 capitalize">{member.role}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={member.achieved >= member.quota ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
                          {((member.achieved / member.quota) * 100).toFixed(0)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <div className="text-xs text-slate-400">Achieved</div>
                          <div className="text-sm font-semibold text-white">${(member.achieved / 1000).toFixed(0)}K</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Quota</div>
                          <div className="text-sm font-semibold text-white">${(member.quota / 1000).toFixed(0)}K</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <Target className="w-3 h-3" />
                        {member.deals} deals closed
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => window.location.href = `mailto:${member.email}`}
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 gap-2 bg-white/5 hover:bg-white/10 text-slate-300"
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </Button>
                        <Button 
                          onClick={() => window.location.href = `tel:${member.phone || ''}`}
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 gap-2 bg-white/5 hover:bg-white/10 text-slate-300"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Teams;


