import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Phone, Mail, ArrowUpRight, Flame, Loader, Clock, AlertCircle, ChevronDown, ChevronUp, Search, MapPin, Briefcase, Filter as FilterIcon, X } from "lucide-react";
import { getLeads, getCurrentUser, updateLead, getUserRole } from "@/lib/supabase";

type UserRole = "owner" | "manager" | "salesman";
import LeadTimeline from "@/components/dashboard/LeadTimeline";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const stageColors: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  proposal: "bg-amber-50 text-amber-700 border-amber-200",
  closed_won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_interested: "bg-rose-50 text-rose-700 border-rose-200",
};

const scoreColors: Record<string, string> = {
  hot: "bg-rose-100 text-rose-700 border-rose-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-slate-100 text-slate-600 border-slate-200",
};

const SalesMyLeads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/', { replace: true });
          return;
        }

        // Use centralized role check - always gets fresh data from DB
        const userRole = await getUserRole(user.id);
        
        if (!userRole || userRole !== 'salesman') {
          const roleRoutes: Record<string, string> = { owner: '/owner', manager: '/manager' };
          navigate(roleRoutes[userRole as UserRole] || '/', { replace: true });
          return;
        }

        const { data } = await getLeads(user ? { assignedTo: user.id } : undefined);
        setLeads(data || []);
      } catch (error) {
        console.error("Error loading my leads", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const totalValue = useMemo(() => leads.reduce((s, l) => s + (l.value || 0), 0), [leads]);

  const [projectFilter, setProjectFilter] = useState<string>("all");

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      const projectName = l.projects?.name || "Unassigned";
      set.add(projectName);
    });
    return ["all", ...Array.from(set)];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.location || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || (lead.status || "new").toLowerCase() === statusFilter;
      
      // Project filter
      const projectName = lead.projects?.name || "Unassigned";
      const matchesProject = projectFilter === "all" || projectName === projectFilter;
      
      // Source filter (simulated - you can add source field to database)
      const leadSource = lead.source || "Direct";
      const matchesSource = sourceFilter === "all" || leadSource === sourceFilter;
      
      // Priority filter (based on lead_score)
      const priority = (lead.lead_score || "warm").toLowerCase();
      const matchesPriority = priorityFilter === "all" || priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesProject && matchesSource && matchesPriority;
    });
  }, [leads, projectFilter, searchQuery, statusFilter, sourceFilter, priorityFilter]);

  const stats = useMemo(() => {
    const hotLeads = filteredLeads.filter((l) => (l.lead_score || "warm").toLowerCase() === "hot");
    const closedWon = filteredLeads.filter((l) => (l.status || "").toLowerCase() === "closed_won");
    const winRate = filteredLeads.length ? Math.round((closedWon.length / filteredLeads.length) * 100) : 0;
    const value = filteredLeads.reduce((s, l) => s + (l.value || 0), 0);
    return {
      total: filteredLeads.length,
      value,
      hot: hotLeads.length,
      winRate,
    };
  }, [filteredLeads]);

  const statusLabel: Record<string, string> = {
    new: "New",
    qualified: "Qualified",
    proposal: "Proposal",
    closed_won: "Closed Won",
    not_interested: "Not Interested",
  };

  const handleAdvanceStage = async (leadId: string, currentStatus: string) => {
    const order = ["new", "qualified", "proposal", "closed_won"];
    const idx = order.indexOf(currentStatus);
    const next = order[Math.min(order.length - 1, idx + 1)] || currentStatus;
    try {
      await updateLead(leadId, { status: next });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: next } : l)));
    } catch (error) {
      console.error("Failed to advance lead", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <DashboardSidebar role="salesman" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-slate-300 flex flex-col items-center gap-3">
              <Loader className="w-10 h-10 animate-spin text-orange-400" />
              <span>Loading leads...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Leads</h1>
                  <p className="text-sm text-slate-600 mt-0.5">Track and manage your pipeline</p>
                </div>
                <Badge className="bg-slate-900 text-white border-transparent px-3 py-1.5 text-sm font-semibold">
                  ${totalValue.toLocaleString()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <Card className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">Total Leads</div>
                <div className="text-xl font-bold text-slate-900">{stats.total}</div>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">Pipeline Value</div>
                <div className="text-xl font-bold text-slate-900">${stats.value.toLocaleString()}</div>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">Hot Leads</div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <div className="text-xl font-bold text-slate-900">{stats.hot}</div>
                </div>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">Win Rate</div>
                <div className="text-xl font-bold text-slate-900">{stats.winRate}%</div>
              </Card>
            </div>

            {/* Advanced Filter Bar */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-5">
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between mb-3">
                <div className="relative flex-1 w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search leads by name, company, email, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 h-9"
                >
                  <FilterIcon className="w-4 h-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                  {(statusFilter !== "all" || sourceFilter !== "all" || priorityFilter !== "all") && (
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs px-1.5 py-0.5 ml-1">Active</Badge>
                  )}
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                  {/* Status Filter */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Status</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between h-9 text-sm">
                          {statusFilter === "all" ? "All Status" : statusLabel[statusFilter] || statusFilter}
                          <ChevronDown className="w-3.5 h-3.5 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStatusFilter("new")}>New</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("qualified")}>Qualified</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("proposal")}>Proposal</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("closed_won")}>Closed Won</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("not_interested")}>Not Interested</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Source Filter */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Lead Source</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between h-9 text-sm">
                          {sourceFilter === "all" ? "All Sources" : sourceFilter}
                          <Briefcase className="w-3.5 h-3.5 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => setSourceFilter("all")}>All Sources</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSourceFilter("Direct")}>Direct</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSourceFilter("Referral")}>Referral</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSourceFilter("Website")}>Website</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSourceFilter("LinkedIn")}>LinkedIn</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSourceFilter("Cold Call")}>Cold Call</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSourceFilter("Event")}>Event</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Priority</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between h-9 text-sm">
                          {priorityFilter === "all" ? "All Priorities" : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                          <Flame className="w-3.5 h-3.5 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => setPriorityFilter("all")}>All Priorities</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setPriorityFilter("hot")}>
                          <Flame className="w-3.5 h-3.5 mr-2 text-rose-600" /> Hot
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriorityFilter("warm")}>
                          <Flame className="w-3.5 h-3.5 mr-2 text-amber-600" /> Warm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriorityFilter("cold")}>
                          <Flame className="w-3.5 h-3.5 mr-2 text-slate-400" /> Cold
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setSourceFilter("all");
                        setPriorityFilter("all");
                        setProjectFilter("all");
                      }}
                      className="w-full h-9 text-sm gap-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
              <div className="text-xs font-medium text-slate-700 uppercase tracking-wide">Filter by project</div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full sm:w-64 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              >
                {projectOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "All projects" : opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredLeads.map((lead) => {
                const stageKey = (lead.status || "new").toLowerCase();
                const scoreKey = (lead.lead_score || "warm").toLowerCase();
                const projectName = lead.projects?.name || "Unassigned";
                const isExpanded = expandedLeadId === lead.id;
                const needsAttention = lead.last_contacted_at
                  ? (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24) > 7
                  : true;
                const lastTouch = lead.last_contacted_at
                  ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
                  : "Never";
                return (
                  <Card key={lead.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-11 h-11 ring-1 ring-slate-200">
                            <AvatarFallback className="bg-slate-900 text-white font-semibold text-sm">
                              {(lead.company_name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-base font-semibold text-slate-900">{lead.company_name || "Unknown"}</div>
                            <div className="text-xs text-slate-600">{lead.contact_name || lead.email || "No contact"}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-slate-400"></span>
                              {projectName}
                            </div>
                          </div>
                        </div>
                        <Badge className={`${stageColors[stageKey] || stageColors.new} border text-xs font-medium px-2 py-0.5`}>
                          {statusLabel[stageKey] || stageKey.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <Badge variant="outline" className="border-slate-300 text-slate-700 flex items-center gap-1 text-xs font-normal px-2 py-0.5">
                          <Clock className="w-3 h-3" />
                          {lastTouch}
                        </Badge>
                        {needsAttention && (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-200 border flex items-center gap-1 text-xs font-medium px-2 py-0.5">
                            <AlertCircle className="w-3 h-3" />
                            Needs attention
                          </Badge>
                        )}
                        {lead.location && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 flex items-center gap-1 text-xs font-normal px-2 py-0.5">
                            <MapPin className="w-3 h-3" />
                            {lead.location}
                          </Badge>
                        )}
                        {(lead.source || "Direct") && (
                          <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 flex items-center gap-1 text-xs font-normal px-2 py-0.5">
                            <Briefcase className="w-3 h-3" />
                            {lead.source || "Direct"}
                          </Badge>
                        )}
                        <Badge className={`${scoreColors[scoreKey] || scoreColors.warm} border text-xs font-medium px-2 py-0.5`}>
                          {(lead.lead_score || "Warm").toString()}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{lead.email || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lead.phone || lead.contact_phone || "-"}</span>
                          </div>
                          <div className="text-slate-500 font-medium">Value</div>
                          <div className="text-slate-900 font-bold text-sm">${Number(lead.value || 0).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors h-8 px-3 text-xs"
                            onClick={() => {
                              const email = (lead as any).contact_email || (lead as any).email;
                              if (email) window.location.href = `mailto:${email}`;
                            }}
                          >
                            <Mail className="w-3.5 h-3.5 mr-1" /> Email
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors h-8 px-3 text-xs"
                            onClick={() => {
                              const phone = (lead as any).contact_phone || (lead as any).phone;
                              if (phone) window.location.href = `tel:${phone}`;
                            }}
                          >
                            <Phone className="w-3.5 h-3.5 mr-1" /> Call
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-8 px-3 text-xs"
                            onClick={() => handleAdvanceStage(lead.id, (lead.status || "new").toLowerCase())}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Advance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 hover:bg-slate-50 h-8 px-3 text-xs"
                            onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3.5 h-3.5" /></>
                            ) : (
                              <><ChevronDown className="w-3.5 h-3.5" /></>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                        <LeadTimeline
                          leadId={lead.id}
                          leadName={lead.company_name || "Unknown"}
                          lastContactedAt={lead.last_contacted_at}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SalesMyLeads;


