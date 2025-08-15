# OMS Tool Monorepo

A multi-language workspace for OMS (Order Management System) operational tools. Each tool lives in its own folder under `tools/` and can be implemented in the language that best fits its job (Python, Node.js/TypeScript, Go, Bash, SQL, etc.).

This repo targets common OMS ops scenarios such as:
- Stock reconciliation: compare on-hand, reserved, and available quantities between OMS and DWH.
- Data quality checks: schema drift, null rates, referential integrity.
- Operational exports/imports: batched adjustments, backfills.

## Repo layout

- `tools/` — One subfolder per tool (e.g., `stock_reconcile/`, `dq_checks/`). Each tool is self-contained with its own README and dependencies.
- `docs/` — Architecture, conventions, and runbooks.
- `examples/` — Example configs and sample data.
- `.editorconfig` — Shared editor settings.
- `.gitignore` — Multi-language ignores.

## Quick start

1) Pick or create a tool folder under `tools/`.
2) Copy the README template from `docs/templates/TOOL_README_TEMPLATE.md` and fill it in.
3) Add a config file based on `examples/config.example.yaml`.
4) Run the tool by following its local README (each tool defines its own runtime and commands).

## Adding a new tool

- Create `tools/<tool_name>/` with:
  - `README.md` (use the template)
  - `src/` or equivalent code folder
  - Dependency manifest (e.g., `pyproject.toml`, `package.json`, `go.mod`)
  - `config.example.yaml` for inputs (endpoints, credentials via env vars)
  - `Makefile` or task runner for common commands (setup, test, run)
  - Minimal tests

- Document:
  - Inputs/outputs and data contracts
  - How to run locally and in CI
  - Configuration and secrets
  - Error modes and retries

## Configuration and secrets

- Use a YAML config (see `examples/config.example.yaml`) with values populated from environment variables.
- Do not commit secrets. Use `.env` files locally and a secret manager in CI/CD.
- Prefer connection strings or DSNs for OMS and DWH connections.

## Tool execution modes

- Local CLI (developer machine)
- Containerized (optional Dockerfile per tool)
- Scheduled/CI (GitHub Actions or other scheduler)

## Support matrix

- Python 3.10+
- Node.js 18+
- Go 1.22+
- Bash >= 5 for shell utilities

Adjust per tool as needed.

## Contributing

See `CONTRIBUTING.md` for conventions, style, and review process.

## License

TBD — add the appropriate license for your organization.
