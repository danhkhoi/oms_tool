---
name: draft-jira-ticket
description: Draft and create a Jira ticket for OMS (SEAOPS) following the official OMS Ticket Template from Confluence. Use when asked to "draft a jira ticket", "create a jira ticket", "raise a ticket", or "log a bug/feature/task in jira". Supports Bug, New Feature, Improvement, Task, Epic, Tech Spike types. Uses Atlassian MCP to create the ticket directly.
license: MIT
metadata:
  author: oms-tool
  version: "1.0.0"
---

# Draft OMS Jira Ticket

You are helping draft and create a Jira ticket for the OMS project (SEAOPS) following the official OMS Ticket Template.

## Config Cache

All Jira IDs are cached in `docs/jira/jira-config.json` (relative to the oms_tool project root).
The template guide is cached in `docs/jira/oms-ticket-template.md`.

Key cached values (use these directly, no need to look up):
- **Cloud ID**: `c5ab62f0-1109-4f2e-b41d-d917b58ee31f`
- **Project Key**: `SEAOPS` (Project ID: `12000`)

## Step 1 — Gather Information

Ask the user (or infer from context) for:

1. **Ticket type**: Bug / New Feature / Improvement / Task / Epic / Tech Spike
2. **Summary**: Short, specific title (e.g. "Delivery to POPStation - SG")
3. **Component** (required, only 1): Warehouse / Logistics / Marketplace / Production / Supply Chain / Customer Service & Experience / Technical / Strategic OKR / Bumblebee / Finance / Payment / Security / One Stock Solution (1SS) / Iconic OWMS SaaS
4. **Squad** (optional): Warehouse & Supply Chain / Logistics / Production / Technical Reinvent / etc.
5. **Priority**:
   - Bug/Task: P0-Blocker / P1-Critical / P2-Major / P3-Minor / P4-Trivial
   - Feature/Improvement: P2-Major or lower (never Blocker/Critical)
6. **Description details**: The context, problem, or requirements
7. **Labels** (optional)
8. **Epic Link** (optional): Key of parent epic (e.g. SEAOPS-1234)
9. **Due date** (optional)

## Step 2 — Draft the Description

Use the correct template from `docs/jira/oms-ticket-template.md`:

### For Bug tickets:
```
## Background
{describe issue and impact}

## Steps to reproduce
1.
2.
3.

## Found
{what actually happens}

## Expected
{what should happen}

## QA notes
{edge cases, testing criteria}

## Example
{affected examples with country}

Reproduction rate: {X%}

cc: {relevant people}
```

### For New Feature / Improvement / Epic / Task:
```
## Motivation
{why we're doing this}

## Business Impact
{business value}

## User Story Statement
As a [user type], I want [goal] so that [reason].

## User Interaction / Design / User Flow
{wireframes, flows, links}

## Functional Requirements and Developer Notes
{requirements and tech notes}

## QA Notes
{acceptance criteria, edge cases}

## Not in Scope / Questions and Answers
{exclusions, open questions}

## Links and References
{related docs, tickets}

## Affected Ventures and Warehouses
| Venture | Affected? |
|---------|-----------|
| OMS MY  | (x) |
| OMS SG  | (x) |
| OMS ID  | (x) |
| OMS PH  | (x) |
| OMS TH  | (x) |
| OMS HK  | (x) |
| OMS TW  | (x) |
| OMS AU  | (x) |

## Affected Platforms
| Platform | Affected? |
|----------|-----------|
| OMS Application | (/) |
| Alice | (x) |
| Bob | (x) |
| ZOPS | (x) |
| Delivery API / Bumblebee | (x) |
| SAP | (x) |

## CC
cc: {relevant people}
```

## Step 3 — Show Draft and Confirm

Show the full draft to the user including:
- Summary
- Type, Priority, Component, Squad
- Description (filled template)

Ask: **"Shall I create this ticket in Jira?"**

## Step 4 — Create via MCP

Use `mcp__atlassian__createJiraIssue` with:

```json
{
  "cloudId": "c5ab62f0-1109-4f2e-b41d-d917b58ee31f",
  "projectKey": "SEAOPS",
  "issueTypeName": "<type>",
  "summary": "<summary>",
  "description": "<filled description markdown>",
  "additional_fields": {
    "components": [{"id": "<component_id from jira-config.json>"}],
    "customfield_12912": {"id": "<squad_option_id from jira-config.json>"},
    "priority": {"id": "<priority_id from jira-config.json>"},
    "labels": ["<label>"],
    "duedate": "<YYYY-MM-DD>"
  }
}
```

**Component IDs** (from `docs/jira/jira-config.json`):
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

## Step 5 — Return Ticket URL

After creation, return the ticket URL:
`https://zalora.atlassian.net/browse/<ISSUE_KEY>`

## Important Rules

- Component is **required** and must be exactly **1**
- Never set Blocker/Critical priority on Feature/Improvement tickets
- Assignee: always leave as automatic (omit from API call)
- Fix Version: always leave empty
- Story Points: always leave empty
- If user says "urgent" or "hotfix" and it's a Bug → suggest P0-Blocker or P1-Critical
- Always show draft before creating — never create without confirmation
