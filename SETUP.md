# Tasknova Admin Panel - Setup Guide

## 🚀 Quick Start

Follow these steps to get your admin panel up and running:

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qdeqpgixanmuzonsoeou.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_random_32_character_secret_here
```

**To get your Supabase keys:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the `URL`, `anon/public key`, and `service_role key`

**To generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the Admins Table

Run the migration to create the `admins` table in your Supabase database:

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_create_admins_table.sql`
4. **IMPORTANT:** Before running, you need to generate a password hash

#### Generate Admin Password Hash

Run this Node.js script to generate a bcrypt hash for your desired password:

```bash
node scripts/generate-password-hash.js YourPasswordHere
```

Or use this quick command:
```bash
node -e "const bcrypt = require('bcryptjs'); const password = process.argv[1] || 'Admin@123'; bcrypt.hash(password, 10).then(hash => console.log('Password hash:', hash));" YOUR_PASSWORD
```

4. Replace the hash in the migration file:
```sql
INSERT INTO public.admins (full_name, email, password_hash, role)
VALUES (
    'Super Admin',
    'admin@tasknova.com',
    '$2a$10$YOUR_GENERATED_HASH_HERE',  -- ← Replace this
    'super_admin'
);
```

5. Run the SQL in the SQL Editor

### 4. Start Development Server

```bash
npm run dev
```

Your admin panel will be available at: **http://localhost:3000**

### 5. First Login

Navigate to **http://localhost:3000/admin/login** and sign in with:

- **Email:** `admin@tasknova.com`
- **Password:** (the password you used to generate the hash)

---

## 📂 Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── (dashboard)/          # Admin panel pages
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── demo-requests/    # Demo requests management
│   │   │   ├── job-openings/     # Job openings management
│   │   │   ├── job-applicants/   # Applicants management
│   │   │   ├── blogs/            # Blog management
│   │   │   ├── playbooks/        # Playbooks management
│   │   │   ├── industry-reports/ # Reports management
│   │   │   ├── voice-conversations/ # Voice calls
│   │   │   ├── chat-conversations/  # Chat sessions
│   │   │   ├── admins/           # Admin user management
│   │   │   └── layout.tsx        # Admin layout with sidebar
│   │   └── login/                # Login page
│   ├── api/
│   │   ├── auth/                 # Authentication endpoints
│   │   └── admin/                # Admin API routes
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── components/                    # Reusable UI components
│   ├── DataTable.tsx             # Table component with search/pagination
│   ├── Modal.tsx                 # Modal dialog
│   └── DeleteConfirm.tsx         # Delete confirmation dialog
├── lib/
│   ├── supabase.ts               # Supabase client config
│   ├── auth.ts                   # Authentication utilities
│   └── utils.ts                  # Helper functions
├── types/
│   └── index.ts                  # TypeScript type definitions
└── middleware.ts                  # Route protection middleware
```

---

## 🔐 Authentication

The admin panel uses **JWT-based authentication** with secure HttpOnly cookies:

- Passwords are hashed using **bcryptjs**
- JWT tokens are signed with HS256
- Sessions expire after 7 days
- Middleware protects all `/admin/*` routes
- Only authenticated admins can access admin pages

### Role-Based Access Control

- **Super Admin**: Full access (can create/delete admins)
- **Admin**: Read/write access to data (cannot manage admins)

---

## 🎨 Features

### Dashboard
- Real-time metrics for all data tables
- Recent activity feeds
- Quick links to all sections

### Data Management
All data pages include:
- ✅ View full details
- ✅ Search and filters
- ✅ Pagination
- ✅ Delete functionality
- ✅ Status toggles (where applicable)

### Security
- Protected routes via middleware
- Session validation
- Role-based permissions
- CSRF protection

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Authentication:** JWT + HttpOnly Cookies
- **Password Hashing:** bcryptjs
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

---

## 📝 Common Tasks

### Adding a New Admin
1. Log in as a super admin
2. Navigate to **Admins** page
3. Click **Add Admin**
4. Fill in details and submit

### Resetting Password
Currently passwords can only be reset by:
1. Generating a new hash using the password script
2. Updating the database directly in Supabase SQL Editor:
```sql
UPDATE admins 
SET password_hash = '$2a$10$YOUR_NEW_HASH' 
WHERE email = 'admin@example.com';
```

### Deploying to Production

1. Deploy to Vercel/Netlify/other platform
2. Set environment variables in deployment settings
3. Ensure Supabase project is in production mode
4. Update CORS settings in Supabase if needed

---

## 🐛 Troubleshooting

### "Invalid credentials" on login
- Verify the password hash in the database matches
- Check that `JWT_SECRET` is set in `.env.local`
- Ensure the admin account is active (`is_active = true`)

### "Failed to fetch" errors
- Verify Supabase credentials in `.env.local`
- Check service role key has proper permissions
- Ensure database tables exist

### Middleware redirect loop
- Clear cookies and try again
- Check middleware.ts for correct path matching
- Verify session creation in auth.ts

---

## 📧 Support

For issues or questions, contact your development team.

---

## 📄 License

Proprietary - Tasknova © 2026
