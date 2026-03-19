# Changelog

All notable changes to the TemcoServers platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-03-19

### Added
- **Subscription Billing Cycle** — Full lifecycle management for subscriptions
  - Daily scheduler (6 AM) sends renewal reminders at 7, 3, 1 days before expiry
  - Auto-transitions expired subscriptions to grace period (5 days)
  - Auto-suspends servers via Contabo API after grace period ends
  - Admin renewal endpoint with automatic server restart
  - Flyway V11: grace_end_date, renewal_count, last_reminder_sent, auto_renew columns
- **Email Campaign System** — Complete admin dashboard for bulk email marketing
  - 5-tab UI: Overview, Templates, Groups, Send, Schedules
  - HTML template editor with placeholder support
  - Audience groups with member management
  - Scheduled campaigns (once/daily/weekly/monthly) with daily quota tracking
  - 22 REST endpoints, Flyway V9 + V10 (8 tables)
- **Accounts & Finance Dashboard** — P&L statement with monthly trend charts
  - Revenue/expense breakdown by chart of accounts
  - Contabo payable tracking with exchange rate conversion
  - Pricing tier analysis with AI cost margins
  - Flyway V7: Contabo accounts payable sub-accounts
- **Subscription Lifecycle UI** — Frontend now handles all billing states
  - BillingPage: grace/suspended/expired warning banners with contextual messaging
  - BillingPage: endDate display (Renewal Date for active, Expired On for others)
  - BillingPage: graceEndDate display during grace period
  - Admin SubscriptionsTab: grace/suspended/expired filter tabs with counts
  - Admin SubscriptionsTab: one-click Renew button with server restart feedback
- **AI Assistant Health Check** — Shows offline banner when AI service unreachable
- **Notification Emails** — Renewal reminder, grace period, server suspended notifications

### Changed
- **BillingService.getUserSubscription** — Now returns graceEndDate and renewalCount
- **BillingService.getProfitAndLoss** — Voucher counts filtered to TemcoServers-only (SSP/PSP/SSR/ACP prefixes), excludes legacy Java Institute data
- **docker-compose.yml** — Added uploads volume mount to dev frontend container

### Removed
- **Terminal tab** — Removed placeholder from DashboardPage, BillingPage, AiAssistantPage sidebars
- **Unused imports** — Cleaned up Terminal icon imports from all affected pages

### Files Changed
- `backend/src/main/java/com/temcoservers/service/BillingService.java` — Billing cycle methods, voucher filter fix, graceEndDate/renewalCount in getUserSubscription
- `backend/src/main/java/com/temcoservers/service/SubscriptionScheduler.java` — NEW: daily lifecycle cron
- `backend/src/main/java/com/temcoservers/service/NotificationService.java` — 3 lifecycle notification methods
- `backend/src/main/java/com/temcoservers/service/EmailCampaignService.java` — NEW: email campaign CRUD
- `backend/src/main/java/com/temcoservers/service/BulkEmailService.java` — NEW: bulk email sender
- `backend/src/main/java/com/temcoservers/service/EmailService.java` — NEW: SMTP email service
- `backend/src/main/java/com/temcoservers/rest/AdminResource.java` — Renewal endpoint
- `backend/src/main/java/com/temcoservers/rest/EmailCampaignResource.java` — NEW: 22 campaign endpoints
- `backend/src/main/resources/db/migration/V7__contabo_accounts_payable.sql` — NEW
- `backend/src/main/resources/db/migration/V8__server_credentials_column.sql` — NEW
- `backend/src/main/resources/db/migration/V9__email_campaign_tables.sql` — NEW
- `backend/src/main/resources/db/migration/V10__email_schedule_and_quota.sql` — NEW
- `backend/src/main/resources/db/migration/V11__subscription_billing_cycle.sql` — NEW
- `frontend/src/pages/BillingPage.jsx` — Lifecycle status banners, endDate, status-aware colors
- `frontend/src/pages/AdminPaymentsTabs.jsx` — Lifecycle filters, Renew button
- `frontend/src/pages/AdminEmailCampaignTabs.jsx` — NEW: 5-tab email campaign dashboard
- `frontend/src/pages/AdminAccountsTab.jsx` — NEW: accounts & finance P&L
- `frontend/src/pages/AdminPage.jsx` — New sidebar sections for finance, billing, email marketing
- `frontend/src/pages/AiAssistantPage.jsx` — Health check + offline banner
- `frontend/src/pages/DashboardPage.jsx` — Terminal tab removed
- `frontend/src/version.js` — v1.5.0
- `docker-compose.yml` — Dev uploads volume
- `docker-compose.prod.yml` — Production compose updates

---

## [1.4.1] - 2026-03-18

### Added
- **Exchange Rate Tracking** — Bank transfer payments now track USD→LKR conversion
  - Plan dropdown auto-calculates expected LKR amount (plan USD × market rate + 2%)
  - Amount field pre-filled and editable; shows +/- difference indicator
  - Double-entry accounting: Overpayment → Customer Advance (liability), Underpayment → Accounts Receivable (asset)
  - Admin payment review shows exchange rate breakdown and difference
- **Navbar User Name** — Logged-in users see their name + dashboard link instead of "Log In" on LandingPage and WorkflowsBlogPage
- **Home Navigation** — WorkflowsBlogPage navbar now includes "Home" link back to landing page

### Changed
- **WorkflowsBlogPage** — Heading updated to "AI 5.5 Gen Workflow Automation"
- **WorkflowsBlogPage** — CTA section text color fixed (accent-100 → gray-200 for readability)
- **PaymentPage** — Plan selector moved before Amount field (drives LKR calculation)
- **release.md** — Updated admin credentials: admin user deactivated, ishantha is Super Admin

### Files Changed
- `backend/src/main/java/com/temcoservers/rest/BillingResource.java` — Exchange rate form params
- `backend/src/main/java/com/temcoservers/service/BillingService.java` — Exchange rate storage + double-entry difference journals
- `backend/src/main/resources/db/migration/V6__payment_exchange_rate_tracking.sql` — New columns + sub-accounts
- `frontend/src/pages/PaymentPage.jsx` — Swap fields, auto-calc LKR, difference indicator
- `frontend/src/pages/LandingPage.jsx` — Logged-in user name in navbar
- `frontend/src/pages/WorkflowsBlogPage.jsx` — Home link, user name, heading, CTA color fix
- `frontend/src/pages/AdminPaymentsTabs.jsx` — Exchange rate breakdown in payment review
- `frontend/src/version.js` — Bumped to v1.4.1

---

## [1.4.0] - 2026-03-18

### Added
- **PayPal Payment Integration** — Full PayPal REST API v2 support for instant payments
  - PayPalService: OAuth token, create order, capture payment
  - Three new endpoints: GET client-id, POST create-order, POST capture
  - PayPal receipt PDF generation with "PAID" watermark
  - Auto-activation of subscription on successful capture
  - PayPal voucher creation (type=4/PSP, payment_mode=5)
- **Admin Payment Review** — Admin panel for managing bank slip payments
  - List pending payments, approve/reject with notes
  - Server provisioning on approval
  - Payment notification emails (approved/rejected)
- **Workflow Automation Blog Page** — Marketing page for n8n add-on feature
  - 9 use cases, AI capabilities, 400+ integrations grid
  - Competitor comparison (vs Zapier, Make, Genspark)
  - Add-on pricing: AI Pro +$5/mo, AI Unlimited +$8/mo
  - Linked from LandingPage navbar, features grid, and footer
- **AdminPaymentsTabs** — PaymentsTab and SubscriptionsTab components for admin UI
- **Flyway Migration V4** — Admin payment review (voucher_vid, admin columns on subscription)
- **Flyway Migration V5** — PayPal support (voucher type PSP, payment mode PayPal, PayPal Revenue sub-account)

### Changed
- **PaymentPage** — Added PayPal payment method toggle, SDK loading, PayPal buttons, receipt download
- **BillingPage** — Handle pending_payment status with amber banner and payment link
- **BillingService** — subscribe() now sets status=pending_payment; filter payment history to TemcoServers vouchers only (SSP/PSP/SSR/ACP)
- **ContaboService** — Return empty list when credentials missing (graceful local dev handling)
- **LandingPage** — Added "Workflows" nav link, "AI Workflow Automation" feature card, footer link
- **docker-compose.yml** — Added PayPal environment variables (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE)
- **release.md** — Updated Cloudflare SSL from Flexible to Full with Origin Certificate

### Infrastructure
- **SSL Upgrade** — Installed Cloudflare Origin Certificate on production Nginx (port 443)
- **Cloudflare SSL** — Switched from Flexible to Full mode (end-to-end encryption)

### Files Changed
- `backend/src/main/java/com/temcoservers/service/PayPalService.java` — New PayPal API service
- `backend/src/main/java/com/temcoservers/rest/BillingResource.java` — PayPal endpoints + receipt generation
- `backend/src/main/java/com/temcoservers/service/BillingService.java` — PayPal voucher, auto-activate, payment history filter
- `backend/src/main/java/com/temcoservers/service/InvoicePdfGenerator.java` — PayPal receipt PDF
- `backend/src/main/java/com/temcoservers/rest/AdminResource.java` — Admin payment review endpoints
- `backend/src/main/java/com/temcoservers/service/AdminService.java` — Exposed EntityManager
- `backend/src/main/java/com/temcoservers/service/NotificationService.java` — Payment notifications
- `backend/src/main/java/com/temcoservers/service/ContaboService.java` — Graceful credential check
- `backend/src/main/resources/db/migration/V4__admin_payment_review.sql` — New migration
- `backend/src/main/resources/db/migration/V5__paypal_payment_support.sql` — New migration
- `frontend/src/App.jsx` — Added /workflows route
- `frontend/src/pages/PaymentPage.jsx` — PayPal integration + receipt download
- `frontend/src/pages/AdminPage.jsx` — Payments and Subscriptions tabs
- `frontend/src/pages/AdminPaymentsTabs.jsx` — New admin payment components
- `frontend/src/pages/BillingPage.jsx` — Pending payment status handling
- `frontend/src/pages/LandingPage.jsx` — Workflows nav link and feature card
- `frontend/src/pages/WorkflowsBlogPage.jsx` — New workflow automation blog page
- `docker-compose.yml` — PayPal env vars
- `frontend/src/version.js` — Bumped to v1.4.0

---

## [1.3.0] - 2026-03-17

### Added
- **CI/CD Pipeline** — GitHub Actions workflow triggered on tag push (v*)
  - Builds 3 Docker images on GitHub runners (backend, AI module, frontend)
  - SCP-based transfer to production (no container registry, no PAT tokens)
  - Auto-loads images, restarts containers, runs DB migrations
  - Automated health checks (backend, AI module, frontend, Docker status)
  - Repo stays private, no expiring tokens

### Changed
- **AI Module Dockerfile** — Removed `--reload` from uvicorn CMD (dev-only flag, wastes CPU in production)
- **Frontend Dockerfile.prod** — Pinned `nginx:1.27-alpine` (was unpinned `nginx:alpine` — prevents version drift between builds)
- **docker-compose.prod.yml** — Pinned `mariadb:11.8` (was unpinned `mariadb:11`), updated header comments for CI/CD vs fallback mode

### Files Changed
- `.github/workflows/deploy.yml` — New CI/CD pipeline workflow
- `ai-module/Dockerfile` — Removed `--reload` flag
- `frontend/Dockerfile.prod` — Pinned nginx version
- `docker-compose.prod.yml` — Pinned MariaDB version, updated comments
- `frontend/src/version.js` — Bumped to v1.3.0

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
