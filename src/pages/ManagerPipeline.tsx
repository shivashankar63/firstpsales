import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Target, DollarSign, Timer, Loader, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getLeads, getCurrentUser } from "@/lib/supabase";

const ManagerPipeline = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const leadsRes = await getLeads();
        const allLeads = leadsRes.data || [];
        
        setLeads(allLeads);
      } catch (error) {
        console.error("Error fetching pipeline data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stage metrics from real data
  const calculateStages = () => {
    const newLeads = leads.filter(l => l.status === 'new');
    const qualifiedLeads = leads.filter(l => l.status === 'qualified');
    const negotiationLeads = leads.filter(l => l.status === 'negotiation');
    const wonLeads = leads.filter(l => l.status === 'won');
    const lostLeads = leads.filter(l => l.status === 'lost');

    return [
      { 
        name: "New", 
        count: newLeads.length, 
        value: newLeads.reduce((sum, l) => sum + (l.value || 0), 0), 
        sla: "1d",
        color: "text-blue-400"
      },
      { 
        name: "Qualified", 
        count: qualifiedLeads.length, 
        value: qualifiedLeads.reduce((sum, l) => sum + (l.value || 0), 0), 
        sla: "3d",
        color: "text-cyan-400"
      },
      { 
        name: "Negotiation", 
        count: negotiationLeads.length, 
        value: negotiationLeads.reduce((sum, l) => sum + (l.value || 0), 0), 
        sla: "7d",
        color: "text-orange-400"
      },
      { 
        name: "Closed Won", 
        count: wonLeads.length, 
        value: wonLeads.reduce((sum, l) => sum + (l.value || 0), 0), 
        sla: "-",
        color: "text-green-400"
      },
      { 
        name: "Lost", 
        count: lostLeads.length, 
        value: lostLeads.reduce((sum, l) => sum + (l.value || 0), 0), 
        sla: "-",
        color: "text-red-400"
      },
    ];
  };

  const stages = calculateStages();
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
  const maxValue = Math.max(...stages.map(s => s.value), 1);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading pipeline...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">Lead Pipeline</h1>
              <p className="text-slate-600">Stage-wise breakdown with value and SLA</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
            <Card className="bg-white border-slate-200 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Total Pipeline Value</p>
                  <p className="text-2xl font-bold text-slate-900">${(totalValue / 1000000).toFixed(2)}M</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="bg-white border-slate-200 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Total Deals</p>
                  <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
            <Card className="bg-white border-slate-200 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {leads.length > 0 ? Math.round((stages[3].count / leads.length) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stages.map((stage) => {
            const pct = maxValue > 0 ? Math.round((stage.value / maxValue) * 100) : 0;
            const getStageColor = (name: string) => {
              if (name === 'Closed Won') return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
              if (name === 'Lost') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
              if (name === 'Negotiation') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
              if (name === 'Qualified') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
              return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
            };
            const colors = getStageColor(stage.name);
            
            return (
              <Card key={stage.name} className="bg-white border-slate-200 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center`}>
                      <Target className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="text-slate-900 font-semibold text-lg">{stage.name}</div>
                  </div>
                  <Badge className={`${colors.bg} ${colors.text} border ${colors.border} font-semibold`}>
                    {stage.count} deals
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-3">
                  ${stage.value >= 1000 ? (stage.value/1000).toFixed(1) : stage.value}K
                </div>
                <Progress value={pct} className="h-2 mb-3" />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Timer className="w-4 h-4" /> SLA: {stage.sla}
                  </div>
                  <div className="text-slate-500">{pct}% of max stage</div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ManagerPipeline;


