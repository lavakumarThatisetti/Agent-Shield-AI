# AgentShield AI

AgentShield AI is a runtime security control plane for autonomous AI agents. It gives each agent a governed identity, tool manifest, data boundary, approval checkpoint, incident trail, and audit record before the agent can call enterprise tools.

## Why This Matters

Autonomous agents can read untrusted content and then call real tools: send email, update CRM records, export data, browse pages, or change payment details. The risky moment happens at runtime, between the generated tool plan and the actual tool call.

AgentShield intercepts those proposed tool calls and decides whether each action should pass, pause for human approval, or be blocked before side effects reach enterprise systems.

This is different from standard IAM, API gateway, or SIEM monitoring. Those systems usually see a user, service, or API request after intent has already formed. AgentShield focuses on the agent-runtime layer: the generated tool intent, the untrusted input that influenced it, the active agent manifest, and the policy decision before the tool executes.

## What It Does

- Registers agent identities with owners, runtimes, allowed tools, approval boundaries, and hard denies.
- Evaluates untrusted email, webpage, invoice, and workflow inputs.
- Generates the proposed agent tool plan through Azure OpenAI when configured, with deterministic fallback for reliable local runs.
- Applies policy, data-boundary, and threat-signal checks to every tool call.
- Routes approval-only actions to a human reviewer.
- Captures audit records and security incidents with policy evidence.
- Persists planner mode, planner model, and planner summary on each audit run so reviewers can see whether an LLM planner or local fallback produced the tool plan.

## Demo Path

1. Start at the login page and enter the workspace.
2. Open **Agent Registry** to review the agent identity and tool boundaries.
3. Open **Runtime Gateway** and run a scenario.
4. Use **Prompt Injection Email** to show blocked exfiltration.
5. Use **Outbound Email Approval** to show hold, review, approval, and audit update.
6. Open **Audit Trail** and **Incidents** to show the recorded evidence.

## Microsoft AI Stack

AgentShield supports Azure OpenAI-compatible planning. When these variables are configured, the gateway uses an Azure OpenAI deployment to generate the proposed tool plan before deterministic runtime policy enforcement:

```bash
AZURE_OPENAI_API_KEY=""
AZURE_OPENAI_ENDPOINT=""
AZURE_OPENAI_DEPLOYMENT=""
AZURE_OPENAI_API_VERSION="2024-10-21"
```

If Azure OpenAI is not configured, or an LLM planner does not return a usable plan, the app falls back to the deterministic planner and records that fallback in the audit metadata.

## Architecture

```mermaid
flowchart LR
  I["Agent Identity"] --> G["Runtime Gateway"]
  U["Untrusted Input"] --> G
  G --> P["Tool Planner"]
  P --> E["Policy Engine"]
  E --> A["Allow"]
  E --> H["Human Approval"]
  E --> B["Block"]
  A --> L["Audit Trail"]
  H --> L
  B --> S["Security Incident"]
  S --> L
```

Core layers:

- `lib/gateway/planner.ts` builds the proposed runtime tool plan through Azure OpenAI, OpenAI-compatible APIs, or deterministic fallback.
- `lib/gateway/policy-engine.ts` evaluates each proposed tool against identity, tool manifest, data boundary, side-effect, and threat signals.
- `app/api/gateway/evaluate/route.ts` persists the run, tool-level decisions, planner metadata, incidents, and approval requests.
- `app/api/approvals/[id]/route.ts` resumes or denies held execution inside a database transaction.
- `prisma/schema.prisma` stores agent identities, policy rules, runs, tool calls, approval requests, incidents, and scenario data. Runtime manifests and evidence payloads use JSON columns for structured audit data.

## Tech Stack

- Next.js and React
- Prisma ORM with PostgreSQL
- Azure OpenAI-compatible planner path through the OpenAI Node SDK
- Zod for API validation
- Lucide React for icons

## Setup

Prerequisites:

- Node.js 20 or newer
- PostgreSQL database
- Optional Azure OpenAI deployment

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Set at minimum:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/agentshield?schema=public"
USER_NAME="demo@example.com"
PASSWORD="change-me"
```

Optional local/demo seed behavior:

```bash
AGENTSHIELD_AUTO_SEED="true"   # Enable automatic demo seeding outside development
```

Prepare the database:

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Scripts

```bash
npm run dev              # Start local Next.js server
npm run build            # Build production bundle
npm run start            # Start production server
npm test                 # Run unit tests; DB-backed integration tests auto-skip without AGENTSHIELD_TEST_DATABASE_URL
npm run prisma:generate  # Generate Prisma client
npm run db:push          # Push Prisma schema to database
npm run db:seed          # Reset and seed demo data
```

## Testing

The default test suite covers runtime policy behavior and planner fallback without requiring a database. Integration tests for audit persistence and approval release are included and run when `AGENTSHIELD_TEST_DATABASE_URL` points to a disposable PostgreSQL test database.

```bash
npm test
AGENTSHIELD_TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/agentshield_test?schema=public" npm test
```

## Project Structure

```text
app/                  Next.js pages and API routes
app/styles/           Route-focused global CSS modules
components/           Product UI and workflow components
lib/gateway/          Planner, policy engine, threat detection, tool registry
lib/agents/           Agent snapshot and policy helpers
lib/auth/             Session helpers
prisma/schema.prisma  Database schema
prisma/seed.mjs       Demo seed script
tests/                Unit and optional PostgreSQL integration tests
```

## Open-Source Credits

- Next.js
- React and React DOM
- Prisma and Prisma Client
- Zod
- Lucide React
- OpenAI Node SDK

## Team

Team name: AgentShield AI

Team member:

- Lavakumar Thatisetti — Senior Software Engineer, Atlassian
