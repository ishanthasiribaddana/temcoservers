# Changelog

All notable changes to the TemcoServers platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-03-17

### Added
- **RBAC Admin Panel** — Full role-based access control with 3 management tabs
  - **User Management** — Create, edit, activate/deactivate users with toggle switch, reset login attempts, GUP search, password visibility toggle (Eye/EyeOff)
  - **Roles & Permissions** — Create/edit roles, assign pages and modules per role
  - **Modules & Pages** — Create/edit system interfaces and modules, assign pages to modules
  - Frontend-only filtering to hide non-TemcoServers modules/pages/roles from shared DB
- **Flyway Database Migrations** — Auto-run on startup via `FlywayMigrator` EJB
  - V1: `ts_voucher_item_slip` table for bank slip uploads
  - V2: Chart of accounts and payment modes seed data
  - V3: TemcoServers RBAC pages (si_id 501-506), module (uc_id 157), interface menu (if_id 63)
- **Bank Slip Upload** — File upload endpoint with voucher item association
- **Invoice PDF Generation** — iText-based PDF invoices with Java Institute branding
- **Forgot Password** — WhatsApp-based password reset contact on login page (0774 505 005)
- **Dashboard Tab Navigation** — Profile, Terminal (coming soon), separate Overview vs My Servers content
- **Admin Panel ↔ Dashboard Toggle** — Bidirectional navigation for admin users (Shield icon link)
- **Back to Website** — New-tab links in Admin and Dashboard sidebars (ExternalLink icon)
- **Generic RBAC Setup Guide** — `docs/setup-admin-panel.md` rewritten as reusable document

### Changed
- **AdminPage sidebar** — Logo opens landing page in new tab, added "Back to Website" button
- **DashboardPage** — Tab-based rendering (Overview shows stats + compact server list, My Servers shows full list with actions, Profile shows user info card)
- **LoginPage** — Added "Forgot Password?" with WhatsApp admin contact message
- **Docker Compose** — Updated for Flyway and new backend dependencies
- **Nginx config** — Updated for production routing

### Files Changed
- `backend/pom.xml` — added iText PDF, Flyway, BCrypt dependencies
- `backend/src/main/java/com/temcoservers/config/FlywayMigrator.java` — new Flyway startup EJB
- `backend/src/main/java/com/temcoservers/entity/TsVoucherItemSlip.java` — new bank slip entity
- `backend/src/main/java/com/temcoservers/service/InvoicePdfGenerator.java` — new PDF generator
- `backend/src/main/java/com/temcoservers/rest/AdminResource.java` — 17+ RBAC REST endpoints
- `backend/src/main/java/com/temcoservers/service/AdminService.java` — ~20 RBAC service methods
- `backend/src/main/java/com/temcoservers/rest/BillingResource.java` — bank slip upload endpoint
- `backend/src/main/java/com/temcoservers/service/BillingService.java` — billing service updates
- `backend/src/main/java/com/temcoservers/service/NotificationService.java` — notification updates
- `backend/src/main/resources/db/migration/V1__create_ts_voucher_item_slip.sql` — new migration
- `backend/src/main/resources/db/migration/V2__seed_chart_of_accounts_and_payment_modes.sql` — new migration
- `backend/src/main/resources/db/migration/V3__register_temcoservers_pages.sql` — new migration
- `backend/src/main/resources/images/java-institute-logo.png` — invoice branding asset
- `frontend/src/pages/AdminPage.jsx` — merged RBAC tabs, navigation updates
- `frontend/src/pages/AdminRbacTabs.jsx` — new RBAC management component
- `frontend/src/pages/DashboardPage.jsx` — tab-based rendering, Profile tab, Admin Panel link
- `frontend/src/pages/LoginPage.jsx` — Forgot Password with WhatsApp contact
- `frontend/src/pages/PaymentPage.jsx` — billing page updates
- `frontend/src/version.js` — bumped to v1.2.0
- `docs/setup-admin-panel.md` — new generic RBAC setup guide
- `docker-compose.yml` / `docker-compose.prod.yml` — updated
- `frontend/nginx.conf` — updated
- `current_status_temcoservers.md` — updated

---

## [1.1.0] - 2026-03-17

### Added
- **LKR Currency Badges** — Gradient pill badges on pricing cards showing approximate LKR bank selling rate (fetched from open.er-api.com with ~2% markup)
- **Competitor Price Comparison** — "How We Compare" section between Pricing and Partners, comparing TemcoServers vs GitHub Copilot, AWS, Google Cloud, and Azure with feature checkmarks and savings percentages
- **Payment Page** — `/payment` route with bank transfer details (Nations Trust, Sampath, Commercial Bank), copy-to-clipboard account numbers, and bank slip upload form
  - Fields: Purchaser Name (auto-filled), Reference Number, Amount (LKR), Plan (dropdown), Bank Slip (file upload)
  - Login required, plan pre-selected via `?plan=<slug>` query param
  - Success confirmation screen with reference number
- **Java Institute Logo** — Replaced JRIRC partner icon with actual Java Institute logo image

### Changed
- Pricing plan "Get Started" buttons now link to `/payment?plan=<slug>` instead of `/login`
- Bank account name updated to "Java Institute Holdings (Pvt) Ltd"

### Files Changed
- `frontend/src/App.jsx` — added PaymentPage import and `/payment` route
- `frontend/src/pages/LandingPage.jsx` — LKR badges, comparison table, JRIRC logo, plan slugs, payment links
- `frontend/src/pages/PaymentPage.jsx` — new payment page component
- `frontend/public/images/java-institute-logo.png` — new partner logo asset
- `frontend/src/version.js` — bumped to v1.1.0

---

## [1.0.0] - 2026-03-16

### Added
- **Java EE Backend (WildFly 30)** — REST API with Auth, Admin, Billing, Notification, Contabo server management
  - BCrypt password hashing + JWT authentication
  - Role-based access control (Super Admin, System Admin, Server Customer)
  - Contabo API integration for VPS instance management
  - Voucher-based billing with subscription plans
  - Communication history notifications
- **React Frontend (Vite + TailwindCSS)** — 7 pages with Temco brand theme
  - Landing page with pricing, features, partner showcase
  - Login with role-based routing
  - Dashboard with real Contabo server data + action buttons
  - AI Code Assistant with chat UI, code highlighting, model selector
  - Admin panel with stats, customer management, revenue overview
  - Billing page with plans, subscriptions, payment history
  - Notifications page with purpose-based icons
- **Python AI Module (FastAPI)** — DeepSeek + OpenAI code generation
  - Multi-model support with conversation tracking
  - Database-backed usage logging
- **Docker Architecture** — 3-container setup (backend, ai-module, frontend)
  - Production Docker Compose with Nginx frontend
  - Development Docker Compose with Vite HMR
- **CI/CD Pipeline** — 18-step release workflow via SSH
  - Automated version bump, changelog, Docker build, deploy, health checks
  - Rollback procedure documented
- **Production Server Security Hardening**
  - SSH key-only auth (Ed25519), root login disabled
  - UFW firewall (ports 22, 80, 443 only) with Docker iptables fix
  - Fail2ban (3 failures = 1hr ban)
  - Non-root deploy user with limited sudo

### Files Changed
- Full initial codebase: 65+ files across backend, frontend, ai-module, config

---
