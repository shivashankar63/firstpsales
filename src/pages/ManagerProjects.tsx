import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, Plus, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects, createProject, createBulkLeads } from "@/lib/supabase";

const ManagerProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", budget: "", status: "planned", start_date: "", end_date: "" });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await getProjects();
      setProjects(data || []);
    })();
  }, []);

  const addProject = async () => {
    if (!form.name) return;
    setCreating(true);
    const payload: any = {
      name: form.name,
      budget: form.budget ? Number(form.budget) : undefined,
      status: form.status,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    };
    const { error } = await createProject(payload);
    setCreating(false);
    if (!error) {
      setShowModal(false);
      const { data } = await getProjects();
      setProjects(data || []);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-20 lg:pt-8 overflow-auto bg-slate-50">
        <div className="mb-2 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div>
            <h1 className="text-lg sm:text-3xl font-semibold text-slate-900">Projects</h1>
            <p className="text-xs sm:text-base text-slate-600">Add and track sales projects</p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white py-2 sm:py-3 text-sm sm:text-base w-full sm:w-auto mt-2 sm:mt-0" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {projects.map((p: any) => (
            <Card
              key={p.id}
              className="p-3 sm:p-4 bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-900 font-semibold truncate break-words text-base sm:text-lg">{p.name}</div>
                  <div className="text-xs sm:text-sm text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">{p.status}  Budget: ${p.budget || 0}</div>
                  <div className="text-xs sm:text-sm text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{p.start_date || "-"}  {p.end_date || "-"}</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto text-base py-2" onClick={() => navigate(`/manager/projects/${p.id}?edit=true`)}>
                  Edit
                </Button>
                <Button className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto text-base py-2" onClick={() => {/* TODO: implement delete logic */}}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-white border border-slate-200 shadow-xl p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-slate-900 text-lg sm:text-2xl">New Project</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="name" className="text-slate-700">Project Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="budget" className="text-slate-700">Budget</Label>
                <Input id="budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="status" className="text-slate-700">Status</Label>
                <Input id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="start" className="text-slate-700">Start Date</Label>
                <Input id="start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="end" className="text-slate-700">End Date</Label>
                <Input id="end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={creating} className="border-slate-300 text-slate-700 hover:bg-slate-50 w-full sm:w-auto">Cancel</Button>
              <Button onClick={addProject} disabled={creating} className="bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto">{creating ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerProjects;


