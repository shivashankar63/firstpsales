import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader, Briefcase, Users, TrendingUp, DollarSign, Target, Clock, CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getProjects, createProject, getLeads, getUsers, getUserById, getUserRole, createSalesmanAccount } from "@/lib/supabase";

type UserRole = "owner" | "manager" | "salesman";

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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [showCreateSalesmanModal, setShowCreateSalesmanModal] = useState(false);
  const [salesmanForm, setSalesmanForm] = useState({ email: "", fullName: "", password: "" });
  const [creatingSalesman, setCreatingSalesman] = useState(false);
  const [createdSalesman, setCreatedSalesman] = useState<{ email: string; password: string; fullName: string } | null>(null);
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
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
        
        if (!userRole || userRole !== 'manager') {
          const roleRoutes: Record<string, string> = { 
            owner: '/owner',
            salesman: '/salesman',
            manager: '/manager'
          };
          navigate(roleRoutes[userRole as UserRole] || '/', { replace: true });
          return;
        }
        
        // Get user data for dashboard (already fetched in getUserRole, but we need full data)
        const { data: userData } = await getUserById(user.id, true);
        if (!userData) {
          navigate('/', { replace: true });
          return;
        }

        setCurrentManagerId(user.id);

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
  }, [navigate]);

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

  const handleCreateSalesman = async () => {
    if (!salesmanForm.email || !salesmanForm.fullName || !salesmanForm.password) {
      alert("Please fill in all fields");
      return;
    }
    if (salesmanForm.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setCreatingSalesman(true);
    try {
      const result = await createSalesmanAccount(
        salesmanForm.email,
        salesmanForm.password,
        salesmanForm.fullName,
        currentManagerId || undefined
      );
      if (result.error) {
        alert(`Failed to create salesman account: ${result.error.message || 'Unknown error'}`);
      } else {
        setCreatedSalesman({
          email: salesmanForm.email,
          password: salesmanForm.password,
          fullName: salesmanForm.fullName,
        });
        // Refresh sales team list
        const usersRes = await getUsers();
        setSalesTeam((usersRes.data || []).filter((u: any) => 
          String(u.role || "").toLowerCase().includes("sales")
        ));
        setSalesmanForm({ email: "", fullName: "", password: "" });
      }
    } catch (error: any) {
      alert(`Failed to create salesman account: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingSalesman(false);
    }
  };

  // Normalize status to match leads page logic
  const normalizeStatus = (status) => {
    if (status === 'negotiation') return 'proposal';
    if (status === 'won') return 'closed_won';
    if (status === 'lost') return 'not_interested';
    return status;
  };
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => normalizeStatus(l.status) === 'new').length;
  const qualifiedLeads = leads.filter(l => normalizeStatus(l.status) === 'qualified').length;
  const negotiationLeads = leads.filter(l => normalizeStatus(l.status) === 'proposal').length;
  const wonLeads = leads.filter(l => normalizeStatus(l.status) === 'closed_won').length;
  const lostLeads = leads.filter(l => normalizeStatus(l.status) === 'not_interested').length;
  const totalRevenue = leads.filter(l => normalizeStatus(l.status) === 'closed_won').reduce((sum, l) => sum + (l.value || 0), 0);
  const totalPipeline = leads.filter(l => ['new', 'qualified', 'proposal'].includes(normalizeStatus(l.status))).reduce((sum, l) => sum + (l.value || 0), 0);
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
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Key Metrics - Clean Cards (now clickable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card
            className="p-3 sm:p-6 bg-white border-slate-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/manager/sales-performance");
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pointer-events-none gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">${(totalRevenue / 1000).toFixed(0)}K</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium text-green-600">12.5%</span>
                  <span className="text-xs sm:text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card
            className="p-3 sm:p-6 bg-white border-slate-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/manager/leads");
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pointer-events-none gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Active Leads</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{totalLeads}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium text-blue-600">8.2%</span>
                  <span className="text-xs sm:text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card
            className="p-3 sm:p-6 bg-white border-slate-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/manager/performance");
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pointer-events-none gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Win Rate</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{winRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium text-purple-600">4.3%</span>
                  <span className="text-xs sm:text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card
            className="p-3 sm:p-6 bg-white border-slate-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/manager/projects");
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pointer-events-none gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Active Projects</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{projects.length}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="text-xs sm:text-sm font-medium text-orange-600">{projects.filter(p => p.status === 'active').length}</span>
                  <span className="text-xs sm:text-sm text-slate-500">in progress</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Overview - Clean Segmented Design */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Leads Overview</h2>
              <p className="text-sm text-slate-600 mt-1">Track your deals through each stage</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-slate-600">Total Pipeline Value</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">${(totalPipeline / 1000).toFixed(0)}K</p>
            </div>
          </div>
          
          {/* Pipeline Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              <div className="bg-slate-400" style={{ width: `${totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-blue-500" style={{ width: `${totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-orange-500" style={{ width: `${totalLeads > 0 ? (negotiationLeads / totalLeads) * 100 : 0}%` }}></div>
              <div className="bg-green-500" style={{ width: `${totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <div 
              className={`text-center p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                selectedStatusFilter === 'new' 
                  ? 'bg-slate-100 border-slate-400 shadow-md' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
              onClick={() => navigate('/manager/leads?status=new')}
            >
              <div className="w-3 h-3 rounded-full bg-slate-400 mx-auto mb-2"></div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{newLeads}</p>
              <p className="text-xs font-medium text-slate-600 mt-1">New</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => normalizeStatus(l.status) === 'new').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div 
              className={`text-center p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                selectedStatusFilter === 'qualified' 
                  ? 'bg-blue-100 border-blue-400 shadow-md' 
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
              onClick={() => navigate('/manager/leads?status=qualified')}
            >
              <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-2"></div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{qualifiedLeads}</p>
              <p className="text-xs font-medium text-blue-700 mt-1">Qualified</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => normalizeStatus(l.status) === 'qualified').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div 
              className={`text-center p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                selectedStatusFilter === 'negotiation' 
                  ? 'bg-orange-100 border-orange-400 shadow-md' 
                  : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
              }`}
              onClick={() => navigate('/manager/leads?status=proposal')}
            >
              <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2"></div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{negotiationLeads}</p>
              <p className="text-xs font-medium text-orange-700 mt-1">Negotiation</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => normalizeStatus(l.status) === 'proposal').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div 
              className={`text-center p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                selectedStatusFilter === 'won' 
                  ? 'bg-green-100 border-green-400 shadow-md' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
              }`}
              onClick={() => navigate('/manager/leads?status=closed_won')}
            >
              <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2"></div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{wonLeads}</p>
              <p className="text-xs font-medium text-green-700 mt-1">Won</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => normalizeStatus(l.status) === 'closed_won').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
            <div 
              className={`text-center p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                selectedStatusFilter === 'lost' 
                  ? 'bg-red-100 border-red-400 shadow-md' 
                  : 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
              }`}
              onClick={() => navigate('/manager/leads?status=not_interested')}
            >
              <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-2"></div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{lostLeads}</p>
              <p className="text-xs font-medium text-red-700 mt-1">Lost</p>
              <p className="text-xs text-slate-500 mt-1">${(leads.filter(l => normalizeStatus(l.status) === 'not_interested').reduce((sum, l) => sum + (l.value || 0), 0) / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        {/* Sales Team Section - Standalone */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sales Team</h2>
              <p className="text-sm text-slate-600 mt-1">{salesTeam.length} team members</p>
            </div>
            <Button 
              onClick={() => {
                setShowCreateSalesmanModal(true);
                setCreatedSalesman(null);
              }} 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Salesman
            </Button>
          </div>
          {salesTeam.length > 0 ? (
            <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
              {salesTeam.map((member: any) => {
                const memberLeads = leads.filter(l => l.assigned_to === member.id);
                const memberRevenue = memberLeads.filter(l => normalizeStatus(l.status) === 'closed_won').reduce((sum, l) => sum + (l.value || 0), 0);
                const memberWon = memberLeads.filter(l => normalizeStatus(l.status) === 'closed_won').length;
                
                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0">
                        {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">
                          {member.full_name || member.email?.split('@')[0] || 'Unknown'}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">{member.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base sm:text-lg font-semibold text-slate-900">${(memberRevenue / 1000).toFixed(0)}K</p>
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
              <p className="text-sm text-slate-600 mb-4">Add sales team members to get started</p>
              <Button 
                onClick={() => {
                  setShowCreateSalesmanModal(true);
                  setCreatedSalesman(null);
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Salesman
              </Button>
            </div>
          )}
        </Card>

        {/* Projects Section */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
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
              <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 sm:p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
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

        {/* Recent Leads Table - clearer display */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Leads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Company</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Contact</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-sm text-slate-900">{lead.company_name}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">{lead.contact_name}</td>
                    <td className="py-2 px-3">
                      <Badge className="capitalize border px-2 py-1 text-xs" variant="outline">{lead.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-semibold text-slate-900">${((lead.value || 0) / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">No leads found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

        {/* Create Salesman Modal */}
        <Dialog open={showCreateSalesmanModal} onOpenChange={setShowCreateSalesmanModal}>
          <DialogContent className="bg-white border-slate-200 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Create Salesman Account</DialogTitle>
            </DialogHeader>
            {createdSalesman ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-semibold mb-2">Account created successfully!</p>
                  <p className="text-sm text-green-700 mb-4">Share these credentials with the salesman:</p>
                  <div className="bg-white border border-green-200 rounded p-3 space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Full Name:</p>
                      <p className="text-sm font-semibold text-slate-900">{createdSalesman.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Email:</p>
                      <p className="text-sm font-semibold text-slate-900">{createdSalesman.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Password:</p>
                      <p className="text-sm font-semibold text-slate-900 font-mono bg-slate-50 p-2 rounded border border-slate-200">{createdSalesman.password}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3">⚠️ Save this password - it cannot be retrieved later!</p>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => {
                      setShowCreateSalesmanModal(false);
                      setCreatedSalesman(null);
                      setSalesmanForm({ email: "", fullName: "", password: "" });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="salesman_name" className="text-slate-700">Full Name</Label>
                    <Input
                      id="salesman_name"
                      value={salesmanForm.fullName}
                      onChange={(e) => setSalesmanForm({ ...salesmanForm, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="mt-1.5 border-slate-300 focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salesman_email" className="text-slate-700">Email</Label>
                    <Input
                      id="salesman_email"
                      type="email"
                      value={salesmanForm.email}
                      onChange={(e) => setSalesmanForm({ ...salesmanForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="mt-1.5 border-slate-300 focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salesman_password" className="text-slate-700">Password</Label>
                    <Input
                      id="salesman_password"
                      type="password"
                      value={salesmanForm.password}
                      onChange={(e) => setSalesmanForm({ ...salesmanForm, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="mt-1.5 border-slate-300 focus:border-slate-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">This password will be shown to you after creation. Share it with the salesman.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCreateSalesmanModal(false);
                      setSalesmanForm({ email: "", fullName: "", password: "" });
                    }}
                    disabled={creatingSalesman}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateSalesman}
                    disabled={creatingSalesman || !salesmanForm.email || !salesmanForm.fullName || !salesmanForm.password}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creatingSalesman ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default ManagerDashboard;


