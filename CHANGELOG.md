# Changelog

All notable changes to the TemcoServers platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
