import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Search, Filter, Plus, Download, Eye, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const allLeads = [
  { id: 1, company: "Acme Corp", contact: "Jane Roe", email: "jane@acme.com", phone: "+1-555-1010", status: "qualified", value: 75000, assignee: "Sally Seller", source: "Website", lastActivity: "2 days ago" },
  { id: 2, company: "Globex", contact: "Will Smith", email: "will@globex.com", phone: "+1-555-2020", status: "negotiation", value: 120000, assignee: "Sam Seller", source: "Referral", lastActivity: "5 hours ago" },
  { id: 3, company: "Initech", contact: "Peter Gibbons", email: "peter@initech.com", phone: "+1-555-3030", status: "won", value: 50000, assignee: "Sally Seller", source: "Cold Call", lastActivity: "1 week ago" },
  { id: 4, company: "Soylent", contact: "Linda Green", email: "linda@soylent.com", phone: "+1-555-4040", status: "new", value: 30000, assignee: "Sam Seller", source: "LinkedIn", lastActivity: "Just now" },
  { id: 5, company: "Umbrella", contact: "Claire Red", email: "claire@umbrella.com", phone: "+1-555-5050", status: "lost", value: 90000, assignee: "Sally Seller", source: "Email Campaign", lastActivity: "2 weeks ago" },
  { id: 6, company: "Stark Industries", contact: "Tony Stark", email: "tony@stark.com", phone: "+1-555-6060", status: "qualified", value: 250000, assignee: "Sam Seller", source: "Conference", lastActivity: "1 day ago" },
  { id: 7, company: "Wayne Enterprises", contact: "Bruce Wayne", email: "bruce@wayne.com", phone: "+1-555-7070", status: "negotiation", value: 180000, assignee: "Sally Seller", source: "Partnership", lastActivity: "3 hours ago" },
];

const Leads = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLeads = allLeads.filter((lead) => {
    const companyName = lead.company_name || lead.company || "";
    const contactName = lead.contact_name || lead.contact || "";
    const matchesSearch = companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAssigneeName = (assignedTo: string) => {
    const user = users.find(u => u.id === assignedTo);
    return user?.full_name || assignedTo || "Unassigned";
  };

  const handleAddLead = async () => {
    try {
      // Dynamically import getCurrentUser to avoid circular deps if any
      const { getCurrentUser, getUserById } = await import("@/lib/supabase");
      const user = await getCurrentUser();
      let leadData = { ...formData };
      if (user) {
        const { data: userData } = await getUserById(user.id);
        if (userData?.role === "salesman") {
          leadData.assigned_to = user.id;
        }
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
          status: "new",
          value: 0,
          source: "",
          description: "",
        });
        // Refresh leads
        const { data: leadsData } = await getLeads();
        if (leadsData) setAllLeads(leadsData);
      } else {
        alert("Failed to add lead");
      }
    } catch (err) {
      alert("Failed to add lead");
    }
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    const { error } = await updateLead(selectedLead.id, formData);
    if (!error) {
      alert("Lead updated successfully!");
      setShowEditModal(false);
      // Refresh leads
      const { data: leadsData } = await getLeads();
      if (leadsData) setAllLeads(leadsData);
    } else {
      alert("Failed to update lead");
    }
  };

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };


  const handleStatusChange = async (lead: any, newStatus: string) => {
    const { error } = await updateLead(lead.id, { status: newStatus });
    if (!error) {
      // Refresh leads
      const { data: leadsData } = await getLeads();
      if (leadsData) setAllLeads(leadsData);
    } else {
      alert("Failed to update status");
    }
  };

  const handleExport = () => {
    const csv = [
      ['Company', 'Contact', 'Email', 'Status', 'Value', 'Assignee', 'Source'],
      ...filteredLeads.map(lead => [
        lead.company_name || lead.company,
        lead.contact_name || lead.contact,
        lead.contact_email || lead.email,
        lead.status,
        lead.value,
        getAssigneeName(lead.assigned_to || lead.assignedTo),
        lead.source || 'Direct'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      qualified: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      won: "bg-green-500/10 text-green-400 border-green-500/20",
      lost: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return colors[status] || colors.new;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardSidebar role="owner" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">All Leads</h1>
          <p className="text-slate-400">Manage and track all leads across your organization</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Leads</div>
            <div className="text-2xl font-bold text-white">{allLeads.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Active Leads</div>
            <div className="text-2xl font-bold text-white">{allLeads.filter(l => ['new', 'qualified', 'negotiation'].includes(l.status)).length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">${(allLeads.reduce((sum, l) => sum + l.value, 0) / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold text-white">{((allLeads.filter(l => l.status === 'won').length / allLeads.length) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col lg:flex-row gap-3 w-full justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 w-full"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 w-full sm:w-auto">
                        <Filter className="w-4 h-4" />
                        {statusFilter === "all" ? "All Status" : statusFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("new")}>New</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("qualified")}>Qualified</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("negotiation")}>Negotiation</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("won")}>Won</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("lost")}>Lost</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleExport} variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 w-full sm:w-auto">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Add Lead
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          {/* Mobile Card View */}
          <div className="flex flex-col gap-4 sm:hidden p-2">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white/10 rounded-2xl shadow-md p-4 flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs font-medium">
                      {lead.company.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-base font-semibold text-white">{lead.company}</div>
                    <div className="text-xs text-slate-400">{lead.lastActivity}</div>
                  </div>
                  <div className="ml-auto">
                    <select
                      className={`bg-transparent border-none text-inherit ${getStatusColor(lead.status)} rounded px-2 py-1 text-xs`}
                      value={lead.status}
                      onChange={e => handleStatusChange(lead, e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-white">{lead.contact}</div>
                  <div className="text-xs text-slate-400">{lead.email}</div>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <span className="text-xs text-slate-400">Assignee:</span>
                  <span className="text-xs text-slate-300">{lead.assignee}</span>
                  <span className="ml-auto font-semibold text-white text-base">${(lead.value / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <span className="text-xs text-slate-400">Source:</span>
                  <span className="text-xs text-slate-300">{lead.source}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => handleViewLead(lead)} variant="ghost" size="sm" className="gap-2 flex-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewLead(lead)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Reassign</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leads found matching your criteria.</p>
              </div>
            )}
          </div>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-slate-400">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Assignee</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-slate-400">Source</th>
                  <th className="text-center py-3 px-4 font-medium text-sm text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs font-medium">
                            {lead.company.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-white">{lead.company}</div>
                          <div className="text-xs text-slate-400">{lead.lastActivity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-white">{lead.contact}</div>
                      <div className="text-xs text-slate-400">{lead.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        className={`bg-transparent border-none text-inherit ${getStatusColor(lead.status)} rounded px-2 py-1`}
                        value={lead.status}
                        onChange={e => handleStatusChange(lead, e.target.value)}
                      >
                        <option value="new">New</option>
                        <option value="qualified">Qualified</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-white">
                      ${(lead.value / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300">{lead.assignee}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{lead.source}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <Button onClick={() => handleViewLead(lead)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewLead(lead)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Reassign</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Lead Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>Enter the details for the new lead</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: parseInt(e.target.value)})} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} placeholder="Website, Referral, etc." className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAddModal(false)} variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">Cancel</Button>
              <Button onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700 text-white">Add Lead</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Lead Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Company</Label>
                    <div className="text-white font-medium">{selectedLead.company_name || selectedLead.company}</div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Contact</Label>
                    <div className="text-white font-medium">{selectedLead.contact_name || selectedLead.contact}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Email</Label>
                    <div className="text-white font-medium">{selectedLead.contact_email || selectedLead.email}</div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Phone</Label>
                    <div className="text-white font-medium">{selectedLead.contact_phone || selectedLead.phone || 'N/A'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Value</Label>
                    <div className="text-white font-medium">${selectedLead.value?.toLocaleString()}</div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Status</Label>
                    <Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400">Assignee</Label>
                  <div className="text-white font-medium">{getAssigneeName(selectedLead.assigned_to || selectedLead.assignedTo)}</div>
                </div>
                <div>
                  <Label className="text-slate-400">Source</Label>
                  <div className="text-white font-medium">{selectedLead.source || 'Direct'}</div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setShowViewModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
            </div>
          </DialogContent>
        </Dialog>


      </main>
    </div>
  );
};

export default Leads;


