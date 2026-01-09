import { useState, useEffect } from "react";
import { Plus, Loader, Briefcase, Users, TrendingUp, DollarSign, Target, Clock, CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getProjects, createProject, getLeads, getUsers } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [salesTeam, setSalesTeam] = useState<any[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", budget: "" });
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [projectsRes, leadsRes, usersRes] = await Promise.all([
          getProjects(),
          getLeads(),
          getUsers(),
        ]);

        setProjects(projectsRes.data || []);
        setLeads(leadsRes.data || []);
        setSalesTeam((usersRes.data || []).filter((u: any) => 
          String(u.role || "").toLowerCase().includes("sales")
        ));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateProject = async () => {
    if (!projectForm.name) return;
    setCreatingProject(true);
    try {
      await createProject({
        name: projectForm.name,
        description: projectForm.description,
        budget: projectForm.budget ? Number(projectForm.budget) : undefined,
        status: 'active',
      });
      const projectsRes = await getProjects();
      setProjects(projectsRes.data || []);
      setShowProjectModal(false);
      setProjectForm({ name: "", description: "", budget: "" });
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  // Calculate metrics
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
  const negotiationLeads = leads.filter(l => l.status === 'negotiation').length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const lostLeads = leads.filter(l => l.status === 'lost').length;
  const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.value || 0), 0);
  const totalPipeline = leads.filter(l => ['new', 'qualified', 'negotiation'].includes(l.status)).reduce((sum, l) => sum + (l.value || 0), 0);
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Key Metrics - Clean Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-semibold text-slate-900">${(totalRevenue / 1000).toFixed(0)}K</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">12.5%</span>
                  <span className="text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Active Leads</p>
                <p className="text-3xl font-semibold text-slate-900">{totalLeads}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">8.2%</span>
                  <span className="text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Win Rate</p>
                <p className="text-3xl font-semibold text-slate-900">{winRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">4.3%</span>
                  <span className="text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Active Projects</p>
                <p className="text-3xl font-semibold text-slate-900">{projects.length}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">{projects.filter(p => p.status === 'active').length}</span>
                  <span className="text-sm text-slate-500">in progress</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Overview - Clean Segmented Design */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lead Pipeline</h2>
              <p className="text-sm text-slate-600 mt-1">Track your deals through each stage</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Total Pipeline Value</p>
              <p className="text-2xl font-semibold text-slate-900">${(totalPipeline / 1000).toFixed(0)}K</p>
            </div>
          </div>
          
          {/* Pipeline Progress Bar */}
          <div className="mb-6">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              <div className="bg-slate-400" style={{ width: `${totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-blue-500" style={{ width: `${totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-orange-500" style={{ width: `${totalLeads > 0 ? (negotiationLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-green-500" style={{ width: `${totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-3 h-3 rounded-full bg-slate-400 mx-auto mb-2"></div>
              <p className="text-2xl font-semibold text-slate-900">{newLeads}</p>
              <p className="text-xs font-medium text-slate-600 mt-1">New</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => l.status === 'new').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-2"></div>
              <p className="text-2xl font-semibold text-slate-900">{qualifiedLeads}</p>
              <p className="text-xs font-medium text-blue-700 mt-1">Qualified</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => l.status === 'qualified').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
              <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2"></div>
              <p className="text-2xl font-semibold text-slate-900">{negotiationLeads}</p>
              <p className="text-xs font-medium text-orange-700 mt-1">Negotiation</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => l.status === 'negotiation').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2"></div>
              <p className="text-2xl font-semibold text-slate-900">{wonLeads}</p>
              <p className="text-xs font-medium text-green-700 mt-1">Won</p>
              <p className="text-xs text-slate-500 mt-1">${(totalRevenue / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-2"></div>
              <p className="text-2xl font-semibold text-slate-900">{lostLeads}</p>
              <p className="text-xs font-medium text-red-700 mt-1">Lost</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => l.status === 'lost').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        {/* Projects & Team Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Projects */}
          <Card className="p-6 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                <p className="text-sm text-slate-600 mt-1">{projects.length} active projects</p>
              </div>
              <Button 
                onClick={() => setShowProjectModal(true)} 
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Project
              </Button>
            </div>
            {projects.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 group-hover:text-slate-700 mb-1">
                          {project.name}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-1">
                          {project.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 text-xs font-medium">
                        {project.status || 'Active'}
                      </Badge>
                      {project.budget && (
                        <span className="text-sm font-medium text-slate-900">
                          ${Number(project.budget).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-900 font-medium mb-1">No projects yet</p>
                <p className="text-sm text-slate-600 mb-4">Get started by creating your first project</p>
                <Button 
                  onClick={() => setShowProjectModal(true)}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Project
                </Button>
              </div>
            )}
          </Card>

          {/* Sales Team */}
          <Card className="p-6 bg-white border-slate-200 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Sales Team</h2>
              <p className="text-sm text-slate-600 mt-1">{salesTeam.length} team members</p>
            </div>
            {salesTeam.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {salesTeam.map((member: any) => {
                  const memberLeads = leads.filter(l => l.assigned_to === member.id);
                  const memberRevenue = memberLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.value || 0), 0);
                  const memberWon = memberLeads.filter(l => l.status === 'won').length;
                  
                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                          {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 truncate">
                            {member.full_name || member.email?.split('@')[0] || 'Unknown'}
                          </h3>
                          <p className="text-sm text-slate-600 truncate">{member.email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-semibold text-slate-900">${(memberRevenue / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-slate-600">{memberWon} won • {memberLeads.length} total</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-900 font-medium mb-1">No team members yet</p>
                <p className="text-sm text-slate-600">Add sales team members to get started</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Leads */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Leads</h2>
            <p className="text-sm text-slate-600 mt-1">Latest updates from your pipeline</p>
          </div>
          {leads.length > 0 ? (
            <div className="space-y-2">
              {leads.slice(0, 5).map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 group-hover:text-slate-700 mb-1">
                      {lead.company_name}
                    </h3>
                    <p className="text-sm text-slate-600">{lead.contact_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={
                      lead.status === 'won' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' :
                      lead.status === 'lost' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50' :
                      lead.status === 'negotiation' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50' :
                      lead.status === 'qualified' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' :
                      'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50'
                    }>
                      {lead.status}
                    </Badge>
                    <span className="text-base font-semibold text-slate-900 min-w-[80px] text-right">
                      ${((lead.value || 0) / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-900 font-medium mb-1">No leads yet</p>
              <p className="text-sm text-slate-600">Start adding leads to track your pipeline</p>
            </div>
          )}
        </Card>



        <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="proj_name" className="text-slate-700">Project Name</Label>
                <Input
                  id="proj_name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Q1 Sales Campaign"
                  className="mt-1.5 border-slate-300 focus:border-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="proj_desc" className="text-slate-700">Description</Label>
                <Input
                  id="proj_desc"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Project description"
                  className="mt-1.5 border-slate-300 focus:border-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="proj_budget" className="text-slate-700">Budget (USD)</Label>
                <Input
                  id="proj_budget"
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  placeholder="150000"
                  className="mt-1.5 border-slate-300 focus:border-slate-400"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowProjectModal(false)} 
                disabled={creatingProject}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject} 
                disabled={creatingProject}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {creatingProject ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default ManagerDashboard;


