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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { getLeads, getCurrentUser, getUserById, updateLead } from "@/lib/supabase";
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
          navigate('/login', { replace: true });
          return;
        }

        setCurrentUser(user);
        const { data: userData } = await getUserById(user.id);
        if (!userData) {
          navigate('/login', { replace: true });
          return;
        }
        const role = String(userData.role || '').toLowerCase().trim();
        if (role !== 'salesman') {
          const roleRoutes: Record<string, string> = { owner: '/owner', manager: '/manager' };
          navigate(roleRoutes[role] || '/login', { replace: true });
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
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
    // Consistent with other pages: lighter backgrounds with darker text
    const colors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      blue: { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      purple: { bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200", badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
      amber: { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
      emerald: { bg: "bg-green-50", text: "text-green-900", border: "border-green-200", badge: "bg-green-500/20 text-green-400 border-green-500/30" },
      slate: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200", badge: "bg-slate-500/20 text-slate-500 border-slate-500/30" },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="salesman" />
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
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
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Sales Pipeline</h1>
                  <p className="text-sm sm:text-base text-slate-600">Manage and track your sales pipeline</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-full sm:w-auto" onClick={() => setShowAddModal(true)}>
                  Add Lead
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium" onClick={handleAddLead}>Add Lead</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Pipeline</p>
                      <p className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Active Deals</p>
                      <p className="text-2xl font-bold text-slate-900">{activeDeals}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-200">
                      <TrendingUp className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                      <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center border border-green-200">
                      <Building2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Search */}
              <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search leads by company, contact, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </Card>
            </div>


            {/* Stage Filters: Dropdown on mobile, Tabs on desktop */}
            <Tabs value={selectedStage} onValueChange={(v) => setSelectedStage(v as StageKey)}>
              {/* Mobile: Dropdown */}
              <div className="block sm:hidden mb-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full justify-between bg-white border border-slate-200 text-base font-medium rounded-lg text-slate-900">
                      <span className="flex items-center">
                        <span className="text-slate-900 font-semibold">{stageMeta[selectedStage].label}</span>
                        <span className="ml-2 text-xs text-slate-500">({stages.find(s => s.key === selectedStage)?.leads.length || 0})</span>
                      </span>
                      <svg className="w-4 h-4 ml-2 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[180px]">
                    {stages.map((stage) => (
                      <DropdownMenuItem
                        key={stage.key}
                        onClick={() => setSelectedStage(stage.key as StageKey)}
                        className={selectedStage === stage.key ? "bg-slate-100 font-semibold" : ""}
                      >
                        <span>{stage.name}</span>
                        <Badge variant="secondary" className="ml-auto">{stage.leads.length}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop: Tabs */}
              <TabsList className="hidden sm:flex bg-white border border-slate-200 p-1 mb-6">
                {stages.map((stage) => {
                  const colors = getStageColor(stage.color);
                  return (
                    <TabsTrigger
                      key={stage.key}
                      value={stage.key}
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span>{stage.name}</span>
                        <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                          {stage.leads.length}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {stages.map((stage) => {
                const colors = getStageColor(stage.color);
                return (
                  <TabsContent key={stage.key} value={stage.key} className="mt-0">
                    {/* Stage Header */}
                    <Card className={`${colors.bg} border ${colors.border} p-4 mb-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className={`text-lg font-semibold ${colors.text}`}>{stage.name}</h2>
                          <p className={`text-sm ${colors.text} opacity-70`}>{stage.description}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${colors.text}`}>${stage.value.toLocaleString()}</p>
                          <p className={`text-sm ${colors.text} opacity-70`}>{stage.leads.length} {stage.leads.length === 1 ? 'deal' : 'deals'}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Leads Grid */}
                    {filteredLeads.length === 0 ? (
                      <Card className="p-12 bg-white border-slate-200 shadow-sm text-center">
                        <p className="text-slate-500">
                          {searchQuery ? "No leads match your search" : "No leads in this stage"}
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredLeads.map((lead: any) => (
                          <Card key={lead.id} className="p-3 sm:p-4 bg-white border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                            <div className="p-5">
                              {/* Lead Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900 text-lg mb-1 truncate">
                                    {lead.company_name || "Unnamed Company"}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <User className="w-4 h-4" />
                                    <span>{lead.contact_name || "No contact"}</span>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {stage.key === "new" && (
                                      <>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                          <CheckCircle className="w-4 h-4 mr-2" /> Mark as Qualified
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Send Proposal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Close Deal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                          <XCircle className="w-4 h-4 mr-2 text-rose-600" /> Archive Lead
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.key === "qualified" && (
                                      <>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Send Proposal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Close Deal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "new")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Move to New
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                          <XCircle className="w-4 h-4 mr-2 text-rose-600" /> Archive Lead
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.key === "proposal" && (
                                      <>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "closed_won")}>
                                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Close Deal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Qualified
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                          <XCircle className="w-4 h-4 mr-2 text-rose-600" /> Archive Lead
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.key === "closed_won" && (
                                      <>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "proposal")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Proposal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "qualified")}>
                                          <ArrowUpRight className="w-4 h-4 mr-2" /> Move to Qualified
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => moveToStage(lead.id, "not_interested")}>
                                          <XCircle className="w-4 h-4 mr-2 text-rose-600" /> Archive Lead
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.key === "not_interested" && (
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
                                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Close Deal
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Deal Value */}
                              <div className={`inline-flex items-center gap-2 ${colors.badge} border px-3 py-1.5 rounded-lg mb-4`}>
                                <DollarSign className="w-4 h-4" />
                                <span className="font-semibold">${(lead.value || 0).toLocaleString()}</span>
                              </div>

                              {/* Contact Info */}
                              <div className="space-y-2 mb-4">
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <a href={`mailto:${lead.email}`} className="hover:text-slate-900 truncate">
                                      {lead.email}
                                    </a>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <a href={`tel:${lead.phone}`} className="hover:text-slate-900">
                                      {lead.phone}
                                    </a>
                                  </div>
                                )}
                                {lead.created_at && (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                                  </div>
                                )}
                              </div>

                              {/* Quick Actions */}
                              <div className="flex gap-2 pt-3 border-t border-slate-100">
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                  <a href={`tel:${lead.phone || ''}`}>
                                    <Phone className="w-4 h-4 mr-1" /> Call
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                  <a href={`mailto:${lead.email || ''}`}>
                                    <Mail className="w-4 h-4 mr-1" /> Email
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default SalesPipeline;


