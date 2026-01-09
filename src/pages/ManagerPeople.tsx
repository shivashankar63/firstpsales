import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getUsers, createUser } from "@/lib/supabase";

const ManagerPeople = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "salesman" });

  useEffect(() => {
    (async () => {
      const { data } = await getUsers();
      setUsers(data || []);
    })();
  }, []);

  const addSalesPerson = async () => {
    if (!form.full_name || !form.email) return;
    setCreating(true);
    const { error } = await createUser({ email: form.email, full_name: form.full_name, role: "salesman" });
    setCreating(false);
    if (!error) {
      setShowModal(false);
      const { data } = await getUsers();
      setUsers(data || []);
    }
  };

  const salesUsers = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Team Members</h1>
            <p className="text-slate-500">Add and manage your salespeople</p>
          </div>
          <Button className="bg-purple-600 text-slate-900" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Sales Person
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesUsers.map((u: any) => (
            <Card key={u.id} className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-slate-900 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{u.full_name || u.email}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sales Person</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
              <Button onClick={addSalesPerson} disabled={creating}>{creating ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerPeople;



