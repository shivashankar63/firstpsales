import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { getLeads, getCurrentUser } from "@/lib/supabase";

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
      <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quota Progress</h2>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading quota data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
      <h2 className="text-xl font-semibold text-foreground mb-4">Quota Progress</h2>
      
      <div className="space-y-6">
        {/* Main Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Monthly Target</span>
            <Badge className="bg-primary/20 text-primary border-0">{percentage.toFixed(0)}%</Badge>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>${(quota.achieved / 1000).toFixed(0)}K / ${(quota.target / 1000).toFixed(0)}K</span>
            <span>${(Math.max(0, quota.target - quota.achieved) / 1000).toFixed(0)}K remaining</span>
          </div>
        </div>

        {/* Daily Target */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Daily Target for Next {quota.daysLeft} Days</p>
          <p className="text-lg font-semibold text-foreground">${(dailyTarget / 1000).toFixed(1)}K/day</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnTrack ? 'bg-success' : 'bg-warning'}`} />
          <span className="text-sm text-foreground">
            {isOnTrack ? 'On track to achieve quota' : 'Need to increase pace'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuotaProgress;
