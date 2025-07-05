# GitHub Update Instructions

## Files to Add/Update on GitHub

The following files have been created or modified and need to be updated in your GitHub repository:

### New Files Created:
- `supabase/migrations/20250705170239_shiny_beacon.sql` - Database schema
- `supabase/migrations/20250705170259_red_dew.sql` - Storage setup
- `DATABASE_SETUP.md` - Database setup guide
- `server/.env.example` - Backend environment template
- `frontend/.env.example` - Frontend environment template

### Modified Files:
- `frontend/src/components/auth/LoginPage.tsx` - Updated with signup functionality
- `frontend/src/components/chat/Sidebar.tsx` - Added project management
- `frontend/src/components/chat/ChatInterface.tsx` - Mobile responsive improvements
- `frontend/src/components/chat/ChatLayout.tsx` - Mobile sidebar support
- `frontend/src/components/chat/ModelSelector.tsx` - Updated model options
- `frontend/src/components/chat/ToolsPanel.tsx` - Mobile responsive
- `frontend/src/services/api.ts` - Added login/register endpoints
- `frontend/src/store/chatStore.ts` - Updated default model

## Git Commands to Update Repository

```bash
# 1. Add all new and modified files
git add .

# 2. Commit the changes
git commit -m "feat: Add user registration, project management, and mobile responsiveness

- Add email/password registration with validation
- Remove GitHub login option
- Add frontend-only project management system
- Implement mobile-responsive design with collapsible sidebar
- Update model selector with new GPT-4.1 variants
- Add comprehensive database schema for Supabase
- Improve message rendering with proper link handling
- Add mobile-friendly chat interface"

# 3. Push to GitHub
git push origin main
```

## Environment Setup After GitHub Update

After updating GitHub, anyone cloning the repository will need to:

1. **Copy environment files:**
   ```bash
   cp server/.env.example server/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Fill in actual values** in both `.env` files

3. **Set up Supabase database** following `DATABASE_SETUP.md`

4. **Install dependencies:**
   ```bash
   npm run install:all
   ```

5. **Run the application:**
   ```bash
   npm run dev
   ```