# 🚀 Tasknova Admin Panel - Setup Checklist

Use this checklist to get your admin panel up and running:

## ☑️ Pre-Installation

- [ ] Node.js 18+ installed
- [ ] Access to Supabase project dashboard
- [ ] Supabase project URL and keys ready

---

## ☑️ Installation Steps

### 1. Dependencies
- [ ] Run `npm install` in project root
- [ ] Wait for all packages to install (may take 2-3 minutes)

### 2. Environment Configuration
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` from Supabase dashboard
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase dashboard
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard (Settings → API)
- [ ] Generate and add `JWT_SECRET` (32+ random characters)

### 3. Database Setup
- [ ] Choose a secure admin password
- [ ] Run: `node scripts/generate-password-hash.js YOUR_PASSWORD`
- [ ] Copy the generated hash
- [ ] Open Supabase dashboard → SQL Editor
- [ ] Open `supabase/migrations/001_create_admins_table.sql`
- [ ] Replace the password hash in the INSERT statement
- [ ] Run the entire SQL migration
- [ ] Verify the `admins` table was created

### 4. Launch Application
- [ ] Run `npm run dev` in project root
- [ ] Wait for Next.js to compile
- [ ] Open browser to `http://localhost:3000`
- [ ] Should redirect to `/admin/login`

### 5. First Login
- [ ] Email: `admin@tasknova.com`
- [ ] Password: (the password you used to generate hash)
- [ ] Click "Sign In"
- [ ] Should redirect to `/admin/dashboard`

---

## ☑️ Verification

Once logged in, verify all pages work:

- [ ] **Dashboard** - Shows 8 metric cards with data
- [ ] **Demo Requests** - Lists demo bookings
- [ ] **Voice Conversations** - Shows voice call data
- [ ] **Chat Conversations** - Displays chat sessions
- [ ] **Job Openings** - Lists job postings
- [ ] **Job Applicants** - Shows applicants with AI scores
- [ ] **Blogs** - Displays blog posts
- [ ] **Playbooks** - Lists downloadable playbooks
- [ ] **Industry Reports** - Shows research reports
- [ ] **Admins** - Admin user management

---

## ☑️ Feature Testing

Test core functionality:

### Authentication
- [ ] Logout works (click Logout in sidebar)
- [ ] Login works after logout
- [ ] Cannot access admin pages when logged out
- [ ] Session persists on page refresh

### Data Tables
- [ ] Search works on any table
- [ ] Pagination works (if >10 records)
- [ ] "View" button opens detail modal
- [ ] "Delete" button shows confirmation
- [ ] Delete confirmation works

### Status Toggles
- [ ] Job openings active/inactive toggle works
- [ ] Blog publish/unpublish toggle works
- [ ] Industry report publish/unpublish toggle works
- [ ] Admin activate/deactivate toggle works

### Admin Management (Super Admin only)
- [ ] "Add Admin" button visible
- [ ] Can create new admin user
- [ ] Can activate/deactivate admins
- [ ] Cannot delete/deactivate self
- [ ] Can delete other admins

---

## ☑️ Optional Configuration

- [ ] Update default admin email in migration (if desired)
- [ ] Add additional super admin users
- [ ] Configure Supabase RLS policies (if needed)
- [ ] Set up production environment variables
- [ ] Configure CORS in Supabase (for production)

---

## ☑️ Deployment (When Ready)

- [ ] Push code to GitHub/GitLab
- [ ] Deploy to Vercel/Netlify/other host
- [ ] Set environment variables in deployment platform
- [ ] Test production deployment
- [ ] Update Supabase allowed URLs if needed

---

## 🐛 Troubleshooting

If something doesn't work:

### Cannot login
- ✅ Check password hash matches in database
- ✅ Verify `JWT_SECRET` is set in `.env.local`
- ✅ Check browser console for errors
- ✅ Ensure admin user `is_active = true` in database

### "Failed to fetch" errors
- ✅ Verify Supabase URL and keys in `.env.local`
- ✅ Check service role key has admin permissions
- ✅ Ensure database tables exist
- ✅ Check browser network tab for 401/403 errors

### Pages not loading
- ✅ Clear browser cache and cookies
- ✅ Restart Next.js dev server
- ✅ Check terminal for compilation errors
- ✅ Verify all dependencies installed

### TypeScript errors
- ✅ Run `npm install` again
- ✅ Delete `node_modules` and `.next` folders
- ✅ Run `npm install` fresh
- ✅ Restart VS Code

---

## ✅ Success Criteria

You're ready to go when:

- ✅ Can log in successfully
- ✅ Dashboard shows real data from your database
- ✅ All pages load without errors
- ✅ Can view, search, and delete records
- ✅ Toast notifications appear on actions
- ✅ Logout works correctly

---

## 📚 Resources

- **Setup Guide:** See `SETUP.md` for detailed instructions
- **Project Summary:** See `PROJECT_SUMMARY.md` for overview
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## 🎉 You're Done!

Once all items are checked, your Tasknova Admin Panel is ready to use!

**Default credentials:**
- Email: `admin@tasknova.com`
- Password: (your chosen password)

Access at: **http://localhost:3000/admin/login**

---

*Need help? Check SETUP.md troubleshooting section*
