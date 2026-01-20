import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Loader, CheckCircle, Clock, XCircle, AlertCircle, Filter, Search, Mail, Phone as PhoneIcon, Briefcase, Upload, FileSpreadsheet, UserPlus, MoreHorizontal, Edit, Trash2, ChevronDown } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLeads, getCurrentUser, getUsers, createLead, updateLead, getProjects, deleteLead, testConnection, subscribeToUsers, subscribeToLeads, getActivitiesForLead, subscribeToLeadActivities, createBulkLeads } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Helper function to parse phone numbers from string (handles comma, semicolon, pipe separated)
const parsePhoneNumbers = (phoneString: string | null | undefined): string[] => {
  if (!phoneString) return [];
  const phones = String(phoneString)
    .split(/[,;|\n\r]+/)
    .map(p => p.trim())
    .filter(p => p.length >= 7 && p.length <= 20 && /[\d\+\-\(\)\s]{7,}/.test(p));
  return [...new Set(phones)]; // Remove duplicates
};

const ManagerLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);
  
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    // Open Edit Lead modal with selected lead's data
    const openEditLeadModal = () => {
      if (!selectedLead) return;
      setEditLeadForm({ ...selectedLead, value: String(selectedLead.value ?? "") });
      setEditMessage(null);
      setShowEditLeadModal(true);
    };

    // Handle Edit Lead form submission
    const handleEditLead = async () => {
      setEditMessage(null);
      if (!editLeadForm.company_name || !editLeadForm.contact_name || !editLeadForm.value) {
        setEditMessage({ type: "error", text: "Company, contact, and value are required." });
        return;
      }
      const valueNum = Number(editLeadForm.value);
      if (isNaN(valueNum) || valueNum <= 0) {
        setEditMessage({ type: "error", text: "Value must be a positive number." });
        return;
      }
      setEditing(true);
      try {
        await updateLead(editLeadForm.id, {
          company_name: editLeadForm.company_name,
          contact_name: editLeadForm.contact_name,
          email: editLeadForm.email?.trim() || null,
          phone: editLeadForm.phone?.trim() || null,
          status: editLeadForm.status,
          value: valueNum,
          assigned_to: editLeadForm.assigned_to || null,
          description: editLeadForm.description,
          link: editLeadForm.link,
        });
        setEditMessage({ type: "success", text: "Lead updated successfully." });
        // Refresh leads after update
        const leadsRes = await getLeads();
        setLeads(leadsRes.data || []);
        setTimeout(() => {
          setShowEditLeadModal(false);
          setEditLeadForm(null);
          setEditMessage(null);
        }, 1200);
      } catch (err: any) {
        setEditMessage({ type: "error", text: err.message || "Failed to update lead." });
      } finally {
        setEditing(false);
      }
    };
  const [leadForm, setLeadForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    value: "",
    assigned_to: "",
    status: "new" as "new" | "qualified" | "proposal" | "closed_won" | "not_interested",
    description: "",
    link: "",
  });
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assigningLead, setAssigningLead] = useState<string | null>(null);
  
  // Bulk assign states
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignSalesman, setBulkAssignSalesman] = useState<string>("");
  
  // Bulk delete states
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Bulk import states
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedImportProject, setSelectedImportProject] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test Supabase connection first
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
          setLoading(false);
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [projectsRes, usersRes] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);

        const allProjects = projectsRes.data || [];
        const users = usersRes.data || [];
        const salespeople = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));

        setProjects(allProjects);
        setSalesUsers(salespeople);

        // If a status filter is set in the URL, set project filter to 'all' (show all projects)
        if (searchParams.get("status")) {
          setSelectedProject(null);
        } else if (allProjects.length > 0) {
          setSelectedProject(allProjects[0]);
        }
      } catch (error) {
        // Error fetching data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Only run on mount and when searchParams changes
  }, [searchParams]);

  // Read status filter from URL params and update filter state
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      // Normalize old status values to new ones for consistency
      let normalizedStatus = statusParam;
      if (statusParam === "negotiation") normalizedStatus = "proposal";
      else if (statusParam === "won") normalizedStatus = "closed_won";
      else if (statusParam === "lost") normalizedStatus = "not_interested";
      else if (["new", "qualified", "proposal", "closed_won", "not_interested"].includes(statusParam)) {
        normalizedStatus = statusParam;
      } else {
        normalizedStatus = "all";
      }
      setStatusFilter(normalizedStatus);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  // If a leadId is present in the URL, open that lead's modal when data is available
  useEffect(() => {
    const paramId = searchParams.get("leadId");
    if (!paramId || !leads?.length) return;
    const found = leads.find((l) => String(l.id) === String(paramId));
    if (found) {
      setSelectedLead(found);
      setShowDetailsModal(true);
    }
  }, [searchParams, leads]);

  useEffect(() => {
    // Realtime: listen for users changes to keep sales list fresh
    const userSub = subscribeToUsers(async () => {
      try {
        const usersRes = await getUsers();
        const users = usersRes.data || [];
        const salespeople = users.filter((u: any) => String(u.role || "").toLowerCase().includes("sales"));
        setSalesUsers(salespeople);
      } catch (e) {
        // Failed to refresh users after realtime event
      }
    });

    return () => {
      try { userSub.unsubscribe?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const leadsRes = await getLeads();
        const allLeads = leadsRes.data || [];
        // If a status filter is set in the URL, show all projects' leads for that status
        if (searchParams.get("status")) {
          setLeads(allLeads);
        } else if (selectedProject) {
          const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject.id);
          setLeads(projectLeads);
        } else {
          setLeads(allLeads); // Show all leads when no project is selected
        }
      } catch (error) {
        // Error fetching leads
      }
    };
    fetchLeads();

    // Realtime: listen for leads changes and refresh
    const leadSub = subscribeToLeads(async () => {
      try {
        const leadsRes = await getLeads();
        const allLeads = leadsRes.data || [];
        if (searchParams.get("status")) {
          setLeads(allLeads);
        } else if (selectedProject) {
          const projectLeads = allLeads.filter((l: any) => l.project_id === selectedProject.id);
          setLeads(projectLeads);
        } else {
          setLeads(allLeads); // Show all leads when no project is selected
        }
      } catch (e) {
        // Failed to refresh leads after realtime event
      }
    });

    return () => {
      try { leadSub.unsubscribe?.(); } catch {}
    };
  }, [selectedProject, searchParams]);

  const handleCreateLead = async () => {
    setCreateMessage(null);
    if (!leadForm.company_name || !leadForm.contact_name || !leadForm.value) {
      setCreateMessage({ type: "error", text: "Company, contact, and value are required." });
      return;
    }
    if (!selectedProject) {
      setCreateMessage({ type: "error", text: "Please select a project first." });
      return;
    }
    const valueNum = Number(leadForm.value);
    if (isNaN(valueNum) || valueNum <= 0) {
      setCreateMessage({ type: "error", text: "Value must be a positive number." });
      return;
    }
    setCreating(true);
    try {
      const newLead = await createLead({
        company_name: leadForm.company_name,
        contact_name: leadForm.contact_name,
        email: leadForm.email?.trim() || null,
        phone: leadForm.phone?.trim() || null,
        status: leadForm.status,
        value: valueNum,
        assigned_to: leadForm.assigned_to || null,
        project_id: selectedProject.id,
        description: leadForm.description || `Created on ${new Date().toLocaleDateString()}`,
        link: leadForm.link || undefined,
      });
      setCreateMessage({ type: "success", text: "Lead created successfully." });
      // Always refresh all leads after add
      const leadsRes = await getLeads();
      setLeads(leadsRes.data || []);
      setTimeout(() => {
        setShowAddLeadModal(false);
        setLeadForm({ company_name: "", contact_name: "", email: "", phone: "", value: "", assigned_to: "", status: "new", description: "", link: "" });
        setCreateMessage(null);
      }, 1500);
    } catch (err: any) {
      setCreateMessage({ type: "error", text: err.message || "Failed to create lead." });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignLead = async (leadId: string, salesPersonId: string) => {
    setAssigningLead(leadId);
    try {
      await updateLead(leadId, { assigned_to: salesPersonId || null });
      const leadsRes = await getLeads();
      setLeads(leadsRes.data || []);
    } catch (error) {
      // Failed to assign lead
    } finally {
      setAssigningLead(null);
    }
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (!bulkAssignSalesman || selectedLeadIds.size === 0) {
      alert("Please select a salesman and at least one lead");
      return;
    }
    setBulkAssigning(true);
    try {
      const leadIdsArray = Array.from(selectedLeadIds);
      const assignPromises = leadIdsArray.map(leadId => 
        updateLead(leadId, { assigned_to: bulkAssignSalesman })
      );
      await Promise.all(assignPromises);
      
      // Refresh leads
      const leadsRes = await getLeads();
      setLeads(leadsRes.data || []);
      
      // Clear selection
      setSelectedLeadIds(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignSalesman("");
      alert(`Successfully assigned ${leadIdsArray.length} lead(s) to salesman`);
    } catch (error: any) {
      alert(`Failed to assign leads: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkAssigning(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) {
      alert("Please select at least one lead to delete");
      return;
    }
    setBulkDeleting(true);
    try {
      const leadIdsArray = Array.from(selectedLeadIds);
      const deletePromises = leadIdsArray.map(leadId => 
        deleteLead(leadId)
      );
      const results = await Promise.all(deletePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        alert(`Failed to delete ${errors.length} lead(s). Some leads may have been deleted.`);
      }
      
      // Refresh leads
      const leadsRes = await getLeads();
      setLeads(leadsRes.data || []);
      
      // Clear selection
      setSelectedLeadIds(new Set());
      setShowBulkDeleteModal(false);
      alert(`Successfully deleted ${leadIdsArray.length - errors.length} lead(s)`);
    } catch (error: any) {
      alert(`Failed to delete leads: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Toggle select all filtered leads
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      const allFilteredIds = new Set(filteredLeads.map(lead => lead.id));
      setSelectedLeadIds(allFilteredIds);
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  // Toggle individual lead selection
  const handleToggleLead = (leadId: string, checked: boolean | "indeterminate") => {
    const newSelection = new Set(selectedLeadIds);
    if (checked === true) {
      newSelection.add(leadId);
    } else {
      newSelection.delete(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  // Handle Excel file upload and parsing
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          setImportMessage({ type: "error", text: "Excel file must have at least a header row and one data row." });
          return;
        }

        const headers = jsonData[0].map((h: any) => String(h || "").trim()).filter((h: string) => h);
        const rows = jsonData.slice(1).filter((row: any[]) => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));
        
        // Convert rows to objects
        const parsedData = rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? String(row[index] || "").trim() : "";
          });
          return obj;
        });

        setExcelHeaders(headers);
        setExcelData(parsedData);
        setImportMessage(null);
      } catch (error) {
        setImportMessage({ type: "error", text: "Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file." });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!selectedImportProject) {
      setImportMessage({ type: "error", text: "Please select a project first." });
      return;
    }

    if (excelData.length === 0) {
      setImportMessage({ type: "error", text: "No data to import. Please upload a valid Excel file." });
      return;
    }

    // Helper function to find ALL phone numbers from row (supports multiple phone numbers)
    const findAllPhoneNumbers = (row: any): string[] => {
      const phoneNumbers: string[] = [];
      const phoneVariations = [
        "Phone", "phone", "PHONE",
        "Phone Number", "phone number", "PhoneNumber", "phone_number", "PHONE_NUMBER",
        "Contact Phone", "contact phone", "ContactPhone", "contact_phone", "CONTACT_PHONE",
        "Mobile", "mobile", "MOBILE",
        "Mobile Number", "mobile number", "MobileNumber", "mobile_number", "MOBILE_NUMBER",
        "Cell", "cell", "CELL",
        "Cell Phone", "cell phone", "CellPhone", "cell_phone", "CELL_PHONE",
        "Tel", "tel", "TEL",
        "Telephone", "telephone", "TELEPHONE",
        "Contact Number", "contact number", "ContactNumber", "contact_number", "CONTACT_NUMBER",
        "Phone No", "phone no", "PhoneNo", "phone_no", "PHONE_NO",
        "Mobile No", "mobile no", "MobileNo", "mobile_no", "MOBILE_NO",
        "Contact No", "contact no", "ContactNo", "contact_no", "CONTACT_NO",
        "Ph", "ph", "PH",
        "Mob", "mob", "MOB",
        // Common abbreviations including Phno
        "Phno", "phno", "PHNO", "PhNo", "Ph No", "ph no",
        "Phone_Number", "phone_number",
        "Contact_Phone", "contact_phone",
        "Mobile_Number", "mobile_number",
        "Tel No", "tel no", "TelNo", "tel_no",
        "Phone#", "phone#", "PHONE#",
        "Contact#", "contact#", "CONTACT#",
        "Number", "number", "NUMBER",
        "No", "no", "NO",
        // Multiple phone columns
        "Phone 1", "phone 1", "Phone1", "phone1",
        "Phone 2", "phone 2", "Phone2", "phone2",
        "Mobile 1", "mobile 1", "Mobile1", "mobile1",
        "Mobile 2", "mobile 2", "Mobile2", "mobile2",
      ];

      // Helper to parse and add phone number
      const addPhoneNumber = (value: any) => {
        if (value === null || value === undefined) return;
        
        // Handle Excel number formatting - convert to string first
        let phoneValue: string;
        if (typeof value === 'number') {
          phoneValue = String(value);
        } else {
          phoneValue = String(value).trim();
        }
        
        if (!phoneValue || phoneValue === "null" || phoneValue === "undefined" || phoneValue === "") return;
        
        // Check if it contains multiple numbers (comma, semicolon, pipe, or newline separated)
        const separators = /[,;|\n\r]+/;
        if (separators.test(phoneValue)) {
          // Split by separators and add each
          const numbers = phoneValue.split(separators).map(n => n.trim()).filter(n => n.length > 0);
          numbers.forEach(num => {
            // More lenient validation - just check if it has digits and reasonable length
            if (num.length >= 6 && num.length <= 25 && /\d/.test(num)) {
              if (!phoneNumbers.includes(num)) phoneNumbers.push(num);
            }
          });
        } else {
          // Single phone number - more lenient validation
          // Just check if it has digits and reasonable length (6-25 characters)
          if (phoneValue.length >= 6 && phoneValue.length <= 25 && /\d/.test(phoneValue)) {
            if (!phoneNumbers.includes(phoneValue)) phoneNumbers.push(phoneValue);
          }
        }
      };

      // First try exact matches from known variations
      for (const variation of phoneVariations) {
        if (row[variation] !== undefined && row[variation] !== null) {
          addPhoneNumber(row[variation]);
        }
      }

      // Then try case-insensitive search through all keys
      const rowKeys = Object.keys(row);
      for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().replace(/[_\s-]/g, '');
        // Check for phone-related keywords including abbreviations like "phno"
        if (lowerKey.includes('phone') || 
            lowerKey.includes('phno') ||  // Add Phno detection
            lowerKey.includes('mobile') || 
            lowerKey.includes('cell') || 
            lowerKey.includes('tel') || 
            (lowerKey.includes('contact') && (lowerKey.includes('no') || lowerKey.includes('num'))) ||
            (lowerKey.includes('number') && (lowerKey.includes('contact') || lowerKey.includes('phone') || lowerKey.includes('mobile'))) ||
            (lowerKey === 'ph' || lowerKey === 'phno' || lowerKey === 'phonenumber')) {  // Exact matches for common abbreviations
          if (row[key] !== undefined && row[key] !== null) {
            addPhoneNumber(row[key]);
          }
        }
      }

      // Last resort: check all columns for values that look like phone numbers
      for (const key of rowKeys) {
        const rawValue = row[key];
        if (rawValue !== undefined && rawValue !== null) {
          const value = String(rawValue).trim();
          if (value && /[\d\+\-\(\)\s]{7,}/.test(value) && value.length >= 7 && value.length <= 20) {
            if (!phoneNumbers.includes(value)) {
              phoneNumbers.push(value);
            }
          }
        }
      }

      return phoneNumbers;
    };

    // Helper function to find phone number (backward compatibility - returns first or comma-separated)
    const findPhoneNumber = (row: any): string => {
      const phoneNumbers = findAllPhoneNumbers(row);
      return phoneNumbers.length > 0 ? phoneNumbers.join(', ') : '';
    };

    // Helper function to find email from row with many variations
    const findEmail = (row: any): string => {
      const emailVariations = [
        "Email", "email", "EMAIL",
        "E-mail", "e-mail", "E-MAIL",
        "Contact Email", "contact email", "ContactEmail", "contact_email", "CONTACT_EMAIL",
        "Email Address", "email address", "EmailAddress", "email_address", "EMAIL_ADDRESS",
        "Contact Email Address", "contact email address", "ContactEmailAddress", "contact_email_address",
        "Mail", "mail", "MAIL",
        "Email Id", "email id", "EmailId", "email_id",
      ];

      // First try exact matches
      for (const variation of emailVariations) {
        if (row[variation] !== undefined && row[variation] !== null && String(row[variation]).trim() !== "") {
          return String(row[variation]).trim();
        }
      }

      // Then try case-insensitive search through all keys
      const rowKeys = Object.keys(row);
      for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().replace(/[_\s-]/g, '');
        if (lowerKey.includes('email') || lowerKey.includes('mail')) {
          const value = String(row[key] || '').trim();
          if (value && value.includes('@')) { // Basic email validation
            return value;
          }
        }
      }

      return "";
    };

    // Map Excel columns to lead fields (flexible mapping)
    const leadsToImport = excelData.map((row: any, index: number) => {
      // Try to find company name in various column names
      const companyName = row["Company Name"] || row["Company"] || row["company_name"] || row["CompanyName"] || 
                         row["COMPANY"] || row["company"] || Object.values(row)[0] || "";
      
      if (!companyName || companyName.trim() === "") {
        return null; // Skip rows without company name
      }

      // Extract ALL phone numbers using comprehensive search
      const phoneNumbers = findAllPhoneNumbers(row);
      const phoneValue = phoneNumbers.length > 0 ? phoneNumbers.join(', ') : undefined;
      
      // Extract email using comprehensive search
      const emailValue = findEmail(row);

      const leadData = {
        company_name: String(companyName).trim(),
        contact_name: (row["Contact Name"] || row["Contact"] || row["contact_name"] || row["ContactName"] || 
                     row["CONTACT"] || row["contact"] || row["Name"] || row["name"] || "").toString().trim(),
        email: emailValue || undefined, // Use undefined instead of empty string
        phone: phoneValue || undefined, // Store multiple phone numbers as comma-separated string
        project_id: selectedImportProject,
        description: (row["Description"] || row["description"] || row["Notes"] || row["notes"] || row["Note"] || row["note"] || "").toString().trim() || undefined,
        link: (row["Link"] || row["link"] || row["Website"] || row["website"] || row["URL"] || row["url"] || "").toString().trim() || undefined,
        value: (() => {
          const val = row["Value"] || row["value"] || row["Deal Value"] || row["deal_value"] || row["Amount"] || row["amount"] || 0;
          const numVal = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]/g, "")) : Number(val);
          return isNaN(numVal) ? 0 : numVal;
        })(),
      };

      return leadData;
    }).filter((lead: any) => lead !== null);

    if (leadsToImport.length === 0) {
      setImportMessage({ type: "error", text: "No valid leads found. Please ensure your Excel file has a 'Company Name' or 'Company' column." });
      return;
    }

    setImporting(true);
    setImportMessage(null);

    try {
      const result = await createBulkLeads(leadsToImport);
      if (result.error) {
        setImportMessage({ type: "error", text: result.error.message || "Failed to import leads." });
      } else {
        setImportMessage({ type: "success", text: `Successfully imported ${leadsToImport.length} lead(s).` });
        // Refresh leads
        const leadsRes = await getLeads();
        setLeads(leadsRes.data || []);
        // Reset form after success
        setTimeout(() => {
          setShowBulkImportModal(false);
          setExcelData([]);
          setExcelHeaders([]);
          setSelectedImportProject("");
          setImportMessage(null);
        }, 2000);
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Failed to import leads." });
    } finally {
      setImporting(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    if (!leadId || !status) {
      return;
    }
    // Normalize status to match database enum values
    const normalizedStatus = normalizeStatus(status);
    const allowedStatuses = ['new', 'qualified', 'proposal', 'closed_won', 'not_interested'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      alert(`Invalid status value: ${status}. Please try again.`);
      return;
    }
    setUpdatingLeadId(leadId);
    try {
      const result = await updateLead(leadId, { status: normalizedStatus });
      if (result.error) {
        alert(`Failed to update lead status: ${result.error.message || 'Unknown error'}`);
        setUpdatingLeadId(null);
        return;
      }
      if (!result.data) {
        alert('Failed to update lead status: No data returned');
        setUpdatingLeadId(null);
        return;
      }
      // Always refresh all leads after update
      const leadsRes = await getLeads();
      setLeads(leadsRes.data || []);
    } catch (error) {
      alert(`Failed to update lead status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Helper function to normalize status values (handle both old and new formats)
  const normalizeStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'negotiation': 'proposal',
      'won': 'closed_won',
      'lost': 'not_interested',
    };
    return statusMap[status] || status;
  };

  // Helper function to check if a lead status matches the filter
  const statusMatches = (leadStatus: string, filterStatus: string): boolean => {
    if (filterStatus === "all") return true;
    const normalizedLeadStatus = normalizeStatus(leadStatus);
    const normalizedFilterStatus = normalizeStatus(filterStatus);
    return normalizedLeadStatus === normalizedFilterStatus || leadStatus === filterStatus;
  };

  // Fix: filteredLeads should show all leads when selectedProject is null
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusFilter === 'all' || normalizeStatus(lead.status) === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || lead.assigned_to === assigneeFilter;
    const matchesSearch = !searchTerm || lead.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    // If selectedProject is null, show all leads
    const matchesProject = selectedProject ? lead.project_id === selectedProject.id : true;
    return matchesStatus && matchesAssignee && matchesSearch && matchesProject;
  });

  // Check if all filtered leads are selected
  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeadIds.has(lead.id));
  const someFilteredSelected = filteredLeads.some(lead => selectedLeadIds.has(lead.id));

  const getStatusIcon = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch(normalizedStatus) {
      case 'closed_won': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not_interested': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'proposal': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'qualified': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch(normalizedStatus) {
      case 'closed_won': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'not_interested': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'proposal': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'qualified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  // Load activities for the selected lead when viewing details
  useEffect(() => {
    if (!selectedLead || !showDetailsModal) return;

    let cleanup: (() => void) | undefined;

    const load = async () => {
      try {
        const { data } = await getActivitiesForLead(selectedLead.id);
        setLeadActivities(data || []);
      } catch (e) {
        // Silently handle error
      }
    };

    load();

    const sub = subscribeToLeadActivities(selectedLead.id, async () => {
      try {
        const { data } = await getActivitiesForLead(selectedLead.id);
        setLeadActivities(data || []);
      } catch (e) {
        // Silently handle error
      }
    });
    cleanup = () => { try { sub.unsubscribe?.(); } catch {} };

    return () => { cleanup?.(); };
  }, [selectedLead, showDetailsModal]);

  // Always set selectedProject to null on mount and after projects load
  useEffect(() => {
    if (projects.length > 0) {
      setSelectedProject(null);
    }
  }, [projects]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar role="manager" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading leads...</p>
          </div>
        </main>
      </div>
    );
  }

  // Pipeline stats should match filteredLeads, using normalized status
  const newLeads = filteredLeads.filter(l => normalizeStatus(l.status) === 'new');
  const qualifiedLeads = filteredLeads.filter(l => normalizeStatus(l.status) === 'qualified');
  const proposalLeads = filteredLeads.filter(l => normalizeStatus(l.status) === 'proposal');
  const closedWonLeads = filteredLeads.filter(l => normalizeStatus(l.status) === 'closed_won');
  const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar role="manager" />
      <main className="flex-1 p-2 sm:p-4 lg:p-8 pt-16 sm:pt-16 lg:pt-8 overflow-auto bg-slate-50">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Leads Management</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage and track all leads across projects</p>
        </div>



        {/* Filters/Search Bar with Project Selector */}
        <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-none min-w-[150px] max-w-[200px]">
              <Select
                value={selectedProject ? selectedProject.id : "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedProject(null);
                  } else {
                    const project = projects.find(p => p.id === value);
                    setSelectedProject(project || null);
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 font-medium">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value={"all"} className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-none min-w-[150px] max-w-[200px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  // Update the URL param for status
                  const next = new URLSearchParams(searchParams);
                  if (value === "all") {
                    next.delete("status");
                  } else {
                    next.set("status", value);
                  }
                  setSearchParams(next, { replace: true });
                }}
              >
                <SelectTrigger className="h-9 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">All Statuses</SelectItem>
                  <SelectItem value="new" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">New</SelectItem>
                  <SelectItem value="qualified" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Qualified</SelectItem>
                  <SelectItem value="proposal" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">In Proposal</SelectItem>
                  <SelectItem value="closed_won" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Closed Won</SelectItem>
                  <SelectItem value="not_interested" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-none min-w-[150px] max-w-[200px]">
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-9 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 font-medium">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">All Assignees</SelectItem>
                  <SelectItem value="unassigned" className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">Unassigned</SelectItem>
                  {salesUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id} className="text-slate-900 hover:bg-slate-100 focus:bg-slate-100 font-medium">
                      {u.full_name || u.email?.split("@")[0] || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search leads..."
                  className="h-9 pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            </div>
            <Button 
              onClick={() => setShowAddLeadModal(true)} 
              disabled={!selectedProject}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={!selectedProject ? "Select a project to add a lead. Switch to a specific project above." : "Add a new lead"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
            <Button 
              onClick={() => {
                setShowBulkImportModal(true);
                setExcelData([]);
                setExcelHeaders([]);
                setImportMessage(null);
                if (selectedProject) {
                  setSelectedImportProject(selectedProject.id);
                }
              }}
              disabled={projects.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={projects.length === 0 ? "Create a project first to import leads" : "Import leads from Excel file"}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </Card>

        {projects.length === 0 && (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Available</h3>
            <p className="text-slate-500 mb-6">Create a project first to start adding leads</p>
          </Card>
        )}


        {/* If All Projects is selected, show all leads and stats across all projects */}
        {projects.length > 0 && !selectedProject && (
          <>
            <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{filteredLeads.length}</span>
                      <span className="text-xs text-slate-600 font-medium">Total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-900">{newLeads.length}</span>
                      <span className="text-xs text-blue-700 font-medium">New</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-indigo-900">{qualifiedLeads.length}</span>
                      <span className="text-xs text-indigo-700 font-medium">Qualified</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-orange-900">{proposalLeads.length}</span>
                      <span className="text-xs text-orange-700 font-medium">In Proposal</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    {/* Download icon removed */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-green-700">${(totalValue / 1000).toFixed(0)}K</span>
                      <span className="text-xs text-green-700 font-medium">Value</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">Showing all leads across all projects</span>
              </div>
            </Card>
            {/* Bulk Actions Toolbar */}
            {selectedLeadIds.size > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200 shadow-sm mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeadIds(new Set())}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowBulkAssignModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign to Salesman
                    </Button>
                    <Button
                      onClick={() => setShowBulkDeleteModal(true)}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-3 sm:p-6 bg-white border-slate-200">
              {/* Select All Header */}
              {filteredLeads.length > 0 && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Select All ({filteredLeads.length} leads)
                  </span>
                </div>
              )}
                {filteredLeads.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">No leads found for any project.</p>
                </div>
              )}

              {filteredLeads.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700 w-10">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={handleSelectAll}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Lead</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Project</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Contact</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Status</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Assigned To</th>
                        <th className="text-right py-2 px-3 font-medium text-xs text-slate-700">Value</th>
                        <th className="text-center py-2 px-3 font-medium text-xs text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                {filteredLeads.map((lead) => {
                  const assignedUser = salesUsers.find(u => u.id === lead.assigned_to);
                  const assignedName = assignedUser?.full_name || assignedUser?.email?.split("@")[0] || "Unassigned";
                  const lastTouched = lead.updated_at || lead.created_at;
                  const daysStale = lastTouched ? Math.floor((Date.now() - new Date(lastTouched).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isStale = daysStale > 7;
                        const isSelected = selectedLeadIds.has(lead.id);
                        const projectName = projects.find(p => p.id === lead.project_id)?.name || 'No Project';
                        
                  return (
                          <tr 
                            key={lead.id} 
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailsModal(true);
                            }}
                          >
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleToggleLead(lead.id, checked)}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-medium">
                                    {lead.company_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs font-medium text-slate-900">{lead.company_name}</div>
                            {isStale && (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0.5 mt-0.5">
                                      Stale ({daysStale}d)
                                    </Badge>
                            )}
                          </div>
                        </div>
                            </td>
                            <td className="py-2 px-3">
                              {projectName !== 'No Project' ? (
                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-2 py-0.5">
                                  {projectName}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">No project</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="text-xs text-slate-900">{lead.contact_name || 'N/A'}</div>
                                {lead.email && (
                                  <div className="text-xs text-slate-500 truncate max-w-[150px]">{lead.email}</div>
                                )}
                                {lead.phone && (
                                  <div className="text-xs text-slate-500">{lead.phone}</div>
                                )}
                      </div>
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={normalizeStatus(lead.status) || lead.status}
                                onValueChange={(value) => {
                                  handleStatusChange(lead.id, value);
                                }}
                                disabled={updatingLeadId === lead.id}
                              >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs h-7 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="qualified">Qualified</SelectItem>
                                  <SelectItem value="proposal">In Proposal</SelectItem>
                                  <SelectItem value="closed_won">Closed Won</SelectItem>
                                  <SelectItem value="not_interested">Not Interested</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={lead.assigned_to || "unassigned"}
                                onValueChange={(value) => {
                                  handleAssignLead(lead.id, value === "unassigned" ? "" : value);
                                }}
                                disabled={assigningLead === lead.id}
                              >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs h-7 w-32">
                                  <SelectValue placeholder="Assign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {salesUsers.map((u: any) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.full_name || u.email?.split("@")[0] || u.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-3 text-right text-xs font-semibold text-slate-900">
                              ${((lead.value || 0) / 1000).toFixed(0)}K
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1">
                                {(() => {
                                  const phoneNumbers = parsePhoneNumbers(lead.contact_phone || lead.phone);
                                  if (phoneNumbers.length === 0) {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-slate-100"
                                        title="No phone number"
                                        disabled
                                      >
                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                      </Button>
                                    );
                                  } else if (phoneNumbers.length === 1) {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-slate-100"
                                        title={`Call ${phoneNumbers[0]}`}
                                        asChild
                                      >
                                        <a href={`tel:${phoneNumbers[0]}`}>
                                          <PhoneIcon className="w-3.5 h-3.5" />
                                        </a>
                                      </Button>
                                    );
                                  } else {
                                    return (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 hover:bg-slate-100"
                                            title={`${phoneNumbers.length} phone numbers - Click to see all`}
                                          >
                                            <PhoneIcon className="w-3.5 h-3.5" />
                                            <ChevronDown className="w-2 h-2 ml-0.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 border-b">
                                            {phoneNumbers.length} Phone Number{phoneNumbers.length !== 1 ? 's' : ''}
                                          </div>
                                          {phoneNumbers.map((phone, idx) => (
                                            <DropdownMenuItem key={idx} asChild>
                                              <a href={`tel:${phone}`} className="flex items-center gap-2 cursor-pointer w-full">
                                                <PhoneIcon className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="font-medium">{phone}</span>
                                              </a>
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    );
                                  }
                                })()}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-slate-100"
                                  title="Email"
                                  asChild
                                >
                                  <a href={`mailto:${lead.contact_email || lead.email || ''}`}>
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-slate-100"
                                  title="Edit"
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    openEditLeadModal();
                                  }}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedLead(lead);
                                      setShowDetailsModal(true);
                                    }}>
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedLead(lead);
                                      openEditLeadModal();
                                    }}>
                                      Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete ${lead.company_name}?`)) {
                                          try {
                                            await deleteLead(lead.id);
                                            const leadsRes = await getLeads();
                                            setLeads(leadsRes.data || []);
                                            alert("Lead deleted successfully");
                                          } catch (error: any) {
                                            alert(`Failed to delete lead: ${error.message || 'Unknown error'}`);
                                          }
                                        }
                                      }}
                                      className="text-red-600"
                                    >
                                      Delete Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                  );
                })}
                    </tbody>
                  </table>
              </div>
              )}
            </Card>
          </>
        )}

        {selectedProject && (
          <>
            {/* Compact Stats Bar */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{leads.length}</span>
                      <span className="text-xs text-slate-600 font-medium">Total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-900">{newLeads.length}</span>
                      <span className="text-xs text-blue-700 font-medium">New</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-indigo-900">{qualifiedLeads.length}</span>
                      <span className="text-xs text-indigo-700 font-medium">Qualified</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-orange-900">{proposalLeads.length}</span>
                      <span className="text-xs text-orange-700 font-medium">In Proposal</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    {/* Download icon removed */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-green-700">${(totalValue / 1000).toFixed(0)}K</span>
                      <span className="text-xs text-green-700 font-medium">Value</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>


            {/* Bulk Actions Toolbar */}
            {selectedLeadIds.size > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200 shadow-sm mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeadIds(new Set())}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowBulkAssignModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign to Salesman
                    </Button>
                    <Button
                      onClick={() => setShowBulkDeleteModal(true)}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Leads Table */}
            <Card className="p-3 sm:p-6 bg-white border-slate-200">
              {/* Select All Header */}
              {filteredLeads.length > 0 && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Select All ({filteredLeads.length} leads)
                  </span>
                </div>
              )}
              
              {filteredLeads.length === 0 && leads.length > 0 && (
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">No leads match the current filters</p>
                  <p className="text-sm text-slate-500">Try adjusting your filters or search term</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setStatusFilter("all");
                      setAssigneeFilter("all");
                      setSearchTerm("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
              
              {filteredLeads.length === 0 && leads.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">No leads found for this project. Add your first lead to get started!</p>
                </div>
              )}

              {filteredLeads.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700 w-10">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={handleSelectAll}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Lead</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Project</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Contact</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Status</th>
                        <th className="text-left py-2 px-3 font-medium text-xs text-slate-700">Assigned To</th>
                        <th className="text-right py-2 px-3 font-medium text-xs text-slate-700">Value</th>
                        <th className="text-center py-2 px-3 font-medium text-xs text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                {filteredLeads.map((lead) => {
                  const assignedUser = salesUsers.find(u => u.id === lead.assigned_to);
                  const assignedName = assignedUser?.full_name || assignedUser?.email?.split("@")[0] || "Unassigned";
                  const lastTouched = lead.updated_at || lead.created_at;
                  const daysStale = lastTouched ? Math.floor((Date.now() - new Date(lastTouched).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isStale = daysStale > 7;
                        const isSelected = selectedLeadIds.has(lead.id);
                        const projectName = projects.find(p => p.id === lead.project_id)?.name || 'No Project';
                  
                  return (
                          <tr 
                            key={lead.id} 
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailsModal(true);
                            }}
                          >
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleToggleLead(lead.id, checked)}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-medium">
                                    {lead.company_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs font-medium text-slate-900">{lead.company_name}</div>
                            {isStale && (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0.5 mt-0.5">
                                      Stale ({daysStale}d)
                                    </Badge>
                            )}
                          </div>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {projectName !== 'No Project' ? (
                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-2 py-0.5">
                                  {projectName}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">No project</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="text-xs text-slate-900">{lead.contact_name || 'N/A'}</div>
                            {lead.email && (
                                  <div className="text-xs text-slate-500 truncate max-w-[150px]">{lead.email}</div>
                            )}
                            {lead.phone && (
                                  <div className="text-xs text-slate-500">{lead.phone}</div>
                            )}
                          </div>
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={normalizeStatus(lead.status) || lead.status}
                                onValueChange={(value) => {
                                  handleStatusChange(lead.id, value);
                                }}
                                disabled={updatingLeadId === lead.id}
                              >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs h-7 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="qualified">Qualified</SelectItem>
                                  <SelectItem value="proposal">In Proposal</SelectItem>
                                  <SelectItem value="closed_won">Closed Won</SelectItem>
                                  <SelectItem value="not_interested">Not Interested</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={(value) => {
                              handleAssignLead(lead.id, value === "unassigned" ? "" : value);
                            }}
                            disabled={assigningLead === lead.id}
                          >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs h-7 w-32">
                                  <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {salesUsers.map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name || u.email?.split("@")[0] || u.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                            </td>
                            <td className="py-2 px-3 text-right text-xs font-semibold text-slate-900">
                              ${((lead.value || 0) / 1000).toFixed(0)}K
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1">
                                {(() => {
                                  const phoneNumbers = parsePhoneNumbers(lead.contact_phone || lead.phone);
                                  if (phoneNumbers.length === 0) {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-slate-100"
                                        title="No phone number"
                                        disabled
                                      >
                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                      </Button>
                                    );
                                  } else if (phoneNumbers.length === 1) {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-slate-100"
                                        title={`Call ${phoneNumbers[0]}`}
                                        asChild
                                      >
                                        <a href={`tel:${phoneNumbers[0]}`}>
                                          <PhoneIcon className="w-3.5 h-3.5" />
                                        </a>
                                      </Button>
                                    );
                                  } else {
                                    return (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 hover:bg-slate-100"
                                            title={`${phoneNumbers.length} phone numbers`}
                                          >
                                            <PhoneIcon className="w-3.5 h-3.5" />
                                            <ChevronDown className="w-2 h-2 ml-0.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 border-b">
                                            {phoneNumbers.length} Phone Number{phoneNumbers.length !== 1 ? 's' : ''}
                                          </div>
                                          {phoneNumbers.map((phone, idx) => (
                                            <DropdownMenuItem key={idx} asChild>
                                              <a href={`tel:${phone}`} className="flex items-center gap-2 cursor-pointer w-full">
                                                <PhoneIcon className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="font-medium">{phone}</span>
                                              </a>
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    );
                                  }
                                })()}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-slate-100"
                                  title="Email"
                                  asChild
                                >
                                  <a href={`mailto:${lead.contact_email || lead.email || ''}`}>
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                    <Button 
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-slate-100"
                                  title="Edit"
                      onClick={() => {
                                    setSelectedLead(lead);
                                    openEditLeadModal();
                      }}
                    >
                                  <Edit className="w-3.5 h-3.5" />
                    </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedLead(lead);
                                      setShowDetailsModal(true);
                                    }}>
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedLead(lead);
                                      openEditLeadModal();
                                    }}>
                                      Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete ${lead.company_name}?`)) {
                                          try {
                                            await deleteLead(lead.id);
                                            const leadsRes = await getLeads();
                                            setLeads(leadsRes.data || []);
                                            alert("Lead deleted successfully");
                                          } catch (error: any) {
                                            alert(`Failed to delete lead: ${error.message || 'Unknown error'}`);
                                          }
                                        }
                                      }}
                                      className="text-red-600"
                                    >
                                      Delete Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                  </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
            </Card>
          </>
        )}

        {/* Add Lead Modal */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {createMessage && (
                <Alert className={createMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <AlertDescription className={createMessage.type === "success" ? "text-green-700" : "text-red-700"}>
                    {createMessage.text}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={leadForm.company_name}
                    onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Contact Name *</Label>
                  <Input
                    id="contact"
                    value={leadForm.contact_name}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="+1-555-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="value">Deal Value (USD) *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={leadForm.value}
                    onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="assign">Assign To</Label>
                  <Select value={leadForm.assigned_to || "unassigned"} onValueChange={(value) => setLeadForm({ ...leadForm, assigned_to: value === "unassigned" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {salesUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email?.split("@")[0] || u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Notes / Description</Label>
                  <Textarea
                    id="description"
                    value={leadForm.description}
                    onChange={(e) => setLeadForm({ ...leadForm, description: e.target.value })}
                    placeholder="Add any additional notes about this lead..."
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="link">Company Website / Link</Label>
                  <Input
                    id="link"
                    type="url"
                    value={leadForm.link}
                    onChange={(e) => setLeadForm({ ...leadForm, link: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <div className="text-xs text-slate-500 mt-1">Enter the company website or relevant link</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLeadModal(false)} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreateLead} disabled={creating}>
                {creating ? "Creating..." : "Create Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lead Details Modal */}
        <Dialog
          open={showDetailsModal}
          onOpenChange={(open) => {
            setShowDetailsModal(open);
            if (!open) {
              // Remove leadId from URL when closing
              const next = new URLSearchParams(searchParams);
              next.delete("leadId");
              setSearchParams(next, { replace: true });
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b border-slate-200 pb-4 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl text-slate-900">Lead Details</DialogTitle>
              {selectedLead && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openEditLeadModal}>
                    Edit Lead
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!window.confirm('Are you sure you want to delete this lead?')) return;
                    try {
                      await deleteLead(selectedLead.id);
                      const leadsRes = await getLeads();
                      setLeads(leadsRes.data || []);
                      setShowDetailsModal(false);
                    } catch (err) {
                      alert('Failed to delete lead.');
                    }
                  }}>
                    Delete Lead
                  </Button>
                </div>
              )}
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="pb-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedLead.company_name}</h3>
                      <p className="text-slate-600 text-sm mt-2">📞 {selectedLead.contact_name}</p>
                    </div>
                    <Badge className={`${getStatusColor(selectedLead.status)} text-sm px-3 py-1`}>{selectedLead.status.toUpperCase()}</Badge>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.email && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all">
                        <span className="text-xs font-semibold text-blue-700 block mb-2 uppercase tracking-wide">📧 Email</span>
                        <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:text-blue-800 break-all text-sm font-medium">{selectedLead.email}</a>
                      </div>
                    )}
                    {(() => {
                      const phoneNumbers = parsePhoneNumbers(selectedLead.contact_phone || selectedLead.phone);
                      if (phoneNumbers.length > 0) {
                        return (
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100 transition-all">
                            <span className="text-xs font-semibold text-indigo-700 block mb-2 uppercase tracking-wide">
                              ☎️ Phone Number{phoneNumbers.length > 1 ? `s (${phoneNumbers.length})` : ''}
                            </span>
                            <div className="space-y-2">
                              {phoneNumbers.map((phone, idx) => (
                                <a 
                                  key={idx}
                                  href={`tel:${phone}`} 
                                  className="flex items-center gap-2 block text-indigo-600 hover:text-indigo-800 text-sm font-medium p-2 bg-white rounded border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                                >
                                  <PhoneIcon className="w-4 h-4" />
                                  <span>{phone}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Company Link */}
                {selectedLead.link && (
                  <div>
                    <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                      Company Website
                    </h4>
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200 hover:border-cyan-300 hover:bg-cyan-100 transition-all">
                      <a 
                        href={selectedLead.link.startsWith('http') ? selectedLead.link : `https://${selectedLead.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:text-cyan-800 break-all text-sm font-medium underline flex items-center gap-2"
                      >
                        🔗 {selectedLead.link}
                      </a>
                    </div>
                  </div>
                )}

                {/* Deal Information */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Deal Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <span className="text-xs font-semibold text-green-700 block mb-2 uppercase tracking-wide">💰 Deal Value</span>
                      <span className="text-xl font-bold text-green-600">${((selectedLead.value || 0) / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <span className="text-xs font-semibold text-blue-700 block mb-2 uppercase tracking-wide">📊 Status</span>
                      <span className="text-lg font-bold text-blue-600 capitalize">{selectedLead.status}</span>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <span className="text-xs font-semibold text-orange-700 block mb-2 uppercase tracking-wide">📅 Created</span>
                      <span className="text-sm font-bold text-orange-600">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                {selectedLead.assigned_to && (() => {
                  const assignedUser = salesUsers.find(u => u.id === selectedLead.assigned_to);
                  return (
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Assigned To
                      </h4>
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <span className="text-lg font-bold text-indigo-900">{assignedUser?.full_name || assignedUser?.email?.split("@")[0] || "Unknown"}</span>
                        {assignedUser?.email && <p className="text-sm text-indigo-700 mt-2">📧 {assignedUser.email}</p>}
                      </div>
                    </div>
                  );
                })()}

                {/* Lead Description */}
                {selectedLead.description && (
                  <div>
                    <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Lead Description
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-700 text-sm leading-relaxed">{selectedLead.description}</p>
                    </div>
                  </div>
                )}

                {/* Recent Notes Section */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    Activity Notes ({(() => {
                      const notes = (leadActivities || []).filter((a: any) => String((a.activity_type || a.type || 'note')).toLowerCase() === 'note');
                      return notes.length;
                    })()})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {(() => {
                      const notes = (leadActivities || []).filter((a: any) => String((a.activity_type || a.type || 'note')).toLowerCase() === 'note');
                      if (notes.length === 0) {
                        return (
                          <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200 border-dashed">
                            <p className="text-slate-500 text-sm">✍️ No notes added yet. Salesperson can add notes from their dashboard.</p>
                          </div>
                        );
                      }
                      return notes.map((a: any, idx: number) => (
                        <div key={a.id} className="bg-pink-50 p-4 rounded-lg border border-pink-200 hover:border-pink-300 hover:bg-pink-100 transition-all">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-base font-bold text-pink-900">{a.title || 'Note'}</span>
                            <span className="text-xs text-slate-600 whitespace-nowrap bg-white px-2 py-1 rounded border border-slate-200">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                          {a.description && (
                            <p className="text-slate-700 text-sm leading-relaxed break-words">{a.description}</p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Lead Modal */}
        <Dialog open={showEditLeadModal} onOpenChange={setShowEditLeadModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editMessage && (
                <Alert className={editMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <AlertDescription className={editMessage.type === "success" ? "text-green-700" : "text-red-700"}>
                    {editMessage.text}
                  </AlertDescription>
                </Alert>
              )}
              {editLeadForm && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-company">Company Name *</Label>
                    <Input
                      id="edit-company"
                      value={editLeadForm.company_name}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, company_name: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contact">Contact Name *</Label>
                    <Input
                      id="edit-contact"
                      value={editLeadForm.contact_name}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, contact_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editLeadForm.email}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editLeadForm.phone}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                      placeholder="+1-555-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-value">Deal Value (USD) *</Label>
                    <Input
                      id="edit-value"
                      type="number"
                      value={editLeadForm.value}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, value: e.target.value })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editLeadForm.status} onValueChange={(value) => setEditLeadForm({ ...editLeadForm, status: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-description">Notes / Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editLeadForm.description}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, description: e.target.value })}
                      placeholder="Add any additional notes about this lead..."
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-link">Company Website / Link</Label>
                    <Input
                      id="edit-link"
                      type="url"
                      value={editLeadForm.link}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, link: e.target.value })}
                      placeholder="https://example.com"
                    />
                    <div className="text-xs text-slate-500 mt-1">Enter the company website or relevant link</div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditLeadModal(false)} disabled={editing}>Cancel</Button>
              <Button onClick={handleEditLead} disabled={editing}>
                {editing ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Modal */}
        <Dialog open={showBulkImportModal} onOpenChange={setShowBulkImportModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Bulk Import Leads from Excel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {importMessage && (
                <Alert className={importMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <AlertDescription className={importMessage.type === "success" ? "text-green-700" : "text-red-700"}>
                    {importMessage.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Excel File Format</h4>
                <p className="text-sm text-blue-800 mb-2">Your Excel file should have the following columns (column names are case-insensitive):</p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li><strong>Required:</strong> Company Name (or Company, company_name)</li>
                  <li><strong>Optional:</strong> Contact Name, Email, Phone, Description, Link/Website, Value/Deal Value</li>
                  <li><strong>Multiple Phone Numbers:</strong> You can have multiple phone columns (Phone, Mobile, Phone 1, Phone 2, etc.) or comma/semicolon-separated values in a single column</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">The first row should contain column headers. Rows without a company name will be skipped. Multiple phone numbers will be detected automatically.</p>
              </div>

              <div>
                <Label htmlFor="import-project">Select Project *</Label>
                <Select 
                  value={selectedImportProject} 
                  onValueChange={setSelectedImportProject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="excel-file">Upload Excel File (.xlsx or .xls)</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFile}
                  className="cursor-pointer"
                />
              </div>

              {excelData.length > 0 && (() => {
                // Helper to find phone number (same as in handleBulkImport)
                const findPhoneNumber = (row: any): string => {
                  const phoneVariations = [
                    "Phone", "phone", "PHONE", "Phone Number", "phone number", "PhoneNumber", "phone_number",
                    "Contact Phone", "contact phone", "ContactPhone", "contact_phone", "Mobile", "mobile",
                    "Mobile Number", "mobile number", "Cell", "cell", "Tel", "tel", "Telephone", "telephone",
                    "Contact Number", "contact number", "ContactNumber", "contact_number", "Phone No", "phone no",
                    "Mobile No", "mobile no", "Contact No", "contact no", "Number", "number", "No", "no",
                    "Phno", "phno", "PHNO", "PhNo", "Ph No", "ph no",  // Add Phno variations
                  ];
                  for (const variation of phoneVariations) {
                    if (row[variation] !== undefined && row[variation] !== null) {
                      let value: string;
                      if (typeof row[variation] === 'number') {
                        value = String(row[variation]);
                      } else {
                        value = String(row[variation]).trim();
                      }
                      if (value && value !== "null" && value !== "undefined" && value.length >= 6) {
                        return value;
                      }
                    }
                  }
                  const rowKeys = Object.keys(row);
                  for (const key of rowKeys) {
                    const lowerKey = key.toLowerCase().replace(/[_\s-]/g, '');
                    if (lowerKey.includes('phone') || lowerKey.includes('phno') || lowerKey === 'ph' || lowerKey === 'phno' ||
                        lowerKey.includes('mobile') || lowerKey.includes('cell') || 
                        lowerKey.includes('tel') || (lowerKey.includes('contact') && (lowerKey.includes('no') || lowerKey.includes('num')))) {
                      const rawValue = row[key];
                      if (rawValue !== undefined && rawValue !== null) {
                        let value: string;
                        if (typeof rawValue === 'number') {
                          value = String(rawValue);
                        } else {
                          value = String(rawValue).trim();
                        }
                        if (value && value.length >= 6 && /\d/.test(value)) {
                          return value;
                        }
                      }
                    }
                  }
                  return "";
                };
                
                const findEmail = (row: any): string => {
                  const emailVariations = ["Email", "email", "EMAIL", "E-mail", "e-mail", "Contact Email", "contact email"];
                  for (const variation of emailVariations) {
                    if (row[variation] !== undefined && row[variation] !== null) {
                      const value = String(row[variation]).trim();
                      if (value) return value;
                    }
                  }
                  const rowKeys = Object.keys(row);
                  for (const key of rowKeys) {
                    const lowerKey = key.toLowerCase().replace(/[_\s-]/g, '');
                    if (lowerKey.includes('email') || lowerKey.includes('mail')) {
                      const value = String(row[key] || '').trim();
                      if (value && value.includes('@')) return value;
                    }
                  }
                  return "";
                };
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Preview ({excelData.length} rows found)</Label>
                      <Badge variant="outline">{excelHeaders.length} columns detected</Badge>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg overflow-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            {excelHeaders.map((header, idx) => (
                              <th key={idx} className="px-3 py-2 text-left border-b border-slate-200 font-semibold text-slate-700">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {excelData.slice(0, 10).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50">
                              {excelHeaders.map((header, colIdx) => (
                                <td key={colIdx} className="px-3 py-2 text-slate-600">
                                  {(() => {
                                    const val = row[header];
                                    if (val !== undefined && val !== null) {
                                      if (typeof val === 'number') return String(val);
                                      return String(val).substring(0, 50);
                                    }
                                    return "";
                                  })()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {excelData.length > 10 && (
                        <div className="p-2 text-xs text-slate-500 text-center bg-slate-50">
                          Showing first 10 of {excelData.length} rows. All rows will be imported.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {excelHeaders.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Detected Columns:</h4>
                  <div className="flex flex-wrap gap-2">
                    {excelHeaders.map((header, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {header}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkImportModal(false);
                  setExcelData([]);
                  setExcelHeaders([]);
                  setImportMessage(null);
                }} 
                disabled={importing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkImport} 
                disabled={importing || excelData.length === 0 || !selectedImportProject}
                className="bg-green-600 hover:bg-green-700"
              >
                {importing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {excelData.length} Lead(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Modal */}
        <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Assign Leads</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Assign {selectedLeadIds.size} selected lead{selectedLeadIds.size !== 1 ? 's' : ''} to a salesman.
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="bulk-assign-salesman">Select Salesman</Label>
                <Select 
                  value={bulkAssignSalesman} 
                  onValueChange={setBulkAssignSalesman}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a salesman" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email?.split("@")[0] || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignSalesman("");
                }} 
                disabled={bulkAssigning}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkAssign} 
                disabled={bulkAssigning || !bulkAssignSalesman}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {bulkAssigning ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Modal */}
        <Dialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Leads</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Are you sure you want to delete {selectedLeadIds.size} selected lead{selectedLeadIds.size !== 1 ? 's' : ''}? 
                  This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkDeleteModal(false);
                }} 
                disabled={bulkDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkDelete} 
                disabled={bulkDeleting}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {bulkDeleting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManagerLeads;





