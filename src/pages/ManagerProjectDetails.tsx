import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProjectById, getLeadsForProject, getActivities, subscribeToProjects, subscribeToActivities, updateProject, createLead, deleteProject } from "@/lib/supabase";
import { ArrowLeft, CalendarDays, DollarSign, Target, TrendingUp, Clock, Mail, Phone, FileText, CheckCircle2, ExternalLink, Edit2, AlertCircle, Check, Upload } from "lucide-react";

const currency = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const ManagerProjectDetails = () => {
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [editProjectForm, setEditProjectForm] = useState<any>(null);
    const [editingProject, setEditingProject] = useState(false);
    const [editProjectMessage, setEditProjectMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    // Open Edit Project modal with current project data
    const openEditProjectModal = () => {
      if (!project) return;
      setEditProjectForm({
        name: project.name || "",
        status: project.status || "planned",
        budget: project.budget || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        description: project.description || "",
      });
      setEditProjectMessage(null);
      setShowEditProjectModal(true);
    };


    // Handle Edit Project form submission
    const handleEditProject = async () => {
      setEditProjectMessage(null);
      if (!editProjectForm.name) {
        setEditProjectMessage({ type: "error", text: "Project name is required." });
        return;
      }
      setEditingProject(true);
      try {
        const payload: any = {
          name: editProjectForm.name,
          status: editProjectForm.status,
          budget: Number(editProjectForm.budget) || 0,
          start_date: editProjectForm.start_date,
          end_date: editProjectForm.end_date,
          description: editProjectForm.description,
        };
        const { error } = await updateProject(id, payload);
        if (error) throw new Error(error.message);
        setEditProjectMessage({ type: "success", text: "Project updated successfully." });
        // Refresh project data
        const projRes = await getProjectById(id);
        setProject(projRes.data);
        setTimeout(() => {
          setShowEditProjectModal(false);
          setEditProjectForm(null);
          setEditProjectMessage(null);
        }, 1200);
      } catch (err: any) {
        setEditProjectMessage({ type: "error", text: err.message || "Failed to update project." });
      } finally {
        setEditingProject(false);
      }
    };
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [editingLink, setEditingLink] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle" | "success" | "error">("idle");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [importingBulk, setImportingBulk] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });


  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [projRes, leadsRes, actsRes] = await Promise.all([
        getProjectById(id),
        getLeadsForProject(id),
        getActivities(),
      ]);
      setProject(projRes.data);
      setLeads(leadsRes.data || []);
      setActivities(actsRes.data || []);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const sub = subscribeToProjects(async () => {
      const [leadsRes, actsRes] = await Promise.all([
        getLeadsForProject(id),
        getActivities(),
      ]);
      setLeads(leadsRes.data || []);
      setActivities(actsRes.data || []);
    });
    // Also watch activities globally and refresh only if related to this project's leads
    const subActs = subscribeToActivities(async (payload: any) => {
      const leadId = payload?.new?.lead_id || payload?.old?.lead_id;
      if (!leadId) return;
      const ids = new Set((leads || []).map((l) => l.id));
      if (ids.has(leadId)) {
        const { data } = await getActivities();
        setActivities(data || []);
      }
    });
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-20 lg:pt-8 overflow-auto bg-slate-50">
          {/* Project Info Section */}
          <div className="mb-2 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/manager/projects')} className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <h1 className="text-lg sm:text-3xl font-semibold text-slate-900 truncate">{project?.name || "Project"}</h1>
              <Badge className="ml-2 text-xs sm:text-sm px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200">{project?.status}</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" onClick={openEditProjectModal}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
          {/* ...existing code... */}
        </main>
      </div>
    );
      const { error } = await updateProject(id, { link: linkInput.trim() });
      if (error) {
        setLinkStatus("error");
        setTimeout(() => setLinkStatus("idle"), 3000);
      } else {
        setProject({ ...project, link: linkInput.trim() });
        setEditingLink(false);
        setLinkStatus("success");
        setTimeout(() => setLinkStatus("idle"), 2000);
      }
    } catch (err) {
      setLinkStatus("error");
      setTimeout(() => setLinkStatus("idle"), 3000);
    } finally {
      setSavingLink(false);
    }
  };

  const openEditDialog = () => {
    setLinkInput(project?.link || "");
    setEditingLink(true);
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim() || !id) return;
    
    setImportingBulk(true);
    setImportStatus({ type: "idle", message: "" });

    try {
      // Parse the pasted data (tab-separated or comma-separated)
      const lines = bulkData.trim().split('\n');
      const headers = lines[0].toLowerCase().split('\t').map(h => h.trim());
      
      // Find column indices
      const companyIdx = headers.findIndex(h => h.includes('company'));
      const contactIdx = headers.findIndex(h => h.includes('contact') || h.includes('name'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const phoneIdx = headers.findIndex(h => h.includes('phone'));
      const valueIdx = headers.findIndex(h => h.includes('value') || h.includes('amount'));
      const descIdx = headers.findIndex(h => h.includes('description') || h.includes('notes'));
      const linkIdx = headers.findIndex(h => h.includes('link') || h.includes('url'));

      let successCount = 0;
      let errorCount = 0;

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('\t').map(c => c.trim());
        if (!cells[0]) continue; // Skip empty rows

        try {
          const leadData = {
            company_name: cells[companyIdx] || `Company ${i}`,
            contact_name: cells[contactIdx] || 'Contact',
            email: cells[emailIdx] || `contact@company.com`,
            phone: cells[phoneIdx] || '',
            value: valueIdx >= 0 && cells[valueIdx] ? parseFloat(cells[valueIdx]) || 0 : 0,
            status: 'new' as const,
            project_id: id,
            description: descIdx >= 0 ? cells[descIdx] : '',
            link: linkIdx >= 0 ? cells[linkIdx] : '',
          };

          await createLead(leadData);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }

      // Refresh leads
      const { data: updatedLeads } = await getLeadsForProject(id);
      setLeads(updatedLeads || []);

      if (errorCount === 0) {
        setImportStatus({ 
          type: "success", 
          message: `Successfully imported ${successCount} leads!` 
        });
        setTimeout(() => {
          setShowBulkImport(false);
          setBulkData("");
        }, 2000);
      } else {
        setImportStatus({ 
          type: "success", 
          message: `Imported ${successCount} leads (${errorCount} failed)` 
        });
      }
    } catch (err: any) {
      setImportStatus({ 
        type: "error", 
        message: `Import failed: ${err.message || 'Unknown error'}` 
      });
    } finally {
      setImportingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-slate-600">Loading project…</div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 p-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button>
          <Card className="p-6 bg-white/5 border-white/10 text-slate-600">Project not found.</Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-20 lg:pt-8 overflow-auto">
        <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-slate-900 flex items-center justify-center flex-shrink-0"><CalendarDays className="w-5 h-5"/></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-3xl font-bold text-slate-900 truncate">{project.name}</h1>
                  <Button size="sm" variant="outline" className="ml-2" onClick={openEditProjectModal}>
                    Edit Project
                  </Button>
                  <Button size="sm" variant="destructive" className="ml-2" onClick={async () => {
                    if (!window.confirm('Are you sure you want to delete this project?')) return;
                    try {
                      await deleteProject(id);
                      navigate(-1);
                    } catch (err) {
                      alert('Failed to delete project.');
                    }
                  }}>
                    Delete Project
                  </Button>
                </div>
                <div className="text-slate-500 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">{project.status || 'planned'} • Budget: {currency(project.budget || 0)}</div>
                <div className="text-slate-500 text-xs whitespace-nowrap overflow-hidden text-ellipsis">{project.start_date || '-'} → {project.end_date || '-'}</div>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button>
        </div>
        {/* Edit Project Modal */}
        <Dialog open={showEditProjectModal} onOpenChange={setShowEditProjectModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editProjectMessage && (
                <div className={editProjectMessage.type === "success" ? "bg-green-50 border-green-200 text-green-700 p-2 rounded" : "bg-red-50 border-red-200 text-red-700 p-2 rounded"}>
                  {editProjectMessage.text}
                </div>
              )}
              {editProjectForm && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-project-name">Project Name *</Label>
                    <Input
                      id="edit-project-name"
                      value={editProjectForm.name}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                      placeholder="Project Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-project-status">Status</Label>
                    <Input
                      id="edit-project-status"
                      value={editProjectForm.status}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value })}
                      placeholder="planned / in_progress / completed"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-project-budget">Budget (USD)</Label>
                    <Input
                      id="edit-project-budget"
                      type="number"
                      value={editProjectForm.budget}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, budget: e.target.value })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-project-start">Start Date</Label>
                    <Input
                      id="edit-project-start"
                      type="date"
                      value={editProjectForm.start_date}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-project-end">End Date</Label>
                    <Input
                      id="edit-project-end"
                      type="date"
                      value={editProjectForm.end_date}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, end_date: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-project-description">Description</Label>
                    <Textarea
                      id="edit-project-description"
                      value={editProjectForm.description}
                      onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                      placeholder="Project description..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditProjectModal(false)} disabled={editingProject}>Cancel</Button>
              <Button onClick={handleEditProject} disabled={editingProject}>
                {editingProject ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Link Section */}
        {project?.link && (
          <Card className="mb-6 p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <a 
                  href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 truncate underline"
                  title={project.link}
                >
                  {project.link}
                </a>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={openEditDialog}
                className="ml-4 flex-shrink-0 text-slate-600 hover:text-slate-900"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
        
        {!project?.link && (
          <Card className="mb-6 p-4 bg-white border-slate-200 border-dashed">
            <div className="flex items-center justify-between">
              <div className="text-slate-500 text-sm">No project link added yet</div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={openEditDialog}
                className="text-blue-400 hover:text-blue-300 hover:bg-slate-100/50"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Add Link
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 bg-gradient-to-br from-blue-900/40 to-slate-800/40 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-600 text-sm">Total Pipeline</div>
                <div className="text-3xl font-bold text-slate-900">{currency(totals.value)}</div>
              </div>
              <DollarSign className="w-7 h-7 text-blue-300"/>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-emerald-900/40 to-slate-800/40 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-600 text-sm">Closed Won Value</div>
                <div className="text-3xl font-bold text-slate-900">{currency(totals.closedWonValue)}</div>
              </div>
              <TrendingUp className="w-7 h-7 text-emerald-300"/>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-purple-900/40 to-slate-800/40 border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-600 text-sm">Win Rate</div>
                <div className="text-3xl font-bold text-slate-900">{totals.rate}%</div>
              </div>
              <Target className="w-7 h-7 text-purple-300"/>
            </div>
          </Card>
        </div>

        {/* Leads */}
        <Card className="p-4 md:p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Leads ({leads.length})</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowBulkImport(true)}
              className="text-blue-400 hover:text-blue-300 hover:bg-slate-100/50"
            >
              <Upload className="w-4 h-4 mr-2" /> Bulk Import
            </Button>
          </div>
          <div className="divide-y divide-slate-700">
            {leads.length === 0 && (
              <div className="text-slate-500 p-4">No leads linked to this project yet.</div>
            )}
            {leads.map((l) => (
              <div key={l.id} className="flex items-center gap-4 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 font-medium truncate">{l.company_name}</div>
                  <div className="text-xs text-slate-500 truncate">{l.contact_name} • {l.email || '—'} • {l.phone || '—'}</div>
                </div>
                <div className="hidden md:block w-40 text-right text-slate-600 font-semibold">{currency(l.value || 0)}</div>
                <div className="w-28 text-right">
                  <Badge className="justify-end capitalize">{l.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity */}
        <div className="mt-6">
          <Card className="p-4 md:p-5 bg-white border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            </div>
            {activities.length === 0 ? (
              <div className="text-slate-500">No recent activity for this project.</div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 20).map((a) => {
                  const type = String(a.activity_type || a.type || 'note').toLowerCase();
                  const lead = leads.find((l) => l.id === a.lead_id);
                  const Icon = (type === 'call' ? Phone : type === 'email' ? Mail : type === 'deal' ? CheckCircle2 : FileText);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`w-full text-left flex items-start gap-3 p-2 rounded-lg transition-colors ${lead ? 'hover:bg-white focus:bg-white focus:outline-none' : ''}`}
                      onClick={() => {
                        if (!lead) return;
                        navigate(`/manager/leads?leadId=${lead.id}`);
                      }}
                      aria-disabled={!lead}
                    >
                      <div className="w-8 h-8 rounded-md bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-medium truncate">{a.title || type.toUpperCase()}</div>
                        <div className="text-xs text-slate-500 truncate">{lead?.company_name || 'Lead'} • {new Date(a.created_at).toLocaleString()}</div>
                        {a.description && <div className="text-sm text-slate-600 mt-1 line-clamp-2">{a.description}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Edit Link Dialog */}
        <Dialog open={editingLink} onOpenChange={setEditingLink}>
          <DialogContent className="bg-slate-800 border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Edit Project Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-link" className="text-slate-600">Project URL</Label>
                <Input 
                  id="project-link"
                  placeholder="https://example.com"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="mt-2 bg-slate-900/50 border-slate-300 text-slate-900 placeholder:text-slate-500"
                  disabled={savingLink}
                />
                <div className="text-xs text-slate-500 mt-1">Enter the full URL or domain for this project</div>
              </div>
              {linkStatus === "error" && (
                <div className="flex items-center gap-2 p-2 bg-rose-900/30 border border-rose-800 rounded text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Failed to save link. Please try again.
                </div>
              )}
              {linkStatus === "success" && (
                <div className="flex items-center gap-2 p-2 bg-emerald-900/30 border border-emerald-800 rounded text-emerald-300 text-sm">
                  <Check className="w-4 h-4" />
                  Link saved successfully!
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingLink(false)}
                disabled={savingLink}
                className="border-slate-300 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveLink}
                disabled={savingLink || !linkInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-slate-900"
              >
                {savingLink ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
          <DialogContent className="bg-slate-800 border-slate-200 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Bulk Import Leads</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-data" className="text-slate-600">Paste Lead Data (Tab-separated)</Label>
                <p className="text-xs text-slate-500 mb-2">Format: Company Name [TAB] Contact Name [TAB] Email [TAB] Phone [TAB] Value [TAB] Description [TAB] Link</p>
                <Textarea 
                  id="bulk-data"
                  placeholder="ABC Corp	John Doe	john@abc.com	555-1234	50000	New prospect	https://abc.com&#10;XYZ Inc	Jane Smith	jane@xyz.com	555-5678	75000	Hot lead	https://xyz.com"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="mt-2 bg-slate-900/50 border-slate-300 text-slate-900 placeholder:text-slate-500 font-mono text-sm"
                  rows={8}
                  disabled={importingBulk}
                />
                <div className="text-xs text-slate-500 mt-1">Each row = one lead. Minimum: Company name, Contact name, Email</div>
              </div>
              {importStatus.type === "error" && (
                <div className="flex items-start gap-2 p-3 bg-rose-900/30 border border-rose-800 rounded text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{importStatus.message}</div>
                </div>
              )}
              {importStatus.type === "success" && (
                <div className="flex items-start gap-2 p-3 bg-emerald-900/30 border border-emerald-800 rounded text-emerald-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{importStatus.message}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkImport(false)}
                disabled={importingBulk}
                className="border-slate-300 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkImport}
                disabled={importingBulk || !bulkData.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-slate-900"
              >
                {importingBulk ? "Importing…" : "Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerProjectDetails;




