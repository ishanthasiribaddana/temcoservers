# TemcoServers - Development Status Tracker

## Project Overview
AI-integrated server hosting platform for Java Institute (JIAT) computer school — 7000 students.
Resells Contabo VPS instances with AI code generation add-ons.

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS + shadcn/ui
- **Backend**: Java EE (EJB) on WildFly 30
- **AI Module**: Python (FastAPI internal module) — OpenAI, DeepSeek, LangChain
- **Database**: MariaDB 11
- **Build**: Maven
- **Containerization**: Docker + Docker Compose

## Brand Colors (Temco Theme)
| Color         | Hex     | TailwindCSS  | Usage                                |
|---------------|---------|--------------|--------------------------------------|
| Yellow        | #FFDE03 | `temco-*`    | CTAs, buttons, logo, section dividers|
| Blue          | #0336FF | `primary-*`  | Links, active states, secondary btns |
| Pink/Magenta  | #FF0266 | `accent-*`   | Checkmarks, highlights, partner cards|

## Partners
- **JRIRC** — Java Robotics and Intelligence Systems Research Center
- **TEMCO Bank** — Technology Entrepreneurship and Management Cooperative Development Banking Society Ltd

## Docker Port Mapping
| Service        | Internal Port | External Port | Status    |
|----------------|---------------|---------------|-----------|
| React Frontend | 5173          | 3010          | Running   |
| WildFly Backend| 8080          | 8180          | Running   |
| Python AI      | 8000          | 8580          | Running   |
| MariaDB        | 3306          | 3306          | Running   |

## Ports to AVOID (already in use on host)
135, 139, 445, 3000, 3001, 3002, 3006, 3306, 3308, 3500, 5040, 5357, 6379,
7680, 8080, 8081, 8085, 8088, 8091, 8092, 8443, 8788, 9990, 9993, 9995, 11434

## Contabo API
- CLI configured at: F:\TemcoServers\cntb\cntb.exe
- Client ID: INT-142497
- API User: ishantha@gmail.com
- 8 existing instances running

## Business Model / Pricing Tiers (Real Contabo Specs)
| Tier          | Price  | Contabo Product | Specs                          | AI Requests    | Contabo Cost | Margin  |
|---------------|--------|-----------------|--------------------------------|----------------|--------------|---------|
| Starter       | $4/mo  | V2              | 4 vCPUs, 8 GB RAM, 75 GB NVMe | None           | ~$3.96       | $0.04   |
| AI Basic      | $8/mo  | V2              | 4 vCPUs, 8 GB RAM, 75 GB NVMe | 500/mo         | ~$3.96       | $4.04   |
| AI Pro        | $15/mo | V7              | 6 vCPUs, 16 GB RAM, 200 GB NVMe| 2000/mo       | ~$8.49       | $6.51   |
| AI Unlimited  | $25/mo | V7              | 6 vCPUs, 16 GB RAM, 200 GB NVMe| Unlimited     | ~$8.49       | $16.51  |

---

## Existing Database Reuse Strategy
- **Database**: ijts_recovery_db (on temco-admin-mariadb container, port 3306)
- **DB Root Password**: (see .env.production)
- **Reused tables**: general_user_profile, user_login, user_role, student, branch, voucher, voucher_type, voucher_item, communication_history, communication_type, communication_purpose
- **New tables**: Prefixed with `ts_` — MUST consult user before adding any new table
- **Created tables**: ts_subscription_plan (seeded with 4 plans), ts_server_instance, ts_subscription, ts_ai_usage, ts_ai_conversation, ts_ai_message, ts_server_action_log, ts_voucher_item_slip (Flyway V1)
- **Flyway migrations**: V1 (ts_voucher_item_slip), V2 (seed chart of accounts + payment modes), V3 (register TemcoServers pages/module/menu)
- **Flyway schema history**: `flyway_schema_history` table, baselined at version 0
- **Added role**: "Server Customer" (ur_id: 57) in user_role
- **Added comm purposes**: Server Provisioned, Subscription Renewal, AI Usage Alert

## Development Progress

### Session 1 — 2026-03-15
- [x] Contabo CLI (cntb) installed and configured at F:\TemcoServers\cntb\
- [x] API authentication verified — 8 instances listed
- [x] Architecture decided: Monolithic with internal Python AI module
- [x] Docker containerization decided — all services in Docker
- [x] docker-compose.yml — connects to existing temco-admin-mariadb (no new DB container)
- [x] .env + .env.example configured
- [x] **Backend (Java EE / WildFly 30)**:
  - pom.xml (Jakarta EE 10, JWT, Jackson, HttpClient5)
  - Dockerfile, standalone.xml with MariaDB datasource
  - MariaDB JDBC driver module
  - persistence.xml (JPA with TemcoServersDS)
  - beans.xml (CDI)
  - JPA Entities: GeneralUserProfile, UserLogin, UserRole, Voucher, VoucherItem, VoucherType, CommunicationType, CommunicationPurpose, CommunicationHistory
  - Services: AuthService (JPA-based auth with JWT), ContaboService (Contabo API integration)
  - REST: HealthResource, AuthResource, ServerInstanceResource
  - CorsFilter
- [x] **Python AI Module (FastAPI)**:
  - Dockerfile, requirements.txt (FastAPI, SQLAlchemy, pymysql, OpenAI, LangChain, httpx)
  - main.py — /health, /api/ai/generate endpoints (DeepSeek + OpenAI)
  - db.py — SQLAlchemy ORM models (AiUsage, AiConversation, AiMessage)
- [x] **React Frontend (Vite + TailwindCSS)**:
  - Dockerfile, package.json, vite.config.js, tailwind.config.js
  - API config with axios interceptors
  - Pages: LandingPage (marketing + pricing), LoginPage, DashboardPage (sidebar + stats + quick actions)
- [x] Database: All 7 ts_ tables created (user approved)
- [x] "Server Customer" role added (ur_id: 57)
- [x] 4 subscription plans seeded with real Contabo specs
- [x] 3 new communication purposes added
- [x] Temco brand colors applied (#FFDE03, #0336FF, #FF0266)
- [x] Partners section added (JRIRC + TEMCO Bank)
- [x] Frontend running on port 3010

### Session 2 — 2026-03-16
- [x] **WildFly Backend Docker Container — Built & Running (port 8180)**:
  - Multi-stage Dockerfile: Maven build stage → WildFly 30 runtime stage
  - Switched from custom standalone.xml to jboss-cli embedded datasource config (`configure-ds.cli`)
  - Removed broken connector subsystem, kept WildFly default config
  - MariaDB JDBC driver module installed (`mariadb-java-client-3.3.3.jar`)
  - Removed unused `httpclient5` dependency from pom.xml
  - Added `jbcrypt-0.4` dependency for BCrypt password hashing
  - Fixed AuthService: BCrypt.checkpw() for password verification (DB uses `$2a$` hashes)
  - Fixed AuthResource: Catches `EJBException` wrapping `SecurityException` → returns 401 not 500
  - Container runs on `temco-network`, connects to `temco-admin-mariadb`
  - Health check: `GET /temcoservers/api/health` → `{"status":"UP"}`
- [x] **Python AI Module Docker Container — Built & Running (port 8580)**:
  - FastAPI with DeepSeek + OpenAI code generation
  - Health check: `GET /health` → `{"status":"UP"}`
  - AI generation: `POST /api/ai/generate` (needs API keys to function)
- [x] **Login → Dashboard Flow — Working End-to-End**:
  - Test user created: `teststudent` / `password123` (role: Server Customer)
  - BCrypt `$2a$` hash generated and stored in user_login table
  - JWT token returned on successful login with user profile data
  - Wrong password correctly returns 401 Unauthorized
  - Frontend API config updated: `http://localhost:8180/temcoservers/api`
- [x] **Dashboard Wired to Real Contabo Data**:
  - `CONTABO_API_PASSWORD` configured on backend container
  - `GET /temcoservers/api/servers` returns all 8 real Contabo VPS instances
  - Dashboard shows: instance name, status (running/stopped), IPv4, region, productId
  - Stats cards: Total Servers, Running, Stopped, AI Requests (with gradient styling)
  - Action buttons: Start (green), Restart (blue), Stop (red) — trigger real Contabo API
  - Refresh button re-fetches live data
  - Sidebar with Temco logo, user avatar, role, sign out
- [x] **AI Code Assistant Page — Built (`/ai`)**:
  - Chat-style UI with user bubbles and AI response cards
  - Code block rendering with dark theme, language labels, copy buttons
  - Language selector (17 languages) and model selector (DeepSeek/OpenAI)
  - 4 example starter prompts on empty state
  - Auto-expanding textarea, Enter to send, Shift+Enter for newline
  - Token tracking per response
  - Navigation: Dashboard sidebar → AI Assistant links to `/ai`
- [x] **Temco Brand Theme Fully Applied**:
  - Gradient color themes on all cards (feature, pricing, partner)
  - Official Temco logos integrated (navbar, footer, TEMCO Bank partner)
  - Balanced light theme (gray-100 base, white cards, subtle shadows)
- [x] Frontend pages: LandingPage, LoginPage, DashboardPage, AiAssistantPage
- [x] Routes: `/`, `/login`, `/dashboard`, `/ai`

### Session 3 — 2026-03-16
- [x] **Admin Panel — Built (`/admin`)**:
  - Backend: `AdminService` + `AdminResource` (`/api/admin/*`)
  - `GET /admin/stats` — total users, 158K students, server customers, subscriptions, plans, revenue
  - `GET /admin/customers` — paginated server customers with search
  - `GET /admin/users` — all active users with roles
  - `GET /admin/servers` — all Contabo instances (reuses ContaboService)
  - Role guard: requires `Super Admin` or `System Admin` JWT
  - Frontend: Overview (6 stat cards + platform summary + quick actions), Customers (table + search + pagination), Servers (Contabo instances), Revenue (metrics + pricing tiers)
  - Admin sidebar with accent pink theme, "Admin Panel" badge, link to User Dashboard
  - Admin test user created: `admin` / `password123` (role: Super Admin, gup_id: 258018)
- [x] **Role-Based Login Routing**:
  - Super Admin / System Admin → `/admin`
  - Server Customer → `/dashboard`
  - Non-admin accessing `/admin` redirected to `/dashboard`
- [x] **Billing Integration — Built (`/billing`)**:
  - Backend: `BillingService` + `BillingResource` (`/api/billing/*`)
  - `GET /billing/plans` — all active subscription plans (public)
  - `GET /billing/subscription` — user's active subscription
  - `POST /billing/subscribe` — subscribe to plan, creates voucher + notifications
  - `POST /billing/cancel` — cancel active subscription + notification
  - `GET /billing/history` — user's payment history from voucher table
  - Voucher integration: creates `voucher` records on subscribe (type: Server Subscription Payment)
  - Seeded: `branch_type`, `branch` (TemcoServers Online), `voucher_type` (SSP, SSR, ACP), `login_session`
  - Frontend: Plans tab (4 plan cards with specs + subscribe buttons), My Subscription tab (active plan details + cancel), Payment History tab (voucher table)
- [x] **Notification Integration — Built (`/notifications`)**:
  - Backend: `NotificationService` + `NotificationResource` (`/api/notifications`)
  - Writes to `communication_history` table on: subscription created, payment received, subscription cancelled, AI usage alert
  - Uses existing `communication_type` (Email, SMS) and `communication_purpose` entries
  - `GET /notifications` — paginated user notifications
  - Frontend: Notification cards with purpose-based icons/colors, sender info, timestamps, pagination
- [x] **Dashboard Sidebar Updated**: Added Billing + Notifications nav links
- [x] Frontend pages: LandingPage, LoginPage, DashboardPage, AiAssistantPage, AdminPage, BillingPage, NotificationsPage
- [x] Routes: `/`, `/login`, `/dashboard`, `/ai`, `/admin`, `/billing`, `/notifications`
- [x] Backend services: AuthService, ContaboService, AdminService, BillingService, NotificationService
- [x] Backend REST: HealthResource, AuthResource, ServerInstanceResource, AdminResource, BillingResource, NotificationResource

### Test Credentials (Local)
| Username | Password | Role | Destination | gup_id | login_id |
|----------|----------|------|-------------|--------|----------|
| `admin` | `admin123` | Super Admin | `/admin` | 258018 | 41102 |
| `teststudent` | `password123` | Server Customer | `/dashboard` | 258017 | 41101 |

### Docker Containers Running
```
temcoservers-backend    → localhost:8180  (WildFly 30, temcoservers.war)
temcoservers-ai-module  → localhost:8580  (FastAPI, uvicorn)
temco-admin-mariadb     → localhost:3306  (MariaDB, ijts_recovery_db)
Frontend dev server     → localhost:3010  (Vite HMR)
```

### How to Restart Containers
```bash
# Backend
docker rm -f temcoservers-backend
docker run -d --name temcoservers-backend --network temco-network -p 127.0.0.1:8180:8080 \
  -e DB_HOST=temco-admin-mariadb -e DB_PORT=3306 -e DB_NAME=ijts_recovery_db \
  -e DB_USER=root -e "DB_PASSWORD=<see .env.production>" \
  -e "JWT_SECRET=<see .env.production>" \
  -e "CONTABO_CLIENT_ID=<see .env.production>" \
  -e "CONTABO_CLIENT_SECRET=<see .env.production>" \
  -e "CONTABO_API_USER=<see .env.production>" \
  -e "CONTABO_API_PASSWORD=<see .env.production>" \
  temcoservers-backend:latest

# AI Module
docker rm -f temcoservers-ai-module
docker run -d --name temcoservers-ai-module --network temco-network -p 127.0.0.1:8580:8000 \
  -e DB_HOST=temco-admin-mariadb -e DB_PORT=3306 -e DB_NAME=ijts_recovery_db \
  -e DB_USER=root -e "DB_PASSWORD=<see .env.production>" \
  -e OPENAI_API_KEY="" -e DEEPSEEK_API_KEY="" \
  temcoservers-ai-module:latest
```

### Session 4 — 2026-03-16
- [x] **CI/CD Pipeline (`release.md`)**:
  - 18-step release workflow adapted for TemcoServers Docker-based deployment
  - Version bump (version.js), CHANGELOG, git tag, SSH deploy to production
  - Database migration support with idempotent SQL and naming conventions
  - Post-deploy health checks for backend, AI module, frontend, DB connectivity
  - Rollback procedure documented
  - Production Docker Compose (`docker-compose.prod.yml`) + Dockerfile.prod for frontend
  - Nginx frontend config (SPA routing + API proxy)
  - `.env.production.example` template created
- [x] **Production Server Security Hardening (194.163.130.223)**:
  - SSH key pair generated: `~/.ssh/temcoservers_deploy` (Ed25519)
  - SSH config alias: `ssh TemcoServers` → deploy@194.163.130.223
  - Non-root `deploy` user with limited sudo (docker, git, mysql, nginx, certbot, ufw, fail2ban-client)
  - Root SSH login disabled (`PermitRootLogin no`)
  - Password authentication disabled (`PasswordAuthentication no`)
  - `AllowUsers deploy` enforced
  - UFW firewall: only ports 22, 80, 443 open; all Docker ports hidden
  - Docker + UFW conflict resolved: `{"iptables": false}` in daemon.json + DOCKER-USER chain in after.rules
  - Fail2ban active: 3 failures in 10min = 1hr ban (already caught bot `80.94.92.182`)
  - Reusable `setup_server_security.md` guide created (Phase 1-7 with Docker+UFW fix)
- [x] **Server Software Installed**:
  - Docker 28.2.2 + Docker Compose v5.1.0
  - Nginx 1.24.0 (Ubuntu)
  - MariaDB client 10.11.14
  - Git 2.43.0
- [x] **Git Repo Initialized + Pushed to GitHub**:
  - Repository: https://github.com/ishanthasiribaddana/temcoservers
  - 65 files, 8435 insertions
  - `.gitignore` covers .env, Java targets, node_modules, Python cache, IDE files
  - Production server cloned to `/opt/temcoservers` (owned by `deploy` user)
- [x] **release.md Updated** to use `deploy` user via SSH alias instead of root

### Session 5 — 2026-03-16 (v1.0.0 Release)
- [x] **v1.0.0 Released & Deployed to Production**:
  - Tagged `v1.0.0`, pushed to GitHub, deployed via SSH to `/opt/temcoservers`
  - All 4 Docker containers running: backend, ai-module, frontend, mariadb
  - Production database: `ijts_recovery_db` with 981 tables, 251K+ user profiles
  - Health checks passed: backend UP, AI module UP, frontend 200
- [x] **Domain & SSL via Cloudflare**:
  - Domain: `aihost.temcobank.com`
  - Cloudflare A record → 194.163.130.223 (Proxied)
  - SSL mode: Flexible (Browser↔Cloudflare HTTPS, Cloudflare↔Server HTTP port 80)
  - Fixed Error 521 by switching from Full to Flexible SSL mode
- [x] **Production Nginx Reverse Proxy**:
  - Host Nginx on port 80 proxies to Docker containers
  - `/` → frontend:3010, `/temcoservers/api/` → backend:8180, `/ai/` → ai:8580
- [x] **Admin Login Fixed on Production**:
  - Generated bcrypt hash with Python, fixed `$2b$` → `$2a$` prefix for Java BCrypt compatibility
  - Updated admin password via SQL file SCP'd to server
  - Admin login: `admin` / `admin123` → `/admin`
- [x] **Production Credentials Updated**:
  - Admin password changed from `password123` to `admin123`
  - Student test: `teststudent` / `password123`

### Session 6 — 2026-03-17 (v1.1.0 Release)
- [x] **LKR Currency Conversion Badges**:
  - Fetches USD→LKR rate from `open.er-api.com` on page load
  - Applies ~2% markup for approximate bank selling rate
  - Displayed as gradient pill badges (blue-to-pink) under each plan's USD price
  - Shows: 🇱🇰 LKR {amount}/month
- [x] **Competitor Price Comparison Section**:
  - "How We Compare" table between Pricing and Partners sections
  - Compares TemcoServers vs GitHub Copilot, AWS, Google Cloud, Azure
  - Feature columns: Cloud VPS, AI Assistant, Dev Tools, Student Plan
  - Green "Save X%" badges on competitor rows (64%-80% savings)
  - TemcoServers row highlighted with gradient background
- [x] **Payment Page (`/payment`)**:
  - Bank transfer details: Nations Trust Bank (Nawala), Sampath Bank (Gangodawila), Commercial Bank (Reid Avenue)
  - Account name: Java Institute Holdings (Pvt) Ltd
  - Copy-to-clipboard for account numbers
  - Bank slip upload form: Purchaser Name (auto-filled), Reference Number, Amount (LKR), Plan (dropdown), Bank Slip (file upload, max 5MB)
  - Login required; plan pre-selected via `?plan=<slug>` query param
  - Success confirmation screen with reference number
  - Backend endpoint not yet wired (frontend-only in this release)
- [x] **Java Institute Logo**:
  - Replaced JRIRC Building2 icon with actual Java Institute logo
  - Logo asset: `frontend/public/images/java-institute-logo.png`
- [x] **Pricing Plan Links Updated**:
  - "Get Started" buttons now link to `/payment?plan=<slug>` instead of `/login`
  - Each plan has a `slug` field: starter, ai-basic, ai-pro, ai-unlimited
- [x] **v1.1.0 Released & Deployed to Production**:
  - Commit: `b77aa9c`, 6 files changed (+499, -4)
  - All health checks passed, frontend container recreated

### Session 7 — 2026-03-17 (v1.2.0 Development + Release)
- [x] **Flyway Database Versioning**:
  - Added `flyway-core` + `flyway-mysql` dependencies to backend pom.xml
  - Created `FlywayMigrator.java` — `@Singleton @Startup` EJB runs migrations on deploy
  - Uses existing `TemcoServersDS` datasource, baselines at version 0
  - Migration location: `classpath:db/migration`
  - V1: `ts_voucher_item_slip` table (1:1 link to voucher_item for bank slip URLs)
  - V2: Seed `account_type`, `main_chart_of_account`, `chart_of_account`, `scoa_type`, `payment_mode`
  - V3: Register TemcoServers pages (si_id 501-506), interface_menu (if_id 63), module (uc_id 157), role↔page mappings
- [x] **Bank Slip Upload Backend**:
  - `TsVoucherItemSlip.java` — JPA entity for slip table
  - `BillingService.uploadSlip()` — creates voucher + voucher_items (debit bank, credit revenue) + slip record
  - `BillingResource POST /billing/upload-slip` — multipart file upload, saves to `/opt/temcoservers/uploads/slips/`
  - Docker volume `uploads-data` mounted to backend container (local + prod)
  - Nginx location block for serving `/uploads/` from shared volume
  - File size limit: 5MB, accepts JPEG/PNG/PDF
- [x] **Invoice PDF Generation**:
  - Added OpenPDF dependency to pom.xml
  - `InvoicePdfGenerator.java` — EJB service generating payment acknowledgement PDFs
  - Features: Java Institute logo, payment details, "PENDING VERIFICATION" watermark, bank account info, disclaimer
  - Saved to `/opt/temcoservers/uploads/invoices/INV-{voucherId}.pdf`
  - Invoice URL included in notification message and API response
- [x] **Notification System Updated**:
  - `notifyPaymentReceived()` updated to LKR currency format
  - Includes invoice download URL in notification message
  - Sender hardcoded as "System Account" (temporary until GUP created)
- [x] **Frontend PaymentPage Updated**:
  - Captures `invoiceUrl` from API response
  - Shows "Download Invoice" button on upload success screen
- [x] **Login Page Logo Updated**:
  - Replaced `Server` icon with Temco logo image matching LandingPage navbar style
- [x] **RBAC Admin Panel (per `docs/setup-admin-panel.md`)**:
  - Backend `AdminService.java` extended with ~20 RBAC methods:
    - Users: `getUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, `resetLoginAttempts`
    - Roles: `getRoles`, `createRole`, `updateRole`, `setRolePages`, `setRoleModules`
    - Modules: `getModules`, `createModule`, `updateModule`, `setModulePages`
    - Pages: `getSystemInterfaces`, `createSystemInterface`
    - Other: `getPrivileges`, `searchGup`, `assignUserModulesFromRole`
  - Backend `AdminResource.java` extended with 17+ REST endpoints under `/admin/rbac/*`
  - Frontend `AdminRbacTabs.jsx` — new file with `UsersTab`, `RolesTab`, `ModulesPagesTab` components
  - `AdminPage.jsx` merged to **7 tabs** (4 existing + 3 RBAC):
    - Business Ops: Overview, Customers, Servers, Revenue
    - Access Control: User Mgmt, Roles & Perms, Modules & Pages
  - Sidebar has "Access Control" section divider
  - User Management: searchable table, Create/Edit modal with GUP search, role select, privilege toggles, password, active toggle, deactivate, reset login attempts
  - Roles & Perms: expandable role cards with page/module access toggle buttons (instant save)
  - Modules & Pages: expandable module cards with page assignment toggles, registered pages table, inline page creation form
  - Uses existing `axios + useState` pattern (no React Query)
- [x] **Local Admin Login Fixed**:
  - Updated bcrypt password hashes in local `temco-admin-mariadb`
  - Admin: `admin123` hash copied from production
  - Student: `password123` hash generated with Python bcrypt (`$2b$` → `$2a$` prefix fix)
- [x] **Docker Compose Updated**:
  - `docker-compose.yml`: Added `uploads-data` volume for backend
  - `docker-compose.prod.yml`: Added `uploads-data` volume for both backend and frontend (Nginx)

### Session 8 — 2026-03-17 (UI Polish + v1.2.0 Release)
- [x] **Admin ↔ Dashboard Bidirectional Navigation**:
  - Added "Admin Panel" link (Shield icon) in DashboardPage sidebar, visible only for Super Admin / System Admin
  - Admin users can now toggle between `/admin` and `/dashboard` without re-logging in
- [x] **Back to Website Navigation**:
  - AdminPage + DashboardPage sidebar logos open landing page in new tab (`window.open('/', '_blank')`)
  - Added "Back to Website" button (ExternalLink icon) in both sidebars
- [x] **Password Visibility Toggle (Eye/EyeOff)**:
  - Added to UserModal password field in AdminRbacTabs.jsx
  - LoginPage already had it from Session 7
- [x] **User Active/Inactive Toggle Switch**:
  - Replaced static "Active"/"Inactive" text with green/gray toggle switch in UsersTab
  - Bidirectional: click to activate or deactivate with confirmation dialog
  - Uses `PUT /admin/rbac/users/{id}` instead of one-way `DELETE`
- [x] **Forgot Password (Login Page)**:
  - "Forgot Password?" link toggles a blue info box
  - WhatsApp-based: "Send 'Reset My TemcoServers Password' to 0774 505 005"
  - Phone number is clickable `wa.me` link with pre-filled message
- [x] **Dashboard Tab-Based Rendering**:
  - Overview: stats cards + compact server status list with "View All →" link
  - My Servers: full server list with Start/Stop/Restart actions
  - Profile: user info card (avatar, name, role, username, email, mobile, GUP/Login IDs)
  - Terminal: "Coming soon" placeholder
- [x] **RBAC Frontend Filtering**:
  - Hide non-TemcoServers modules (only show ID 157)
  - Hide non-TemcoServers pages (only show `TS` prefix)
  - Hide non-TemcoServers roles (only show IDs 51, 52, 57)
- [x] **Generic RBAC Setup Guide**:
  - `docs/setup-admin-panel.md` rewritten as reusable document
  - All JIAT/Recovery-specific references replaced with generic placeholders
- [x] **v1.2.0 Released & Deployed to Production**:
  - Commit: `9231060`, 25 files changed (+3,108, -44)
  - All 4 containers running, all health checks passed
  - Database: 251,346 user profiles

### Production Server Info
| Property | Value |
|----------|-------|
| IP | 194.163.130.223 |
| SSH | `ssh TemcoServers` (alias, key auth) |
| User | deploy (non-root) |
| SSH Key | `~/.ssh/temcoservers_deploy` |
| Firewall | UFW — ports 22, 80, 443 only |
| Fail2ban | Active — 3 failures = 1hr ban |
| Project Path | `/opt/temcoservers` |
| Docker | 28.2.2 + Compose v5.1.0 |
| Nginx | 1.24.0 |
| Domain | aihost.temcobank.com |
| SSL | Cloudflare Flexible |
| Latest Release | v1.2.0 (2026-03-17) |
| GitHub | https://github.com/ishanthasiribaddana/temcoservers |

### Production Docker Containers
```
temcoservers-frontend    → port 3010  (Nginx + React dist)
temcoservers-backend     → port 8180  (WildFly 30, temcoservers.war)
temcoservers-ai-module   → port 8580  (FastAPI, uvicorn)
temcoservers-mariadb     → port 3306  (MariaDB 11, ijts_recovery_db)
```

### Production Test Credentials
| Username | Password | Role | Destination |
|----------|----------|------|-------------|
| `admin` | `admin123` | Super Admin | `/admin` |
| `teststudent` | `password123` | Server Customer | `/dashboard` |

### Frontend Pages & Routes (v1.2.0)
| Page | Route | Auth |
|------|-------|------|
| LandingPage | `/` | No |
| LoginPage | `/login` | No |
| DashboardPage | `/dashboard` | Yes |
| AiAssistantPage | `/ai` | Yes |
| AdminPage | `/admin` | Yes (Admin) |
| BillingPage | `/billing` | Yes |
| NotificationsPage | `/notifications` | Yes |
| PaymentPage | `/payment` | Yes |

### Session 9 — 2026-03-19 (Subscription Billing Cycle)
- [x] **Subscription Billing Cycle — Full Implementation (MVP Critical)**:
  - **Problem**: Subscriptions had no end_date, no expiry check, no renewal flow, no auto-suspend — customers could use servers indefinitely after a single payment
  - **Flyway V11** (`V11__subscription_billing_cycle.sql`):
    - Added columns to `ts_subscription`: `grace_end_date`, `renewal_count`, `last_reminder_sent`, `auto_renew`
    - Backfilled `end_date = start_date + 30 days` for all active subscriptions with NULL end_date
  - **BillingService.java** — 8 new methods:
    - `renewSubscription(gupId, adminLoginId)` — extends end_date by 30 days, resets grace/reminder state, increments renewal_count
    - `findSubscriptionsExpiringWithin(days)` — finds subscriptions expiring within N days (for reminders)
    - `findExpiredActiveSubscriptions()` — finds active subs past end_date (for grace transition)
    - `moveToGrace(subscriptionId)` — sets status='grace', grace_end_date = today + 5 days
    - `findExpiredGraceSubscriptions()` — finds grace subs past grace_end_date (for suspension)
    - `suspendSubscription(subscriptionId)` — sets status='suspended'
    - `markReminderSent(subscriptionId)` — tracks last reminder date to avoid duplicates
    - `getContaboInstanceIdForUser(gupId)` — looks up Contabo instance ID for server restart
  - **Fixed** `approvePayment()` and `autoActivateSubscription()` to set `end_date = start_date + 30 days` on activation (G3)
  - **Fixed** `getUserSubscription()` to include grace/suspended/expired statuses in query
  - **SubscriptionScheduler.java** — `@Singleton @Startup` EJB:
    - `@Schedule(hour = "6")` — runs daily at 6 AM
    - Stage 1: Send renewal reminders at 7-day, 3-day, 1-day marks (skips if already sent today)
    - Stage 2: Move expired active subscriptions to 'grace' (5-day window), send grace notification
    - Stage 3: Stop Contabo servers via API and mark as 'suspended' after grace period ends
  - **NotificationService.java** — 3 new methods:
    - `notifyRenewalReminder()` — "Your subscription expires on X (N days remaining)"
    - `notifyGracePeriod()` — "Your subscription has expired, server will be SUSPENDED on X"
    - `notifyServerSuspended()` — "Your server has been SUSPENDED"
  - **AdminResource.java** — 1 new endpoint:
    - `POST /admin/subscriptions/{gupId}/renew` — renews subscription + auto-restarts Contabo server if suspended
  - **Subscription Status Lifecycle**:
    ```
    pending_payment → active → grace (5 days) → suspended
                                 ↑ renewal resets to active + restarts server
                    → rejected
                    → cancelled
    ```
- [x] **Email Campaign Dashboard** (built in prior session):
  - Flyway V9 + V10 migrations (8 tables)
  - EmailCampaignService, BulkEmailService, EmailCampaignResource (22 REST endpoints)
  - AdminEmailCampaignTabs.jsx — 5 tabs (Overview, Templates, Groups, Send, Schedules)
  - Generic `/setup-mail-campaign` workflow created for reuse across apps

### Session 10 — 2026-03-19 (MVP Gap-Fill — Frontend Lifecycle Awareness)
- [x] **BillingPage.jsx — Full subscription lifecycle support**:
  - Added `grace`, `suspended`, `expired` status banners with contextual warnings (orange/red/gray)
  - Added `endDate` display (shows as "Renewal Date" for active, "Expired On" for others)
  - Added `graceEndDate` display during grace period ("Suspend Date")
  - Status-aware gradient bar, icon colors, and badge colors for all 5 subscription states
  - Cancel button now only shows for `active` and `pending_payment` states
  - Added `AlertTriangle`, `ShieldOff`, `Clock` icons from lucide-react
- [x] **AdminPaymentsTabs.jsx (SubscriptionsTab) — Lifecycle states + Renew button**:
  - Added `grace`, `suspended`, `expired` filter tabs with live counts
  - Added `statusBadge()` and `statusIcon()` support for all 7 states
  - Added **Renew** button on each subscription row (grace/suspended/expired/active)
  - Calls `POST /admin/subscriptions/{gupId}/renew` with confirmation dialog
  - Shows success/error banner with server restart status
  - End date column highlights red for grace/suspended subscriptions
- [x] **BillingService.java — getUserSubscription() enhanced**:
  - Added `grace_end_date` and `renewal_count` to SQL query
  - Returns `graceEndDate` and `renewalCount` fields to frontend
- [x] **Terminal tab removed from all pages**:
  - Removed from `DashboardPage.jsx` sidebar nav + "Coming Soon" placeholder section
  - Removed from `BillingPage.jsx` sidebar nav
  - Removed from `AiAssistantPage.jsx` sidebar nav
  - Cleaned up unused `Terminal` import from all three files
- [x] **AiAssistantPage.jsx — Service health check**:
  - Added `aiStatus` state with health check on page load (`GET /health`)
  - Shows amber warning banner when AI service is offline: "AI service is currently unavailable"
  - Users can still browse the page but are informed upfront instead of discovering on first prompt
- [x] **docker-compose.yml — Dev uploads volume fix**:
  - Added `uploads-data:/usr/share/nginx/uploads:ro` to frontend service (was missing in dev)
  - Production compose already had this correctly configured
- [x] **Reusable workflows created**:
  - Updated `setup-mail-campaign.md`: Added Step 7b (Transactional Email Integration) + Step 7c (CampaignScheduler EJB)
  - Created `setup-subscription-lifecycle.md`: 9-step generic workflow for subscription billing cycles

### Session 11 — 2026-03-19 (Self-Registration + OTP Email Verification)
- [x] **Self-Registration Page (`/register`)** — 4-step flow:
  1. NIC Lookup (debounced 600ms, inline status: found/not-found/has-account)
  2. OTP Email Verification (6-digit code, 5min expiry, 60s resend cooldown)
  3. Registration Form (pre-filled from JIAT student data)
  4. Success
- [x] **Backend OTP endpoints**:
  - `POST /auth/send-otp` — generates 6-digit OTP, stores in `ts_registration_otp`, sends branded HTML email via `TXN_REGISTRATION_OTP` template
  - `POST /auth/verify-otp` — validates OTP (max 5 attempts), returns 10-min JWT verification token
  - `POST /auth/register` — now requires `verificationToken` when `gupId` is provided (linking to existing profile)
  - Rate limiting: max 3 OTP requests per NIC per hour
  - Admin CC (ishantha@gmail.com) on all OTP emails during staging (remove after Sep 2026)
- [x] **Flyway V12**: `ts_registration_otp` table + `TXN_REGISTRATION_OTP` email template seed
- [x] **Frontend**: RegisterPage.jsx with debounced NIC input, OTP step (Step 1b), monospaced code input
- [x] **Navigation**: Updated LandingPage "Get Started" links + LoginPage "Create account" link → `/register`
- [x] **Released as v1.7.0** — deployed to production via CI/CD

### Session 12 — 2026-03-19 (AI Doctor — Self-Service Server Troubleshooting)
- [x] **AI Doctor** — browser-based AI troubleshooting assistant in customer dashboard:
  - Chat UI with quick actions (Check Disk, Memory, Docker, Nginx, Logs, Full Health Check)
  - DeepSeek AI agent with tool-use pattern — decides which SSH commands to run
  - 3-tier command whitelist: readonly (auto-execute), fix (customer confirmation), blocked (never)
  - Session history, fix confirmation flow, 50 req/day quota
- [x] **Python AI Module** — 3 new files:
  - `ssh_executor.py` — paramiko SSH + command whitelist (50+ readonly patterns, 9 fix patterns, 15+ blocked patterns)
  - `doctor_agent.py` — DeepSeek/OpenAI tool-use agent, multi-turn conversation
  - `doctor_routes.py` — FastAPI endpoints under `/ai/doctor/*` (sessions, messages, confirm-fix, quota, admin)
- [x] **Java Backend Proxy** — `DoctorResource.java`:
  - Proxies `/doctor/*` to Python AI module with JWT auth
  - Injects server credentials server-side (password never exposed to frontend)
  - Admin endpoints: `GET /doctor/admin/sessions`, `GET /doctor/admin/sessions/{id}` (role-gated)
- [x] **Frontend**:
  - `AiDoctorTab.jsx` — Chat UI in DashboardPage sidebar
  - `AdminDoctorTab` — Admin sessions viewer in AdminPage with filter + detail
- [x] **Flyway V13**: `ts_ai_doctor_session`, `ts_ai_doctor_message`, `ts_ai_doctor_quota` tables
- [x] **Bug fix**: `db.py` — URL-encode DB password with `quote_plus()` (@ char was breaking SQLAlchemy URL)
- [x] **Dependencies**: Added `paramiko==3.4.0` to ai-module requirements.txt

### Current Step
**AI Doctor feature complete and locally tested. All builds pass (frontend + backend + ai-module). V13 migration applied. Quota endpoint verified end-to-end through Java proxy. Ready for v1.8.0 release.**

### Pending / Next Steps
- [ ] Release to production (v1.8.0) with AI Doctor
- [ ] End-to-end test AI Doctor on production with a real customer Contabo VPS
- [ ] Add DEEPSEEK_API_KEY to production AI module `.env` (required for AI Doctor)
- [ ] Configure nightly replication: `ijts_system` → `ijts_recovery_db`
- [ ] Test full bank slip upload + invoice generation flow on production
- [ ] Server action audit log (ts_server_action_log table — planned but not created)
- [ ] Plan upgrade/downgrade flow
- [ ] ServerHealthScheduler EJB — proactive monitoring (Phase 2)
