import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { getLeads, getUsers } from "@/lib/supabase";
import { formatCurrencyCompact } from "@/utils/currency";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  revenue: number;
  dealsWon: number;
}

const TeamPerformance = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const { data: users } = await getUsers();
        const { data: leads } = await getLeads();

        if (users && leads) {
          const membersData = users.map((user: any) => {
            const userLeads = leads.filter((lead: any) => lead.assigned_to === user.id);
            const wonLeads = userLeads.filter((lead: any) => lead.status === 'won');
            const totalRevenue = wonLeads.reduce((sum: number, lead: any) => sum + (lead.value || 0), 0);
            
            return {
              id: user.id,
              name: user.full_name || user.email.split('@')[0],
              role: "Sales Rep",
              revenue: totalRevenue,
              dealsWon: wonLeads.length,
            };
          });

          // Sort by revenue descending
          membersData.sort((a: TeamMember, b: TeamMember) => b.revenue - a.revenue);
          setMembers(membersData.slice(0, 5)); // Top 5
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
        <h2 className="text-xl font-semibold text-foreground mb-4">Top Performers</h2>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading team data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
      <h2 className="text-xl font-semibold text-foreground mb-4">Top Performers</h2>
      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.dealsWon} deals won</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{formatCurrencyCompact(member.revenue)}</p>
              <Badge variant="outline" className="text-xs mt-1 bg-success/10 text-success border-success/20">
                {member.dealsWon} wins
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamPerformance;
