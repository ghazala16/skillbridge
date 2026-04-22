# DEPLOYMENT GUIDE
# Follow this top-to-bottom. Takes ~30 minutes.

================================================================
STEP 1 — PUSH CODE TO GITHUB
================================================================

1. Create a new GitHub repo (can be private)
2. Inside the skillbridge/ folder:

   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/skillbridge.git
   git push -u origin main

================================================================
STEP 2 — SET UP CLERK
================================================================

1. Go to https://clerk.com → Sign up (free)
2. Create application → Name: "SkillBridge" → Enable Email/Password
3. Go to API Keys → copy:
   - Publishable key  (starts with pk_test_...)
   - Secret key       (starts with sk_test_...)

4. Go to Sessions → Customize session token → Edit:
   Click "Add claim" → key: role → value: {{user.public_metadata.role}}
   Save.

Keep this tab open — you'll need the keys in Steps 3 and 4.

================================================================
STEP 3 — SET UP NEON DATABASE
================================================================

1. Go to https://neon.tech → Sign up (free)
2. Create project → Name: "skillbridge" → Region: pick closest
3. Go to Dashboard → Connection Details → copy the connection string
   It looks like:
   postgresql://neondb_owner:xxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

4. Run migrations from your local machine:
   cd backend
   cp .env.example .env
   # Edit .env — paste DATABASE_URL and Clerk keys
   npm install
   npm run migrate
   # You should see: ✅ Migrations complete.

================================================================
STEP 4 — DEPLOY BACKEND TO RAILWAY
================================================================

1. Go to https://railway.app → Sign up with GitHub (free)
2. New Project → Deploy from GitHub repo
3. Select your repo → Select the "backend" folder as root
   (Railway auto-detects it via package.json)
4. Go to Variables tab → Add these env vars:

   DATABASE_URL       = (your Neon connection string)
   CLERK_SECRET_KEY   = sk_test_...
   CLERK_PUBLISHABLE_KEY = pk_test_...
   NODE_ENV           = production
   FRONTEND_URL       = https://skillbridge-attendance.vercel.app
                        ↑ set this AFTER you deploy frontend in Step 5
                          For now use * or your Vercel URL once known

5. Go to Settings → Networking → Generate Domain
   Copy the URL — it looks like: https://skillbridge-api.up.railway.app

6. Test it: open https://skillbridge-api.up.railway.app/health
   You should see: {"status":"ok","service":"SkillBridge API",...}

================================================================
STEP 5 — DEPLOY FRONTEND TO VERCEL
================================================================

1. Go to https://vercel.com → Sign up with GitHub (free)
2. New Project → Import your GitHub repo
3. Set Root Directory to: frontend
4. Framework Preset: Next.js (auto-detected)
5. Add Environment Variables:

   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  = pk_test_...
   CLERK_SECRET_KEY                   = sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL      = /sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL      = /sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /onboarding
   NEXT_PUBLIC_API_URL                = https://skillbridge-api.up.railway.app
                                        ↑ your Railway URL from Step 4

6. Click Deploy
7. Copy your Vercel URL (e.g. https://skillbridge-attendance.vercel.app)
8. Go back to Railway → Variables → update FRONTEND_URL to this URL
9. Go to Clerk dashboard → Domains → add your Vercel domain

================================================================
STEP 6 — CREATE TEST ACCOUNTS
================================================================

1. Open your Vercel frontend URL
2. Click "Get started" → sign up with:
   Email: student@skillbridge.test   Password: SkillBridge@123
   On /onboarding → select "Student"

3. Repeat for each role:
   trainer@skillbridge.test          → Trainer
   institution@skillbridge.test      → Institution Admin
   pm@skillbridge.test               → Programme Manager
   monitor@skillbridge.test          → Monitoring Officer

4. Once all 5 are created, run the seed from your local machine:
   cd backend
   npm run seed
   # Should print: 🎉 Seed complete!

================================================================
STEP 7 — VERIFY EVERYTHING WORKS
================================================================

Test checklist:
[ ] /health endpoint returns 200
[ ] student@skillbridge.test can log in → sees Student dashboard
[ ] trainer@skillbridge.test can log in → sees Trainer dashboard with batch/session tabs
[ ] Trainer can create a batch → invite code generated
[ ] Student can visit /join/[code] → joins batch
[ ] Student can mark attendance on a session
[ ] Trainer can view attendance → sees student's mark
[ ] institution@skillbridge.test → sees batches + attendance summaries
[ ] pm@skillbridge.test → sees cross-institution programme view
[ ] monitor@skillbridge.test → sees read-only dashboard, NO create buttons

================================================================
STEP 8 — UPDATE README WITH LIVE URLS
================================================================

Edit README.md → replace placeholder URLs with:
- Your Vercel URL
- Your Railway URL

Commit and push:
   git add README.md
   git commit -m "Add live URLs to README"
   git push

================================================================
DONE. Submit your Google Drive folder link.
================================================================

Folder structure to submit:
/submission
  CONTACT.txt          ← fill in your details
  README.md
  /backend             ← all backend files
  /frontend            ← all frontend files
