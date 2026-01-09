import { useState } from "react";
import { Search, Filter, ChevronDown, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Lead {
  id: string;
  name: string;
  avatar: string;
  project: string;
  status: "new" | "proposal" | "closed_won" | "not_interested";
  assignedTo: string;
  value: number;
}

const mockLeads: Lead[] = [
  { id: "1", name: "Acme Corporation", avatar: "AC", project: "Project Alpha", status: "new", assignedTo: "", value: 45000 },
  { id: "2", name: "TechStart Inc", avatar: "TS", project: "Enterprise Deal", status: "proposal", assignedTo: "Agent Smith", value: 125000 },
  { id: "3", name: "GlobalTech Ltd", avatar: "GT", project: "Project Beta", status: "closed_won", assignedTo: "Agent Doe", value: 89000 },
  { id: "4", name: "InnovateCo", avatar: "IC", project: "Consulting", status: "proposal", assignedTo: "Agent Smith", value: 67000 },
  { id: "5", name: "DataDriven Corp", avatar: "DD", project: "SaaS License", status: "new", assignedTo: "", value: 34000 },
  { id: "6", name: "CloudFirst Systems", avatar: "CF", project: "Implementation", status: "closed_won", assignedTo: "Agent Doe", value: 156000 },
];

const salesmen = ["Agent Smith", "Agent Doe", "Agent Brown", "Agent Wilson"];

const LeadsTable = () => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.project.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Lead["status"]) => {
    const styles = {
      new: "bg-muted text-muted-foreground",
      proposal: "bg-warning/10 text-warning border-warning/20",
      closed_won: "bg-success/10 text-success border-success/20",
      not_interested: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels = {
      new: "New",
      proposal: "In Proposal",
      closed_won: "Closed Won",
      not_interested: "Not Interested",
    };

    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const handleAssign = (leadId: string, salesman: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, assignedTo: salesman } : lead
      )
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-foreground">Lead Distribution</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {statusFilter === "all" ? "All Status" : statusFilter}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("new")}>New</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("proposal")}>In Proposal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("closed_won")}>Closed Won</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("not_interested")}>Not Interested</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Lead Name</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Project</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Assigned To</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Value</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, index) => (
              <tr 
                key={lead.id} 
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {lead.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{lead.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-muted-foreground">{lead.project}</td>
                <td className="py-4 px-4">{getStatusBadge(lead.status)}</td>
                <td className="py-4 px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 h-8">
                        {lead.assignedTo || <span className="text-destructive">Unassigned</span>}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {salesmen.map((salesman) => (
                        <DropdownMenuItem
                          key={salesman}
                          onClick={() => handleAssign(lead.id, salesman)}
                        >
                          {salesman}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="py-4 px-4 font-medium text-foreground">
                  ${lead.value.toLocaleString()}
                </td>
                <td className="py-4 px-4">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No leads found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default LeadsTable;
