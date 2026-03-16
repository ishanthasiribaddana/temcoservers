# Changelog

All notable changes to the TemcoServers platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
