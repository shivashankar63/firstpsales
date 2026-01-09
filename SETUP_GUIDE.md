# SalesFlow Hub - Complete Setup Guide

## Step 1: Database Setup

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uvqlonqtlqypxqatgbih
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire content from `COMPLETE_DATABASE_SCHEMA.sql`
5. Click **Run** to execute the schema setup
6. Verify that all tables are created successfully

## Step 2: Environment Variables

Make sure your `.env.local` file has:

```env
VITE_SUPABASE_URL=https://uvqlonqtlqypxqatgbih.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_A8iz_SOWHx_G5eKQZGgfMg_csYrQ5Q8
```

## Step 3: Test the Connection

Run the dev server:

```bash
npm run dev
```

The app will auto-test the Supabase connection on load. Check the browser console for connection status.

## Database Schema Overview

### Tables Created:

1. **users** - User profiles with roles (owner, manager, salesman)
2. **projects** - Sales projects/campaigns
3. **leads** - Individual leads in projects
4. **teams** - Team management
5. **activities** - General activities log
6. **lead_activities** - Detailed lead activity tracking
7. **lead_lists** - Saved lead filter groups

### Key Features:

- **Row Level Security (RLS)** - Data is protected by user role
- **Real-time Subscriptions** - Live updates for leads, users, activities
- **Automatic Timestamps** - All records track created_at and updated_at
- **Professional Status Enum** - Statuses: new, qualified, proposal, closed_won, not_interested
- **Trigger Functions** - Auto user creation, timestamp updates

## Supabase Functions Available

All functions in `src/lib/supabase.ts` are fully typed and include error handling:

### Authentication
- `signUpWithEmail()` - Create new account
- `signInWithEmail()` - Login
- `signOut()` - Logout
- `getCurrentUser()` - Get logged in user
- `getSession()` - Get current session

### Users
- `getUsers()` - Get all users
- `getUserById()` - Get specific user
- `getUsersByRole()` - Filter by role
- `createUser()` - Create new user
- `updateUser()` - Update user profile

### Leads
- `getLeads()` - Get all leads with optional filters
- `getLeadById()` - Get specific lead
- `createLead()` - Create new lead
- `createBulkLeads()` - Create multiple leads
- `updateLead()` - Update lead (auto-logs activity on status change)
- `deleteLead()` - Delete lead
- `getLeadsForProject()` - Get leads in a project
- `getLeadsByStatus()` - Filter by status

### Projects
- `getProjects()` - Get all projects
- `getProjectById()` - Get specific project
- `createProject()` - Create new project
- `updateProject()` - Update project
- `deleteProject()` - Delete project

### Activities
- `getActivities()` - Get activities
- `createActivity()` - Log activity
- `getActivitiesForLead()` - Get lead-specific activities
- `createLeadActivity()` - Log lead activity

### Teams
- `getTeams()` - Get all teams
- `getTeamById()` - Get specific team
- `createTeam()` - Create team
- `updateTeam()` - Update team

### Lead Lists
- `getLeadLists()` - Get saved lead lists
- `createLeadList()` - Save lead filter
- `deleteLeadList()` - Delete saved list

### Real-time Subscriptions
- `subscribeToLeads()` - Live lead updates
- `subscribeToUsers()` - Live user updates
- `subscribeToProjects()` - Live project updates
- `subscribeToLeadActivities()` - Live activity updates
- `subscribeToActivities()` - Live general activities
- `unsubscribeAll()` - Clean up subscriptions

### Statistics
- `getLeadStats()` - Overall lead statistics
- `getProjectStats()` - Stats for specific project

## Lead Status Flow

Professional CRM terminology is used throughout:

1. **New** - Initial lead creation
2. **Qualified** - Lead meets criteria
3. **In Proposal** - Proposal sent (previously "negotiation")
4. **Closed Won** - Deal closed successfully (previously "won")
5. **Not Interested** - Lead rejected (previously "lost")

## Error Handling

All functions include:
- Try-catch blocks
- Supabase error logging
- Consistent error return format: `{ data, error }`
- Detailed console logging for debugging

## Example Usage

```typescript
import { getLeads, createLead, subscribeToLeads } from '@/lib/supabase';

// Fetch all leads
const { data: leads, error } = await getLeads();

// Create a new lead
const { data: newLead, error } = await createLead({
  company_name: "Acme Corp",
  contact_name: "John Doe",
  email: "john@acme.com",
  phone: "555-1234",
  status: "new",
  value: 50000,
  project_id: "project-uuid",
  assigned_to: "user-uuid"
});

// Subscribe to lead changes
const subscription = subscribeToLeads((payload) => {
  console.log('Lead changed:', payload);
});

// Cleanup
subscription.unsubscribe();
```

## Troubleshooting

### Connection Issues
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Verify Supabase project is active
- Check browser console for specific error messages

### Permission Denied Errors
- Ensure RLS policies are correctly configured
- Verify user role (owner, manager, salesman)
- Check that user is authenticated

### Missing Data
- Verify tables exist in Supabase dashboard
- Check that data was inserted correctly
- Ensure you're filtering by correct column names

### Subscription Not Working
- Check that real-time is enabled in Supabase
- Verify table names match exactly
- Ensure filters are correct (if using)

## Migration from Old Status Names

If you have existing data with old status names:
- Run the `UPDATE_LEAD_STATUS_ENUM.sql` migration
- Old values (negotiation, won, lost) → (proposal, closed_won, not_interested)
- Auto-migration handles all conversions

## Next Steps

1. ✅ Run the database schema SQL
2. ✅ Verify all tables are created
3. ✅ Test connection via the app
4. ✅ Create test users with different roles
5. ✅ Create test projects
6. ✅ Create test leads
7. ✅ Test real-time subscriptions
8. ✅ Test user permissions (RLS)

The app is now ready for full production use!
