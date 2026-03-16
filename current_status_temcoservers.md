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
| MariaDB        | 3306          | (existing)    | Running   |

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
- **DB Root Password**: 6qZB6d@pIvj
- **Reused tables**: general_user_profile, user_login, user_role, student, branch, voucher, voucher_type, voucher_item, communication_history, communication_type, communication_purpose
- **New tables**: Prefixed with `ts_` — MUST consult user before adding any new table
- **Created tables**: ts_subscription_plan (seeded with 4 plans), ts_server_instance, ts_subscription, ts_ai_usage, ts_ai_conversation, ts_ai_message, ts_server_action_log
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

### Test Credentials
| Username | Password | Role | Destination | gup_id | login_id |
|----------|----------|------|-------------|--------|----------|
| `admin` | `password123` | Super Admin | `/admin` | 258018 | 41102 |
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
  -e DB_USER=root -e "DB_PASSWORD=6qZB6d@pIvj" \
  -e "JWT_SECRET=TemcoServers-JWT-Secret-2026-Change-In-Production" \
  -e "CONTABO_CLIENT_ID=INT-142497" \
  -e "CONTABO_CLIENT_SECRET=06221e04-3706-403c-b704-96e1b2e153de" \
  -e "CONTABO_API_USER=ishantha@gmail.com" \
  -e "CONTABO_API_PASSWORD=Java0218#@" \
  temcoservers-backend:latest

# AI Module
docker rm -f temcoservers-ai-module
docker run -d --name temcoservers-ai-module --network temco-network -p 127.0.0.1:8580:8000 \
  -e DB_HOST=temco-admin-mariadb -e DB_PORT=3306 -e DB_NAME=ijts_recovery_db \
  -e DB_USER=root -e "DB_PASSWORD=6qZB6d@pIvj" \
  -e OPENAI_API_KEY="" -e DEEPSEEK_API_KEY="" \
  temcoservers-ai-module:latest
```

### Current Step
**All major features built. Admin panel, billing (voucher integration), and notifications (communication_history) fully functional. 7 frontend pages, 6 REST resources, 5 backend services.**

### Pending / Next Steps
- [ ] Add DEEPSEEK_API_KEY or OPENAI_API_KEY to AI module for live code generation
- [ ] Deploy platform on Contabo server
