import { useState, useEffect } from "react";
import { Plus, Loader, Users, TrendingUp, Award, Target, Mail, Phone as PhoneIcon, UserPlus } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLeads, getCurrentUser, getUsers, updateLead, getProjects, createUser } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const ManagerSales = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesForm, setSalesForm] = useState({ full_name: "", email: "", phone: "" });
  const [addingSalesperson, setAddingSalesperson] = useState(false);
  const [assigningLead, setAssigningLead] = useState<string | null>(null);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        
        if (allProjects.length > 0 && !selectedProject) {
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
  }, [selectedProject]);

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

  const handleAddSalesperson = async () => {
    if (!salesForm.full_name || !salesForm.email) return;
    
    try {
      setAddingSalesperson(true);
      // Create user in database with role 'salesman'
      const { data, error } = await createUser({
        full_name: salesForm.full_name,
        email: salesForm.email,
        role: 'salesman',
        phone: salesForm.phone || undefined,
      });
      
      if (error) {
        console.error('Failed to add salesperson:', error);
        window.alert(error.message || 'Failed to add salesperson. Please try again.');
        return;
      }
      
      // Refresh the salesUsers list
      const usersRes = await getUsers();
      const users = usersRes.data || [];
      const salespeople = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));
      setSalesUsers(salespeople);
      
      setShowSalesModal(false);
      setSalesForm({ full_name: "", email: "", phone: "" });
    } catch (error) {
      console.error('Error adding salesperson:', error);
      window.alert('Error adding salesperson. Please try again.');
    } finally {
      setAddingSalesperson(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      'won': '🏆',
      'lost': '❌',
      'negotiation': '💬',
      'qualified': '✅',
      'new': '🆕',
    };
    return icons[status] || '📋';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'won': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'negotiation': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'qualified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-slate-600">Loading sales team...</p>
          </div>
        </main>
      </div>
    );
  }

  const salesAssignments = salesUsers.map((user: any) => {
    const userLeads = leads.filter((lead: any) => lead.assigned_to === user.id);
    const statusCounts = userLeads.reduce((acc: Record<string, number>, lead: any) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    const totalValue = userLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const wonValue = userLeads.filter(l => l.status === 'won').reduce((sum, lead) => sum + (lead.value || 0), 0);
    const conversionRate = userLeads.length > 0 ? ((statusCounts.won || 0) / userLeads.length * 100).toFixed(0) : 0;
    
    return { user, userLeads, statusCounts, totalValue, wonValue, conversionRate };
  });

  const unassignedLeads = leads.filter((lead: any) => !lead.assigned_to);
  const totalLeads = leads.length;
  const totalAssigned = leads.filter(l => l.assigned_to).length;
  const assignmentRate = totalLeads > 0 ? ((totalAssigned / totalLeads) * 100).toFixed(0) : 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Sales Team Management</h1>
            <p className="text-slate-500">Monitor performance and manage sales assignments</p>
          </div>
          <Button onClick={() => setShowSalesModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Salesperson
          </Button>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="mb-6">
            <Label className="text-slate-600 mb-2 block">Active Project</Label>
            <Select value={selectedProject?.id} onValueChange={(value) => {
              const project = projects.find(p => p.id === value);
              setSelectedProject(project || null);
            }}>
              <SelectTrigger className="w-full sm:w-80 bg-white border-slate-200 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedProject && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <Badge className="bg-purple-500/20 text-purple-300">Active</Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900">{salesUsers.length}</p>
                <p className="text-xs text-slate-500">Sales Team Members</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-slate-500">{assignmentRate}%</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalAssigned}/{totalLeads}</p>
                <p className="text-xs text-slate-500">Leads Assigned</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-300">Won</Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900">{leads.filter(l => l.status === 'won').length}</p>
                <p className="text-xs text-slate-500">Closed Deals</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-slate-500">Avg</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {salesUsers.length > 0 ? Math.floor(totalLeads / salesUsers.length) : 0}
                </p>
                <p className="text-xs text-slate-500">Leads per Person</p>
              </Card>
            </div>

            {/* Unassigned Leads */}
            {unassignedLeads.length > 0 && (
              <Card className="p-6 bg-white/5 border-white/10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Unassigned Leads</h3>
                    <p className="text-sm text-slate-500">{unassignedLeads.length} leads waiting for assignment</p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {unassignedLeads.length} Pending
                  </Badge>
                </div>
                <div className="space-y-2">
                  {unassignedLeads.slice(0, 5).map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-medium">{lead.company_name}</span>
                          <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {lead.contact_name} • ${((lead.value || 0) / 1000).toFixed(1)}K
                        </p>
                      </div>
                      <div className="w-52">
                        <Select
                          value=""
                          onValueChange={(value) => handleAssignLead(lead.id, value)}
                          disabled={assigningLead === lead.id}
                        >
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-sm">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {salesUsers.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.email?.split("@")[0] || u.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  {unassignedLeads.length > 5 && (
                    <p className="text-center text-sm text-slate-500 pt-2">
                      +{unassignedLeads.length - 5} more unassigned leads
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Sales Team Performance */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900">Team Performance</h3>
              {salesAssignments.map(({ user, userLeads, statusCounts, totalValue, wonValue, conversionRate }) => {
                const name = user.full_name || user.email?.split("@")[0] || user.id;
                const loadPercentage = totalLeads > 0 ? (userLeads.length / totalLeads * 100).toFixed(0) : 0;
                
                return (
                  <Card key={user.id} className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-slate-900 font-bold text-lg">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {user.email && (
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </span>
                            )}
                            {user.phone && (
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <PhoneIcon className="w-3 h-3" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          {userLeads.length} Total Leads
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          {conversionRate}% Win Rate
                        </Badge>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-500">Total Value</p>
                        <p className="text-xl font-bold text-slate-900">${(totalValue / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-500">Won Value</p>
                        <p className="text-xl font-bold text-green-400">${(wonValue / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-500">Active Leads</p>
                        <p className="text-xl font-bold text-blue-400">
                          {userLeads.filter(l => !['won', 'lost'].includes(l.status)).length}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-500">Workload</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={Number(loadPercentage)} className="flex-1" />
                          <span className="text-sm font-medium text-slate-900">{loadPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['new', 'qualified', 'negotiation', 'won', 'lost'].map((status) => (
                        <Badge key={status} className={getStatusColor(status)}>
                          {getStatusIcon(status)} {status}: {statusCounts[status] || 0}
                        </Badge>
                      ))}
                    </div>

                    {/* Assigned Leads */}
                    {userLeads.length > 0 ? (
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2">
                          <span>View Assigned Leads ({userLeads.length})</span>
                          <span className="group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-purple-500/30">
                          {userLeads.map((lead: any) => (
                            <div key={lead.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                              <div>
                                <span className="text-slate-900 font-medium">{lead.company_name}</span>
                                <Badge className={`${getStatusColor(lead.status)} ml-2`}>{lead.status}</Badge>
                              </div>
                              <span className="text-sm text-purple-400">${((lead.value || 0) / 1000).toFixed(1)}K</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No leads assigned yet</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Add Salesperson Modal */}
        <Dialog open={showSalesModal} onOpenChange={setShowSalesModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Salesperson</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sp_name">Full Name *</Label>
                <Input
                  id="sp_name"
                  value={salesForm.full_name}
                  onChange={(e) => setSalesForm({ ...salesForm, full_name: e.target.value })}
                  placeholder="Jane Seller"
                />
              </div>
              <div>
                <Label htmlFor="sp_email">Email *</Label>
                <Input
                  id="sp_email"
                  type="email"
                  value={salesForm.email}
                  onChange={(e) => setSalesForm({ ...salesForm, email: e.target.value })}
                  placeholder="jane@sales.com"
                />
              </div>
              <div>
                <Label htmlFor="sp_phone">Phone</Label>
                <Input
                  id="sp_phone"
                  value={salesForm.phone}
                  onChange={(e) => setSalesForm({ ...salesForm, phone: e.target.value })}
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSalesModal(false)}>Cancel</Button>
              <Button onClick={handleAddSalesperson} disabled={!salesForm.full_name || !salesForm.email || addingSalesperson}>
                {addingSalesperson ? 'Adding...' : 'Add Salesperson'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerSales;




