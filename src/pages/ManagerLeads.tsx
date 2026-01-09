import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Loader, CheckCircle, Clock, XCircle, AlertCircle, Filter, Search, Download, Mail, Phone as PhoneIcon, Briefcase } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLeads, getCurrentUser, getUsers, createLead, updateLead, getProjects, deleteLead, testConnection, subscribeToUsers, subscribeToLeads, getActivitiesForLead, subscribeToLeadActivities } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ManagerLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);
  
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    value: "",
    assigned_to: "",
    status: "new" as "new" | "qualified" | "proposal" | "closed_won" | "not_interested",
    description: "",
    link: "",
  });
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assigningLead, setAssigningLead] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test Supabase connection first
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
          console.error('Supabase connection failed! Check your API key in .env.local');
          setLoading(false);
          return;
        }
        
        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [projectsRes, usersRes] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);

        const allProjects = projectsRes.data || [];
        const users = usersRes.data || [];
        const salespeople = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));
        
        setProjects(allProjects);
        setSalesUsers(salespeople);
        
        if (allProjects.length > 0) {
          setSelectedProject(allProjects[0]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Read status filter from URL params
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && ["new", "qualified", "negotiation", "won", "lost", "proposal", "closed_won", "not_interested"].includes(statusParam)) {
      // Normalize old status values to new ones for consistency
      const normalizedStatus = statusParam === "negotiation" ? "proposal" 
        : statusParam === "won" ? "closed_won"
        : statusParam === "lost" ? "not_interested"
        : statusParam;
      setStatusFilter(normalizedStatus);
    }
  }, [searchParams]);

  // If a leadId is present in the URL, open that lead's modal when data is available
  useEffect(() => {
    const paramId = searchParams.get("leadId");
    if (!paramId || !leads?.length) return;
    const found = leads.find((l) => String(l.id) === String(paramId));
    if (found) {
      setSelectedLead(found);
      setShowDetailsModal(true);
    }
  }, [searchParams, leads]);

  useEffect(() => {
    // Realtime: listen for users changes to keep sales list fresh
    const userSub = subscribeToUsers(async () => {
      try {
        const usersRes = await getUsers();
        const users = usersRes.data || [];
        const salespeople = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));
        setSalesUsers(salespeople);
      } catch (e) {
        console.error("Failed to refresh users after realtime event", e);
      }
    });

    return () => {
      try { userSub.unsubscribe?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const fetchProjectLeads = async () => {
      try {
        const leadsRes = await getLeads();
        const allLeads = leadsRes.data || [];
        const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject.id);
        setLeads(projectLeads);
      } catch (error) {
        console.error("Error fetching project leads:", error);
      }
    };
    fetchProjectLeads();

    // Realtime: listen for leads changes and refresh current project's leads
    const leadSub = subscribeToLeads(async (payload: any) => {
      try {
        const affected = payload?.new?.project_id || payload?.old?.project_id;
        if (!affected || affected !== selectedProject.id) return;
        const leadsRes = await getLeads();
        const allLeads = leadsRes.data || [];
        const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject.id);
        setLeads(projectLeads);
      } catch (e) {
        console.error("Failed to refresh leads after realtime event", e);
      }
    });

    return () => {
      try { leadSub.unsubscribe?.(); } catch {}
    };
  }, [selectedProject]);

  const handleCreateLead = async () => {
    setCreateMessage(null);
    if (!leadForm.company_name || !leadForm.contact_name || !leadForm.value) {
      setCreateMessage({ type: "error", text: "Company, contact, and value are required." });
      return;
    }
    if (!selectedProject) {
      setCreateMessage({ type: "error", text: "Please select a project first." });
      return;
    }
    const valueNum = Number(leadForm.value);
    if (isNaN(valueNum) || valueNum <= 0) {
      setCreateMessage({ type: "error", text: "Value must be a positive number." });
      return;
    }
    setCreating(true);
    try {
      const newLead = await createLead({
        company_name: leadForm.company_name,
        contact_name: leadForm.contact_name,
        email: leadForm.email,
        phone: leadForm.phone,
        status: leadForm.status,
        value: valueNum,
        assigned_to: leadForm.assigned_to || null,
        project_id: selectedProject.id,
        description: leadForm.description || `Created on ${new Date().toLocaleDateString()}`,
        link: leadForm.link || undefined,
      });
      
      console.log('Lead created:', newLead);
      setCreateMessage({ type: "success", text: "Lead created successfully." });
      
      // Refresh leads for the current project
      const leadsRes = await getLeads();
      const allLeads = leadsRes.data || [];
      console.log('All leads after creation:', allLeads);
      const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject.id);
      console.log('Project leads after creation:', projectLeads);
      setLeads(projectLeads);
      
      setTimeout(() => {
        setShowAddLeadModal(false);
        setLeadForm({ company_name: "", contact_name: "", email: "", phone: "", value: "", assigned_to: "", status: "new", description: "", link: "" });
        setCreateMessage(null);
      }, 1500);
    } catch (err: any) {
      setCreateMessage({ type: "error", text: err.message || "Failed to create lead." });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignLead = async (leadId: string, salesPersonId: string) => {
    setAssigningLead(leadId);
    try {
      await updateLead(leadId, { assigned_to: salesPersonId || null });
      const leadsRes = await getLeads();
      const allLeads = leadsRes.data || [];
      const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject?.id);
      setLeads(projectLeads);
    } catch (error) {
      console.error('Failed to assign lead:', error);
    } finally {
      setAssigningLead(null);
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    if (!leadId || !status) {
      console.error('Invalid leadId or status:', { leadId, status });
      return;
    }
    
    setUpdatingLeadId(leadId);
    try {
      console.log('Updating lead status:', { leadId, status, selectedProject: selectedProject?.id });
      
      const result = await updateLead(leadId, { status });
      console.log('Update result:', result);
      
      // Check if there was an error in the result
      if (result.error) {
        console.error('Update lead error:', result.error);
        alert(`Failed to update lead status: ${result.error.message || 'Unknown error'}`);
        setUpdatingLeadId(null);
        return;
      }
      
      if (!result.data) {
        console.error('No data returned from update');
        alert('Failed to update lead status: No data returned');
        setUpdatingLeadId(null);
        return;
      }
      
      console.log('Status updated successfully, refreshing leads...');
      
      // Refresh leads for the current project
      const leadsRes = await getLeads();
      if (leadsRes.error) {
        console.error('Error fetching leads after update:', leadsRes.error);
        alert('Status updated but failed to refresh the list. Please refresh the page.');
      } else {
        const allLeads = leadsRes.data || [];
        const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject?.id);
        console.log('Refreshed leads:', projectLeads.length);
        setLeads(projectLeads);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(`Failed to update lead status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Helper function to normalize status values (handle both old and new formats)
  const normalizeStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'negotiation': 'proposal',
      'won': 'closed_won',
      'lost': 'not_interested',
    };
    return statusMap[status] || status;
  };

  // Helper function to check if a lead status matches the filter
  const statusMatches = (leadStatus: string, filterStatus: string): boolean => {
    if (filterStatus === "all") return true;
    const normalizedLeadStatus = normalizeStatus(leadStatus);
    const normalizedFilterStatus = normalizeStatus(filterStatus);
    return normalizedLeadStatus === normalizedFilterStatus || leadStatus === filterStatus;
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusMatches(lead.status, statusFilter);
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" ? !lead.assigned_to : lead.assigned_to === assigneeFilter);
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term === "" ||
      (lead.company_name || "").toLowerCase().includes(term) ||
      (lead.contact_name || "").toLowerCase().includes(term) ||
      (lead.email || "").toLowerCase().includes(term);
    return matchesStatus && matchesAssignee && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch(normalizedStatus) {
      case 'closed_won': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not_interested': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'proposal': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'qualified': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch(normalizedStatus) {
      case 'closed_won': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'not_interested': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'proposal': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'qualified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  // Load activities for the selected lead when viewing details
  useEffect(() => {
    if (!selectedLead || !showDetailsModal) return;

    let cleanup: (() => void) | undefined;

    const load = async () => {
      try {
        const { data } = await getActivitiesForLead(selectedLead.id);
        setLeadActivities(data || []);
      } catch (e) {
        console.error('Failed to load lead activities', e);
      }
    };

    load();

    const sub = subscribeToLeadActivities(selectedLead.id, async () => {
      try {
        const { data } = await getActivitiesForLead(selectedLead.id);
        setLeadActivities(data || []);
      } catch (e) {
        console.error('Failed to refresh lead activities', e);
      }
    });
    cleanup = () => { try { sub.unsubscribe?.(); } catch {} };

    return () => { cleanup?.(); };
  }, [selectedLead, showDetailsModal]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading leads...</p>
          </div>
        </main>
      </div>
    );
  }

  // Count leads by status (handling both old and new status values)
  const newLeads = leads.filter(l => l.status === 'new');
  const qualifiedLeads = leads.filter(l => l.status === 'qualified');
  const proposalLeads = leads.filter(l => l.status === 'proposal' || l.status === 'negotiation');
  const closedWonLeads = leads.filter(l => l.status === 'closed_won' || l.status === 'won');
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

  // Debug logging
  console.log('Current state:', {
    selectedProject: selectedProject?.name,
    totalLeads: leads.length,
    filteredLeads: filteredLeads.length,
    statusFilter,
    assigneeFilter,
    searchTerm,
    leads: leads.map(l => ({ company: l.company_name, status: l.status, project_id: l.project_id }))
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Leads Management</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage and track all leads across projects</p>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 w-full">
                <Label className="text-slate-700 mb-2 block text-sm sm:text-base font-medium">Active Project</Label>
                <Select value={selectedProject?.id} onValueChange={(value) => {
                  const project = projects.find(p => p.id === value);
                  setSelectedProject(project || null);
                }}>
                  <SelectTrigger className="w-full bg-white border-slate-300 text-slate-900 hover:bg-slate-50">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100">
                        {project.name}
                      </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => setShowAddLeadModal(true)} 
            disabled={!selectedProject}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedProject ? "Please select a project first" : "Add a new lead"}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>
        )}

        {projects.length === 0 && (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Available</h3>
            <p className="text-slate-500 mb-6">Create a project first to start adding leads</p>
          </Card>
        )}

        {projects.length > 0 && !selectedProject && (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Project</h3>
            <p className="text-slate-500">Please select a project from the dropdown above to view and manage leads</p>
          </Card>
        )}

        {selectedProject && (
          <>
            {/* Compact Stats Bar */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{leads.length}</span>
                      <span className="text-xs text-slate-600 font-medium">Total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-900">{newLeads.length}</span>
                      <span className="text-xs text-blue-700 font-medium">New</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-indigo-900">{qualifiedLeads.length}</span>
                      <span className="text-xs text-indigo-700 font-medium">Qualified</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-orange-900">{proposalLeads.length}</span>
                      <span className="text-xs text-orange-700 font-medium">In Proposal</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    <Download className="w-4 h-4 text-green-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-green-700">${(totalValue / 1000).toFixed(0)}K</span>
                      <span className="text-xs text-green-700 font-medium">Value</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Compact Filters Bar */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-900">Filters:</span>
                </div>
                <div className="flex-1 min-w-[150px] max-w-[200px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">All Statuses</SelectItem>
                      <SelectItem value="new" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">New</SelectItem>
                      <SelectItem value="qualified" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Qualified</SelectItem>
                      <SelectItem value="proposal" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">In Proposal</SelectItem>
                      <SelectItem value="closed_won" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Closed Won</SelectItem>
                      <SelectItem value="not_interested" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[150px] max-w-[200px]">
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="h-9 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 font-medium">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">All Assignees</SelectItem>
                      <SelectItem value="unassigned" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Unassigned</SelectItem>
                      {salesUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id} className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">
                          {u.full_name || u.email?.split("@")[0] || u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search leads..."
                      className="h-9 pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Leads List */}
            <Card className="p-3 sm:p-6 bg-white border-slate-200">
              <div className="space-y-2 sm:space-y-3">
                {filteredLeads.map((lead) => {
                  const assignedUser = salesUsers.find(u => u.id === lead.assigned_to);
                  const assignedName = assignedUser?.full_name || assignedUser?.email?.split("@")[0] || "Unassigned";
                  const lastTouched = lead.updated_at || lead.created_at;
                  const daysStale = lastTouched ? Math.floor((Date.now() - new Date(lastTouched).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isStale = daysStale > 7;
                  
                  return (
                    <Card key={lead.id} className="p-3 sm:p-4 bg-white border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailsModal(true);
                    }}>
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {getStatusIcon(lead.status)}
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{lead.company_name}</h3>
                            <Badge className={getStatusColor(lead.status) + " text-xs sm:text-sm font-semibold"}>{lead.status}</Badge>
                            {isStale && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Stale ({daysStale}d)</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>{lead.contact_name}</span>
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <PhoneIcon className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-green-600 font-semibold">${((lead.value || 0) / 1000).toFixed(1)}K</span>
                            <span className="text-slate-400 mx-2">•</span>
                            <span className="text-slate-600">Assigned to: <span className="font-medium">{assignedName}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full lg:w-56" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={(value) => {
                              handleAssignLead(lead.id, value === "unassigned" ? "" : value);
                            }}
                            disabled={assigningLead === lead.id}
                          >
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs" onClick={(e) => e.stopPropagation()}>
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {salesUsers.map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name || u.email?.split("@")[0] || u.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={normalizeStatus(lead.status) || lead.status}
                            onValueChange={(value) => {
                              console.log('Status change triggered:', { 
                                leadId: lead.id, 
                                newStatus: value, 
                                currentStatus: lead.status,
                                normalizedCurrent: normalizeStatus(lead.status)
                              });
                              // Use the value directly (it's already normalized from the SelectItem values)
                              handleStatusChange(lead.id, value);
                            }}
                            disabled={updatingLeadId === lead.id}
                          >
                            <SelectTrigger 
                              className="bg-white border-slate-200 text-slate-900 text-xs" 
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent 
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <SelectItem 
                                value="new" 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                New
                              </SelectItem>
                              <SelectItem 
                                value="qualified" 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Qualified
                              </SelectItem>
                              <SelectItem 
                                value="proposal" 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                In Proposal
                              </SelectItem>
                              <SelectItem 
                                value="closed_won" 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Closed Won
                              </SelectItem>
                              <SelectItem 
                                value="not_interested" 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Not Interested
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {filteredLeads.length === 0 && leads.length > 0 && (
                  <div className="text-center py-12">
                    <Filter className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">No leads match the current filters</p>
                    <p className="text-sm text-slate-500">Try adjusting your filters or search term</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setStatusFilter("all");
                        setAssigneeFilter("all");
                        setSearchTerm("");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
                {filteredLeads.length === 0 && leads.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">No leads found for this project. Add your first lead to get started!</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* Add Lead Modal */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {createMessage && (
                <Alert className={createMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <AlertDescription className={createMessage.type === "success" ? "text-green-700" : "text-red-700"}>
                    {createMessage.text}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={leadForm.company_name}
                    onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Contact Name *</Label>
                  <Input
                    id="contact"
                    value={leadForm.contact_name}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="+1-555-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="value">Deal Value (USD) *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={leadForm.value}
                    onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="assign">Assign To</Label>
                  <Select value={leadForm.assigned_to || "unassigned"} onValueChange={(value) => setLeadForm({ ...leadForm, assigned_to: value === "unassigned" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {salesUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email?.split("@")[0] || u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Notes / Description</Label>
                  <Textarea
                    id="description"
                    value={leadForm.description}
                    onChange={(e) => setLeadForm({ ...leadForm, description: e.target.value })}
                    placeholder="Add any additional notes about this lead..."
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="link">Company Website / Link</Label>
                  <Input
                    id="link"
                    type="url"
                    value={leadForm.link}
                    onChange={(e) => setLeadForm({ ...leadForm, link: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <div className="text-xs text-slate-500 mt-1">Enter the company website or relevant link</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLeadModal(false)} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreateLead} disabled={creating}>
                {creating ? "Creating..." : "Create Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lead Details Modal */}
        <Dialog
          open={showDetailsModal}
          onOpenChange={(open) => {
            setShowDetailsModal(open);
            if (!open) {
              // Remove leadId from URL when closing
              const next = new URLSearchParams(searchParams);
              next.delete("leadId");
              setSearchParams(next, { replace: true });
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="text-xl text-slate-900">Lead Details</DialogTitle>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="pb-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedLead.company_name}</h3>
                      <p className="text-slate-600 text-sm mt-2">📞 {selectedLead.contact_name}</p>
                    </div>
                    <Badge className={`${getStatusColor(selectedLead.status)} text-sm px-3 py-1`}>{selectedLead.status.toUpperCase()}</Badge>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.email && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all">
                        <span className="text-xs font-semibold text-blue-700 block mb-2 uppercase tracking-wide">📧 Email</span>
                        <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:text-blue-800 break-all text-sm font-medium">{selectedLead.email}</a>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100 transition-all">
                        <span className="text-xs font-semibold text-indigo-700 block mb-2 uppercase tracking-wide">☎️ Phone</span>
                        <a href={`tel:${selectedLead.phone}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">{selectedLead.phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Link */}
                {selectedLead.link && (
                  <div>
                    <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                      Company Website
                    </h4>
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200 hover:border-cyan-300 hover:bg-cyan-100 transition-all">
                      <a 
                        href={selectedLead.link.startsWith('http') ? selectedLead.link : `https://${selectedLead.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:text-cyan-800 break-all text-sm font-medium underline flex items-center gap-2"
                      >
                        🔗 {selectedLead.link}
                      </a>
                    </div>
                  </div>
                )}

                {/* Deal Information */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Deal Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <span className="text-xs font-semibold text-green-700 block mb-2 uppercase tracking-wide">💰 Deal Value</span>
                      <span className="text-xl font-bold text-green-600">${((selectedLead.value || 0) / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <span className="text-xs font-semibold text-blue-700 block mb-2 uppercase tracking-wide">📊 Status</span>
                      <span className="text-lg font-bold text-blue-600 capitalize">{selectedLead.status}</span>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <span className="text-xs font-semibold text-orange-700 block mb-2 uppercase tracking-wide">📅 Created</span>
                      <span className="text-sm font-bold text-orange-600">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                {selectedLead.assigned_to && (() => {
                  const assignedUser = salesUsers.find(u => u.id === selectedLead.assigned_to);
                  return (
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Assigned To
                      </h4>
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <span className="text-lg font-bold text-indigo-900">{assignedUser?.full_name || assignedUser?.email?.split("@")[0] || "Unknown"}</span>
                        {assignedUser?.email && <p className="text-sm text-indigo-700 mt-2">📧 {assignedUser.email}</p>}
                      </div>
                    </div>
                  );
                })()}

                {/* Lead Description */}
                {selectedLead.description && (
                  <div>
                    <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Lead Description
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-700 text-sm leading-relaxed">{selectedLead.description}</p>
                    </div>
                  </div>
                )}

                {/* Recent Notes Section */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    Activity Notes ({(() => {
                      const notes = (leadActivities || []).filter((a: any) => String((a.activity_type || a.type || 'note')).toLowerCase() === 'note');
                      return notes.length;
                    })()})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {(() => {
                      const notes = (leadActivities || []).filter((a: any) => String((a.activity_type || a.type || 'note')).toLowerCase() === 'note');
                      if (notes.length === 0) {
                        return (
                          <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200 border-dashed">
                            <p className="text-slate-500 text-sm">✍️ No notes added yet. Salesperson can add notes from their dashboard.</p>
                          </div>
                        );
                      }
                      return notes.map((a: any, idx: number) => (
                        <div key={a.id} className="bg-pink-50 p-4 rounded-lg border border-pink-200 hover:border-pink-300 hover:bg-pink-100 transition-all">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-base font-bold text-pink-900">{a.title || 'Note'}</span>
                            <span className="text-xs text-slate-600 whitespace-nowrap bg-white px-2 py-1 rounded border border-slate-200">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                          {a.description && (
                            <p className="text-slate-700 text-sm leading-relaxed break-words">{a.description}</p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerLeads;





