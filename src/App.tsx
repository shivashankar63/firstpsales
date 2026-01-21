import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerLeads from "./pages/ManagerLeads";
import ManagerSales from "./pages/ManagerSales";
import ManagerSalesPerformance from "./pages/ManagerSalesPerformance";
import SalesmanDashboard from "./pages/SalesmanDashboard";
import ManagerTeam from "./pages/ManagerTeam";
import ManagerPipeline from "./pages/ManagerPipeline";
import ManagerPerformance from "./pages/ManagerPerformance";
import ManagerActivity from "./pages/ManagerActivity";
import ManagerReports from "./pages/ManagerReports";
import ManagerPeople from "./pages/ManagerPeople";
import ManagerLeadLists from "./pages/ManagerLeadLists";
import ManagerProjects from "./pages/ManagerProjects";
import ManagerProjectDetails from "./pages/ManagerProjectDetails";
import ManagerDealStages from "./pages/ManagerDealStages";
import ManagerWonDeals from "./pages/ManagerWonDeals";
import ManagerLostDeals from "./pages/ManagerLostDeals";
import ManagerClients from "./pages/ManagerClients";
import ManagerQuotations from "./pages/ManagerQuotations";
import ManagerInvoices from "./pages/ManagerInvoices";
import ManagerReceipts from "./pages/ManagerReceipts";
import ManagerSuppliers from "./pages/ManagerSuppliers";
import ManagerPurchaseOrders from "./pages/ManagerPurchaseOrders";
import ManagerFollowUps from "./pages/ManagerFollowUps";
import SalesMyLeads from "./pages/SalesMyLeads";
import SalesFollowUps from "./pages/SalesFollowUps";
import SalesPipeline from "./pages/SalesPipeline";
import SalesLeaderboard from "./pages/SalesLeaderboard";
import SalesStats from "./pages/SalesStats";
import SalesProposals from "./pages/SalesProposals";
import Leads from "./pages/Leads";
import Teams from "./pages/Teams";
import Analytics from "./pages/Analytics";
import Regions from "./pages/Regions";
import RevenueReports from "./pages/RevenueReports";
import NotFound from "./pages/NotFound";
import WhoAmI from "./pages/WhoAmI";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/whoami" element={<WhoAmI />} />
          <Route path="/salesman" element={<SalesmanDashboard />} />
          <Route path="/manager/leads" element={<ManagerLeads />} />
          <Route path="/manager/deal-stages" element={<ManagerDealStages />} />
          <Route path="/manager/won-deals" element={<ManagerWonDeals />} />
          <Route path="/manager/lost-deals" element={<ManagerLostDeals />} />
          <Route path="/manager/clients" element={<ManagerClients />} />
          <Route path="/manager/quotations" element={<ManagerQuotations />} />
          <Route path="/manager/invoices" element={<ManagerInvoices />} />
          <Route path="/manager/receipts" element={<ManagerReceipts />} />
          <Route path="/manager/suppliers" element={<ManagerSuppliers />} />
          <Route path="/manager/purchase-orders" element={<ManagerPurchaseOrders />} />
          <Route path="/manager/follow-ups" element={<ManagerFollowUps />} />
          <Route path="/manager/sales" element={<ManagerSales />} />
          <Route path="/manager/sales-performance" element={<ManagerSalesPerformance />} />
          <Route path="/manager/team" element={<ManagerTeam />} />
          <Route path="/manager/pipeline" element={<ManagerPipeline />} />
          <Route path="/manager/performance" element={<ManagerPerformance />} />
          <Route path="/manager/activity" element={<ManagerActivity />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
          <Route path="/manager/people" element={<ManagerPeople />} />
          <Route path="/manager/lead-lists" element={<ManagerLeadLists />} />
          <Route path="/manager/projects" element={<ManagerProjects />} />
          <Route path="/manager/projects/:id" element={<ManagerProjectDetails />} />
          <Route path="/sales/my-leads" element={<SalesMyLeads />} />
          <Route path="/sales/follow-ups" element={<SalesFollowUps />} />
          <Route path="/sales/pipeline" element={<SalesPipeline />} />
          <Route path="/sales/leaderboard" element={<SalesLeaderboard />} />
          <Route path="/sales/stats" element={<SalesStats />} />
          <Route path="/sales/proposals" element={<SalesProposals />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/regions" element={<Regions />} />
          <Route path="/revenue" element={<RevenueReports />} />
          <Route path="/owner-dashboard" element={<OwnerDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/salesman-dashboard" element={<SalesmanDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
