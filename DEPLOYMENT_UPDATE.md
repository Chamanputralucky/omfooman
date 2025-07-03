# Update Environment Variables with Actual URLs

## Backend Environment Variables to Update

Go to your **ai-chatbot-backend** service on Render and update these environment variables:

```bash
GOOGLE_REDIRECT_URI=https://ai-chatbot-backend-fuzp.onrender.com/auth/google/callback
FRONTEND_URL=https://ai-chatbot-frontend-9dq0.onrender.com
```

## Frontend Environment Variables to Update

Go to your **ai-chatbot-frontend** service on Render and update this environment variable:

```bash
VITE_API_URL=https://ai-chatbot-backend-fuzp.onrender.com
```

## Google OAuth Settings to Update

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Update **Authorized JavaScript origins:**
   ```
   https://ai-chatbot-frontend-9dq0.onrender.com
   ```
5. Update **Authorized redirect URIs:**
   ```
   https://ai-chatbot-backend-fuzp.onrender.com/auth/google/callback
   ```
6. **Save changes**

## Steps to Apply Changes

1. **Update Backend Environment Variables** in Render dashboard
2. **Update Frontend Environment Variables** in Render dashboard
3. **Update Google OAuth settings** in Google Cloud Console
4. **Redeploy both services** (they should auto-deploy when you save environment variables)

## Test Your Deployment

After all updates:
1. Visit: https://ai-chatbot-frontend-9dq0.onrender.com
2. Try logging in with Google
3. Test chat functionality
4. Verify file uploads work

Your URLs:
- **Frontend**: https://ai-chatbot-frontend-9dq0.onrender.com
- **Backend**: https://ai-chatbot-backend-fuzp.onrender.com