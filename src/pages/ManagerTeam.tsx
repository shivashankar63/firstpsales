import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Users, Mail, Phone, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const teamMembers = [
  { name: "Sally Seller", role: "Senior AE", email: "sally@salesflow.com", phone: "+1-555-1001", quota: 180000, achieved: 195000, deals: 12 },
  { name: "Sam Seller", role: "AE", email: "sam@salesflow.com", phone: "+1-555-1002", quota: 150000, achieved: 132000, deals: 9 },
  { name: "Steve Sales", role: "AE", email: "steve@salesflow.com", phone: "+1-555-1003", quota: 140000, achieved: 99000, deals: 7 },
  { name: "Emma Expert", role: "BDR", email: "emma@salesflow.com", phone: "+1-555-1004", quota: 90000, achieved: 82000, deals: 11 },
];

const ManagerTeam = () => {
  const totalQuota = teamMembers.reduce((s, m) => s + m.quota, 0);
  const totalAchieved = teamMembers.reduce((s, m) => s + m.achieved, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Team</h1>
            <p className="text-slate-500">Overview of team performance and quotas</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4" /> {teamMembers.length} members
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Total Quota</div>
            <div className="text-2xl font-bold text-slate-900">${(totalQuota/1000).toFixed(0)}K</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Achieved</div>
            <div className="text-2xl font-bold text-slate-900">${(totalAchieved/1000).toFixed(0)}K</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Achievement</div>
            <div className="text-2xl font-bold text-slate-900">{Math.round((totalAchieved/totalQuota)*100)}%</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {teamMembers.map((member) => {
            const pct = Math.round((member.achieved / member.quota) * 100);
            return (
              <Card key={member.email} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-purple-600 text-slate-900 font-semibold">
                        {member.name.split(' ').map(n=>n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-slate-900 font-semibold">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.role}</div>
                    </div>
                  </div>
                  <Badge className={pct >= 100 ? 'bg-green-500/20 text-green-300 border-green-500/20' : 'bg-amber-500/20 text-amber-200 border-amber-500/20'}>
                    {pct}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{member.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{member.phone}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <div className="text-slate-500">Quota</div>
                    <div className="font-semibold text-slate-900">${(member.quota/1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Achieved</div>
                    <div className="font-semibold text-slate-900">${(member.achieved/1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Deals</div>
                    <div className="font-semibold text-slate-900">{member.deals}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="bg-white/5 text-slate-900 border-white/10 hover:bg-white/10">Nudge</Button>
                  <Button variant="ghost" className="text-purple-300 hover:text-slate-900">View details</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ManagerTeam;



