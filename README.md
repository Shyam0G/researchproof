# Collaborative Research Ecosystem (ResearchProof)

A production-grade, full-stack web application designed for transparent, fair, and accountable scientific collaboration. The platform connects **Sponsors & Funding Organizations**, **Project Leads & Domain Experts**, and **Student Researchers**, supported by server-side AI task planning, locked rubric evaluation, and an append-only provenance ledger.

---

## Architecture Overview

```text
c:\resarchproof\
├── backend\
│   ├── config\                # Configuration settings
│   ├── data\                  # Persistent SQLite database (WAL mode, Foreign Keys)
│   ├── db\
│   │   ├── index.js           # DatabaseSync connection pool & transaction manager
│   │   ├── migrate.js         # Reproducible schema migration (16 normalized tables)
│   │   └── seed.js            # Labeled demonstration research projects and profiles
│   ├── middleware\
│   │   └── auth.js            # JWT verification & role authorization middleware
│   ├── routes\
│   │   ├── auth.js            # Registration, login, logout, role switching
│   │   ├── profiles.js        # User credentials and role management
│   │   ├── projects.js        # Project CRUD, filtering, leader recommendations
│   │   ├── tasks.js           # Task management, AI generation, term locking
│   │   ├── submissions.js     # Multipart file uploads, SHA-256 hashing, AI rubric evaluation
│   │   ├── credits.js         # Authoritative credit balances & project allocations
│   │   ├── ledger.js          # Provenance ledger & cryptographic SHA-256 verification
│   │   └── notifications.js   # In-app notification center
│   ├── services\
│   │   ├── aiService.js       # Gemini API client with budget-safe rule fallback
│   │   ├── auditService.js    # Append-only SHA-256 event recording
│   │   ├── recommendationService.js # Expert-first team leader recommendation
│   │   └── notificationService.js   # In-app alert dispatcher
│   ├── tests\
│   │   ├── auth.test.js       # Auth, session, and role escalation tests
│   │   └── workflows.test.js  # Tasks, snapshots, submissions, AI evaluation tests
│   ├── uploads\               # Protected, non-public research artifact storage
│   ├── server.js              # Express API server entry point (port 5000)
│   └── package.json
├── frontend\
│   ├── src\
│   │   ├── api\client.js      # Unified API client
│   │   ├── components\        # Navbar, RoleSwitcherModal, Badge, Alert, ReceiptCard
│   │   ├── context\           # AuthContext (session persistence), NotificationContext
│   │   ├── pages\             # 21 fully implemented interactive pages
│   │   ├── index.css          # Slate & Indigo academic design system
│   │   ├── App.jsx            # Dynamic client router with parameter matching
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js         # Vite configuration with /api backend proxy
│   └── package.json
└── README.md
```

---

## Key Features & Security Guarantees

1. **Server-Side Role Enforcement & Role Switching:**
   - Accounts can be authorized for multiple roles (`student`, `expert`, `sponsor`).
   - The active role is verified in the database on every protected endpoint—**never** trusting client-side `localStorage`.
   - Unauthorized role escalation is strictly rejected (HTTP 403).

2. **Locked Terms & Immutable Assignment Snapshots:**
   - When a researcher accepts a task, its title, deliverables, acceptance criteria, credit reward, and deadline are snapshotted in `task_assignments`.
   - Project leads cannot retroactively alter criteria or reduce agreed rewards.
   - Database transactions prevent duplicate assignments or race conditions.

3. **Cryptographic Provenance & Audit Ledger:**
   - Uploaded research files are assigned unique storage identifiers outside the public web root, validated for size/MIME type, and hashed via **SHA-256**.
   - Every significant action (task creation, publication, acceptance, submission, evaluation, credit award) writes a tamper-evident record with an integrity checksum.
   - Interactive verification allows any user to recalculate the event hash and verify its intactness.

4. **AI Task Generation & Predefined Rubric Evaluation:**
   - Server-side AI (Google Gemini API with deterministic rule-based fallback when no key is configured).
   - Generates tasks strictly within the project's remaining credit budget.
   - Submissions are evaluated objectively against **predefined, locked rubrics**, producing criterion-by-criterion explanations and specific revision guidance.
   - No confidential files or participant data are sent to external AI providers.

5. **Atomic Credit Transactions & Budget Safeguards:**
   - Credits are awarded atomically only upon verified rubric acceptance.
   - Each transaction utilizes an `idempotency_key` preventing duplicate awards.

6. **Transparent Team Leader Recommendation:**
   - Adheres to the Master Specification: Domain Experts are prioritized first based on category experience and skills. If unavailable, top-ranked experienced researchers are recommended with an explicit score breakdown.

---

## Getting Started on Windows (VS Code)

### Prerequisites
- Node.js (v18, v20, v22, or v24 verified)
- Windows PowerShell or Command Prompt

### Step 1: Open the Project in VS Code
Open folder `C:\resarchproof` in Visual Studio Code.

### Step 2: Terminal 1 - Start the Backend Server

1. Open a new terminal in VS Code (`Terminal -> New Terminal`).
2. Navigate to the `backend` folder:
   ```powershell
   cd C:\resarchproof\backend
   ```
3. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```
4. Run migrations and seed sample demo data:
   ```powershell
   npm run db:migrate
   npm run db:seed
   ```
5. Run the automated test suite:
   ```powershell
   npm test
   ```
   *(All 14 automated tests will execute and pass)*
6. Start the backend API server:
   ```powershell
   npm start
   ```
   *The backend will be running on `http://localhost:5000`.*
   *Health endpoint: `http://localhost:5000/api/health`*

---

### Step 3: Terminal 2 - Start the Frontend Dev Server

1. Open a second terminal tab in VS Code (`Terminal -> New Terminal` or click `+`).
2. Navigate to the `frontend` folder:
   ```powershell
   cd C:\resarchproof\frontend
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Start the Vite development server:
   ```powershell
   npm run dev -- --port 3000
   ```
5. Open your web browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## Demonstration Scenarios & Test Accounts

All sample profiles and projects are clearly labeled as **illustrative demonstration data**. Password for all demo accounts is `Password123!`.

| Demo Profile | Email | Roles | Description |
| :--- | :--- | :--- | :--- |
| **Alex Chen** | `student@researchproof.test` | `student` | Graduate student researcher. Used to demonstrate task discovery, term acceptance, and submission. |
| **Dr. Sarah Mitchell** | `lead@researchproof.test` | `expert`, `student` | Principal Investigator & Domain Expert. Demonstrates project creation, AI task breakdowns, and rubric management. |
| **Global Health Initiative** | `sponsor@researchproof.test` | `sponsor` | Research Grant Funder. Demonstrates grant milestone monitoring, aggregate progress, and impact reports. |
| **Jordan Lee** | `multirole@researchproof.test` | `student`, `expert`, `sponsor` | Multi-role user demonstrating instant authorized role switching. |

### End-to-End Walkthrough Scenarios

#### Scenario A: Student Contribution Workflow
1. Navigate to `http://localhost:3000` and click the **Alex Chen (Student)** demo login button.
2. In the **Student Dashboard**, review active credits, accepted tasks, and recommendations.
3. Click **Explore Projects** in the navbar and select **AI for Diabetic Retinopathy Screening**.
4. Inspect an available research task and review its locked acceptance criteria and credit reward.
5. Click **Accept Task Terms & Reward**. Notice that terms are snapshotted in the server database.
6. Click **My Workspace** -> **Submit My Work**.
7. Enter your methodology summary and attach supporting research artifacts (e.g., PDF or PNG).
8. Click **Submit Work for Evaluation**.
9. View the generated **Cryptographic Receipt Card** (with SHA-256 file hashes) and the **Criterion-by-Criterion Evaluation Findings**.
10. Verify that credits are automatically deposited into your balance ledger upon passing.

#### Scenario B: Project Lead & AI Task Generation
1. Click the active role badge in the navbar and switch to **Project Lead / Domain Expert** (or log in as `lead@researchproof.test`).
2. From the **Expert Dashboard**, click **New Research Project** to launch an initiative with defined objectives and credit budget.
3. On any project, click **Task Breakdown & AI**.
4. Click **Generate Tasks with AI**. Review the generated suggestions and verify that total credits remain within the project's available credit budget.
5. Click **Approve & Publish Task** to release it to the researcher community.

#### Scenario C: Sponsor Oversight & Impact Reports
1. Switch active role to **Sponsor** (or log in as `sponsor@researchproof.test`).
2. Navigate to **Sponsor Reports**.
3. Inspect the aggregate milestone progress bars, total credit grants committed, and verified researcher impact numbers.
4. Verify that confidential internal research files remain strictly protected.

#### Scenario D: Role Switching & Cryptographic Ledger
1. Click the active role button in the top navigation bar at any time to open the **Role Switcher Modal**.
2. Switch dynamically between authorized roles; notice that the dashboard, navigation links, and permissions adapt instantly.
3. Refresh the browser (`F5`); verify that your session and active role persist seamlessly.
4. Click **Ledger** in the navigation bar to inspect the **Provenance & Audit Ledger**.
5. Click **Verify Hash** on any event to trigger an independent, server-side cryptographic checksum calculation confirming that the record is intact.
6. Click the **Logout** button to clear your session and return to the login screen.
