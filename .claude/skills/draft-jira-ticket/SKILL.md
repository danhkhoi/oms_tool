---
name: draft-jira-ticket
description: Draft and create a Jira ticket for OMS (SEAOPS) following the official OMS Ticket Template from Confluence. Use when asked to "draft a jira ticket", "create a jira ticket", "raise a ticket", or "log a bug/feature/task in jira". Supports Bug, New Feature, Improvement, Task, Epic, Tech Spike, Investigation types. Uses Atlassian MCP to create the ticket directly.
license: MIT
metadata:
  author: oms-tool
  version: "2.0.0"
---

# Draft OMS Jira Ticket

You are helping draft and create a Jira ticket for the OMS project (SEAOPS) following the official OMS Ticket Template.

The input may be:
- A support ticket from Freshdesk
- A piece of information from a conversation
- An email thread
- A bug from Sentry, APM, or a debug log
- An existing JIRA ticket (enrich and rewrite in easy-to-understand language)

## Config Cache

All Jira IDs are cached in `docs/jira/jira-config.json` (relative to the oms_tool project root).

Key cached values (use these directly, no need to look up):
- **Cloud ID**: `c5ab62f0-1109-4f2e-b41d-d917b58ee31f`
- **Project Key**: `SEAOPS` (Project ID: `12000`)

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

### Bug Template (JIRA markup):
```
h2. Background
{describe the issue and the impact it has caused}

h2. Steps to reproduce
# Step 1
# Step 2
# Step 3

h2. Found
{what actually happens — include screenshots if available}

h2. Expected
{what should happen}

h2. QA notes
{edge cases and testing criteria — be detailed, more is better}

|| Test Case || Description || Test Data || Result ||
| TC-01 | {test case description} | {test data} | {expected result} |

h2. Example
{affected examples with country indicated}

Reproduction rate: {X%}
```

### New Feature / Improvement / Epic / Task Template (JIRA markup):
```
h2. Motivation
{why we are doing this — what problem does it solve}

h2. Business Impact
{business value and measurable outcomes}

h2. User Story Statement
As a [user type], I want [goal] so that [reason].

h2. User Interaction / Design / User Flow
{wireframes, flows, links to design files}

h2. Functional Requirements and Developer Notes
{detailed requirements and technical notes}

h2. QA Notes
{acceptance criteria, edge cases, test scenarios}

|| Test Case || Description || Test Data || Result ||
| TC-01 | {test case description} | {test data} | {expected result} |

h2. Not in Scope / Questions and Answers
{what is excluded, open questions and their answers}

h2. Links and References
{full URLs only — related docs, tickets, Confluence pages}

h2. Affected Ventures and Warehouses
|| Venture || Affected? ||
| OMS MY | (x) |
| OMS SG | (x) |
| OMS ID | (x) |
| OMS PH | (x) |
| OMS TH | (x) |
| OMS HK | (x) |
| OMS TW | (x) |
| OMS AU | (x) |

Feature flag required? Yes / No

h2. Affected Platforms
{list only affected platforms from: Alice, Bob, Marketplace / Seller Center, Web Mobile, iOS Mobile App, Android Mobile App, OMS Web Mobile, OMS Application, ZOPS, Costa, Delivery Module, Fareye, Aftership, Delivery API / 3rd Party Logistics / Bumblebee, SAP, Stock Service, Product Service, FLASH}
```

### Investigation Template (JIRA markup):
```
h2. Background
{describe the error/incident and its impact on the system or users}

h2. Error Details
- *Error message:* {error message or stack trace}
- *Timestamp:* {when it occurred}
- *Affected service:* {service/component}
- *Frequency:* {how often it occurs}
- *Environment:* {production/staging/etc.}

h2. Initial Analysis
{quick assessment of likely root cause based on error logs}

h2. Investigation Scope
* What needs to be investigated
* Which systems/services are involved
* Data/logs that need to be analyzed

h2. Expected Outcome
{One of:
1. Root cause identified + quick fix applied (if simple, < 3 points)
2. Root cause identified + new ticket(s) raised for proper fix (if >= 5 points)
3. Conclusion with recommendations for next steps}

h2. QA Notes
* How to verify investigation findings
* Test scenarios to confirm root cause
* Validation steps if quick fix is applied

h2. Links and References
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
2. **Description**: Filled template in JIRA markup
3. **Estimated Story Points**: With rationale
4. **Knowledge base findings**: Questions, concerns, improvements
5. **Markdown copy block**: Provide the description content (from Motivation/Background section to end, excluding Labels) in a markdown code block for easy copying:

```markdown
## Background / Motivation
...
(full content through last section, excluding Labels)
```

Ask: **"Shall I create this ticket in Jira?"**

---

## Step 7 — Create via MCP

Use `mcp__atlassian__createJiraIssue` with:

```json
{
  "cloudId": "c5ab62f0-1109-4f2e-b41d-d917b58ee31f",
  "projectKey": "SEAOPS",
  "issueTypeName": "<type>",
  "summary": "<summary>",
  "description": "<filled description in JIRA markup>",
  "additional_fields": {
    "components": [{"id": "<component_id>"}],
    "customfield_12912": {"id": "<squad_option_id>"},
    "priority": {"id": "<priority_id>"},
    "labels": ["<label>"],
    "duedate": "<YYYY-MM-DD>"
  }
}
```

**Component IDs**:
- Warehouse: `16505`
- Logistics: `16506`
- Supply Chain: `16507`
- Production: `16508`
- Customer Service & Experience: `16509`
- Marketplace: `16510`
- Payment: `16511`
- One Stock Solution (1SS): `16569`
- Technical: `16530`
- Strategic OKR: `16532`
- Security: `16531`
- Bumblebee: `16534`
- Finance: `16694`
- Iconic OWMS SaaS: `16693`

**Priority IDs**:
- P0 - Blocker: `1`
- P1 - Critical: `2`
- P2 - Major: `3`
- P3 - Minor: `4`
- P4 - Trivial: `5`

**Squad Option IDs** (customfield_12912):
- Warehouse & Supply Chain: `11513`
- Logistics: `11511`
- Production: `11526`
- Technical Reinvent: `11717`
- Iconic OWMS SaaS: `12107`
- Post Purchase: `11522`
- Marketplace: `11510` *(use Storefront: `11520` if in doubt)*

---

## Step 8 — Return Ticket URL

After creation, return the ticket URL:
`https://zalora.atlassian.net/browse/<ISSUE_KEY>`

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
- Always provide the markdown copy block in a code block (from Background/Motivation to end, excluding Labels section)

## Project Context

**OMS/OWMS:** Order Management System — warehouse operations platform for processing consumer orders, tracking inventory, handling returns/refunds, stock checks.

**Bumblebee:** Middleware system (built 2019) handling data flows with 3rd Party Logistics partners (3PLs) — sends parcel info to 3PLs and receives tracking data back.

**Bob:** Internal business operations platform.

**ZOPS:** Zalora Operations system.

**Fareye:** Third-party delivery tracking system.

**Stock Service:** Inventory management service.

**Product Service:** Product catalog and information service. *(Skip knowledge base enrichment for this platform.)*
