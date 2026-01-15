import { Search, Filter, ChevronDown, Phone, MessageSquare, MoreHorizontal, Loader, X, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLeads, getCurrentUser, supabase, subscribeToLeads, createActivity } from "@/lib/supabase";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  status: "new" | "qualified" | "proposal" | "closed_won" | "not_interested";
  value: number;
  assigned_to?: string;
  projects?: { name: string; deadline?: string };
  project_id?: string;
  last_contacted_at?: string;
}

const SalesmanLeadsTable = () => {

      // Helper to render a badge for each status
      function getStatusBadge(status: string) {
        const statusMap: Record<string, { label: string; color: string }> = {
          new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
          qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
          proposal: { label: 'Proposal', color: 'bg-amber-100 text-amber-800' },
          closed_won: { label: 'Closed', color: 'bg-emerald-100 text-emerald-800' },
          not_interested: { label: 'Archived', color: 'bg-slate-100 text-slate-800' },
        };
        const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>;
      }
    useEffect(() => {
      let isMounted = true;
      const fetchLeads = async () => {
        setLoading(true);
        try {
          const user = await getCurrentUser();
          if (!user) {
            setLeads([]);
            setLoading(false);
            return;
          }
          const { data, error } = await getLeads({ assignedTo: user.id });
          if (error) {
            setLeads([]);
          } else if (isMounted) {
            setLeads(data || []);
            // Calculate project stats and unique projects for filters
            const stats: any[] = [];
            const projectsSet = new Set<string>();
            (data || []).forEach((lead: any) => {
              if (lead.projects?.name) projectsSet.add(lead.projects.name);
            });
            setUniqueProjects(Array.from(projectsSet));
            // Example: group by project name for stats
            const grouped: Record<string, { name: string; count: number; value: number; needsAttention: number }> = {};
            (data || []).forEach((lead: any) => {
              const name = lead.projects?.name || 'No Project';
              if (!grouped[name]) grouped[name] = { name, count: 0, value: 0, needsAttention: 0 };
              grouped[name].count++;
              grouped[name].value += lead.value || 0;
              if (lead.status === 'new' || lead.status === 'proposal') grouped[name].needsAttention++;
            });
            setProjectStats(Object.values(grouped));
          }
        } catch (err) {
          setLeads([]);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchLeads();
      return () => { isMounted = false; };
    }, []);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupByProject, setGroupByProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("new");
  const [updateMessage, setUpdateMessage] = useState<{ type: string; text: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [updateLoadingId, setUpdateLoadingId] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState<any[]>([]);
  const [uniqueProjects, setUniqueProjects] = useState<string[]>([]);

  // ...existing useEffect and logic...

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesProject = projectFilter === "all" || lead.projects?.name === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Sort leads by project if grouping is enabled
  const sortedLeads = groupByProject
    ? [...filteredLeads].sort((a, b) => {
      const projectA = a.projects?.name || 'zzz_no_project';
      const projectB = b.projects?.name || 'zzz_no_project';
      return projectA.localeCompare(projectB);
    })
    : filteredLeads;

  const statusLabel: Record<string, string> = {
    all: "All Status",
    new: "New",
    qualified: "Qualified",
    proposal: "Proposal",
    closed_won: "Closed Won",
    not_interested: "Not Interested",
  };

  const handleChangeStatusClick = (lead: Lead) => {
    setSelectedLead(lead);
    setEditingStatus(lead.status);
    setUpdateMessage(null);
    setShowEditModal(true);
  };

  const handleAddNote = (lead: Lead) => {
    setSelectedLead(lead);
    setNoteText("");
    setUpdateMessage(null);
    setShowNoteModal(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    
    setUpdateLoadingId(selectedLead.id);
    setUpdateMessage(null);

    try {
      const { error } = await supabase
        .from("leads")
        .update({
          status: editingStatus,
        })
        .eq("id", selectedLead.id);

      if (error) {
        setUpdateMessage({ type: "error", text: error.message });
      } else {
        setUpdateMessage({ type: "success", text: "Lead updated successfully!" });
        
        // Update local state
        setLeads(leads.map(lead => 
          lead.id === selectedLead.id 
            ? { ...lead, status: editingStatus as any }
            : lead
        ));

        setTimeout(() => {
          setShowEditModal(false);
          setSelectedLead(null);
        }, 1500);
      }
    } catch (error: any) {
      setUpdateMessage({ type: "error", text: error.message });
    } finally {
      setUpdateLoadingId(null);
    }
  };

  const handleAddNoteSubmit = async () => {
    if (!selectedLead || !noteText.trim()) {
      alert("Please enter a note");
      return;
    }
    
    setUpdateLoadingId(selectedLead.id);
    setUpdateMessage(null);

    try {
      const user = await getCurrentUser();
      const title = `Note - ${selectedLead.company_name}`;

      // Use helper that matches table schema and includes required title
      const { error } = await createActivity({
        user_id: user?.id as string,
        type: "note",
        title,
        description: noteText,
        lead_id: selectedLead.id,
      });

      if (error) {
        setUpdateMessage({ type: "error", text: error.message });
      } else {
        setUpdateMessage({ type: "success", text: "Note added successfully!" });
        
        setTimeout(() => {
          setShowNoteModal(false);
          setSelectedLead(null);
          setNoteText("");
        }, 1500);
      }
    } catch (error: any) {
      setUpdateMessage({ type: "error", text: error.message });
    } finally {
      setUpdateLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Project Stats Cards */}
      {projectStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectStats.map(stat => (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-900 truncate">{stat.name}</h3>
                {stat.needsAttention > 0 && (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs px-1.5 py-0.5">
                    {stat.needsAttention} urgent
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs">{stat.count} leads</span>
                </div>
                <span className="text-sm font-bold text-slate-900">${(stat.value / 1000).toFixed(0)}K</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Focus leads section removed */}

      <div className="bg-card rounded-xl shadow-soft p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900">My Leads</h2>
          <Button
            variant={groupByProject ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setGroupByProject(!groupByProject)}
          >
            {groupByProject ? "Grouped" : "Group by Project"}
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-full sm:w-56 text-sm"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 text-sm px-3">
                <Filter className="w-3.5 h-3.5" />
                {projectFilter === "all" ? "All Projects" : projectFilter}
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setProjectFilter("all")}>
                All Projects
              </DropdownMenuItem>
              {uniqueProjects.map(project => (
                <DropdownMenuItem key={project} onClick={() => setProjectFilter(project)}>
                  {project}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 text-sm px-3">
                <Filter className="w-3.5 h-3.5" />
                {statusLabel[statusFilter] || "All Status"}
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("new")}>
                New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("qualified")}>
                Qualified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("proposal")}>
                Proposal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("closed_won")}>
                Closed Won
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("not_interested")}>
                Not Interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-slate-900 mr-2" />
          <span className="text-sm text-slate-600">Loading...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Lead</th>
                <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Project</th>
                <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Contact</th>
                <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Status</th>
                <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Update Status</th>
                <th className="text-right py-2 px-3 font-medium text-xs text-slate-700">Value</th>
                <th className="text-center py-2 px-3 font-medium text-xs text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length > 0 ? (
                sortedLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleViewDetails(lead)}>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-medium">
                            {lead.company_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-900">{lead.company_name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {lead.projects?.name ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-2 py-0.5">
                            {lead.projects.name}
                          </Badge>
                          {lead.projects.deadline && new Date(lead.projects.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs px-1.5 py-0.5">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No project</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-900">{lead.contact_name}</div>
                          {(lead as any).contact_email || (lead as any).email ? (
                            <div className="text-xs text-slate-500 mt-0.5 truncate">{(lead as any).contact_email || (lead as any).email}</div>
                          ) : null}
                        </div>
                        {lead.last_contacted_at && getNeedsAttention(lead) && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0.5 flex-shrink-0">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))}d
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">{getStatusBadge(lead.status)}</td>
                    <td className="py-2 px-3">
                      <div style={{ position: 'relative' }}>
                        <select
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                          value={lead.status}
                          disabled={updateLoadingId === lead.id}
                          onClick={e => e.stopPropagation()}
                          onChange={async e => {
                            e.stopPropagation();
                            setUpdateLoadingId(lead.id);
                            setUpdateMessage(null);
                            try {
                              const value = e.target.value;
                              const { error } = await supabase
                                .from("leads")
                                .update({ status: value })
                                .eq("id", lead.id);
                              if (error) {
                                setUpdateMessage({ type: "error", text: error.message });
                                return;
                              }
                              setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? { ...l, status: value } : l));
                              setUpdateMessage({ type: "success", text: "Status updated successfully!" });
                            } catch (err) {
                              setUpdateMessage({ type: "error", text: 'Exception: ' + (err?.message || err) });
                              console.error('Update status exception:', err);
                            } finally {
                              setUpdateLoadingId(null);
                            }
                          }}
                        >
                          <option value="new">New</option>
                          <option value="qualified">Qualified</option>
                          <option value="proposal">Proposal</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                        {updateLoadingId === lead.id && (
                          <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
                            <Loader className="animate-spin w-4 h-4 text-slate-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-semibold text-slate-900">
                      ${(lead.value / 1000).toFixed(0)}K
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-slate-100" 
                          title="Call"
                          onClick={() => handleCallLead(lead)}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-slate-100" 
                          title="Message"
                          onClick={() => handleMessageLead(lead)}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(lead)}>Edit Lead</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetails(lead)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeStatusClick(lead)}>Change Status</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddNote(lead)}>Add Note</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                    No leads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Company Name</Label>
                <p className="text-sm font-medium text-foreground mt-1">{selectedLead.company_name}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Project</Label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {selectedLead.projects?.name ? (
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {selectedLead.projects.name}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">No project assigned</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Contact Name</Label>
                <p className="text-sm font-medium text-foreground mt-1">{selectedLead.contact_name}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {selectedLead.contact_email || selectedLead.email || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {selectedLead.contact_phone || selectedLead.phone || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                <p className="text-sm font-medium text-foreground mt-1">{statusLabel[selectedLead.status] || selectedLead.status}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Value</Label>
                <p className="text-sm font-medium text-foreground mt-1">${(selectedLead.value / 1000).toFixed(0)}K</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead - {selectedLead?.company_name}</DialogTitle>
            <DialogDescription>
              Update the status of this lead. Select a new status and click "Update Lead" to save changes.
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              {updateMessage && (
                <Alert className={updateMessage.type === "success" ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}>
                  <AlertDescription className={updateMessage.type === "success" ? "text-success" : "text-destructive"}>
                    {updateMessage.text}
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground"
                >
                  <option value="new">New</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
              disabled={updateLoadingId === selectedLead?.id}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateLead}
              disabled={updateLoadingId === selectedLead?.id}
            >
              {updateLoadingId === selectedLead?.id ? "Updating..." : "Update Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note - {selectedLead?.company_name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              {updateMessage && (
                <Alert className={updateMessage.type === "success" ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}>
                  <AlertDescription className={updateMessage.type === "success" ? "text-success" : "text-destructive"}>
                    {updateMessage.text}
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  placeholder="Enter your note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground"
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowNoteModal(false)}
              disabled={updateLoadingId === selectedLead?.id}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNoteSubmit}
              disabled={updateLoadingId === selectedLead?.id}
            >
              {updateLoadingId === selectedLead?.id ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default SalesmanLeadsTable;

