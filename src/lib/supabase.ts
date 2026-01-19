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

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

export const testConnection = async () => {
  try {
    console.log('[Supabase] Testing connection...');
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

export const signUpWithEmail = async (email: string, password: string, fullName: string, role: 'owner' | 'manager' | 'salesman' = 'salesman') => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as any };
  }
};

// Create salesman account - for managers to create salesman accounts
export const createSalesmanAccount = async (email: string, password: string, fullName: string, managerId?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'salesman'
        }
      }
    });
    
    if (error) throw error;
    
    // Create user profile in database
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'salesman',
          manager_id: managerId || null,
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Still return success as auth user was created
      }
    }
    
    return { data, error: null, password }; // Return password so manager can share it
  } catch (error) {
    return { data: null, error: error as any, password: null };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as any };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as any };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return null;
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('[getSession] Error:', error);
    return null;
  }
};

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export const getUsers = async () => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getUsers', error);
    return { data: [], error: error as any };
  }
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
    logSupabaseError('getUserById', error);
    return { data: null, error: error as any };
  }
};

export const getUsersByRole = async (role: 'owner' | 'manager' | 'salesman') => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getUsersByRole', error);
    return { data: [], error: error as any };
  }
};

export const createUser = async (userData: {
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'salesman';
  phone?: string;
  avatar_url?: string;
  manager_id?: string;
  department?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createUser', error);
    return { data: null, error: error as any };
  }
};

export const updateUser = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('updateUser', error);
    return { data: null, error: error as any };
  }
};

// ============================================================================
// LEADS FUNCTIONS
// ============================================================================

export const getLeads = async (filters?: { status?: string; assignedTo?: string; projectId?: string }) => {
  try {
    let query = supabase.from('leads').select('*, projects(name)');
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);
    
    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getLeads', error);
    return { data: [], error: error as any };
  }
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
    logSupabaseError('getLeadById', error);
    return { data: null, error: error as any };
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
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to create leads');
    
    const leadWithCreator = {
      ...leadData,
      created_by: currentUser.id,
    };
    
    const { data, error } = await supabase
      .from('leads')
      .insert([leadWithCreator])
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createLead', error);
    return { data: null, error: error as any };
  }
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
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to create leads');
    
    const leadsWithCreator = leads.map(lead => ({
      ...lead,
      created_by: currentUser.id,
      status: 'new',
      value: lead.value || 0,
    }));
    
    const { data, error } = await supabase
      .from('leads')
      .insert(leadsWithCreator)
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createBulkLeads', error);
    return { data: null, error: error as any };
  }
};

export const updateLead = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Log activity if status changed
    if (updates.status) {
      const lead = await getLeadById(id);
      if (lead.data) {
        await createLeadActivity({
          lead_id: id,
          type: 'status_change',
          description: `Status changed to ${updates.status}`,
          changed_to: updates.status
        });
      }
    }
    
    return { data, error: null };
  } catch (error) {
    logSupabaseError('updateLead', error);
    return { data: null, error: error as any };
  }
};

export const deleteLead = async (id: string) => {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    logSupabaseError('deleteLead', error);
    return { error: error as any };
  }
};

export const getLeadsForProject = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getLeadsForProject', error);
    return { data: [], error: error as any };
  }
};

export const getLeadsByStatus = async (status: 'new' | 'qualified' | 'proposal' | 'closed_won' | 'not_interested') => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getLeadsByStatus', error);
    return { data: [], error: error as any };
  }
};

// ============================================================================
// TEAMS FUNCTIONS
// ============================================================================

export const getTeams = async () => {
  try {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getTeams', error);
    return { data: [], error: error as any };
  }
};

export const getTeamById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('getTeamById', error);
    return { data: null, error: error as any };
  }
};

export const createTeam = async (teamData: {
  name: string;
  manager_id: string;
  description?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createTeam', error);
    return { data: null, error: error as any };
  }
};

export const updateTeam = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('updateTeam', error);
    return { data: null, error: error as any };
  }
};

// ============================================================================
// ACTIVITIES FUNCTIONS
// ============================================================================

export const getActivities = async (userId?: string) => {
  try {
    let query = supabase.from('activities').select('*');
    if (userId) query = query.eq('user_id', userId);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getActivities', error);
    return { data: [], error: error as any };
  }
};

export const createActivity = async (activityData: {
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'status_change' | 'lead_created' | 'lead_assigned';
  title: string;
  description?: string;
  user_id: string;
  lead_id?: string;
  project_id?: string;
  metadata?: any;
}) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([activityData])
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createActivity', error);
    return { data: null, error: error as any };
  }
};

// ============================================================================
// LEAD ACTIVITIES FUNCTIONS
// ============================================================================

export const getActivitiesForLead = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getActivitiesForLead', error);
    return { data: [], error: error as any };
  }
};

export const createLeadActivity = async (activityData: {
  lead_id: string;
  type: 'status_change' | 'assignment' | 'note' | 'call' | 'email' | 'meeting';
  description?: string;
  changed_from?: string;
  changed_to?: string;
  user_id?: string;
}) => {
  try {
    const currentUser = await getCurrentUser();
    const userId = activityData.user_id || currentUser?.id;
    
    if (!userId) throw new Error('User must be logged in');
    
    const { data, error } = await supabase
      .from('lead_activities')
      .insert([{ ...activityData, user_id: userId }])
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createLeadActivity', error);
    return { data: null, error: error as any };
  }
};

// ============================================================================
// PROJECTS FUNCTIONS
// ============================================================================

export const getProjects = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getProjects', error);
    return { data: [], error: error as any };
  }
};

export const getProjectById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('getProjectById', error);
    return { data: null, error: error as any };
  }
};

export const createProject = async (project: {
  name: string;
  description?: string;
  budget?: number;
  revenue_target?: number;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  owner_id?: string;
  manager_id?: string;
  start_date?: string;
  end_date?: string;
  link?: string;
}) => {
  try {
    const currentUser = await getCurrentUser();
    const ownerId = project.owner_id || currentUser?.id;
    
    if (!ownerId) throw new Error('Owner ID is required');
    
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...project,
        owner_id: ownerId,
        status: project.status || 'active',
      }])
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createProject', error);
    return { data: null, error: error as any };
  }
};

export const updateProject = async (id: string, updates: {
  name?: string;
  description?: string;
  budget?: number;
  revenue_target?: number;
  status?: string;
  link?: string;
  start_date?: string;
  end_date?: string;
  manager_id?: string;
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
    logSupabaseError('updateProject', error);
    return { data: null, error: error as any };
  }
};

export const deleteProject = async (id: string) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    logSupabaseError('deleteProject', error);
    return { error: error as any };
  }
};

// ============================================================================
// LEAD LISTS FUNCTIONS
// ============================================================================

export const getLeadLists = async () => {
  try {
    const { data, error } = await supabase
      .from('lead_lists')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logSupabaseError('getLeadLists', error);
    return { data: [], error: error as any };
  }
};

export const createLeadList = async (list: {
  name: string;
  filters: any;
  description?: string;
}) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in');
    
    const { data, error } = await supabase
      .from('lead_lists')
      .insert([{ ...list, owner_id: currentUser.id }])
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logSupabaseError('createLeadList', error);
    return { data: null, error: error as any };
  }
};

export const deleteLeadList = async (id: string) => {
  try {
    const { error } = await supabase.from('lead_lists').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    logSupabaseError('deleteLeadList', error);
    return { error: error as any };
  }
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const subscribeToLeads = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('public:leads')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

export const subscribeToUsers = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('public:users')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

export const subscribeToProjects = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('public:projects')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

export const subscribeToLeadActivities = (leadId: string, callback: (payload: any) => void) => {
  const subscription = supabase
    .channel(`public:lead_activities:${leadId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lead_activities', filter: `lead_id=eq.${leadId}` },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

export const subscribeToActivities = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('public:activities')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const unsubscribeAll = async () => {
  try {
    await supabase.removeAllChannels();
  } catch (error) {
    console.error('[unsubscribeAll] Error:', error);
  }
};

export const getLeadStats = async () => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('status, value', { count: 'exact' });
    
    if (error) throw error;
    
    const stats = {
      total: data?.length || 0,
      new: data?.filter(l => l.status === 'new').length || 0,
      qualified: data?.filter(l => l.status === 'qualified').length || 0,
      proposal: data?.filter(l => l.status === 'proposal').length || 0,
      closedWon: data?.filter(l => l.status === 'closed_won').length || 0,
      notInterested: data?.filter(l => l.status === 'not_interested').length || 0,
      totalValue: data?.reduce((sum, l) => sum + (l.value || 0), 0) || 0,
    };
    
    return { data: stats, error: null };
  } catch (error) {
    logSupabaseError('getLeadStats', error);
    return { data: null, error: error as any };
  }
};

export const getProjectStats = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('status, value')
      .eq('project_id', projectId);
    
    if (error) throw error;
    
    const stats = {
      total: data?.length || 0,
      qualified: data?.filter(l => l.status === 'qualified').length || 0,
      proposal: data?.filter(l => l.status === 'proposal').length || 0,
      closedWon: data?.filter(l => l.status === 'closed_won').length || 0,
      value: data?.reduce((sum, l) => sum + (l.value || 0), 0) || 0,
      closedWonValue: data?.filter(l => l.status === 'closed_won').reduce((sum, l) => sum + (l.value || 0), 0) || 0,
    };
    
    return { data: stats, error: null };
  } catch (error) {
    logSupabaseError('getProjectStats', error);
    return { data: null, error: error as any };
  }
};
