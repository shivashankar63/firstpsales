import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { getLeads, getCurrentUser } from "@/lib/supabase";
import { formatCurrencyCompact } from "@/utils/currency";

interface QuotaData {
  target: number;
  achieved: number;
  daysLeft: number;
}

const QuotaProgress = () => {
  const [quota, setQuota] = useState<QuotaData>({
    target: 250000,
    achieved: 0,
    daysLeft: 15,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotaData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // Standard quota of 250k per month (can be customized)
          const targetQuota = 250000;
          
          // Get user's won deals
          const { data: leads } = await getLeads();
          const userLeads = (leads || []).filter((l: any) => l.assigned_to === user.id);
          const wonLeads = userLeads.filter((l: any) => l.status === 'closed_won');
          const achieved = wonLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);

          // Calculate days left in month
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          setQuota({
            target: targetQuota,
            achieved,
            daysLeft: Math.max(1, daysLeft),
          });
        }
      } catch (error) {
        console.error("Error fetching quota data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotaData();
  }, []);

  const percentage = (quota.achieved / quota.target) * 100;
  const dailyTarget = (quota.target - quota.achieved) / quota.daysLeft;
  const isOnTrack = percentage >= (100 / 30) * (30 - quota.daysLeft); // Simple on-track calculation

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Quota Progress</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-slate-900 mr-2" />
          <span className="text-sm text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Quota Progress</h2>
      
      <div className="space-y-4">
        {/* Main Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Monthly Target</span>
            <Badge className="bg-slate-900 text-white border-0 text-xs px-2 py-0.5">{percentage.toFixed(0)}%</Badge>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-600">
            <span>{formatCurrencyCompact(quota.achieved)} / {formatCurrencyCompact(quota.target)}</span>
            <span className="text-slate-500">{formatCurrencyCompact(Math.max(0, quota.target - quota.achieved))} left</span>
          </div>
        </div>

        {/* Daily Target */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-600 mb-1">Daily Target · Next {quota.daysLeft} Days</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrencyCompact(dailyTarget)}/day</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs text-slate-700">
            {isOnTrack ? 'On track to achieve quota' : 'Need to increase pace'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuotaProgress;
