# Database Setup Guide

This guide will help you set up the Supabase database for the AI Chatbot application.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Project Created**: Create a new Supabase project

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `ai-chatbot` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready, you'll need these values:

### From Project Settings → API
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (public key)
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (secret key)

### From Project Settings → Database
- **Database URL**: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`

## Step 3: Run Database Schema

1. **Open SQL Editor** in your Supabase dashboard
2. **Copy and paste** the contents of `database/schema.sql`
3. **Click "Run"** to execute the schema
4. **Verify tables** were created in the Table Editor

## Step 4: Set Up Storage

1. **Go to Storage** in your Supabase dashboard
2. **Open SQL Editor** again
3. **Copy and paste** the contents of `database/storage-setup.sql`
4. **Click "Run"** to set up storage policies
5. **Verify** the `attachments` bucket was created in Storage

## Step 5: Configure Environment Variables

### Backend (.env)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Other required variables
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_random_session_secret_here
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### Frontend (.env)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API Configuration
VITE_API_URL=http://localhost:3000
```

## Step 6: Test Database Connection

1. **Start your backend server**:
   ```bash
   cd server
   npm start
   ```

2. **Check health endpoint**:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Should return**:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

## Database Schema Overview

### Core Tables

1. **users** - User accounts and profiles
2. **user_preferences** - User settings and tool preferences
3. **sessions** - Session management for authentication
4. **auth_tokens** - Google OAuth tokens storage
5. **chats** - Chat conversations
6. **messages** - Individual messages in chats
7. **attachments** - File attachments metadata

### Storage

- **attachments bucket** - Stores uploaded files (PDFs, images, documents)

### Security

- **Row Level Security (RLS)** enabled on all tables
- **Service role access** for backend operations
- **Secure file storage** with proper access policies

## Production Deployment

### For Render Deployment

Update your environment variables in Render dashboard:

**Backend Service:**
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Frontend Service:**
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Security Best Practices

1. **Never expose service role key** in frontend
2. **Use anon key only** in frontend applications
3. **Keep database password secure**
4. **Enable 2FA** on your Supabase account
5. **Monitor usage** in Supabase dashboard

## Troubleshooting

### Common Issues

**Connection Error:**
- Verify Supabase URL and keys are correct
- Check if project is active and not paused
- Ensure environment variables are set

**Permission Denied:**
- Verify RLS policies are set correctly
- Check if using correct key (service role for backend)
- Ensure tables were created successfully

**Storage Issues:**
- Verify storage bucket exists
- Check storage policies are applied
- Ensure file upload limits are appropriate

### Useful SQL Queries

**Check if tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

**View RLS policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Check storage buckets:**
```sql
SELECT * FROM storage.buckets;
```

## Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Community**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Status**: [status.supabase.com](https://status.supabase.com)

Your database is now ready for the AI Chatbot application! 🚀