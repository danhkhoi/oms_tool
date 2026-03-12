---
name: check-staging
description: Check the health of a staging environment (oms, oms-mobile, or luna) for a specific venture (MY, ID, PH, AU) by inspecting recent commits/merged PRs on the venture branch and checking Sentry for new issues. Use when asked to "check staging", "is staging okay", "check health", "what's deployed on staging", or "any issues on staging for [venture]".
license: MIT
metadata:
  author: oms-tool
  version: "2.0.0"
---

# Staging Health Check

You are helping check the health of a staging environment by inspecting recent Git activity and Sentry errors.

## Repo Config Table

| Key | `oms` | `oms-mobile` | `luna` |
|-----|-------|--------------|--------|
| **GitHub repo** | `zalora/oms` | `zalora/oms-mobile` | `zalora/luna` |
| **Sentry project slug** | `oms` | `oms-mobile` | `luna` |
| **Sentry country filter** | `country:{venture_lower}` | `country:{venture_lower}` | `country:{venture_lower}` |
| **Ventures → Branches** | MY→`development-MY`, ID→`development-ID`, PH→`development-PH`, AU→`development-AU` | same | same |
| **Ignore file** | `sentry-ignore-oms.txt` | `sentry-ignore-oms-mobile.txt` | `sentry-ignore-luna.txt` |

- **Sentry Base URL**: `https://sentry-stg.zalora.net`
- **Sentry API Base**: `https://sentry-stg.zalora.net/api/0`

All three repos use the same venture-to-branch mapping: `development-{VENTURE}` (e.g. `development-MY`).

---

## Step 0 — Check MCP & Auth Setup

Before fetching data, load credentials and verify integrations are available.

### 0a — Load credentials from .env

**Always attempt to load from `.env` first** before checking env vars. Use the Bash tool:

```bash
# Load .env if present in the project root
if [ -f /Users/khoinguyen/project/oms_tool/.env ]; then
  export $(grep -v '^#' /Users/khoinguyen/project/oms_tool/.env | grep -E '^(GITHUB_TOKEN|SENTRY_URL|SENTRY_AUTH_TOKEN|SENTRY_ORG)=' | xargs)
fi
echo "GITHUB_TOKEN=${GITHUB_TOKEN:+set}" && echo "SENTRY_URL=${SENTRY_URL}" && echo "SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:+set}" && echo "SENTRY_ORG=${SENTRY_ORG}"
```

If the `.env` file exists and contains the keys, proceed silently without prompting the user for credentials.

### 0b — GitHub MCP

Check if `mcp__github__*` tools are available (e.g. `mcp__github__list_commits`).

- If GitHub MCP **is available** → use MCP tools (preferred)
- If GitHub MCP **is NOT available** but `GITHUB_TOKEN` is set (from `.env` or env) → use REST API fallback silently
- If neither → show setup guide below

**Setup guide (only show if no GitHub access at all):**

---
> **GitHub access not found.** Add your token to `.env`:
> ```
> GITHUB_TOKEN=ghp_YOUR_TOKEN
> ```
> Or connect via MCP (recommended for richer access):
> ```bash
> claude mcp add --transport http github https://api.githubcopilot.com/mcp/
> ```

---

### 0c — Sentry Connection

Check if `sentry-cli` is installed:
```bash
which sentry-cli && sentry-cli --version
```

- If installed and credentials loaded from `.env` → proceed silently
- If not installed → show install guide

**Install guide (only show if sentry-cli missing):**

---
> ```bash
> brew install getsentry/tools/sentry-cli
> ```
> Then add to `.env`:
> ```
> SENTRY_URL=https://sentry-stg.zalora.net
> SENTRY_AUTH_TOKEN=sntrys_YOUR_TOKEN
> SENTRY_ORG=zalora
> ```

---

If `SENTRY_ORG` is not set after loading `.env`, discover it:
```bash
sentry-cli --url $SENTRY_URL --auth-token $SENTRY_AUTH_TOKEN organizations list
```

**If both GitHub and Sentry are unavailable**, stop and ask the user to add credentials to `.env`. If at least GitHub is available, proceed and skip the Sentry section with a note.

---

## Step 1 — Identify Repo, Venture & Branch

### 1a — Select Repo

If the user did not specify a repo, **ask**:
> "Which repo do you want to check? (oms / oms-mobile / luna)"

Set from the Repo Config Table:
- `REPO_KEY` = e.g. `oms`
- `GITHUB_REPO` = e.g. `zalora/oms`
- `SENTRY_PROJECT` = e.g. `oms`
- `SENTRY_IGNORE_FILE` = e.g. `sentry-ignore-oms.txt`

### 1b — Select Venture

If the user did not specify a venture, **ask**:
> "Which venture? (MY / ID / PH / AU)"

Also accept a custom branch override (e.g. `feature/xyz`).

Set:
- `VENTURE` = e.g. `MY`
- `BRANCH` = `development-{VENTURE}` (e.g. `development-MY`), or custom if overridden

---

## Step 2 — Fetch Recent GitHub Activity

**Prefer GitHub MCP tools** when available. Fall back to REST API if MCP is not installed.

Split `{GITHUB_REPO}` into `{GITHUB_OWNER}` (e.g. `zalora`) and `{GITHUB_REPO_NAME}` (e.g. `oms`) for MCP calls.

### 2a — Using GitHub MCP (preferred)

```
mcp__github__list_commits
  owner: "{GITHUB_OWNER}"
  repo: "{GITHUB_REPO_NAME}"
  sha: "{BRANCH}"
  perPage: 10
```

```
mcp__github__list_pull_requests
  owner: "{GITHUB_OWNER}"
  repo: "{GITHUB_REPO_NAME}"
  base: "{BRANCH}"
  state: "closed"
  sort: "updated"
  direction: "desc"
  perPage: 10
```

For each merged PR (where `merged_at` is not null), optionally fetch file changes:
```
mcp__github__get_pull_request_files
  owner: "{GITHUB_OWNER}"
  repo: "{GITHUB_REPO_NAME}"
  pullNumber: {PR_NUMBER}
```

### 2b — Using REST API (fallback if MCP not available)

```
GET https://api.github.com/repos/{GITHUB_REPO}/commits?sha={BRANCH}&per_page=10
Headers:
  Authorization: Bearer $GITHUB_TOKEN
  Accept: application/vnd.github+json
```

```
GET https://api.github.com/repos/{GITHUB_REPO}/pulls?state=closed&base={BRANCH}&per_page=10&sort=updated&direction=desc
```

### Extract from each merged PR/commit:
- PR number and title
- Merge commit SHA (short, 7 chars) and full commit message
- Committer name / author login
- Merged at / committed at timestamp
- Files changed (filenames) — important for correlation
- PR body summary (first 2–3 lines)

Focus on the **last 5–10 commits** (non-merge commits) as the most likely source of staging issues.

### 2c — Fetch Commit Diffs for Code Review

For each non-merge commit in the recent list, fetch its diff using the REST API:

```bash
curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{GITHUB_REPO}/commits/{SHA}"
```

This returns `files[].patch` — the actual code diff for each changed file.

**Limit scope**: fetch diffs for the **5 most recent commits** only to avoid excessive API calls. Include merge commits — they may contain real code changes from squashed or resolved conflicts.

Extract from each diff:
- Changed files list with `additions` / `deletions` counts
- The `patch` content (actual diff lines) for files with < 300 changed lines
- For larger files, note the filename and line counts only

### 2d — Read Full Files for Deeper Analysis

After reviewing diffs, fetch the **complete file content** for files that changed in the 5 most recent commits. This allows you to understand the full context around each change and catch issues that are invisible from the diff alone (e.g. missing cases in a switch, callers of a changed function, interface contracts).

Use the GitHub REST API to read a full file at the branch tip:

```bash
curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{GITHUB_REPO}/contents/{FILE_PATH}?ref={BRANCH}" \
  | python3 -c "import json,sys,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())"
```

**Scope rules — read the full file when:**
- The changed file is a PHP class, service, or listener (`.php`)
- The changed file is a config file (`.yml`, `.xml`, `.json`) that defines routing, events, or listeners
- The diff shows a function signature change — read the full file to find all callers
- The diff introduces a new event name or constant — read listener config files to verify wiring
- Total lines in the file is < 500 (skip very large files; note them instead)

**Skip full-file reads for:**
- Pure frontend assets (`.js`, `.css`) unless the diff shows a logic bug worth deeper inspection
- Lock files, generated files, vendor files
- Files > 500 lines unless a `CRITICAL` diff finding warrants it

For each full file read, look for:
- **Callers of changed functions**: does any other code in the file call the function with the old signature?
- **Missing interface implementations**: does the class fully implement its interface after the change?
- **Dead event listeners**: are all events declared in config actually fired somewhere?
- **Incomplete switch/match statements**: are all cases handled after the change?
- **Dependency injection issues**: are all constructor/container dependencies available?

---

## Step 3 — Fetch Sentry Issues

Use the **Bash tool** with `sentry-cli` to query the self-hosted Sentry instance.

Each repo has its own Sentry project (see Repo Config Table). Ventures are distinguished by the `country` tag. The `{venture_lower}` is the lowercase venture code (e.g. `my`, `id`, `ph`, `au`).

### 3a — Discover Org Slug (if SENTRY_ORG not set)

```bash
sentry-cli --url $SENTRY_URL --auth-token $SENTRY_AUTH_TOKEN organizations list
```

Save the org slug as `{org_slug}` (e.g. `zalora`). Set `SENTRY_ORG={org_slug}` for subsequent commands.

### 3b — Fetch Recent Unresolved Issues (filtered by country)

```bash
sentry-cli --url $SENTRY_URL --auth-token $SENTRY_AUTH_TOKEN \
  issues -o $SENTRY_ORG -p {SENTRY_PROJECT} list \
  --query "is:unresolved country:{venture_lower}" \
  --max-rows 25
```

If the `--query` filter flag is not supported, fall back to the REST API via curl:

```bash
curl -s \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "$SENTRY_URL/api/0/projects/$SENTRY_ORG/{SENTRY_PROJECT}/issues/?query=is:unresolved+country:{venture_lower}&sort=date&limit=25&start={ISO_TIMESTAMP_24H_AGO}"
```

Use 24h ago as default for `start`, or since the timestamp of the most recent merged PR if available.

### 3c — Apply Ignore List

Before processing results, load the repo-specific ignore list from the skill's base directory:

```
{SKILL_BASE_DIR}/{SENTRY_IGNORE_FILE}
```

Read the file using the Read tool. Skip lines starting with `#` and blank lines. For each remaining line (a keyword/pattern), **exclude any Sentry issue whose title contains that string** (case-insensitive match).

Show a note in the report: `N issues filtered by ignore list ({SENTRY_IGNORE_FILE})`

If the ignore file does not exist, skip filtering and note it in the report.

Extract for each **non-ignored** issue:
- Issue ID, title (exact — do not paraphrase)
- Error type / culprit file and line
- `firstSeen` / `lastSeen` timestamps
- `count` (times seen)
- `permalink` (link to Sentry issue page)
- `tags` if relevant (environment, transaction)

---

## Step 4 — Code Review & Correlate

### 4a — Static Code Review of Diffs

For each fetched diff, review the patch content and look for potential bugs:

- **Null / nil dereference**: accessing a property/method on a value that could be null/undefined
- **Missing error handling**: unchecked return values, missing try/catch around DB or external calls
- **Off-by-one errors**: loop bounds, array indexing
- **Hardcoded values**: hardcoded IPs, credentials, environment-specific strings
- **SQL issues**: raw string interpolation into queries (injection risk), missing indexes hinted by query shape
- **Race conditions**: shared state modified without locks in async/swoole contexts
- **Wrong variable used**: copy-paste mistakes, shadowed variables
- **Logic errors**: inverted conditions, wrong operator (`=` vs `==`), missing `break` in switch
- **Removed or changed function signatures**: callers that may now pass wrong args
- **Config/constant changes**: modified constants or config keys that other code depends on (e.g. `SWOOLE_TASK_SERVER`)

Assign a severity to each finding:
- `CRITICAL` — likely to cause immediate runtime error or data corruption
- `WARNING` — suspicious, may cause issues under certain conditions
- `INFO` — code smell or minor concern, not immediately dangerous

### 4b — Correlate with Sentry

Cross-reference Sentry issues with recent GitHub activity:

1. **Time correlation**: Sentry issues that appeared **after** a specific commit are likely related
2. **File correlation**: If a commit touches file `X` and a Sentry error's culprit is in file `X` → strong suspect
3. **Code correlation**: If a diff finding (Step 4a) matches a Sentry error type → `HIGH` confidence
4. **Error type classification**:
   - `SyntaxError`, `NameError`, `AttributeError`, `TypeError` → code bug likely introduced by a commit
   - `DatabaseError`, `OperationalError`, `ConnectionRefused` → infra or config issue
   - `HTTP 404`, `HTTP 403` → routing or permission regression
   - `HTTP 500` spike or `UnhandledRejection` → critical regression
   - Pre-existing issues (firstSeen older than oldest recent commit) → not from recent changes

5. **Flag confidence level** for each suspect:
   - `HIGH` — code diff finding + Sentry error match, or time + file match
   - `MEDIUM` — time match only, or diff finding with no corresponding Sentry error yet
   - `LOW` — no clear link, but new since last deploy

---

## Step 5 — Output Report

Present a clean health report:

---

## Staging Health Check — {REPO_KEY} / {VENTURE} (`{BRANCH}`)
**Checked at**: {timestamp}
**Repo**: `{GITHUB_REPO}`  |  **Sentry project**: `{SENTRY_PROJECT}`
**Data sources**: GitHub MCP ✓ / REST API ✓  |  Sentry CLI ✓

---

### Recent Merges (last N PRs)
| PR | Commit | Committer | Merged At | Summary |
|----|--------|-----------|-----------|---------|
| #1234 | `a1b2c3d` Fix order status sync logic | @dev-name | 2h ago | Fix order status sync logic |
| #1231 | `e4f5g6h` Refactor warehouse picking flow | @dev-name | 5h ago | Refactor warehouse picking flow |

---

### Sentry Issues (last 24h — N new issues, N filtered by ignore list)
| Severity | Error (exact) | First Seen | Count | Linked Commit |
|----------|---------------|------------|-------|---------------|
| ERROR | TypeError: 'NoneType' object has no attribute 'id' | 1h ago | 42 | `a1b2c3d` Fix order status — @dev-name (HIGH) |
| WARNING | ConnectionRefused: redis:6379 | 3h ago | 5 | — (infra) |

> Sentry link: https://sentry-stg.zalora.net/organizations/{org}/issues/{id}/

When a Sentry issue is linked to a commit, always show:
- Short commit SHA (7 chars) as inline code: `` `a1b2c3d` ``
- Commit message (truncated to ~60 chars)
- Committer name / GitHub login
- Confidence level: `HIGH` / `MEDIUM` / `LOW`

---

### Code Review — Recent Commits

For each reviewed commit, show findings:

---
**`a1b2c3d`** — "SEAOPS-XXXX: some change" — @dev-name — Mar 11 09:00
- Files changed: `path/to/file.php` (+12 / -3), `another/file.php` (+5 / -1)
- `[CRITICAL]` `path/to/file.php:42` — Null dereference: `$order->getItem()` called without null check; `getItem()` can return null when order has no items
- `[WARNING]` `path/to/file.php:88` — Hardcoded environment value `'staging'` in condition; will break in production
- `[INFO]` `another/file.php:15` — Unused variable `$result` assigned but never read

If no issues found in a commit: "No potential issues found."
If diff is too large (>300 lines): "Diff too large to review inline — {N} lines changed in {file}. Review manually."

---

### Verdict

**Status**: 🔴 Unhealthy / 🟡 Degraded / 🟢 Healthy

**Summary**:
- Suspect commit: `a1b2c3d` — "Fix order status sync logic" — @dev-name — `HIGH` confidence
- Via PR: #1234
- Reason: TypeError spike (42×) starting 1h after merge, culprit file matches changed files

**Recommended action**:
- [ ] Rollback commit `a1b2c3d` (PR #1234) OR
- [ ] Hotfix: investigate `{file}:{line}` for `{error}`
- [ ] Assign to @{author} for investigation

---

### Verdict Rules:
- **Healthy** — No new Sentry issues after recent merges, or only pre-existing issues
- **Degraded** — New issues but low frequency (<10 count), or no clear link to recent changes
- **Unhealthy** — High-frequency new errors (>10 count) appearing after a specific merge, or any SyntaxError/TypeError spike

---

## Important Notes

- **Always show raw Sentry error titles** — exact messages help developers grep the codebase
- If GitHub MCP is available but token has no access to the private repo, it will return 404 — guide user to ensure the token has `repo` scope
- If Sentry returns 0 issues, explicitly confirm: "No new issues in Sentry for the last 24h on {REPO_KEY}/{VENTURE}" — do not silently skip
- If the user asks for a custom time window (e.g. "last 2 hours"), apply it to both GitHub (filter commits by date) and Sentry (`start` param)
- Never speculate beyond what data shows — if data is missing, say clearly which source failed and why
- If both MCP and REST fail for GitHub, ask the user to paste recent commits manually
- **Code review scope**: review the 5 most recent commits including merge commits — merge commits may contain conflict resolutions or squashed changes worth reviewing
- **Code review honesty**: only flag real issues visible in the diff — do not fabricate findings. If the diff looks clean, say so explicitly
- For very large diffs (>300 lines per file), note the file and size and ask the user if they want a focused review of specific files
