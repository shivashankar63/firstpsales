import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Users, Bell, Shield, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentUser, getUserById } from "@/lib/supabase";

const Settings = () => {
  const [sidebarRole, setSidebarRole] = useState<"owner" | "manager" | "salesman">("owner");
  const [formData, setFormData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    slackIntegration: true,
    autoAssignment: true,
  });

  useEffect(() => {
    const loadRole = async () => {
      try {
        const authUser = await getCurrentUser();
        if (authUser?.id) {
          const { data } = await getUserById(authUser.id);
          const role = data?.role as "owner" | "manager" | "salesman" | undefined;
          if (role) setSidebarRole(role);
        }
      } catch (error) {
        console.error("Failed to load user role for settings sidebar", error);
      }
    };
    loadRole();
  }, []);

  const handleSave = () => {
    console.log("Saving settings:", formData);
    alert("Settings saved successfully!");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role={sidebarRole} />
      <main className="flex-1 p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Organization Settings</h1>
            <p className="text-sm text-slate-600">Configure your workspace and preferences</p>
          </div>

          {/* Notifications */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Notification Preferences</h2>
                <p className="text-sm text-slate-600">Manage how you receive updates</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-900 font-medium">Email Notifications</div>
                  <div className="text-sm text-slate-600">Receive updates via email</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-900 font-medium">SMS Notifications</div>
                  <div className="text-sm text-slate-600">Get alerts via text message</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications}
                    onChange={(e) => setFormData({ ...formData, smsNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Integrations</h2>
                <p className="text-sm text-slate-600">Connect with external tools</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-purple-600 flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <div className="text-slate-900 font-medium">Slack Integration</div>
                    <div className="text-sm text-slate-600">Get notifications in Slack</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.slackIntegration}
                    onChange={(e) => setFormData({ ...formData, slackIntegration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                    G
                  </div>
                  <div>
                    <div className="text-slate-900 font-medium">Google Workspace</div>
                    <div className="text-sm text-slate-600">Sync with Gmail and Calendar</div>
                  </div>
                </div>
                <Button onClick={() => alert('Google Workspace integration coming soon!')} variant="outline" className="border-slate-300 hover:bg-slate-100">
                  Connect
                </Button>
              </div>
            </div>
          </div>

          {/* Sales Automation */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sales Automation</h2>
                <p className="text-sm text-slate-600">Configure automated workflows</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-900 font-medium">Auto-Assign Leads</div>
                  <div className="text-sm text-slate-600">Automatically distribute new leads to available salespeople</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoAssignment}
                    onChange={(e) => setFormData({ ...formData, autoAssignment: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;


