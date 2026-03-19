# Double-Entry Accounting Module — Setup Guide

A generic, production-grade double-entry bookkeeping module that can be embedded into any application. This document describes the data model, schema creation, seed data patterns, DR/CR conventions, and report generation (starting with Profit & Loss).

---

## Table of Contents

1. [Data Model Overview](#1-data-model-overview)
2. [Schema — Table Definitions](#2-schema--table-definitions)
3. [Seed Data — Chart of Accounts](#3-seed-data--chart-of-accounts)
4. [DR/CR Convention](#4-drcr-convention)
5. [Recording Transactions](#5-recording-transactions)
6. [Reports — Profit & Loss Statement](#6-reports--profit--loss-statement)
7. [Multi-Currency Support](#7-multi-currency-support)
8. [Accounts Payable & Receivable](#8-accounts-payable--receivable)
9. [Backend Implementation (Java EE)](#9-backend-implementation-java-ee)
10. [Frontend Implementation (React)](#10-frontend-implementation-react)
11. [Extension Points](#11-extension-points)

---

## 1. Data Model Overview

The accounting module uses a **5-tier hierarchy** with a **journal entry (voucher)** system:

```
account_type                   (5 fundamental types: A, L, E, R, X)
  └── main_chart_of_account    (top-level groupings)
       └── chart_of_account    (individual accounts)
            └── sub_chart_of_account  (granular sub-accounts, self-referencing tree)

voucher                        (journal entry header)
  └── voucher_item             (line items — each links to a sub_chart_of_account)
```

### Entity Relationship

```
account_type (1) ──< main_chart_of_account (1) ──< chart_of_account (1) ──< sub_chart_of_account
                                                                                     │
voucher_type (1) ──< voucher (1) ──< voucher_item (N) ─────────────────────────────-─┘
                         │                │
                    payment_mode     scoa_type (classification)
```

### Design Principles

- **Every financial transaction** creates a `voucher` (journal entry header) with two or more `voucher_item` entries (line items)
- **DR and CR must always balance** within a voucher — enforced by application logic
- **Sub-accounts form a unary tree** — `sub_chart_of_account` can reference a parent `sub_chart_of_account` for hierarchical grouping
- **Soft delete** — `is_active` flags on both `voucher` and `voucher_item`; never hard-delete financial records
- **Completion workflow** — `is_completed` flag separates draft/pending entries from finalized ones
- **Reports aggregate `voucher_item`** records by account hierarchy, filtered by completion status

---

## 2. Schema — Table Definitions

### 2.1 Account Type

The 5 fundamental accounting types (GAAP/IFRS compliant).

```sql
CREATE TABLE account_type (
    a_id        INT PRIMARY KEY AUTO_INCREMENT,
    type_name   VARCHAR(255),
    code        VARCHAR(45)         -- A, L, E, R, X
);
```

### 2.2 Main Chart of Account

Top-level groupings that categorize accounts (e.g., Current Assets, Operating Expenses).

```sql
CREATE TABLE main_chart_of_account (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    name                VARCHAR(255),
    account_type_a_id   INT NOT NULL,
    FOREIGN KEY (account_type_a_id) REFERENCES account_type(a_id)
);
```

### 2.3 Chart of Account (COA)

Individual named accounts (e.g., "Bank - Commercial Bank", "Service Revenue").

```sql
CREATE TABLE chart_of_account (
    coa_id                      INT PRIMARY KEY AUTO_INCREMENT,
    account_name                VARCHAR(255),
    code                        VARCHAR(45),        -- e.g., A-1001, R-4001, X-5001
    is_active                   INT DEFAULT 1,
    account_typea_id            INT NOT NULL,
    main_chart_of_account_id    INT,
    FOREIGN KEY (account_typea_id) REFERENCES account_type(a_id),
    FOREIGN KEY (main_chart_of_account_id) REFERENCES main_chart_of_account(id)
);
```

### 2.4 SCOA Type

Classification for sub-chart of accounts.

```sql
CREATE TABLE scoa_type (
    id_st   INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(45)         -- e.g., Revenue Item, Expense Item, Bank Account, Payable Item
);
```

### 2.5 Sub Chart of Account (SCA)

Granular sub-accounts with **self-referencing tree** support. This is where `voucher_item` entries post to.

```sql
CREATE TABLE sub_chart_of_account (
    is_sca                              INT PRIMARY KEY AUTO_INCREMENT,
    reference                           VARCHAR(255),   -- unique reference code
    code                                VARCHAR(45),    -- hierarchical code, e.g., R-4001-01
    sub_account_name                    VARCHAR(255),
    chart_of_accountcoa_id              INT,
    status                              VARCHAR(45) NOT NULL DEFAULT 'active',
    scoa_type_id_st                     INT,
    sub_chart_of_account_is_sca         INT,            -- parent SCA (self-referencing, NULL = root)
    general_organization_profile_id_gop INT,            -- optional: link to external org/vendor
    FOREIGN KEY (chart_of_accountcoa_id) REFERENCES chart_of_account(coa_id),
    FOREIGN KEY (scoa_type_id_st) REFERENCES scoa_type(id_st),
    FOREIGN KEY (sub_chart_of_account_is_sca) REFERENCES sub_chart_of_account(is_sca)
);
```

### 2.6 Payment Mode

```sql
CREATE TABLE payment_mode (
    payment_mode_id     INT PRIMARY KEY AUTO_INCREMENT,
    payment_type        VARCHAR(255)    -- Bank Transfer, Cash, Online Payment, Cheque
);
```

### 2.7 Voucher Type

Classifies the nature of a transaction.

```sql
CREATE TABLE voucher_type (
    vt_id               INT PRIMARY KEY AUTO_INCREMENT,
    name                VARCHAR(255),
    id_abbreviation     VARCHAR(255)    -- prefix for voucher IDs, e.g., INV, PAY, EXP
);
```

### 2.8 Voucher (Journal Entry Header)

```sql
CREATE TABLE voucher (
    vid                                 INT PRIMARY KEY AUTO_INCREMENT,
    id                                  VARCHAR(255),       -- human-readable ID, e.g., INV-20260318-001
    description                         VARCHAR(6000),
    date                                DATE,
    voucher_total                       DOUBLE,
    general_user_profilegup_id          INT NOT NULL,       -- the user/customer this voucher is for
    voucher_typevt_id                   INT NOT NULL,
    user_loginlogin_id                  INT,                -- who created this voucher
    branch_bid                          INT NOT NULL,       -- branch/location
    login_sessionsession_id             INT NOT NULL,
    is_active                           INT DEFAULT 1,
    is_completed                        TINYINT(1) DEFAULT 0,
    payment_date                        DATE,               -- NULL = unpaid
    due                                 DOUBLE,
    total_paid                          DOUBLE,
    payment_mode_payment_mode_id        INT,
    intl_payment                        DECIMAL(10,2),      -- international currency amount
    currency_type_id                    INT,
    shipping_fee                        DOUBLE,
    time                                TIME,
    created_at                          DATETIME(6),
    updated_at                          DATETIME(6),
    record_updated_at                   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_typevt_id) REFERENCES voucher_type(vt_id),
    FOREIGN KEY (payment_mode_payment_mode_id) REFERENCES payment_mode(payment_mode_id)
);
```

### 2.9 Voucher Item (Journal Entry Line)

Each voucher_item is a single DR or CR posting to a sub-chart of account.

```sql
CREATE TABLE voucher_item (
    vi_id                           INT PRIMARY KEY AUTO_INCREMENT,
    id                              VARCHAR(255),       -- format: {voucher_id}-DR or {voucher_id}-CR
    description                     VARCHAR(255),
    date                            DATE,
    is_active                       INT DEFAULT 1,
    amount                          DOUBLE,             -- always positive; DR/CR determined by id suffix
    vouchervid                      INT NOT NULL,
    voucher_typevt_id               INT NOT NULL,
    user_loginlogin_id              INT,
    login_sessionsession_id         INT NOT NULL,
    sub_chart_of_accountis_sca      INT,                -- which sub-account this posts to
    voucher_item_vi_id              INT,                -- optional: links to another voucher_item
    is_deleted                      TINYINT(1) DEFAULT 0,
    is_completed                    TINYINT(1) DEFAULT 0,
    nbt_amount                      DOUBLE,             -- tax amount if applicable
    qty                             DOUBLE,
    unit_price                      DOUBLE,
    payment_mode_payment_mode_id    INT,
    to_be_paid_amount               DOUBLE,
    discount_percentage             DOUBLE,
    discount_value                  DOUBLE,
    discounted_amount               DOUBLE,
    due_amount                      DOUBLE,
    other_currency_amount           DOUBLE,             -- foreign currency amount
    bank_reference_no               VARCHAR(255),
    time                            TIME,
    created_at                      DATETIME(6),
    updated_at                      DATETIME(6),
    record_updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vouchervid) REFERENCES voucher(vid),
    FOREIGN KEY (voucher_typevt_id) REFERENCES voucher_type(vt_id),
    FOREIGN KEY (sub_chart_of_accountis_sca) REFERENCES sub_chart_of_account(is_sca),
    FOREIGN KEY (voucher_item_vi_id) REFERENCES voucher_item(vi_id),
    FOREIGN KEY (payment_mode_payment_mode_id) REFERENCES payment_mode(payment_mode_id)
);
```

---

## 3. Seed Data — Chart of Accounts

Customize the seed data below for your organization. The structure is generic — only account names and codes need to change.

### 3.1 Account Types (never change these)

```sql
INSERT INTO account_type (a_id, type_name, code) VALUES
    (1, 'Assets', 'A'),
    (2, 'Liabilities', 'L'),
    (3, 'Equity', 'E'),
    (4, 'Revenue', 'R'),
    (5, 'Expenses', 'X')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), code = VALUES(code);
```

### 3.2 Main Chart of Account (common groupings)

```sql
INSERT INTO main_chart_of_account (id, name, account_type_a_id) VALUES
    (1, 'Current Assets', 1),       -- Cash, Bank, Receivables
    (2, 'Fixed Assets', 1),         -- Equipment, Property
    (3, 'Current Liabilities', 2),  -- Payables, Short-term debt
    (4, 'Owner Equity', 3),         -- Capital, Retained earnings
    (5, 'Service Revenue', 4),      -- Income from services
    (6, 'Operating Expenses', 5)    -- Day-to-day costs
ON DUPLICATE KEY UPDATE name = VALUES(name), account_type_a_id = VALUES(account_type_a_id);
```

### 3.3 Chart of Account (customize per organization)

```sql
-- Example: A SaaS company
INSERT INTO chart_of_account (coa_id, account_name, code, is_active, account_typea_id, main_chart_of_account_id) VALUES
    -- Assets (type 1)
    (1, 'Bank - Primary Account', 'A-1001', 1, 1, 1),
    (2, 'Bank - Secondary Account', 'A-1002', 1, 1, 1),
    (3, 'Accounts Receivable', 'A-1100', 1, 1, 1),
    -- Revenue (type 4)
    (4, 'Subscription Revenue', 'R-4001', 1, 4, 5),
    (5, 'Service Revenue', 'R-4002', 1, 4, 5),
    -- Expenses (type 5)
    (6, 'Hosting Cost', 'X-5001', 1, 5, 6),
    (7, 'API Cost', 'X-5002', 1, 5, 6),
    (8, 'Payment Gateway Fees', 'X-5003', 1, 5, 6),
    (9, 'General Operating Expenses', 'X-5999', 1, 5, 6),
    -- Liabilities (type 2)
    (10, 'Accounts Payable', 'L-2001', 1, 2, 3)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), code = VALUES(code);
```

### 3.4 SCOA Types

```sql
INSERT INTO scoa_type (id_st, name) VALUES
    (1, 'Revenue Item'),
    (2, 'Expense Item'),
    (3, 'Bank Account'),
    (4, 'Payable Item'),
    (5, 'Receivable Item')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

### 3.5 Sub Chart of Account (customize per product/vendor)

```sql
INSERT INTO sub_chart_of_account (is_sca, reference, code, sub_account_name, chart_of_accountcoa_id, status, scoa_type_id_st) VALUES
    -- Revenue sub-accounts (per product/plan)
    (1, 'REV-PLAN-A', 'R-4001-01', 'Plan A Revenue', 4, 'active', 1),
    (2, 'REV-PLAN-B', 'R-4001-02', 'Plan B Revenue', 4, 'active', 1),
    (3, 'REV-PLAN-C', 'R-4001-03', 'Plan C Revenue', 4, 'active', 1),
    -- Bank sub-accounts (for debit entries)
    (4, 'BANK-PRIMARY', 'A-1001-01', 'Primary Bank Deposits', 1, 'active', 3),
    (5, 'BANK-SECONDARY', 'A-1002-01', 'Secondary Bank Deposits', 2, 'active', 3),
    -- Expense sub-accounts (per vendor/category)
    (6, 'EXP-HOSTING', 'X-5001-01', 'Cloud Hosting Expense', 6, 'active', 2),
    (7, 'EXP-API', 'X-5002-01', 'API Usage Expense', 7, 'active', 2),
    -- Payable sub-accounts (per vendor)
    (8, 'PAY-VENDOR-A', 'L-2001-01', 'Vendor A Payable', 10, 'active', 4),
    -- Receivable sub-accounts
    (9, 'REC-CUSTOMER-ADV', 'A-1100-01', 'Customer Advance', 3, 'active', 5)
ON DUPLICATE KEY UPDATE sub_account_name = VALUES(sub_account_name), code = VALUES(code);
```

### 3.6 Payment Modes

```sql
INSERT INTO payment_mode (payment_mode_id, payment_type) VALUES
    (1, 'Bank Transfer'),
    (2, 'Cash'),
    (3, 'Online Payment'),
    (4, 'Cheque')
ON DUPLICATE KEY UPDATE payment_type = VALUES(payment_type);
```

### 3.7 Voucher Types (customize per transaction type)

```sql
INSERT INTO voucher_type (vt_id, name, id_abbreviation) VALUES
    (1, 'Sales Invoice', 'INV'),
    (2, 'Sales Refund', 'REF'),
    (3, 'Expense Payment', 'EXP'),
    (4, 'Vendor Payable', 'PAY'),
    (5, 'Receipt', 'REC')
ON DUPLICATE KEY UPDATE name = VALUES(name), id_abbreviation = VALUES(id_abbreviation);
```

---

## 4. DR/CR Convention

### 4.1 The Fundamental Rule

| Account Type | Normal Balance | Increases With | Decreases With |
|---|---|---|---|
| **Assets** (A) | Debit | DR | CR |
| **Liabilities** (L) | Credit | CR | DR |
| **Equity** (E) | Credit | CR | DR |
| **Revenue** (R) | Credit | CR | DR |
| **Expenses** (X) | Debit | DR | CR |

### 4.2 How DR/CR is Encoded

In this data model, DR/CR is determined by the **`voucher_item.id` suffix**:

```
{voucher_id}-DR    → Debit entry
{voucher_id}-CR    → Credit entry
```

The `amount` field is **always positive**. The suffix tells the system whether it's a debit or credit.

### 4.3 Example: Customer Pays $100 for Plan A via Bank Transfer

| # | voucher_item.id | Account | SCA | Amount | Effect |
|---|---|---|---|---|---|
| 1 | `INV-20260318-001-DR` | Bank - Primary (Asset) | BANK-PRIMARY | $100 | Bank balance ↑ |
| 2 | `INV-20260318-001-CR` | Subscription Revenue | REV-PLAN-A | $100 | Revenue ↑ |

**DR = CR = $100** ✓ Balanced.

### 4.4 Example: Record Vendor Payable of $50

| # | voucher_item.id | Account | SCA | Amount | Effect |
|---|---|---|---|---|---|
| 1 | `PAY-20260318-001-DR` | Hosting Cost (Expense) | EXP-HOSTING | $50 | Expense ↑ |
| 2 | `PAY-20260318-001-CR` | Accounts Payable (Liability) | PAY-VENDOR-A | $50 | Liability ↑ |

### 4.5 Example: Settle Vendor Payable (pay the vendor)

| # | voucher_item.id | Account | SCA | Amount | Effect |
|---|---|---|---|---|---|
| 1 | `EXP-20260318-001-DR` | Accounts Payable (Liability) | PAY-VENDOR-A | $50 | Liability ↓ |
| 2 | `EXP-20260318-001-CR` | Bank - Primary (Asset) | BANK-PRIMARY | $50 | Bank balance ↓ |

---

## 5. Recording Transactions

### 5.1 Creating a Voucher with Items (Pseudocode)

```
function createTransaction(userId, voucherTypeId, description, lineItems[]):
    1. Generate unique voucher ID: "{abbreviation}-{date}-{seq}"
    2. INSERT into voucher:
       - id = generated ID
       - date = today
       - voucher_total = sum of DR amounts (or CR amounts — they must be equal)
       - general_user_profilegup_id = userId
       - voucher_typevt_id = voucherTypeId
       - is_completed = 0 (draft) or 1 (finalized)
    3. For each lineItem in lineItems:
       INSERT into voucher_item:
       - id = "{voucherId}-DR" or "{voucherId}-CR"
       - amount = lineItem.amount (always positive)
       - sub_chart_of_accountis_sca = lineItem.scaId
       - vouchervid = voucher.vid
       - voucher_typevt_id = voucherTypeId
    4. Validate: SUM(DR amounts) == SUM(CR amounts)
    5. Return voucher
```

### 5.2 Validation Rules

- **Balance check**: Total DR must equal total CR within every voucher
- **Active accounts only**: Only post to `sub_chart_of_account` where `status = 'active'`
- **Immutability**: Once `is_completed = 1`, a voucher should not be modified — create reversal entries instead
- **Soft delete only**: Set `is_active = 0` instead of DELETE; never hard-delete financial records
- **Sequential IDs**: Voucher IDs should be sequential per voucher_type for audit compliance

### 5.3 Completion Workflow

```
Draft (is_completed=0)  →  Approved (is_completed=1)  →  Paid (payment_date set)
                                                           │
                                                    Only completed vouchers
                                                    appear in P&L and reports
```

---

## 6. Reports — Profit & Loss Statement

The P&L aggregates `voucher_item` records by account type, filtered to completed vouchers only.

### 6.1 Revenue Query

Sum all CR entries posted to Revenue-type accounts (account_type = 4):

```sql
SELECT
    coa.coa_id,
    coa.account_name,
    coa.code,
    sca.is_sca,
    sca.sub_account_name,
    sca.code AS sca_code,
    COALESCE(SUM(vi.amount), 0) AS total
FROM voucher_item vi
JOIN voucher v ON vi.vouchervid = v.vid
JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca
JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id
JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id
WHERE mca.account_type_a_id = 4          -- Revenue accounts
  AND v.is_completed = 1
  AND v.is_active = 1
  AND vi.is_active = 1
  AND vi.id LIKE '%-CR'                  -- Credit entries = revenue recognized
  -- Optional date filters:
  -- AND YEAR(v.date) = ?
  -- AND MONTH(v.date) = ?
GROUP BY coa.coa_id, coa.account_name, coa.code,
         sca.is_sca, sca.sub_account_name, sca.code
ORDER BY coa.code, sca.code;
```

### 6.2 Expense Query

Sum all entries (DR) posted to Expense-type accounts (account_type = 5):

```sql
SELECT
    coa.coa_id,
    coa.account_name,
    coa.code,
    COALESCE(SUM(vi.amount), 0) AS total
FROM voucher_item vi
JOIN voucher v ON vi.vouchervid = v.vid
JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca
JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id
JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id
WHERE mca.account_type_a_id = 5          -- Expense accounts
  AND v.is_completed = 1
  AND v.is_active = 1
  AND vi.is_active = 1
  -- Optional date filters:
  -- AND YEAR(v.date) = ?
  -- AND MONTH(v.date) = ?
GROUP BY coa.coa_id, coa.account_name, coa.code
ORDER BY coa.code;
```

### 6.3 Asset Balances (Bank Balances)

Sum all DR entries posted to Asset-type accounts (account_type = 1):

```sql
SELECT
    coa.coa_id,
    coa.account_name,
    coa.code,
    COALESCE(SUM(vi.amount), 0) AS total
FROM voucher_item vi
JOIN voucher v ON vi.vouchervid = v.vid
JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca
JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id
JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id
WHERE mca.account_type_a_id = 1          -- Asset accounts
  AND v.is_completed = 1
  AND v.is_active = 1
  AND vi.is_active = 1
  AND vi.id LIKE '%-DR'                  -- Debit entries = asset increases
GROUP BY coa.coa_id, coa.account_name, coa.code
ORDER BY coa.code;
```

### 6.4 Monthly Trend (Last 12 Months)

```sql
SELECT
    YEAR(v.date) AS yr,
    MONTH(v.date) AS mo,
    COALESCE(SUM(CASE WHEN mca.account_type_a_id = 4 AND vi.id LIKE '%-CR'
                      THEN vi.amount ELSE 0 END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN mca.account_type_a_id = 5
                      THEN vi.amount ELSE 0 END), 0) AS expenses
FROM voucher_item vi
JOIN voucher v ON vi.vouchervid = v.vid
JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca
JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id
JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id
WHERE v.is_completed = 1
  AND v.is_active = 1
  AND vi.is_active = 1
  AND v.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY yr, mo
ORDER BY yr DESC, mo DESC;
```

### 6.5 P&L Response Structure

```json
{
    "revenue": [
        {
            "coaId": 4,
            "accountName": "Subscription Revenue",
            "accountCode": "R-4001",
            "scaId": 1,
            "subAccountName": "Plan A Revenue",
            "subAccountCode": "R-4001-01",
            "amount": 5000.00
        }
    ],
    "totalRevenue": 5000.00,
    "expenses": [
        {
            "coaId": 6,
            "accountName": "Hosting Cost",
            "accountCode": "X-5001",
            "amount": 1200.00
        }
    ],
    "totalExpenses": 1200.00,
    "netProfit": 3800.00,
    "assets": [
        {
            "coaId": 1,
            "accountName": "Bank - Primary Account",
            "accountCode": "A-1001",
            "amount": 15000.00
        }
    ],
    "totalAssets": 15000.00,
    "monthlyTrend": [
        { "year": 2026, "month": 3, "revenue": 2000, "expenses": 500, "netProfit": 1500 }
    ],
    "totalVouchers": 45,
    "pendingVouchers": 3,
    "filterYear": null,
    "filterMonth": null
}
```

---

## 7. Multi-Currency Support

The model supports multi-currency transactions via fields on `voucher` and `voucher_item`:

| Field | Table | Purpose |
|---|---|---|
| `intl_payment` | `voucher` | Amount in foreign currency |
| `currency_type_id` | `voucher` | FK to a currency table |
| `other_currency_amount` | `voucher_item` | Line-item foreign currency amount |

### Recording a Foreign Currency Transaction

1. Store the **local currency amount** in `voucher_item.amount` (this is what reports aggregate)
2. Store the **foreign currency amount** in `voucher_item.other_currency_amount`
3. Store the **exchange rate** used at time of transaction (in a separate tracking table or in the voucher description)
4. All reports run in **local currency** — the `amount` field

### Example: Customer pays $10 USD, exchange rate = 306 LKR/USD

```
voucher.intl_payment = 10.00 (USD)
voucher_item[0].amount = 3060.00 (LKR)  -- Bank DR
voucher_item[0].other_currency_amount = 10.00
voucher_item[1].amount = 3060.00 (LKR)  -- Revenue CR
voucher_item[1].other_currency_amount = 10.00
```

---

## 8. Accounts Payable & Receivable

### 8.1 Accounts Payable (Vendor Bills)

Use a **Liability-type** chart of account with sub-accounts per vendor.

**When service is consumed (accrual):**

| DR | CR |
|---|---|
| Expense SCA (e.g., Hosting Cost) | Vendor Payable SCA (Liability) |

**When vendor is paid (settlement):**

| DR | CR |
|---|---|
| Vendor Payable SCA (Liability) | Bank SCA (Asset) |

**Outstanding balance query:**

```sql
-- Total CR (payable created) minus total DR (payable settled) for a vendor SCA
SELECT
    (SELECT COALESCE(SUM(vi.amount), 0)
     FROM voucher_item vi
     JOIN voucher v ON vi.vouchervid = v.vid
     WHERE vi.sub_chart_of_accountis_sca = ?  -- vendor payable SCA
       AND vi.id LIKE '%-CR'
       AND v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1)
    -
    (SELECT COALESCE(SUM(vi.amount), 0)
     FROM voucher_item vi
     JOIN voucher v ON vi.vouchervid = v.vid
     WHERE vi.sub_chart_of_accountis_sca = ?  -- same vendor payable SCA
       AND vi.id LIKE '%-DR'
       AND v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1)
    AS outstanding_balance;
```

### 8.2 Accounts Receivable

Same pattern but reversed — use an **Asset-type** chart of account.

**When invoice is issued:**

| DR | CR |
|---|---|
| Receivable SCA (Asset) | Revenue SCA |

**When customer pays:**

| DR | CR |
|---|---|
| Bank SCA (Asset) | Receivable SCA (Asset) |

---

## 9. Backend Implementation (Java EE)

### 9.1 REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/accounts/profit-loss` | P&L statement with optional `?year=&month=` filters |
| `GET` | `/api/admin/accounts/vendor-payable?scaId=` | Outstanding payable for a vendor |
| `GET` | `/api/admin/accounts/pricing-tiers` | Pricing tier analysis with real cost data |

### 9.2 Service Method Pattern

```java
@Stateless
public class AccountingService {

    @PersistenceContext
    private EntityManager em;

    /**
     * Create a balanced double-entry voucher.
     * @param userId       the user/customer
     * @param typeId       voucher_type ID
     * @param description  voucher description
     * @param drScaId      debit sub-chart of account
     * @param crScaId      credit sub-chart of account
     * @param amount       transaction amount (local currency)
     * @param completed    mark as completed immediately
     */
    public int createDoubleEntry(int userId, int typeId, String description,
                                  int drScaId, int crScaId, double amount,
                                  boolean completed) {
        // 1. Get voucher type abbreviation
        Object abbr = em.createNativeQuery(
            "SELECT id_abbreviation FROM voucher_type WHERE vt_id = ?1")
            .setParameter(1, typeId).getSingleResult();

        // 2. Generate sequential voucher ID
        String voucherId = abbr + "-" +
            java.time.LocalDate.now().toString().replace("-", "") + "-" +
            String.format("%03d", getNextSequence(typeId));

        // 3. Insert voucher
        em.createNativeQuery(
            "INSERT INTO voucher (id, description, date, voucher_total, " +
            "general_user_profilegup_id, voucher_typevt_id, is_active, " +
            "is_completed, created_at) VALUES (?,?,CURDATE(),?,?,?,1,?,NOW())")
            .setParameter(1, voucherId)
            .setParameter(2, description)
            .setParameter(3, amount)
            .setParameter(4, userId)
            .setParameter(5, typeId)
            .setParameter(6, completed ? 1 : 0)
            .executeUpdate();

        int vid = ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()")
            .getSingleResult()).intValue();

        // 4. Insert DR voucher_item
        em.createNativeQuery(
            "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
            "vouchervid, voucher_typevt_id, sub_chart_of_accountis_sca, " +
            "is_completed, created_at) " +
            "VALUES (?,?,CURDATE(),1,?,?,?,?,?,NOW())")
            .setParameter(1, voucherId + "-DR")
            .setParameter(2, "DR: " + description)
            .setParameter(3, amount)
            .setParameter(4, vid)
            .setParameter(5, typeId)
            .setParameter(6, drScaId)
            .setParameter(7, completed ? 1 : 0)
            .executeUpdate();

        // 5. Insert CR voucher_item
        em.createNativeQuery(
            "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
            "vouchervid, voucher_typevt_id, sub_chart_of_accountis_sca, " +
            "is_completed, created_at) " +
            "VALUES (?,?,CURDATE(),1,?,?,?,?,?,NOW())")
            .setParameter(1, voucherId + "-CR")
            .setParameter(2, "CR: " + description)
            .setParameter(3, amount)
            .setParameter(4, vid)
            .setParameter(5, typeId)
            .setParameter(6, crScaId)
            .setParameter(7, completed ? 1 : 0)
            .executeUpdate();

        return vid;
    }
}
```

---

## 10. Frontend Implementation (React)

### 10.1 P&L Display Component

```jsx
function ProfitAndLoss({ data }) {
    const fmt = (n) => n == null ? '—' :
        'LKR ' + Number(n).toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });

    return (
        <div>
            {/* Revenue Section */}
            <h3>Revenue</h3>
            {data.revenue.map((item, i) => (
                <div key={i}>
                    <span>{item.subAccountName}</span>
                    <span>{fmt(item.amount)}</span>
                </div>
            ))}
            <div><strong>Total Revenue: {fmt(data.totalRevenue)}</strong></div>

            {/* Expense Section */}
            <h3>Expenses</h3>
            {data.expenses.map((item, i) => (
                <div key={i}>
                    <span>{item.accountName}</span>
                    <span>{fmt(item.amount)}</span>
                </div>
            ))}
            <div><strong>Total Expenses: {fmt(data.totalExpenses)}</strong></div>

            {/* Net Profit */}
            <div>
                <strong>Net Profit: {fmt(data.netProfit)}</strong>
            </div>
        </div>
    );
}
```

### 10.2 Date Filters

```jsx
const [filterYear, setFilterYear] = useState(null);
const [filterMonth, setFilterMonth] = useState(null);

const fetchPL = async (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const res = await api.get('/admin/accounts/profit-loss', { params });
    setData(res.data);
};
```

---

## 11. Extension Points

This model can be extended without schema changes for:

| Feature | How to Add |
|---|---|
| **Balance Sheet** | Query Assets (type 1), Liabilities (type 2), Equity (type 3) the same way P&L queries Revenue and Expenses |
| **Cash Flow Statement** | Filter voucher_items by Bank-type SCAs with date ranges |
| **Departmental P&L** | Add a `department_id` column to `voucher_item`; GROUP BY in queries |
| **Tax/VAT Tracking** | Add Liability SCA for "VAT Collected"; post CR to it on each sale |
| **Inventory/COGS** | Add Asset COA for Inventory, Expense COA for Cost of Goods Sold |
| **Payroll** | Add Expense COA for Salaries, Liability SCA for statutory deductions (EPF/ETF) |
| **Accounting Periods** | Add `accounting_period` table with `is_closed` flag; validate voucher dates against open periods |
| **Audit Trail** | Add `created_by`, `approved_by` columns to `voucher`; create approval workflow |
| **Multi-Branch** | Already supported via `voucher.branch_bid`; filter reports by branch |
| **Journal Entries** | Add a new `voucher_type` for manual journal entries; same DR/CR pattern |
| **Aging Reports** | Query payable/receivable vouchers by `date` vs `payment_date` to calculate days outstanding |
| **Budget vs Actual** | Add `budget` table with monthly targets per SCA; compare with actual voucher_item totals |

---

## Quick Start Checklist

1. [ ] Run schema DDL (Section 2) — create all 9 tables
2. [ ] Run seed data (Section 3) — customize account names for your organization
3. [ ] Implement `createDoubleEntry()` method (Section 9.2)
4. [ ] Wire up P&L endpoint (Section 9.1)
5. [ ] Build P&L UI (Section 10)
6. [ ] Record your first transaction and verify DR = CR
7. [ ] Check P&L report shows revenue and expenses correctly

---

*This document is a living reference. Update it as new reports (Balance Sheet, Cash Flow) are added.*
