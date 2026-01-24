
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Users, Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import * as React from "react";
import { getUsersByRole } from "@/lib/supabase";
import { formatCurrencyCompact } from "@/utils/currency";


type Salesman = {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone?: string;
  quota?: number;
  achieved?: number;
  deals?: number;
};


const ManagerTeam = () => {
  const [salesmen, setSalesmen] = React.useState<Salesman[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSalesmen = async () => {
      setLoading(true);
      const { data } = await getUsersByRole('salesman');
      setSalesmen(data || []);
      setSelectedIds((data || []).map((u: Salesman) => u.id)); // default: all selected
      setLoading(false);
    };
    fetchSalesmen();
  }, []);

  const selectedSalesmen = salesmen.filter((s) => selectedIds.includes(s.id));
  const totalQuota = selectedSalesmen.reduce((s, m) => s + (m.quota || 0), 0);
  const totalAchieved = selectedSalesmen.reduce((s, m) => s + (m.achieved || 0), 0);
  const totalDeals = selectedSalesmen.reduce((s, m) => s + (m.deals || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Users</h1>
            <p className="text-slate-500">Overview of users and quotas</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4" /> {selectedSalesmen.length} selected
          </div>
        </div>

        {/* Team selection dropdown */}
        <div className="mb-6">
          <div className="mb-2 text-slate-700 font-medium">Select Team Members:</div>
          <div className="flex flex-wrap gap-3 bg-white/50 border border-white/10 rounded-lg p-3">
            {loading ? (
              <span className="text-slate-400">Loading...</span>
            ) : (
              salesmen.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedIds.includes(s.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      );
                    }}
                    id={`salesman-${s.id}`}
                  />
                  <span className="text-slate-800 text-sm">{s.full_name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Total Quota</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(totalQuota)}</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Achieved</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(totalAchieved)}</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="text-slate-500 text-sm">Achievement</div>
            <div className="text-2xl font-bold text-slate-900">{totalQuota > 0 ? Math.round((totalAchieved/totalQuota)*100) : 0}%</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {selectedSalesmen.map((member) => {
            const pct = member.quota && member.achieved ? Math.round((member.achieved / member.quota) * 100) : 0;
            return (
              <Card key={member.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-purple-600 text-slate-900 font-semibold">
                        {member.full_name?.split(' ').map(n=>n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-slate-900 font-semibold">{member.full_name}</div>
                      <div className="text-xs text-slate-500">{member.role}</div>
                    </div>
                  </div>
                  <Badge className={pct >= 100 ? 'bg-green-500/20 text-green-300 border-green-500/20' : 'bg-amber-500/20 text-amber-200 border-amber-500/20'}>
                    {pct}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{member.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{member.phone || '-'}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <div className="text-slate-500">Quota</div>
                    <div className="font-semibold text-slate-900">{member.quota ? formatCurrencyCompact(member.quota) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Achieved</div>
                    <div className="font-semibold text-slate-900">${member.achieved ? (member.achieved/1000).toFixed(0) : '-'}K</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Deals</div>
                    <div className="font-semibold text-slate-900">{member.deals ?? '-'}</div>
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





