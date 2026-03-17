# Setup Admin Panel — Reusable Guide (v2)

> **Purpose**: This document enables Cascade (or any AI assistant) to set up a full Admin Panel
> with RBAC in any system that shares the same RBAC database schema and Jakarta EE technology stack.
>
> **Tested on**: IJTS Recovery System (multi-module EAR), TemcoServers Platform (single WAR + Docker).
>
> **Usage**: Point Cascade to this file along with the target project path:
> ```
> @setup-admin-panel.md — Set up the Admin Panel for the project at <PROJECT_PATH>
> ```

---

## 1. Prerequisites

### 1.1 Technology Stack (supported variants)

| Layer        | Option A (Reference)                         | Option B (Lightweight)                       |
|--------------|----------------------------------------------|----------------------------------------------|
| Database     | MySQL 5.7+ / 8.x                            | MariaDB 10.6+                                |
| Backend      | Jakarta EE 10, WildFly 30+                   | Same                                         |
| Build        | Maven multi-module (EJB + WAR + EAR)         | Maven single WAR module                      |
| ORM          | JPA (EntityManager, native SQL)              | Same                                         |
| Auth         | JWT (`io.jsonwebtoken:jjwt`) + BCrypt        | Same                                         |
| BCrypt       | `at.favre.lib:bcrypt` (favre-lib)            | `org.mindrot:jbcrypt` (jbcrypt-0.4)          |
| Frontend     | React 18+ / Vite / TailwindCSS               | Same                                         |
| State mgmt   | `@tanstack/react-query`                      | Plain `axios` + `useState/useEffect`         |
| Icons        | Lucide React                                 | Same                                         |
| Migrations   | Raw SQL scripts (`scripts/migrations/`)      | Flyway (`classpath:db/migration`)            |
| Deployment   | Standalone WildFly (EAR file copy)           | Docker (image build + compose up)            |

Cascade must **detect which variant** the target project uses before generating code. Check:
- `pom.xml` for `<packaging>war</packaging>` vs `<modules>` with ejb/web/ear
- `pom.xml` for `at.favre.lib` vs `org.mindrot` BCrypt dependency
- `package.json` for `@tanstack/react-query` presence
- Project root for `Dockerfile` / `docker-compose.yml` presence
- Backend `src/main/resources/db/migration/` for Flyway convention

### 1.2 Required Database Tables (must already exist)

These 10 tables form the RBAC model. They exist in the **application database** (e.g. `my_app_db`).
The `general_user_profile` table may live in the **same database** or a **separate read-only database** — see `GUP_DB_LOCATION` in Section 2.

#### Core 6 Tables

| # | Table                          | Purpose                      | Key Columns                                            |
|---|--------------------------------|------------------------------|--------------------------------------------------------|
| 1 | `user_role`                    | Role definitions             | `ur_id` PK, `role_name`, `role_order`                  |
| 2 | `user_login`                   | System user accounts         | `login_id` PK, `username`, `password`, `is_active`, `user_role_ur_id` FK, `general_user_profilegup_id` FK, `system_interface_si_id` FK, `max_login_attempt`, `count_attempt`, `is_first_time` |
| 3 | `privileges`                   | CRUD privilege types         | `id` PK, `name` (View, Insert, Update, Delete)        |
| 4 | `user_login_has_privileges`    | User ↔ Privilege junction    | `id` PK, `privileges_id` FK, `user_login_login_id` FK |
| 5 | `system_interface`             | Page/screen definitions      | `si_id` PK, `interface_name`, `display_name`, `url`, `interface_menu_if_id` FK, `icon` |
| 6 | `user_role_has_system_interface` | Role ↔ Page access         | `id` PK, `system_interface_si_id` FK, `user_role_ur_id` FK |

#### Module Tables (4 additional)

| # | Table                              | Purpose                    | Key Columns                                           |
|---|------------------------------------|----------------------------|-------------------------------------------------------|
| 7 | `use_case`                         | Module definitions         | `uc_id` PK, `case_name`                              |
| 8 | `use_case_has_user_role`           | Module ↔ Role access       | `uc_ur_id` PK, `use_case_uc_id` FK, `user_role_ur_id` FK |
| 9 | `use_case_has_system_interface`    | Module ↔ Page mapping      | `uc_si_id` PK, `system_interface_si_id` FK, `use_case_uc_id` FK |
| 10| `user_login_has_usecase`           | User ↔ Module access       | `id` PK, `use_case_uc_id` FK, `user_login_login_id` FK |

#### Person Profile Table

| Scenario | Table Reference |
|----------|-----------------|
| **Same DB** | `general_user_profile` (direct JOIN, no cross-DB prefix) |
| **External DB** | `<EXTERNAL_DB>.general_user_profile` (cross-DB query required) |

### 1.3 Required Supporting Infrastructure

| Item                     | Details                                                   |
|--------------------------|-----------------------------------------------------------|
| `interface_menu` table   | Menu groupings — at least one row (e.g. id=100, name="My App") |
| Auth endpoint            | Existing login via `user_login` table with BCrypt + JWT   |
| JWT utility              | `JwtUtil` class, or `AuthService` with `getUserFromToken()` method |
| Persistence unit         | Configured in `persistence.xml` (e.g. `MyAppPU`) |

---

## 2. Customization Points

Before starting, Cascade must **auto-detect or ask** for these project-specific values.
Values marked with ⚡ should be auto-detected by inspecting the codebase.

```yaml
# ── STRUCTURAL (detect from project files) ────────────────

PROJECT_PATH:          "F:/MyProject/my-system"              # ⚡ Root of the project
PROJECT_TYPE:          "war"                                  # ⚡ "ear" (multi-module) or "war" (single module)
#   If "ear":
#     EJB_MODULE:      "my-system-ejb"                       # EJB sub-module name
#     WEB_MODULE:      "my-system-web"                       # WAR sub-module name
#     EAR_MODULE:      "my-system-ear"                       # EAR sub-module name
#   If "war":
#     BACKEND_DIR:     "backend"                             # Backend sub-folder (or "." if root)
FRONTEND_PATH:         "frontend"                             # ⚡ React/Vite sub-folder (relative to PROJECT_PATH)

# ── DATABASE ──────────────────────────────────────────────

DATABASE_NAME:         "my_app_db"                            # ⚡ Application database name
GUP_DB_LOCATION:       "same"                                 # ⚡ "same" or "external"
#   If "external":
#     EXTERNAL_DB_NAME: "external_db"                        # External DB with general_user_profile
PERSISTENCE_UNIT:      "MyAppPU"                              # ⚡ From persistence.xml

# ── JAVA ──────────────────────────────────────────────────

JAVA_PACKAGE_SERVICE:  "com.mycompany.myapp.service"          # ⚡ Package where AdminService.java goes
JAVA_PACKAGE_REST:     "com.mycompany.myapp.rest"             # ⚡ Package where AdminResource.java goes
BCRYPT_LIBRARY:        "mindrot"                              # ⚡ "mindrot" (org.mindrot.jbcrypt) or "favre" (at.favre.lib)
BCRYPT_COST:           12                                     # BCrypt cost factor (10-12 recommended)

# ── MIGRATION ─────────────────────────────────────────────

MIGRATION_TOOL:        "flyway"                               # ⚡ "flyway" or "raw" (manual SQL scripts)
#   If "flyway":
#     Next version auto-detected from existing V*.sql files in db/migration/
#   If "raw":
#     MIGRATION_DIR:   "scripts/migrations"

# ── REST API ──────────────────────────────────────────────

REST_PREFIX:           "/admin/rbac"                           # Prefix for RBAC endpoints
#   Use "/admin/rbac" if project already has /admin/* endpoints (avoids collisions)
#   Use "/admin" if no existing admin endpoints

# ── FRONTEND ──────────────────────────────────────────────

FRONTEND_PATTERN:      "axios-useState"                       # ⚡ "react-query" or "axios-useState"
ADMIN_MODE:            "merge"                                 # "merge" (into existing admin page) or "standalone" (new page)
#   If "merge":
#     EXISTING_ADMIN_PAGE: "src/pages/AdminPage.jsx"         # ⚡ Path to existing admin component
#   If "standalone":
#     ADMIN_ROUTE:     "/admin-panel"                        # Route for the new page
FRONTEND_DEV_PORT:     3001                                   # ⚡ Vite dev server port

# ── RBAC DATA ─────────────────────────────────────────────

INTERFACE_MENU_ID:     100                                    # FK for system_interface.interface_menu_if_id (pick unused ID)
EXISTING_ROLES:        []                                     # ⚡ Query: SELECT ur_id, role_name FROM user_role
EXISTING_PAGES:        []                                     # ⚡ Query: SELECT si_id, interface_name FROM system_interface
EXISTING_MODULES:      []                                     # ⚡ Query: SELECT uc_id, case_name FROM use_case

# Roles to seed (adjust IDs to avoid conflicts with EXISTING_ROLES)
NEW_ROLES:
  - { id: 101, name: "Super Admin",  order: 0 }
  - { id: 102, name: "System Admin", order: 1 }
  - { id: 103, name: "Regular User", order: 2 }
  # ... add project-specific roles with unused IDs

# Modules to seed
NEW_MODULES:
  - { id: 155, name: "Admin Panel" }
  # ... add project-specific modules

# Pages to register (adjust si_id to avoid conflicts with EXISTING_PAGES)
NEW_PAGES:
  - { id: 505, interface_name: "AdminPanel", display_name: "Admin Panel", url: "/admin", icon: "shield" }
  # ... add project-specific pages

# ── DEPLOYMENT ────────────────────────────────────────────

DEPLOY_METHOD:         "docker"                               # ⚡ "docker" or "standalone"
#   If "standalone":
#     WILDFLY_DEPLOY_PATH: "F:/path/to/wildfly/standalone/deployments"
#     ARTIFACT_FILENAME:   "my-system.ear"  # or "my-system.war"
#   If "docker":
#     DOCKER_COMPOSE:      "docker-compose.yml"
#     BACKEND_SERVICE:     "backend"
```

### 2.1 Auto-Detection Procedure

Cascade should run these checks in order before asking the user:

1. **Read `pom.xml`** → detect `<packaging>`, BCrypt dependency, persistence unit
2. **Read `package.json`** → detect `@tanstack/react-query` presence
3. **List `src/main/resources/db/migration/`** → if exists, `MIGRATION_TOOL=flyway`
4. **Check for `Dockerfile`** → if exists, `DEPLOY_METHOD=docker`
5. **Search for existing admin page** → grep for `AdminPage` or `admin` route in `App.jsx`
6. **Query database** → `SELECT MAX(si_id) FROM system_interface`, `SELECT MAX(ur_id) FROM user_role`, etc. to determine safe IDs
7. **Check GUP location** → if `general_user_profile` is in the same DB, set `GUP_DB_LOCATION=same`

---

## 3. Implementation Steps

### Step 3.1 — SQL Migration

#### If `MIGRATION_TOOL=flyway`:

Create `V<N>__admin_panel_rbac.sql` in `<BACKEND_DIR>/src/main/resources/db/migration/`:
- Auto-detect `<N>` as next version number from existing files.

#### If `MIGRATION_TOOL=raw`:

Create `v<VERSION>_admin_panel.sql` in `<MIGRATION_DIR>/`.

#### Migration content (same for both):

```sql
-- 1. Seed roles (if NEW_ROLES has entries not in EXISTING_ROLES)
INSERT IGNORE INTO user_role (ur_id, role_name, role_order) VALUES ...;

-- 2. Create interface_menu group (if needed)
INSERT IGNORE INTO interface_menu (if_id, menu_name) VALUES (<INTERFACE_MENU_ID>, '<ProjectName>');

-- 3. Seed pages
INSERT IGNORE INTO system_interface (si_id, interface_name, display_name, url, icon, interface_menu_if_id)
VALUES ...;  -- Use IDs from NEW_PAGES

-- 4. Seed modules
INSERT IGNORE INTO use_case (uc_id, case_name) VALUES ...;  -- Use IDs from NEW_MODULES

-- 5. Map pages → modules
INSERT IGNORE INTO use_case_has_system_interface (system_interface_si_id, use_case_uc_id) VALUES ...;

-- 6. Map modules → roles
INSERT IGNORE INTO use_case_has_user_role (use_case_uc_id, user_role_ur_id) VALUES ...;

-- 7. Map pages → roles (determines sidebar visibility)
INSERT IGNORE INTO user_role_has_system_interface (system_interface_si_id, user_role_ur_id) VALUES ...;
```

**Important**: Always use `INSERT IGNORE` (MySQL/MariaDB) to make migrations idempotent. Query `SELECT MAX(si_id)`, `SELECT MAX(ur_id)`, etc. to pick safe IDs.

### Step 3.2 — Backend Service (AdminService.java)

#### File location:

| Project Type | Path |
|-------------|------|
| **EAR** | `<EJB_MODULE>/src/main/java/<package_path>/AdminService.java` |
| **WAR** | `<BACKEND_DIR>/src/main/java/<package_path>/AdminService.java` |

**If an `AdminService.java` already exists**: extend it with the new methods rather than creating a new file.

#### Class structure:

```java
@Stateless
public class AdminService {
    @PersistenceContext(unitName = "<PERSISTENCE_UNIT>")
    private EntityManager em;
    // ... methods below
}
```

#### BCrypt usage (adapt based on `BCRYPT_LIBRARY`):

| Library | Import | Hash | Verify |
|---------|--------|------|--------|
| **mindrot** | `import org.mindrot.jbcrypt.BCrypt;` | `BCrypt.hashpw(pwd, BCrypt.gensalt(COST))` | `BCrypt.checkpw(pwd, hash)` |
| **favre** | `import at.favre.lib.crypto.bcrypt.BCrypt;` | `BCrypt.withDefaults().hashToString(COST, pwd.toCharArray())` | `BCrypt.verifyer().verify(pwd.toCharArray(), hash).verified` |

#### GUP query (adapt based on `GUP_DB_LOCATION`):

| Location | JOIN clause |
|----------|-------------|
| **same** | `JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id` |
| **external** | `JOIN <EXTERNAL_DB_NAME>.general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id` |

#### Required methods (all use native SQL via EntityManager):

| Category      | Methods                                                                    |
|---------------|---------------------------------------------------------------------------|
| **Users**     | `getUsers()`, `getUserById(int)`, `createUser(Map)`, `updateUser(int, Map)`, `deleteUser(int)`, `resetLoginAttempts(int)` |
| **Roles**     | `getRoles()`, `createRole(Map)`, `updateRole(int, Map)`, `setRolePages(int, List<Integer>)`, `setRoleModules(int, List<Integer>)` |
| **Modules**   | `getModules()`, `createModule(Map)`, `updateModule(int, Map)`, `setModulePages(int, List<Integer>)` |
| **Pages**     | `getSystemInterfaces()`, `createSystemInterface(Map)` |
| **Privileges**| `getPrivileges()` |
| **GUP Search**| `searchGup(String)` — query `general_user_profile` (same or cross-DB) |
| **Helpers**   | `getUserPrivileges(int)`, `setUserPrivileges(int, List)`, `getUserModules(int)`, `getRolePages(int)`, `getRoleModules(int)`, `getModulePages(int)`, `assignUserModulesFromRole(int, int)` |

#### Key behaviors:

- **`createUser`**: Hash password with BCrypt, check username uniqueness, insert `user_login` (set `system_interface_si_id` to the Admin Panel page ID), auto-assign modules from role via `assignUserModulesFromRole()`
- **`updateUser`**: Dynamic SET clause — only update provided fields. Re-hash password only if non-blank.
- **`deleteUser`**: Soft-delete — set `is_active = 0`. **Never hard delete.**
- **`getUsers`**: JOIN `user_login` → `general_user_profile` → `user_role`. Include nested `privileges[]` and `modules[]` arrays.
- **`setRolePages`**: DELETE all existing + re-INSERT (idempotent replace pattern).
- **`searchGup`**: `WHERE first_name LIKE :q OR last_name LIKE :q OR nic LIKE :q OR email LIKE :q LIMIT 20`

### Step 3.3 — Backend REST Resource (AdminResource.java)

#### File location:

| Project Type | Path |
|-------------|------|
| **EAR** | `<WEB_MODULE>/src/main/java/<package_path>/AdminResource.java` |
| **WAR** | `<BACKEND_DIR>/src/main/java/<package_path>/AdminResource.java` |

**If an `AdminResource.java` already exists**: extend it with the new endpoints rather than creating a new file. Use `REST_PREFIX` to avoid path collisions.

#### Class structure:

```java
@Path("<REST_PREFIX_BASE>")   // e.g. "/admin"
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AdminResource {
    @EJB private AdminService adminService;
    @EJB private AuthService authService;  // for JWT validation
    // ...
}
```

#### Admin validation pattern:

```java
private String validateAdmin(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
    try {
        Map<String, Object> user = authService.getUserFromToken(authHeader.substring(7));
        String role = (String) user.get("role");
        if ("Super Admin".equals(role) || "System Admin".equals(role)) return role;
    } catch (Exception ignored) {}
    return null;
}
```

#### Endpoints (19 total):

All endpoints require `@HeaderParam("Authorization") String authHeader` and call `validateAdmin()`. Return 403 if null.

| Method | Path                                      | Description                |
|--------|-------------------------------------------|----------------------------|
| GET    | `<REST_PREFIX>/users`                     | List all users             |
| GET    | `<REST_PREFIX>/users/{id}`                | Get user by ID             |
| POST   | `<REST_PREFIX>/users`                     | Create user                |
| PUT    | `<REST_PREFIX>/users/{id}`                | Update user                |
| DELETE | `<REST_PREFIX>/users/{id}`                | Deactivate user            |
| POST   | `<REST_PREFIX>/users/{id}/reset-attempts` | Reset failed logins        |
| GET    | `<REST_PREFIX>/roles`                     | List all roles             |
| POST   | `<REST_PREFIX>/roles`                     | Create role                |
| PUT    | `<REST_PREFIX>/roles/{id}`                | Update role                |
| PUT    | `<REST_PREFIX>/roles/{id}/pages`          | Set role page access       |
| PUT    | `<REST_PREFIX>/roles/{id}/modules`        | Set role module access     |
| GET    | `<REST_PREFIX>/modules`                   | List all modules           |
| POST   | `<REST_PREFIX>/modules`                   | Create module              |
| PUT    | `<REST_PREFIX>/modules/{id}`              | Update module              |
| PUT    | `<REST_PREFIX>/modules/{id}/pages`        | Set module pages           |
| GET    | `<REST_PREFIX>/pages`                     | List all system_interfaces |
| POST   | `<REST_PREFIX>/pages`                     | Register new page          |
| GET    | `<REST_PREFIX>/privileges`                | List all privileges        |
| GET    | `<REST_PREFIX>/gup-search?q=`             | Search person profiles     |

**Error handling:** Wrap each method in try/catch:
- `IllegalArgumentException` → 400 with `Map.of("error", message)`
- All other exceptions → 500 with `Map.of("error", message)`

### Step 3.4 — Frontend Components

#### If `ADMIN_MODE=standalone` (new page):

Create a single file with all 4 RBAC tabs:
```
<FRONTEND_PATH>/src/pages/admin/AdminPanel.jsx
```

#### If `ADMIN_MODE=merge` (extend existing admin page):

**Recommended: split RBAC tabs into a separate file** for maintainability:

```
<FRONTEND_PATH>/src/pages/AdminRbacTabs.jsx    ← NEW: UsersTab, RolesTab, ModulesPagesTab
<FRONTEND_PATH>/src/pages/AdminPage.jsx         ← EXISTING: import + add tabs
```

Then in the existing admin page:
1. Import: `import { UsersTab, RolesTab, ModulesPagesTab } from './AdminRbacTabs'`
2. Add new items to the nav/tab array with a section divider
3. Add tab content sections that render `<UsersTab />`, `<RolesTab />`, `<ModulesPagesTab />`

#### RBAC Tabs (3 or 4 depending on whether Modules & Pages are combined):

| Tab                 | Content                                                                  |
|---------------------|--------------------------------------------------------------------------|
| **Users**           | Searchable table, Create/Edit modal (GUP search, role select, privilege toggles, password, active toggle), deactivate, reset attempts |
| **Roles & Perms**   | Expandable role cards, toggle page access buttons, toggle module access buttons per role |
| **Modules & Pages** | Expandable module cards with page toggles + pages table with inline create form |

#### Frontend state management (adapt based on `FRONTEND_PATTERN`):

| Pattern | Data fetching | Mutations | Cache invalidation |
|---------|---------------|-----------|-------------------|
| **react-query** | `useQuery(['rbac-users'], () => api.get(...))` | `useMutation(...)` + `queryClient.invalidateQueries()` | Automatic |
| **axios-useState** | `useState` + `useEffect` + `useCallback` | `async function` + re-call `fetchAll()` | Manual |

Both patterns produce the same UX. Use whichever the project already uses.

#### Key UX patterns (same for both):

- Toggle buttons for privilege/page/module assignment (click = instant save)
- GUP search with debounced input (400ms) + dropdown results
- Password field with show/hide toggle
- Active status as a toggle switch
- Expandable cards with ChevronUp/ChevronDown icons
- Section divider in sidebar between existing tabs and RBAC tabs (if merging)

### Step 3.5 — Route & Navigation

#### If `ADMIN_MODE=standalone`:

**App.jsx** (or equivalent router file):
- Add lazy import: `const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'))`
- Add route: `<Route path="<ADMIN_ROUTE>" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />`

**Layout/Sidebar**:
- Add nav item: `{ name: 'Admin Panel', href: '<ADMIN_ROUTE>', icon: Shield }`

#### If `ADMIN_MODE=merge`:

No new routes needed. Just update the existing admin page component to include the RBAC tabs.

### Step 3.6 — Build & Deploy

#### If `DEPLOY_METHOD=docker`:

```bash
# 1. Build and restart backend
docker compose up -d --build <BACKEND_SERVICE>

# 2. Verify (check container logs for Flyway migration + deployment)
docker logs <BACKEND_CONTAINER> --tail 30

# 3. Look for: "Flyway: Migration complete — N migration(s) applied"
# 4. Look for: "Deployed \"app.war\""
```

#### If `DEPLOY_METHOD=standalone`:

```bash
# 1. Build
cd <PROJECT_PATH>
mvn clean package -DskipTests -q

# 2. Deploy
cp <EAR_MODULE>/target/<ARTIFACT_FILENAME> <WILDFLY_DEPLOY_PATH>/<ARTIFACT_FILENAME>

# 3. Run migration manually (if MIGRATION_TOOL=raw)
mysql -u root -p <DATABASE_NAME> < scripts/migrations/v<VERSION>_admin_panel.sql

# 4. Verify (WildFly log should show: "Replaced deployment")
```

---

## 4. Reference Implementations

### 4.1 IJTS Recovery System (EAR, favre BCrypt, React Query, external GUP DB)

| File | Path |
|------|------|
| SQL Migration | `scripts/migrations/v1.5.76_admin_panel.sql` |
| AdminService.java | `jiat-recovery-ejb/src/main/java/com/jiat/recovery/service/AdminService.java` |
| AdminResource.java | `jiat-recovery-web/src/main/java/com/jiat/recovery/rest/AdminResource.java` |
| api.js (adminApi) | `jiat-recovery-frontend/src/services/api.js` |
| AdminPanel.jsx | `jiat-recovery-frontend/src/pages/admin/AdminPanel.jsx` |
| Layout.jsx | `jiat-recovery-frontend/src/components/Layout.jsx` |
| App.jsx | `jiat-recovery-frontend/src/App.jsx` |

### 4.2 TemcoServers Platform (WAR, mindrot BCrypt, axios+useState, same DB, Flyway, Docker, merged tabs)

| File | Path |
|------|------|
| Flyway Migration | `backend/src/main/resources/db/migration/V3__register_temcoservers_pages.sql` |
| AdminService.java | `backend/src/main/java/com/temcoservers/service/AdminService.java` |
| AdminResource.java | `backend/src/main/java/com/temcoservers/rest/AdminResource.java` |
| AdminRbacTabs.jsx | `frontend/src/pages/AdminRbacTabs.jsx` (split component) |
| AdminPage.jsx | `frontend/src/pages/AdminPage.jsx` (merged — 7 tabs) |
| App.jsx | `frontend/src/App.jsx` |

### Key Differences Between Implementations

| Aspect | IJTS Recovery | TemcoServers |
|--------|--------------|--------------|
| Project type | Multi-module EAR | Single WAR |
| BCrypt | `at.favre.lib` | `org.mindrot.jbcrypt` |
| GUP location | External DB (`ijts_system`) | Same DB |
| Migration | Raw SQL script | Flyway V3 |
| REST prefix | `/admin/` | `/admin/rbac/` (avoids collision) |
| Frontend pattern | React Query | axios + useState |
| Admin page | Standalone `/admin-panel` | Merged into existing `/admin` (7 tabs) |
| Component structure | Single AdminPanel.jsx | Split: AdminPage.jsx + AdminRbacTabs.jsx |
| Deployment | EAR copy to WildFly | Docker build + compose up |

---

## 5. RBAC Data Model Summary

```
use_case (Module)
  ├── use_case_has_user_role        → which roles can access this module
  ├── use_case_has_system_interface → which pages belong to this module
  └── user_login_has_usecase        → which users have access to this module

user_role (Role)
  ├── user_role_has_system_interface → which pages this role can see (sidebar)
  └── user_login.user_role_ur_id    → which users have this role

user_login (User)
  ├── user_login_has_privileges     → per-user CRUD privileges (View/Insert/Update/Delete)
  ├── user_login_has_usecase        → per-user module access
  └── general_user_profilegup_id   → link to person profile (same or external DB)

Login Flow:
  username/password → BCrypt verify → fetch allowedPages from
  user_role_has_system_interface → generate JWT → frontend uses
  allowedPages to filter sidebar navigation
```

---

## 6. Troubleshooting

### BCrypt `$2a$` vs `$2b$` Prefix

Java's `org.mindrot.jbcrypt` only accepts `$2a$` hashes. Python's `bcrypt` library generates `$2b$` by default. If you generate hashes with Python, **replace `$2b$` with `$2a$`** in the output before storing in the database. Both are functionally identical.

### Shell Escaping BCrypt Hashes

BCrypt hashes contain `$` characters which shells (Bash, PowerShell) interpret as variables. When inserting hashes via command line:

```bash
# WRONG — shell eats the $ signs
docker exec mariadb mariadb -e "UPDATE user_login SET password = '$2a$10$abc...' WHERE ..."

# CORRECT — encode as base64 and pipe
$sql = "UPDATE user_login SET password = '<hash>' WHERE username = 'admin';"
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sql))
docker exec mariadb bash -c "echo $b64 | base64 -d | mariadb -u root -p'<pwd>' <db>"
```

### Flyway Baseline on Existing Database

When adding Flyway to a project that already has tables, you must baseline:

```java
Flyway flyway = Flyway.configure()
    .dataSource(dataSource)
    .locations("classpath:db/migration")
    .baselineOnMigrate(true)
    .baselineVersion("0")               // treat existing schema as version 0
    .table("flyway_schema_history")
    .load();
flyway.migrate();
```

### REST Path Collisions

If the project already has `/admin/*` endpoints (e.g. `/admin/stats`, `/admin/customers`), use `/admin/rbac/*` as the prefix for RBAC endpoints. This avoids JAX-RS path conflicts. Set `REST_PREFIX=/admin/rbac` in customization points.

### Cross-DB Query Permissions

If `GUP_DB_LOCATION=external`, the database user must have SELECT permission on the external database:

```sql
GRANT SELECT ON <EXTERNAL_DB_NAME>.general_user_profile TO 'app_user'@'%';
```

### WildFly Config History Warning

WildFly may log this error on startup:
```
Could not rename .../standalone_xml_history/current to .../standalone_xml_history/20260317-...
```
This is a **harmless Docker volume artifact** — it does not affect deployment.

---

## 7. Checklist

Before marking complete, verify:

**Backend:**
- [ ] Migration executed without errors (check Flyway logs or manual run)
- [ ] `AdminService.java` compiles (check BCrypt import matches `BCRYPT_LIBRARY`)
- [ ] `AdminResource.java` compiles (check `REST_PREFIX` is correct)
- [ ] All RBAC endpoints return data (test `GET <REST_PREFIX>/roles` in browser/curl)

**Frontend:**
- [ ] RBAC tabs component created (standalone or split file)
- [ ] Users tab loads and shows existing users with roles/privileges
- [ ] Roles tab shows all roles with expandable page/module toggles
- [ ] Can create a new user with GUP search, role assignment, and privileges
- [ ] Can toggle page access for a role (instant save)
- [ ] Route added (if standalone) or tabs merged (if merge mode)

**Integration:**
- [ ] Build succeeds: `mvn clean package -DskipTests` or `docker compose build`
- [ ] Deployed without errors in WildFly/container log
- [ ] Admin login → navigate to RBAC tabs → data loads correctly
- [ ] Created user can log in with assigned role
