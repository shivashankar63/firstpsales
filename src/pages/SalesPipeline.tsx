import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Building2,
  User,
  TrendingUp,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronDown,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLeads, getCurrentUser, getUserRole, updateLead } from "@/lib/supabase";

type UserRole = "owner" | "manager" | "salesman";
import { formatDistanceToNow } from "date-fns";

type StageKey = "new" | "qualified" | "proposal" | "closed_won" | "not_interested";

const stageMeta: Record<StageKey, { label: string; color: string; description: string }> = {
  new: {
    label: "New Leads",
    color: "blue",
    description: "Fresh opportunities to pursue",
  },
  qualified: {
    label: "Qualified",
    color: "purple",
    description: "Vetted and engaged prospects",
  },
  proposal: {
    label: "Proposal Sent",
    color: "amber",
    description: "Awaiting decision",
  },
  closed_won: {
    label: "Closed",
    color: "emerald",
    description: "Successfully closed deals",
  },
  not_interested: {
    label: "Archived",
    color: "slate",
    description: "Declined or inactive",
  },
};


const SalesPipeline = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<StageKey>("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    value: 0,
    source: "",
    status: "new",
    description: "",
  });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/', { replace: true });
          return;
        }

        setCurrentUser(user);
        
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
        console.error("Error loading pipeline leads", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleAddLead = async () => {
    try {
      const { createLead } = await import("@/lib/supabase");
      let leadData = { ...formData };
      if (currentUser) {
        leadData.assigned_to = currentUser.id;
      }
      const { data, error } = await createLead(leadData as any);
      if (!error) {
        alert("Lead added successfully!");
        setShowAddModal(false);
        setFormData({
          company_name: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          value: 0,
          source: "",
          status: "new",
          description: "",
        });
        // Refresh leads
        const { data: leadsData } = await getLeads(currentUser ? { assignedTo: currentUser.id } : undefined);
        if (leadsData) setLeads(leadsData);
      } else {
        alert("Failed to add lead");
      }
    } catch (err) {
      alert("Failed to add lead");
    }
  };

  const stages = useMemo(() => {
    const grouped: Record<StageKey, { leads: any[]; value: number }> = {
      new: { leads: [], value: 0 },
      qualified: { leads: [], value: 0 },
      proposal: { leads: [], value: 0 },
      closed_won: { leads: [], value: 0 },
      not_interested: { leads: [], value: 0 },
    };

    leads.forEach((lead: any) => {
      const key = (lead.status || "new") as StageKey;
      if (!grouped[key]) return;
      grouped[key].leads.push(lead);
      grouped[key].value += lead.value || 0;
    });

    return (Object.keys(stageMeta) as StageKey[]).map((key) => ({
      key,
      name: stageMeta[key].label,
      leads: grouped[key].leads,
      value: grouped[key].value,
      color: stageMeta[key].color,
      description: stageMeta[key].description,
    }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const stageLeads = stages.find(s => s.key === selectedStage)?.leads || [];
    if (!searchQuery) return stageLeads;
    
    return stageLeads.filter(lead =>
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.contact_email || lead.email)?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stages, selectedStage, searchQuery]);

  const totalValue = stages.reduce((s, st) => s + st.value, 0);
  const totalLeads = leads.length;
  const activeDeals = leads.filter(l => !["closed_won", "not_interested"].includes(l.status)).length;

  const moveToStage = async (leadId: string, newStage: StageKey) => {
    try {
      await updateLead(leadId, { status: newStage });
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStage } : lead
        )
      );
    } catch (error) {
      console.error("Error moving lead:", error);
    }
  };

  const getStageColor = (color: string) => {
    // Black and white color scheme
    const colors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      blue: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200", badge: "bg-slate-50 text-slate-900 border-slate-200" },
      purple: { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300", badge: "bg-slate-100 text-slate-900 border-slate-300" },
      amber: { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300", badge: "bg-slate-100 text-slate-900 border-slate-300" },
      emerald: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200", badge: "bg-slate-50 text-slate-900 border-slate-200" },
      slate: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200", badge: "bg-slate-50 text-slate-900 border-slate-200" },
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="salesman" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center flex flex-col items-center gap-3">
              <Loader className="w-10 h-10 animate-spin text-slate-900" />
              <span className="text-slate-600">Loading pipeline...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Header with Stats and Add Lead button */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Sales Pipeline</h1>
                  <p className="text-sm text-slate-600">Manage and track your sales pipeline</p>
                </div>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium w-full sm:w-auto" onClick={() => setShowAddModal(true)}>
                  Add Lead
                </Button>
              </div>
              
              {/* Add Lead Modal */}
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                              <DialogContent className="bg-white max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Add New Lead</DialogTitle>
                                  <DialogDescription>Enter the details for the new lead</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Company Name</Label>
                                      <Input value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                                    </div>
                                    <div>
                                      <Label>Contact Name</Label>
                                      <Input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Email</Label>
                                      <Input type="email" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
                                    </div>
                                    <div>
                                      <Label>Phone</Label>
                                      <Input value={formData.contact_phone} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Value</Label>
                                      <Input type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                      <Label>Source</Label>
                                      <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="Website, Referral, etc." />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value })}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="proposal">Proposal Sent</SelectItem>
                                        <SelectItem value="closed_won">Closed</SelectItem>
                                        <SelectItem value="not_interested">Archived</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Description</Label>
                                    <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                  </div>
                                  <div className="flex justify-end pt-2">
                                    <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium" onClick={handleAddLead}>Add Lead</Button>
                                  </div>
                                </div>
                              </DialogContent>
              </Dialog>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Pipeline</p>
                      <p className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <DollarSign className="w-6 h-6 text-slate-900" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Active Deals</p>
                      <p className="text-2xl font-bold text-slate-900">{activeDeals}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <TrendingUp className="w-6 h-6 text-slate-900" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                      <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Building2 className="w-6 h-6 text-slate-900" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Search and Stage Filter */}
              <Card className="p-4 bg-white border-slate-200 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Search leads by company, contact, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-slate-500"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto justify-between bg-white border-slate-200 text-slate-900">
                        <span className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          <span>{stageMeta[selectedStage].label}</span>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {stages.find(s => s.key === selectedStage)?.leads.length || 0}
                          </Badge>
                        </span>
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {stages.map((stage) => {
                        const colors = getStageColor(stage.color);
                        return (
                          <DropdownMenuItem
                            key={stage.key}
                            onClick={() => setSelectedStage(stage.key as StageKey)}
                            className={selectedStage === stage.key ? "bg-slate-100 font-semibold" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{stage.name}</span>
                              <Badge className={`${colors.badge} border text-xs`}>
                                {stage.leads.length}
                              </Badge>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>

              {/* Stage Header - Compact */}
              {(() => {
                const currentStage = stages.find(s => s.key === selectedStage);
                return (
                  <div className="flex items-center justify-between mb-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">
                      {currentStage?.name || 'New Leads'} ({currentStage?.leads.length || 0})
                    </span>
                    <span className="text-slate-700">
                      ${((currentStage?.value || 0) / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })()}

              {/* Leads Table */}
              <Card className="p-3 sm:p-6 bg-white border-slate-200 shadow-sm">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">
                      {searchQuery ? "No leads match your search" : "No leads in this stage"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Lead</th>
                          <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Contact</th>
                          <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Status</th>
                          <th className="text-right py-2 px-3 font-medium text-xs text-slate-700">Value</th>
                          <th className="text-center py-2 px-3 font-medium text-xs text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map((lead: any) => {
                          const colors = getStageColor(stageMeta[selectedStage].color);
                          return (
                            <tr 
                              key={lead.id} 
                              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7">
                                    <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-medium">
                                      {lead.company_name?.substring(0, 2).toUpperCase() || 'UN'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-xs font-medium text-slate-900">{lead.company_name || "Unnamed Company"}</div>
                                    {lead.created_at && (
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-xs text-slate-900">{lead.contact_name || 'N/A'}</div>
                                  {(lead.contact_email || lead.email) && (
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">
                                      {lead.contact_email || lead.email}
                                    </div>
                                  )}
                                  {(lead.contact_phone || lead.phone) && (
                                    <div className="text-xs text-slate-500">
                                      {lead.contact_phone || lead.phone}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <Select
                                  value={lead.status || "new"}
                                  onValueChange={(value) => {
                                    moveToStage(lead.id, value as StageKey);
                                  }}
                                >
                                  <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs h-7 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="proposal">Proposal</SelectItem>
                                    <SelectItem value="closed_won">Closed Won</SelectItem>
                                    <SelectItem value="not_interested">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-semibold text-slate-900">
                                ${((lead.value || 0) / 1000).toFixed(0)}K
                              </td>
                              <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-slate-100"
                                    title="Call"
                                    asChild
                                  >
                                    <a href={`tel:${lead.contact_phone || lead.phone || ''}`}>
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-slate-100"
                                    title="Email"
                                    asChild
                                  >
                                    <a href={`mailto:${lead.contact_email || lead.email || ''}`}>
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {selectedStage === "new" && (
                                        <>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Qualified
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Send Proposal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-slate-900" /> Close Deal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                            <XCircle className="w-4 h-4 mr-2 text-slate-900" /> Archive Lead
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {selectedStage === "qualified" && (
                                        <>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Send Proposal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-slate-900" /> Close Deal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "new")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to New
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                            <XCircle className="w-4 h-4 mr-2 text-slate-900" /> Archive Lead
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {selectedStage === "proposal" && (
                                        <>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-slate-900" /> Close Deal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Qualified
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                            <XCircle className="w-4 h-4 mr-2 text-slate-900" /> Archive Lead
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {selectedStage === "closed_won" && (
                                        <>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Proposal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Qualified
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                            <XCircle className="w-4 h-4 mr-2 text-slate-900" /> Archive Lead
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {selectedStage === "not_interested" && (
                                        <>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "new")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Reactivate to New
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Qualified
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Proposal
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-slate-900" /> Close Deal
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SalesPipeline;


