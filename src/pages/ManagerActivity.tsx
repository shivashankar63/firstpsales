import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, Mail, FileText, CheckCircle2, Loader } from "lucide-react";
import { getCurrentUser, getUsers, getLeads, getActivities, subscribeToActivities } from "@/lib/supabase";

const iconMap: Record<string, any> = {
  call: Phone,
  email: Mail,
  note: FileText,
  deal: CheckCircle2,
};

const colorMap: Record<string, string> = {
  call: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  email: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  note: "bg-slate-500/15 text-slate-200 border-slate-500/20",
  deal: "bg-green-500/15 text-green-200 border-green-500/20",
};

interface ActivityWithDetails {
  id: string;
  type: string;
  title: string;
  description?: string;
  owner: string;
  created_at: string;
  user_id: string;
}

const ManagerActivity = () => {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const fetchData = async () => {
      try {
        const manager = await getCurrentUser();
        if (!manager) {
          setLoading(false);
          return;
        }

        // Get all users to map IDs to names
        const { data: users } = await getUsers();
        const userMap: Record<string, string> = {};
        (users || []).forEach((u: any) => {
          userMap[u.id] = u.full_name || u.email?.split("@")[0] || u.id;
        });
        setTeamMembers(userMap);

        // Get all activities (manager can see team's activities)
        const { data: allActivities } = await getActivities();
        const enriched = (allActivities || [])
          .map((a: any) => ({
            ...a,
            type: (a.activity_type || a.type || "note").toLowerCase(),
            owner: userMap[a.user_id] || "Unknown",
          }))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50); // Last 50 activities

        setActivities(enriched);

        // Subscribe to all activities for realtime updates
        const subs: any[] = [];
        (users || []).forEach((u: any) => {
          const sub = subscribeToActivities(u.id, async () => {
            try {
              const { data: updated } = await getActivities();
              const enriched = (updated || [])
                .map((a: any) => ({
                  ...a,
                  type: (a.activity_type || a.type || "note").toLowerCase(),
                  owner: userMap[a.user_id] || "Unknown",
                }))
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 50);
              setActivities(enriched);
            } catch (e) {
              console.error("Failed to refresh activities", e);
            }
          });
          subs.push(sub);
        });

        cleanup = () => {
          subs.forEach(sub => {
            try { sub.unsubscribe?.(); } catch {}
          });
        };
      } catch (error) {
        console.error("Error loading manager activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => { cleanup?.(); };
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Activity Log</h1>
            <p className="text-slate-500">Team-wide calls, emails, notes and deals</p>
          </div>
          <div className="text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Live</div>
        </div>

        <Card className="p-4 bg-white/5 border-white/10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-purple-500 mr-2" />
              <span className="text-slate-600">Loading activities...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500">No activities yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => {
                const Icon = iconMap[item.type] || FileText;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className={colorMap[item.type] || colorMap.note} variant="outline">
                        <Icon className="w-4 h-4" />
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-medium truncate">{item.title || "Activity"}</div>
                        <div className="text-xs text-slate-500">
                          {item.owner} {item.description ? `• ${item.description.substring(0, 40)}...` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 ml-2 whitespace-nowrap">{formatTime(item.created_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default ManagerActivity;




