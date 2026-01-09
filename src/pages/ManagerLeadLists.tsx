import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Filter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getLeadLists, createLeadList } from "@/lib/supabase";

const ManagerLeadLists = () => {
  const [lists, setLists] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", status: "", minValue: "" });

  useEffect(() => {
    (async () => {
      const { data } = await getLeadLists();
      setLists(data || []);
    })();
  }, []);

  const addList = async () => {
    if (!form.name) return;
    setCreating(true);
    const payload: any = {
      name: form.name,
      filters: {
        location: form.location || undefined,
        status: form.status || undefined,
        minValue: form.minValue ? Number(form.minValue) : undefined,
      },
    };
    const { error } = await createLeadList(payload);
    setCreating(false);
    if (!error) {
      setShowModal(false);
      const { data } = await getLeadLists();
      setLists(data || []);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lead Lists</h1>
            <p className="text-slate-500">Create and manage saved filters</p>
          </div>
          <Button className="bg-purple-600 text-slate-900" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> New List
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((l: any) => (
            <Card key={l.id} className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-slate-900 flex items-center justify-center">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{l.name}</div>
                  <div className="text-xs text-slate-500">{JSON.stringify(l.filters)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Lead List</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">List Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Input id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="minValue">Min Deal Value</Label>
                <Input id="minValue" type="number" value={form.minValue} onChange={(e) => setForm({ ...form, minValue: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
              <Button onClick={addList} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerLeadLists;



