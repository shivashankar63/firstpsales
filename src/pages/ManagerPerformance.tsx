import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { BarChart3, TrendingUp, Trophy, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const teamPerformance = [
  { name: "Sally Seller", winRate: 36, cycle: 24, quota: 180000, achieved: 195000 },
  { name: "Sam Seller", winRate: 28, cycle: 29, quota: 150000, achieved: 132000 },
  { name: "Steve Sales", winRate: 22, cycle: 31, quota: 140000, achieved: 99000 },
  { name: "Emma Expert", winRate: 18, cycle: 26, quota: 90000, achieved: 82000 },
];

const ManagerPerformance = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Team Performance</h1>
            <p className="text-slate-500">Win rates, sales cycles, and quota attainment</p>
          </div>
          <Badge className="bg-purple-600 text-slate-900">This Quarter</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {teamPerformance.map((rep) => {
            const quotaPct = Math.round((rep.achieved / rep.quota) * 100);
            return (
              <Card key={rep.name} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-900 font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-300" /> {rep.name}
                  </div>
                  <Badge className={quotaPct >= 100 ? 'bg-green-500/20 text-green-200' : 'bg-amber-500/20 text-amber-200'}>
                    {quotaPct}% quota
                  </Badge>
                </div>
                <div className="text-sm text-slate-500">Win Rate</div>
                <div className="text-xl font-bold text-slate-900 mb-2">{rep.winRate}%</div>
                <div className="text-sm text-slate-500">Sales Cycle</div>
                <div className="text-xl font-bold text-slate-900 mb-2">{rep.cycle} days</div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500 mb-1">Quota Attainment</div>
                  <Progress value={quotaPct} className="h-2" />
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ManagerPerformance;



