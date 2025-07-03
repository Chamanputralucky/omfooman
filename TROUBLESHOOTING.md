# Backend Error Troubleshooting

## Current Issue: Internal Server Error on Google OAuth

The error you're seeing suggests there are still configuration issues. Here's how to debug and fix:

### 1. Check Environment Variables

Make sure these are set in your Render backend service:

**Required Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://ai-chatbot-backend-fuzp.onrender.com/auth/google/callback
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SESSION_SECRET=your_random_session_secret_here
FRONTEND_URL=https://ai-chatbot-frontend-9dq0.onrender.com
PYTHON_PATH=/opt/render/project/src/.venv/bin/python
```

### 2. Check Render Logs

1. Go to your backend service in Render dashboard
2. Click on "Logs" tab
3. Look for specific error messages
4. Common issues:
   - Missing environment variables
   - Database connection errors
   - Google OAuth configuration errors

### 3. Verify Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Check that these APIs are enabled:
   - Google Drive API
   - Gmail API
   - Google Calendar API
   - Google+ API (for OAuth)
3. Verify OAuth 2.0 Client ID settings:
   - **Authorized JavaScript origins**: `https://ai-chatbot-frontend-9dq0.onrender.com`
   - **Authorized redirect URIs**: `https://ai-chatbot-backend-fuzp.onrender.com/auth/google/callback`

### 4. Test Backend Health

Try accessing: `https://ai-chatbot-backend-fuzp.onrender.com/api/health`

This should return server status information.

### 5. Common Fixes

**If you see "Missing environment variables":**
- Double-check all environment variables are set in Render
- Make sure there are no extra spaces or quotes

**If you see "Database connection error":**
- Verify Supabase URL and service role key
- Check that Supabase project is active

**If you see "Google OAuth error":**
- Verify Google Client ID and Secret
- Check redirect URI matches exactly
- Ensure Google APIs are enabled

### 6. Force Redeploy

After fixing environment variables:
1. Go to your backend service in Render
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Check logs for any new errors

### 7. Test the Fix

1. Visit: `https://ai-chatbot-frontend-9dq0.onrender.com`
2. Click "Sign in with Google"
3. Should redirect to Google OAuth (not show internal server error)

If you're still getting errors, please share the specific error messages from the Render logs.