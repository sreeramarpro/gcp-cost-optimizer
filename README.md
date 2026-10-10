# GCP Cost Optimizer

> Production-grade automated non-production resource scheduler and FinOps cost optimization engine for Google Cloud Platform.

![GCP Cost Optimizer](https://img.shields.io/badge/GCP-Compute%20Engine-4285F4?style=flat&logo=google-cloud&logoColor=white)
![Status](https://img.shields.io/badge/Tests-Passing-34A853?style=flat)
![Architecture](https://img.shields.io/badge/Architecture-Resource--Adapter%20Pattern-indigo)
![Safety](https://img.shields.io/badge/Guardrails-Multi--Layer%20Protected-success)

---

## Overview

Non-production environments (development, staging, QA, sandbox) in Google Cloud typically sit idle during nights, weekends, and non-working hours, yet continuously incur on-demand compute costs. Running an instance 24/7 requires paying for 730 hours per month; shutting it down outside business hours (e.g. running Mon-Fri 08:00–19:00, 55 hours/week) reduces uptime to ~239 hours/month—**delivering up to 67% direct cost savings**.

**GCP Cost Optimizer** is an autonomous application that discovers Google Cloud Compute Engine VMs, configures timezone-accurate start/stop schedules, enforces multi-layered safety guardrails (preventing accidental shutdown of production instances), executes scheduled routines automatically, and maintains an immutable audit trail.

---

## Key Features

1. **Autonomous VM Discovery & Inventory**:
   - Queries Compute Engine across all zones using aggregated list.
   - Normalizes hardware configurations (vCPU, RAM, machine type families) and labels.
2. **FinOps Cost & Savings Engine**:
   - Accurately models hourly baseline rates for GCP machine types (E2, N2, C2, N1, custom).
   - Computes baseline monthly spend (730 hours/month), weekly scheduled off-hours, and projected monthly cost savings.
3. **Multi-Layered Safety Guardrails**:
   - **Layer 1: Policy Rules** – Global patterns (e.g. `env=prod`, `environment=production`, `protected=true`, `cost-optimizer=exempt`) automatically exclude matching instances from stop actions.
   - **Layer 2: Explicit Resource Lock** – Per-instance administrative locks in the inventory.
   - **Layer 3: Dry-Run Mode** – Global and schedule-level dry-run switches that simulate triggers, evaluate policies, and log audit entries without issuing cloud mutations.
   - **Layer 4: Skip & Audit** – If an automated stop schedule targets a protected VM, the engine skips the action and records a `SKIPPED_PROTECTED` audit event explaining the rationale.
4. **Timezone-Aware In-Process Scheduler**:
   - Built on `croner` with second-accurate cron scheduling supporting IANA timezones (e.g., `UTC`, `America/New_York`, `Asia/Tokyo`).
   - Supports dynamic target matching by label (e.g. all VMs labeled `env=dev`) or explicit instance attachment.
5. **Clean Resource-Adapter Boundary**:
   - Core scheduling, policy evaluation, and persistence are decoupled from cloud provider SDKs via the `CloudResourceAdapter` interface. Compute Engine is implemented first; Cloud SQL or other GCP services can be plugged in without refactoring core services.
6. **Dual Mode Operation (Live GCP & Sandbox Demo)**:
   - **Live GCP Mode**: Interacts directly with the Google Cloud Compute Engine API via `@google-cloud/compute`.
   - **Sandbox Demo Mode**: Operates against a realistic simulated fleet when credentials are not configured, guaranteeing that live and simulated data are never conflated.

---

## Architecture Diagram

```
                     +---------------------------------------+
                     |    React 19 + Vite + Tailwind CSS     |
                     |  (Dashboard, Inventory, Schedules,    |
                     |   Policies, Audit Trail, Settings)    |
                     +-------------------+-------------------+
                                         | HTTP / REST
                                         v
                     +---------------------------------------+
                     |       Node.js + Express Backend       |
                     |  - REST API Routes & Zod Validation   |
                     |  - FinOps Cost & Savings Calculator   |
                     |  - Multi-Layer Safety Policy Engine   |
                     |  - Automated In-Process Cron Runner   |
                     +---------+-------------------+---------+
                               |                   |
            +------------------+                   +------------------+
            |                                                         |
            v                                                         v
+-----------------------+                                 +-----------------------+
|  Persistence Layer    |                                 | CloudResourceAdapter  |
|  - SQLite Database    |                                 | Interface Contract    |
|  - Prisma ORM         |                                 +-----------+-----------+
|  (optimizer.db)       |                                             |
+-----------------------+                         +-------------------+-------------------+
                                                  |                                       |
                                                  v                                       v
                                      +-----------------------+               +-----------------------+
                                      | ComputeEngineAdapter  |               |  MockComputeAdapter   |
                                      | (@google-cloud/compute|               | (Sandbox Demo Fleet   |
                                      |  InstancesClient API) |               |  Safe Offline Mode)   |
                                      +-----------+-----------+               +-----------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      | Google Cloud Platform |
                                      | Compute Engine API    |
                                      +-----------------------+
```

---

## Directory Structure

```
gcp-cost-optimizer/
├── package.json                   # Root monorepo orchestrator
├── README.md                      # Architecture & operational documentation
├── backend/
│   ├── src/
│   │   ├── adapters/
│   │   │   ├── base.adapter.ts    # CloudResourceAdapter interface definition
│   │   │   ├── pricing.ts         # Machine type pricing lookup & cost formulas
│   │   │   ├── compute.adapter.ts # Live GCP Compute Engine adapter (@google-cloud/compute)
│   │   │   ├── mock.adapter.ts    # Sandbox demonstration adapter
│   │   │   └── adapter.factory.ts # Dual-mode adapter switching & diagnostics
│   │   ├── services/
│   │   │   ├── resource.service.ts   # Inventory sync & DB cache
│   │   │   ├── schedule.service.ts   # Schedule CRUD & timezone/cron resolution
│   │   │   ├── policy.service.ts     # Multi-layer safety & exclusion rules
│   │   │   ├── execution.service.ts  # Safe start/stop execution & audit logging
│   │   │   └── cost.service.ts       # FinOps savings & spend calculations
│   │   ├── scheduler/
│   │   │   └── runner.ts          # In-process cron runner evaluating active routines
│   │   ├── routes/                # Express API endpoints
│   │   ├── database.ts            # Prisma client singleton
│   │   ├── config.ts              # Environment loader & safety flags
│   │   └── index.ts               # Server entrypoint with auto-initialization
│   ├── prisma/
│   │   ├── schema.prisma          # SQLite schema
│   │   └── seed.ts                # Default protection policies seed script
│   └── tests/                     # Vitest automated test suite
└── frontend/
    ├── src/
    │   ├── api/client.ts          # Typed API client
    │   ├── components/            # Header, Sidebar, modals
    │   ├── pages/                 # Dashboard, Resources, Schedules, Policies, History, Savings, Settings
    │   ├── App.tsx
    │   └── main.tsx
    ├── vite.config.ts             # Vite with backend proxy configuration
    └── tailwind.config.js
```

---

## Prerequisites

- **Node.js**: `v20+` or `v24+`
- **npm**: `v10+`
- **GCP Account & Project** *(Optional for Live mode)*:
  - Enabled API: `compute.googleapis.com`
  - Service Account Roles: `roles/compute.viewer` (read) and `roles/compute.instanceAdmin.v1` (to execute start/stop)

---

## Quickstart

### 1. Install Dependencies
```bash
# In the root repository
npm install --workspace=backend
npm install --workspace=frontend
```

### 2. Initialize the Database
```bash
cd backend
npx prisma db push
npm run db:seed
cd ..
```

### 3. Run Automated Tests
```bash
npm run test --workspace=backend
```

### 4. Start the Application
Run both backend and frontend concurrently with a single command from the project root:
```bash
# Terminal 1: Backend (port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend (port 3000)
npm run dev --workspace=frontend
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Configuring Real Google Cloud Integration

1. Go to the **Settings & GCP** page in the application UI (or configure `backend/.env`).
2. Set your **GCP Project ID** (e.g. `my-gcp-project-12345`).
3. Set your **Service Account Key File Path** pointing to your local JSON credentials file (or ensure Application Default Credentials are configured via `GOOGLE_APPLICATION_CREDENTIALS`).
4. Click **Test & Save GCP Connection**.
5. Switch the operational mode to **Live GCP Mode**.
6. Click **Sync Inventory** to discover your live Compute Engine VMs!

---

## Extensibility: Adding Cloud SQL

The adapter boundary is defined in `backend/src/adapters/base.adapter.ts`. To add Cloud SQL:
1. Create `backend/src/adapters/cloudsql.adapter.ts` implementing `CloudResourceAdapter`.
2. Implement `listResources()`, `startResource()`, and `stopResource()` using `@google-cloud/sql`.
3. Register the adapter in `adapter.factory.ts`.
All existing schedules, protection policies, audit logs, and cron runner routines will automatically apply to Cloud SQL instances with zero changes required to business logic!
#   g c p - c o s t - o p t i m i z e r  
 