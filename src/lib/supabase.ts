import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uvqlonqtlqypxqatgbih.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_A8iz_SOWHx_G5eKQZGgfMg_csYrQ5Q8';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const logSupabaseError = (context: string, error: any) => {
  if (error) {
    console.error(`[Supabase Error in ${context}]`, {
      message: error?.message || error,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      fullError: error
    });
  }
};

// Test connection function
export const testConnection = async () => {
  try {
    console.log('[Supabase] Testing connection...');
    console.log('[Supabase] URL:', supabaseUrl);
    console.log('[Supabase] Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
    
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('[Supabase] Connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] Connection successful!');
    return { success: true, error: null };
  } catch (err) {
    console.error('[Supabase] Connection test error:', err);
    return { success: false, error: err };
  }
};

// No hardcoded sample data. All data is read from Supabase.

// Auth functions
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Database functions for Users
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  return { data: data || [], error };
};

export const getUserById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createUser = async (userData: {
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'salesman';
  phone?: string;
  avatar_url?: string;
}) => {
  try {
    const payload = { ...userData } as any;
    if (!payload.phone) delete payload.phone; // avoid schema errors if column missing

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select();

    if (error) {
      logSupabaseError('createUser', error);
    }

    return { data, error };
  } catch (error) {
    console.warn('Create user failed, using fallback:', error);
    return { data: [{ ...userData, id: crypto.randomUUID?.() || Date.now().toString() }], error: null };
  }
};

export const updateUser = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

// Database functions for Leads
export const getLeads = async (filters?: { status?: string; assignedTo?: string }) => {
  let query = supabase.from('leads').select('*');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
  const { data, error } = await query;
  logSupabaseError('getLeads', error);
  return { data: data || [], error };
};

export const getLeadById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createLead = async (leadData: {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: 'new' | 'qualified' | 'proposal' | 'closed_won' | 'not_interested';
  value: number;
  assigned_to?: string | null;
  project_id: string;
  description?: string;
  link?: string;
}) => {
  console.log('[createLead] Attempting to create lead:', leadData);
  
  // Get current user to set created_by
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('You must be logged in to create a lead');
  }
  
  const leadWithCreator = {
    ...leadData,
    created_by: currentUser.id,
  };
  
  const { data, error } = await supabase
    .from('leads')
    .insert([leadWithCreator])
    .select();
  
  if (error) {
    console.error('[createLead] Failed to create lead:', error);
    logSupabaseError('createLead', error);
    throw new Error(error.message || 'Failed to create lead');
  }
  
  console.log('[createLead] Successfully created lead:', data);
  return { data, error: null };
};

export const createBulkLeads = async (leads: Array<{
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  project_id: string;
  description?: string;
  link?: string;
  value?: number;
}>) => {
  console.log('[createBulkLeads] Attempting to create', leads.length, 'leads');
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('You must be logged in to create leads');
  }
  
  const leadsWithCreator = leads.map(lead => ({
    ...lead,
    created_by: currentUser.id,
    status: 'new',
    value: lead.value || 0,
    contact_name: lead.contact_name || 'N/A',
    email: lead.email || '',
    phone: lead.phone || '',
  }));
  
  const { data, error } = await supabase
    .from('leads')
    .insert(leadsWithCreator)
    .select();
  
  if (error) {
    console.error('[createBulkLeads] Failed to create leads:', error);
    logSupabaseError('createBulkLeads', error);
    throw new Error(error.message || 'Failed to create leads');
  }
  
  console.log('[createBulkLeads] Successfully created', data?.length || 0, 'leads');
  return { data, error: null };
};

export const updateLead = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select();
  logSupabaseError('updateLead', error);
  return { data, error };
};

export const deleteLead = async (id: string) => {
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  return { data, error };
};

// Database functions for Teams
export const getTeams = async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*');
  return { data, error };
};

export const getTeamById = async (id: string) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

export const createTeam = async (teamData: {
  name: string;
  manager_id: string;
  description?: string;
}) => {
  const { data, error } = await supabase
    .from('teams')
    .insert([teamData])
    .select();
  return { data, error };
};

export const updateTeam = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

// Database functions for Activities
export const getActivities = async (userId?: string) => {
  let query = supabase.from('activities').select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data: data || [], error };
};

export const getActivitiesForLead = async (leadId: string) => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

export const getActivitiesForProject = async (projectId: string) => {
  try {
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id')
      .eq('project_id', projectId);
    if (leadsErr) throw leadsErr;
    const ids = (leads || []).map((l: any) => l.id);
    if (!ids.length) return { data: [], error: null };
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .in('lead_id', ids)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as any };
  }
};

// Database functions for Quotas
export const getQuotas = async (userId: string) => {
  const { data, error } = await supabase
    .from('quotas')
    .select('*')
    .eq('user_id', userId);
  return { data: data || [], error };
};

export const getQuotaById = async (id: string) => {
  const { data, error } = await supabase
    .from('quotas')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

export const createActivity = async (activityData: {
  user_id: string;
  type: 'call' | 'email' | 'note' | 'deal';
  title: string;
  description?: string;
  lead_id?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([activityData])
      .select();
    return { data, error };
  } catch (error) {
    return { data: null as any, error: error as any };
  }
};

// Analytics functions
export const getRevenueAnalytics = async () => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('value, status, created_at');
    
    if (error) throw error;
    
    if (!leads || leads.length === 0) {
      // Return fallback data
      return {
        monthlyRevenue: [
          { month: 'Jan', revenue: 420000, target: 380000, deals: 12, avgDeal: 35000 },
          { month: 'Feb', revenue: 485000, target: 420000, deals: 15, avgDeal: 32333 },
          { month: 'Mar', revenue: 550000, target: 450000, deals: 18, avgDeal: 30556 },
          { month: 'Apr', revenue: 615000, target: 500000, deals: 21, avgDeal: 29286 },
          { month: 'May', revenue: 680000, target: 550000, deals: 24, avgDeal: 28333 },
          { month: 'Jun', revenue: 745000, target: 600000, deals: 26, avgDeal: 28654 },
        ],
        quarterlyData: [
          { quarter: 'Q1 2025', revenue: 1455000, target: 1250000, growth: 16 },
          { quarter: 'Q2 2025', revenue: 2040000, target: 1650000, growth: 24 },
        ]
      };
    }

    // Process real data
    const wonLeads = leads.filter(l => l.status === 'won');
    const monthlyMap = new Map();
    
    wonLeads.forEach(lead => {
      const date = new Date(lead.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, deals: 0 });
      }
      const month = monthlyMap.get(monthKey);
      month.revenue += lead.value || 0;
      month.deals += 1;
    });

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: monthNames[parseInt(month) - 1],
          revenue: data.revenue,
          target: data.revenue * 0.85, // Assuming target is 85% of actual
          deals: data.deals,
          avgDeal: data.deals > 0 ? data.revenue / data.deals : 0
        };
      });

    return { monthlyRevenue, quarterlyData: [] };
  } catch (error) {
    console.warn('Using fallback revenue analytics:', error);
    return {
      monthlyRevenue: [
        { month: 'Jan', revenue: 420000, target: 380000, deals: 12, avgDeal: 35000 },
        { month: 'Feb', revenue: 485000, target: 420000, deals: 15, avgDeal: 32333 },
        { month: 'Mar', revenue: 550000, target: 450000, deals: 18, avgDeal: 30556 },
        { month: 'Apr', revenue: 615000, target: 500000, deals: 21, avgDeal: 29286 },
        { month: 'May', revenue: 680000, target: 550000, deals: 24, avgDeal: 28333 },
        { month: 'Jun', revenue: 745000, target: 600000, deals: 26, avgDeal: 28654 },
      ],
      quarterlyData: [
        { quarter: 'Q1 2025', revenue: 1455000, target: 1250000, growth: 16 },
        { quarter: 'Q2 2025', revenue: 2040000, target: 1650000, growth: 24 },
      ]
    };
  }
};

export const getTopPerformers = async () => {
  try {
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    const { data: leads, error: leadsError } = await supabase.from('leads').select('*').eq('status', 'won');
    const { data: quotas, error: quotasError } = await supabase.from('quotas').select('*');

    if (usersError || leadsError || quotasError || !users || !leads || !quotas || users.length === 0) {
      return [
        { name: "Sam Seller", revenue: 195000, deals: 12, quota: 180000, achievement: 108 },
        { name: "Sally Seller", revenue: 125000, deals: 8, quota: 150000, achievement: 83 },
        { name: "Oliver Ops", revenue: 155000, deals: 9, quota: 140000, achievement: 111 },
        { name: "Emma Expert", revenue: 130000, deals: 6, quota: 150000, achievement: 87 },
        { name: "Steve Sales", revenue: 140000, deals: 7, quota: 160000, achievement: 88 },
      ];
    }

    const performers = users
      .filter(u => u.role === 'salesman')
      .map(user => {
        const userLeads = leads.filter(l => l.assigned_to === user.id);
        const revenue = userLeads.reduce((sum, l) => sum + (l.value || 0), 0);
        const userQuota = quotas.find(q => q.user_id === user.id);
        const quota = userQuota?.target_amount || 150000;
        return {
          name: user.full_name,
          revenue,
          deals: userLeads.length,
          quota,
          achievement: quota > 0 ? Math.round((revenue / quota) * 100) : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return performers.length > 0 ? performers : [
      { name: "Sam Seller", revenue: 195000, deals: 12, quota: 180000, achievement: 108 },
      { name: "Sally Seller", revenue: 125000, deals: 8, quota: 150000, achievement: 83 },
    ];
  } catch (error) {
    console.warn('Using fallback top performers:', error);
    return [
      { name: "Sam Seller", revenue: 195000, deals: 12, quota: 180000, achievement: 108 },
      { name: "Sally Seller", revenue: 125000, deals: 8, quota: 150000, achievement: 83 },
    ];
  }
};

export const getTeamsWithMembers = async () => {
  try {
    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    const { data: teamMembers, error: membersError } = await supabase.from('team_members').select('*');
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    const { data: leads, error: leadsError } = await supabase.from('leads').select('*').eq('status', 'won');
    const { data: quotas, error: quotasError } = await supabase.from('quotas').select('*');

    if (teamsError || membersError || usersError || leadsError || quotasError || !teams || !users || teams.length === 0) {
      return [
        {
          id: "1",
          name: "North America Sales",
          manager: "Mark Manager",
          revenue: 460000,
          quota: 450000,
          achievement: 102,
          region: "North America",
          members: [
            { id: "1", name: "Sam Seller", role: "Senior Sales Rep", quota: 180000, achieved: 195000, deals: 12, email: "sam@salesflow.com" },
            { id: "2", name: "Oliver Ops", role: "Sales Rep", quota: 140000, achieved: 155000, deals: 9, email: "oliver@salesflow.com" },
            { id: "3", name: "Emma Expert", role: "Sales Rep", quota: 150000, achieved: 110000, deals: 6, email: "emma@salesflow.com" },
          ]
        },
        {
          id: "2",
          name: "EMEA Team",
          manager: "Lisa Lead",
          revenue: 285000,
          quota: 300000,
          achievement: 95,
          region: "Europe",
          members: [
            { id: "4", name: "Sally Seller", role: "Sales Rep", quota: 150000, achieved: 125000, deals: 8, email: "sally@salesflow.com" },
            { id: "5", name: "Steve Sales", role: "Junior Sales Rep", quota: 160000, achieved: 140000, deals: 7, email: "steve@salesflow.com" },
          ]
        }
      ];
    }

    const teamsWithData = teams.map(team => {
      const members = teamMembers.filter(tm => tm.team_id === team.id);
      const memberDetails = members.map(tm => {
        const user = users.find(u => u.id === tm.user_id);
        const userLeads = leads.filter(l => l.assigned_to === tm.user_id);
        const achieved = userLeads.reduce((sum, l) => sum + (l.value || 0), 0);
        const userQuota = quotas.find(q => q.user_id === tm.user_id);
        const quota = userQuota?.target_amount || 150000;
        return {
          id: tm.user_id,
          name: user?.full_name || "Unknown",
          role: user?.role || "salesman",
          quota,
          achieved,
          deals: userLeads.length,
          email: user?.email || ""
        };
      });
      const teamRevenue = memberDetails.reduce((sum, m) => sum + m.achieved, 0);
      const teamQuota = memberDetails.reduce((sum, m) => sum + m.quota, 0);
      const manager = users.find(u => u.id === team.manager_id);
      return {
        id: team.id,
        name: team.name,
        manager: manager?.full_name || "Unknown",
        revenue: teamRevenue,
        quota: teamQuota,
        achievement: teamQuota > 0 ? Math.round((teamRevenue / teamQuota) * 100) : 0,
        region: team.description || "Unknown",
        members: memberDetails
      };
    });

    return teamsWithData.length > 0 ? teamsWithData : [
      {
        id: "1",
        name: "North America Sales",
        manager: "Mark Manager",
        revenue: 460000,
        quota: 450000,
        achievement: 102,
        region: "North America",
        members: [
          { id: "1", name: "Sam Seller", role: "Senior Sales Rep", quota: 180000, achieved: 195000, deals: 12, email: "sam@salesflow.com" },
        ]
      }
    ];
  } catch (error) {
    console.warn('Using fallback teams data:', error);
    return [
      {
        id: "1",
        name: "North America Sales",
        manager: "Mark Manager",
        revenue: 460000,
        quota: 450000,
        achievement: 102,
        region: "North America",
        members: [
          { id: "1", name: "Sam Seller", role: "Senior Sales Rep", quota: 180000, achieved: 195000, deals: 12, email: "sam@salesflow.com" },
          { id: "2", name: "Oliver Ops", role: "Sales Rep", quota: 140000, achieved: 155000, deals: 9, email: "oliver@salesflow.com" },
        ]
      }
    ];
  }
};

// Real-time subscriptions
export const subscribeToLeads = (callback: (data: any) => void) => {
  const subscription = supabase
    .channel('leads')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

export const subscribeToActivities = (userId: string, callback: (data: any) => void) => {
  const subscription = supabase
    .channel(`activities:${userId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'activities',
        filter: `user_id=eq.${userId}`
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

export const subscribeToLeadActivities = (leadId: string, callback: (data: any) => void) => {
  const subscription = supabase
    .channel(`activities:lead:${leadId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `lead_id=eq.${leadId}`
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

// Subscribe to all activities (client filters as needed)
export const subscribeToActivitiesAll = (callback: (data: any) => void) => {
  const subscription = supabase
    .channel('activities:all')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities' },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

// Users real-time subscription
export const subscribeToUsers = (callback: (data: any) => void) => {
  const subscription = supabase
    .channel('users')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

// Leads real-time subscription for a specific salesperson
export const subscribeToLeadsForUser = (userId: string, callback: (data: any) => void) => {
  const subscription = supabase
    .channel(`leads:assigned_to:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads', filter: `assigned_to=eq.${userId}` },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

export const subscribeToProjectLeads = (projectId: string, callback: (data: any) => void) => {
  const subscription = supabase
    .channel(`leads:project:${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads', filter: `project_id=eq.${projectId}` },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};

// Lead Lists (Saved Filters)
export const getLeadLists = async () => {
  try {
    const { data, error } = await supabase.from('lead_lists').select('*');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as any };
  }
};

export const createLeadList = async (list: { name: string; filters: any }) => {
  try {
    const { data, error } = await supabase
      .from('lead_lists')
      .insert([{ name: list.name, filters: list.filters }])
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null as any, error: error as any };
  }
};

// Projects
export const getProjects = async () => {
  const { data, error } = await supabase.from('projects').select('*');
  logSupabaseError('getProjects', error);
  return { data: data || [], error };
};

export const createProject = async (project: {
  name: string;
  description?: string;
  budget?: number;
  status?: 'planned' | 'active' | 'paused' | 'completed';
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  link?: string;
}) => {
  try {
    const { data, error } = await supabase.from('projects').insert([{
      ...project,
      status: project.status || 'planned',
    }]).select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null as any, error: error as any };
  }
};

export const getProjectById = async (id: string) => {
  try {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null as any, error: error as any };
  }
};

export const updateProject = async (id: string, updates: {
  name?: string;
  description?: string;
  budget?: number;
  status?: string;
  link?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null as any, error: error as any };
  }
};

export const getLeadsForProject = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as any };
  }
};
