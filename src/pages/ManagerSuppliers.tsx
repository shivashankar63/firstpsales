import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, ShoppingCart } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getUserRole } from "@/lib/supabase";

const ManagerSuppliers = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate("/", { replace: true });
          return;
        }
        const role = await getUserRole(user.id);
        if (role !== "manager") {
          navigate("/", { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <Loader className="w-10 h-10 animate-spin text-slate-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Suppliers</h1>
            <p className="text-sm text-slate-600">Maintain your vendor directory.</p>
          </div>
        </div>

        <Card className="p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Suppliers module</h2>
          <p className="text-sm text-slate-600">
            Add suppliers, contacts, and payment terms. Coming soon—supplier records will appear here once added.
          </p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/manager")}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ManagerSuppliers;
