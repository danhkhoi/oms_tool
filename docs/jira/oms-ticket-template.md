# OMS Ticket Template

> Source: https://zalora.atlassian.net/wiki/spaces/SEAOPS/pages/73334993/OMS+Ticket+Template
> Last synced: 2026-03-04

---

## Ticket Fields

| **Field** | **Description** |
| --- | --- |
| Project | Always "SEAOPS" (unless related to other applications) |
| Issue Type | **New Feature** - develop a new feature. **Improvement** - improve existing functionality. **Bug** - fix broken feature. **Task** - no code change required (e.g. DB update). **Epic** - bundles multiple tickets. **Sub-task** - split work (dev only). **Spike** / **Tech Spike** - research ticket. |
| Summary | Clear, concise header. Be specific. Good: "Delivery to POPStation - SG". Bad: "Checkout is broken". |
| Priority | **P0 - Blocker** (ONLY BUG/TASK - hotfix immediately). **P1 - Critical** (ONLY BUG/TASK - hotfix ASAP). **P2 - Major** (big business impact). **P3 - Minor** (smaller impact). **P4 - Trivial** (cosmetic). NOTE: If Blocker/Critical, should already be escalated to OMS SLA. Highest normal priority = Major. |
| Fix Version/s | Leave empty. |
| Assignee | Leave as "Automatic". |
| Reporter | Creator of the ticket. |
| Linked Issues | Link related tickets (Relates to / Blocks / Duplicates / Causes / etc.) |
| Labels | Tags for grouping. For Improvement pipeline, always use label "Improvement". |
| Epic Link | Name of the Epic this ticket belongs to. |
| Sprint | Added by Regional PM. |
| Component | **Required. Only 1 component.** Options: Customer Service & Experience / Logistics / Marketplace / Production / Supply Chain / Warehouse / Strategic OKR / Technical / Bumblebee / Finance / Iconic OWMS SaaS / One Stock Solution (1SS) / Payment / Security |
| Story Points | Leave empty (filled by devs). |
| Code Review | Leave empty (filled by Team Lead). |
| Due Date | Set if there is a specific deadline. |
| Squad | Optional custom field. Options: Warehouse & Supply Chain / Logistics / Production / Technical Reinvent / Iconic OWMS SaaS / etc. |

---

## Ticket Description Templates

### Bug

```
## Background

(Describe the issue and its impact)

## Steps to reproduce

1.
2.
3.

## Found

(What actually happens - include screenshots)

## Expected

(What should happen)

## QA notes

(Edge cases, special criteria for testing before deployment. More details = better.)

## Example

(List affected examples with country if multi-country)

Reproduction rate: X%

cc: @person1 @person2
```

---

### New Feature / Improvement / Epic / Task

Sections (per LinkedIn template guide):

```
## Motivation

(Why are we doing this? What problem does it solve?)

## Business Impact

(Quantified or qualified business value)

## User Story Statement

As a [user type], I want [goal] so that [reason].

## User Interaction / Design / User Flow

(Wireframes, flows, design links)

## Functional Requirements and Developer Notes

(Detailed requirements, technical notes)

## QA Notes

(What to test, edge cases, acceptance criteria)

## Not in Scope / Questions and Answers

(Explicit exclusions and open Q&A)

## Links and References

(Confluence pages, tickets, docs)

## Affected Ventures and Warehouses

| Venture | Affected? |
|---------|-----------|
| OMS MY  | (/) or (x) |
| OMS SG  | (/) or (x) |
| OMS ID  | (/) or (x) |
| OMS PH  | (/) or (x) |
| OMS TH  | (/) or (x) |
| OMS HK  | (/) or (x) |
| OMS TW  | (/) or (x) |
| OMS AU  | (/) or (x) |

## Affected Platforms

| Platform | Affected? |
|----------|-----------|
| Alice | (x) |
| Bob | (x) |
| Marketplace / Seller Center | (x) |
| Web Mobile | (x) |
| iOS Mobile App | (x) |
| Android Mobile App | (x) |
| OMS Web Mobile | (x) |
| OMS Application | (/) |
| ZOPS | (x) |
| Costa | (x) |
| Delivery Module | (x) |
| Fareye | (x) |
| Aftership | (x) |
| Delivery API / 3rd Party Logistics / Bumblebee | (x) |
| SAP | (x) |

## CC and "to be informed"

cc: @person1 @person2
```
