# Database Setup Instructions

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `ai-chatbot`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be ready (2-3 minutes)

## Step 2: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. **Open SQL Editor** in your Supabase dashboard
2. **Create the main schema**:
   - Copy the entire contents of `supabase/migrations/create_ai_chatbot_schema.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Set up storage**:
   - Copy the entire contents of `supabase/migrations/setup_storage.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## Step 3: Get Your Credentials

From your Supabase project dashboard:

### Project Settings → API
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 4: Update Environment Variables

### Backend (.env)
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 5: Verify Setup

1. **Check Tables**: Go to Table Editor in Supabase dashboard
   - You should see: users, chats, messages, attachments, etc.

2. **Check Storage**: Go to Storage in Supabase dashboard
   - You should see an "attachments" bucket

3. **Test Connection**: Start your backend and check:
   ```bash
   curl http://localhost:3000/api/health
   ```

## What's Included

### Database Tables
- ✅ **users** - User accounts (Google OAuth + email/password)
- ✅ **user_preferences** - User settings and tool preferences
- ✅ **sessions** - Session management
- ✅ **auth_tokens** - Google OAuth tokens
- ✅ **chats** - Chat conversations
- ✅ **messages** - Individual messages
- ✅ **attachments** - File upload metadata

### Storage
- ✅ **attachments bucket** - File storage with 10MB limit
- ✅ **Security policies** - Proper access control

### Security Features
- ✅ **Row Level Security (RLS)** enabled
- ✅ **Service role access** for backend
- ✅ **Password hashing** support
- ✅ **File upload restrictions**

Your database is now ready! 🚀