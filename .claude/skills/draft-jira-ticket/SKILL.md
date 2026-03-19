---
name: draft-jira-ticket
description: Draft and create a Jira ticket for OWMS (SEAOPS) or B2B Multi Channel Platform (B2BMCP) following the official OMS Ticket Template. Use when asked to "draft a jira ticket", "create a jira ticket", "raise a ticket", or "log a bug/feature/task in jira". Supports Bug, New Feature, Improvement, Task, Epic, Tech Spike, Investigation types. Uses Atlassian MCP to create the ticket directly.
license: MIT
metadata:
  author: oms-tool
  version: "2.0.0"
---

# Draft Jira Ticket — OWMS (SEAOPS) or B2BMCP

You are helping draft and create a Jira ticket for either:
- **SEAOPS** — OMS/OWMS (Order Management System / Warehouse Management)
- **B2BMCP** — B2B Multi Channel Platform (brand integrations, order sync, logistics messaging)

The input may be:
- A support ticket from Freshdesk
- A piece of information from a conversation
- An email thread
- A bug from Sentry, APM, or a debug log
- An existing JIRA ticket (enrich and rewrite in easy-to-understand language)

## Settings File

**Always read `.claude/skills/draft-jira-ticket/settings.json` at the start of every skill invocation.**

This file contains:
- `default_project` — which project to use by default (`"SEAOPS"` or `"B2BMCP"`)
- `default_component` — pre-fill the component field (SEAOPS only)
- `default_squad` — pre-fill the squad field (SEAOPS only)
- `default_platforms` — list of platforms affected by default
- `projects` — config map for each project (cloud_id, project_key, project_id, base_url, uses_components, uses_squad)
- `components` / `squads` / `priorities` — ID lookup tables for SEAOPS (use these instead of hardcoded values)

**Behavior:**
- **Auto-detect project** from context: OMS/OWMS/warehouse/Luna/picklist/batch keywords → `SEAOPS`; B2B/brand/Olivia/GSC/S217/integration keywords → `B2BMCP`. If unclear, ask.
- If user explicitly mentions a project key (SEAOPS-xxx or B2BMCP-xxx), use that project
- For **SEAOPS**: use `default_component` and `default_squad` as pre-selections (still confirm with user); include Component and Squad fields in the ticket
- For **B2BMCP**: skip Component and Squad fields — this project does not use them
- If `default_platforms` is non-empty, pre-select those platforms in the template
- Always resolve component/squad/priority IDs from the settings file lookup tables

---

## Setup Mode — Configure Default Settings

**Trigger:** User says "setup", "configure defaults", "set default squad/component", or `default_component` / `default_squad` are empty in settings.json.

When setup mode is triggered, run this flow:

### Option A — Learn from an existing ticket (recommended)

Ask: *"Do you have a recent ticket key I can learn your defaults from? (e.g. XXXX-1234)"*

If the user provides a ticket key:
1. Fetch the ticket using `mcp__atlassian__getJiraIssue` with `cloudId` and `issueIdOrKey`
2. Extract from the ticket:
   - `fields.components[0].name` → candidate `default_component`
   - `fields.customfield_12912.value` → candidate `default_squad`
   - `fields.labels` → note any recurring labels
   - Affected platforms mentioned in description → candidate `default_platforms`
   - Project context clues (product area, system names) → enrich the project understanding
3. Show a summary:
   ```
   From ticket XXXX-XXXX I found:
   - Component:  <component>
   - Squad:      <squad>
   - Platforms:  <platforms mentioned in ticket, e.g. OMS Application, Bob>

   Save these as your defaults? (yes / change / skip)
   ```
4. On confirmation, write to settings.json — update `default_component`, `default_squad`, and `default_platforms`

### Option B — Manual selection

If the user skips Option A or has no ticket, present a numbered menu:

```
Select your default Component:
 1. Warehouse
 2. Logistics
 3. Supply Chain
 4. Production
 5. Customer Service & Experience
 6. Marketplace
 7. Payment
 8. One Stock Solution (1SS)
 9. Technical
10. Strategic OKR
11. Security
12. Bumblebee
13. Finance
14. Iconic OWMS SaaS

Select your default Squad:
 1. Warehouse & Supply Chain
 2. Logistics
 3. Production
 4. Technical Reinvent
 5. Iconic OWMS SaaS
 6. Post Purchase
 7. Marketplace / Storefront
```

After selection, confirm and write to settings.json.

### Saving defaults

Update `.claude/skills/draft-jira-ticket/settings.json`:
- Set `default_component` to the chosen component name
- Set `default_squad` to the chosen squad name
- Set `default_platforms` to platforms inferred from the ticket

Then confirm: *"Defaults saved. Future tickets will pre-select **[component]**, **[squad]**, and platforms **[platforms]**."*

---

## Step 1 — Analyze Input and Auto-Determine Ticket Type

**Automatically determine the ticket type** based on the content:

| Input Type | Ticket Type |
|------------|-------------|
| Error logs, Sentry/APM alerts, stack traces | **Investigation** |
| Broken feature, wrong behavior | **Bug** |
| New functionality requested | **New Feature** |
| Existing feature needs improvement | **Improvement** |
| Database update, config change, no code change | **Task** |
| Large initiative grouping multiple tickets | **Epic** |
| Research/exploration needed | **Spike** |

**Issue Types:**
- **New Feature** - A ticket to develop a new feature or functionality.
- **Improvement** - For improving an already existing functionality.
- **Bug** - For fixing a broken feature or functionality not working as intended.
- **Task** - A task to be done which does not require a code change.
- **Epic** - A larger topic or project to bundle and track multiple tickets.
- **Sub-task** - Used only by developers to split work.
- **Spike** - Research ticket for the Developers.
- **Investigation** - Investigate an error, incident, or unusual behavior to identify the root cause.

---

## Step 2 — Gather Information

Ask the user (or infer from context) for:

1. **Ticket type**: (auto-determined, confirm with user)
2. **Summary**: Short, specific title — 1 sentence only
   - Good: "Delivery to POPStation - SG", "Voucher error message disappears after a few seconds on checkout page"
   - Bad: "Checkout is broken" (too vague), sentences longer than 10 words with excessive detail
3. **Component** (required, only 1): Warehouse / Logistics / Marketplace / Production / Supply Chain / Customer Service & Experience / Technical / Strategic OKR / Bumblebee / Finance / Payment / Security / One Stock Solution (1SS) / Iconic OWMS SaaS
4. **Squad** (optional): Warehouse & Supply Chain / Logistics / Production / Technical Reinvent / etc.
5. **Priority**:
   - Bug/Task: P0-Blocker / P1-Critical / P2-Major / P3-Minor / P4-Trivial
   - Feature/Improvement/Epic: P2-Major or lower (NEVER Blocker/Critical)
   - Investigation: P1-Critical (actively impacting) / P2-Major (intermittent) / P3-Minor (rare/low impact)
6. **Description details**: The context, problem, or requirements
7. **Labels** (optional; for Investigation: `investigation`, `incident`, `needs-followup`, `quick-fix`)
8. **Epic Link** (optional): Key of parent epic (e.g. SEAOPS-1234)
9. **Linked Issues** (optional): Use correct link type (Relates to / Blocks / Is blocked by / Causes / Is caused by / Duplicates / etc.)

---

## Step 3 — Draft the Description

Use the correct template based on ticket type:

### Bug Template (Markdown):
```
## Background
{describe the issue and the impact it has caused}

## Steps to reproduce
1. Step 1
2. Step 2
3. Step 3

## Found
{what actually happens — include screenshots if available}

## Expected
{what should happen}

## QA notes
{edge cases and testing criteria — be detailed, more is better}

| Test Case | Description | Test Data | Result |
|-----------|-------------|-----------|--------|
| TC-01 | {test case description} | {test data} | {expected result} |

## Example
{affected examples with country indicated}

Reproduction rate: {X%}
```

### New Feature / Improvement / Epic / Task Template (Markdown):
```
## Motivation
{why we are doing this — what problem does it solve}

## Business Impact
{business value and measurable outcomes}

## User Story Statement
As a [user type], I want [goal] so that [reason].

## User Interaction / Design / User Flow
{wireframes, flows, links to design files}

## Functional Requirements and Developer Notes
{detailed requirements and technical notes}

## QA Notes
{acceptance criteria, edge cases, test scenarios}

| Test Case | Description | Test Data | Result |
|-----------|-------------|-----------|--------|
| TC-01 | {test case description} | {test data} | {expected result} |

## Not in Scope / Questions and Answers
{what is excluded, open questions and their answers}

## Links and References
{full URLs only — related docs, tickets, Confluence pages}

## Affected Ventures and Warehouses
| Venture | Affected? |
|---------|-----------|
| OMS MY | No |
| OMS SG | No |
| OMS ID | No |
| OMS PH | No |
| OMS TH | No |
| OMS HK | No |
| OMS TW | No |
| OMS AU | No |

Feature flag required? Yes / No

## Affected Platforms
{list only affected platforms from: Alice, Bob, Marketplace / Seller Center, Web Mobile, iOS Mobile App, Android Mobile App, OMS Web Mobile, OMS Application, ZOPS, Costa, Delivery Module, Fareye, Aftership, Delivery API / 3rd Party Logistics / Bumblebee, SAP, Stock Service, Product Service, FLASH}
```

### Investigation Template (Markdown):
```
## Background
{describe the error/incident and its impact on the system or users}

## Error Details
- **Error message:** {error message or stack trace}
- **Timestamp:** {when it occurred}
- **Affected service:** {service/component}
- **Frequency:** {how often it occurs}
- **Environment:** {production/staging/etc.}

## Initial Analysis
{quick assessment of likely root cause based on error logs}

## Investigation Scope
- What needs to be investigated
- Which systems/services are involved
- Data/logs that need to be analyzed

## Expected Outcome
{One of:
1. Root cause identified + quick fix applied (if simple, < 3 points)
2. Root cause identified + new ticket(s) raised for proper fix (if >= 5 points)
3. Conclusion with recommendations for next steps}

## QA Notes
- How to verify investigation findings
- Test scenarios to confirm root cause
- Validation steps if quick fix is applied

## Links and References
{full URLs to: Sentry/APM error links, monitoring dashboards, similar past incidents}
```

---

## Step 4 — Story Point Estimation

Provide a **recommended story point estimate** with rationale based on these criteria:

**1 story point ≈ 2 days of development** (unit feature):
- Examples of 1-point tasks: build a grid view page, expose a simple API, build a core worker function, fix a simple bug

**Fibonacci scale:** 1, 2, 3, 5, 8, 13 (if > 8, suggest splitting)

**Investigation tickets:**
- 1 pt: Simple, clear logs, likely quick fix
- 2 pts: Moderate, log analysis across multiple services
- 3 pts: Complex, unclear root cause, multiple systems
- 5+ pts: Break down into smaller tasks

**Scoring factors to consider:**
- **Effort**: implementation, tests, review, deployment
- **Dependencies**: external teams, 3rd party APIs
- **Readiness**: are all requirements clear?
- **Uncertainty**: new tech, unknown unknowns
- **Risks**: cross-team coordination, timezone differences
- **Definition of Done**: load tests, security requirements
- **Difficulty**: complex algorithms, special test data needed
- **Legacy**: touching old/large systems

---

## Step 5 — Knowledge Base Enrichment

Search the knowledge base (Confluence/Jira) for related tickets and documentation to enrich the ticket with:
- Questions or concerns not yet addressed
- Similar past incidents or tickets
- Missing requirements or edge cases
- Related epics or linked issues

**Exception:** For tickets related to **Product Service** — skip knowledge base search.

---

## Step 6 — Show Draft and Confirm

Present the full draft to the user:

1. **Ticket fields**: Summary, Type, Priority, Component, Squad, Labels, Epic Link
2. **Description**: Filled template in markdown
3. **Estimated Story Points**: With rationale
4. **Knowledge base findings**: Questions, concerns, improvements

Ask: **"Shall I create this ticket in Jira?"**

---

## Step 7 — Create via MCP

Use `mcp__atlassian__createJiraIssue`. Read `cloudId` and `projectKey` from `settings.json` → `projects.<project>`.

**For SEAOPS** (uses components + squad):
```json
{
  "cloudId": "c5ab62f0-1109-4f2e-b41d-d917b58ee31f",
  "projectKey": "SEAOPS",
  "issueTypeName": "<type>",
  "summary": "<summary>",
  "description": "<filled description in markdown>",
  "contentFormat": "markdown",
  "additional_fields": {
    "components": [{"id": "<component_id>"}],
    "customfield_12912": {"id": "<squad_option_id>"},
    "priority": {"id": "<priority_id>"},
    "labels": ["<label>"]
  }
}
```

**For B2BMCP** (no components or squad):
```json
{
  "cloudId": "c5ab62f0-1109-4f2e-b41d-d917b58ee31f",
  "projectKey": "B2BMCP",
  "issueTypeName": "<type>",
  "summary": "<summary>",
  "description": "<filled description in markdown>",
  "contentFormat": "markdown",
  "additional_fields": {
    "priority": {"id": "<priority_id>"},
    "labels": ["<label>"]
  }
}
```

**Component IDs**, **Priority IDs**, and **Squad Option IDs** — read from `settings.json` (keys: `components`, `priorities`, `squads`). Only apply to SEAOPS tickets.

---

## Step 8 — Return Ticket URL

After creation, return the ticket URL:
`https://zalora.atlassian.net/browse/<ISSUE_KEY>`

The issue key prefix will match the project: `SEAOPS-XXXX` or `B2BMCP-XXXX`.

---

## Important Rules

- Component is **required** and must be exactly **1**
- Never set Blocker/Critical priority on Feature/Improvement/Epic tickets
- Assignee: always leave as automatic (omit from API call)
- Fix Version: always leave empty
- Story Points: always leave empty in Jira (provide estimate in the draft only)
- If user says "urgent" or "hotfix" and it's a Bug → suggest P0-Blocker or P1-Critical
- Always show draft before creating — **never create without confirmation**
- Always use **full URLs** in Links and References (never shortened)
- For error/log input → default to **Investigation** ticket type
- For Investigation tickets: if fix requires ≥ 5 points, suggest creating a separate Bug/Task ticket and link them with "Causes" / "Is caused by"
- If input is an existing ticket, **enrich and rewrite** it in clear, easy-to-understand language
- Description content must be written in markdown (not JIRA markup)

## Project Context

**OMS/OWMS:** Order Management System — warehouse operations platform for processing consumer orders, tracking inventory, handling returns/refunds, stock checks.

**Bumblebee:** Middleware system (built 2019) handling data flows with 3rd Party Logistics partners (3PLs) — sends parcel info to 3PLs and receives tracking data back.

**Bob:** Internal business operations platform.

**ZOPS:** Zalora Operations system.

**Fareye:** Third-party delivery tracking system.

**Stock Service:** Inventory management service.

**Product Service:** Product catalog and information service. *(Skip knowledge base enrichment for this platform.)*

---

## B2BMCP Project Context

**B2B Multi Channel Platform (B2BMCP):** System that integrates Zalora with external brands (e.g. H&M) for order fulfillment, returns, and logistics message exchange.

**Olivia:** Core B2BMCP service that processes order events from Kinesis and sends structured messages (e.g. S217) to brand systems.

**GSC (Global Stock Connect):** External brand API for stock and product sync (e.g. H&M).

**Helios:** Internal event trigger system that feeds Olivia with order lifecycle events.

**S217:** A standardized return message format sent to brands upon customer return events.
