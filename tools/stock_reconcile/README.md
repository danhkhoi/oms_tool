# Stock Reconcile

Reconciles stock quantities between OMS and DWH by sku and location.

## Inputs and contracts

- Config: `config.yaml` (see `config.example.yaml`)
- Env vars:
  - OMS_BASE_URL
  - OMS_API_KEY
  - DWH_DSN (e.g., postgres://user:pass@host:5432/db)
  - TZ (default UTC)
- Output: CSV/JSON diff with columns: sku, location_id, metric, oms_value, dwh_value, delta, pct_delta

## Install

This tool is language-agnostic for now. Add your preferred implementation (Python/Node/Go) under `src/`.

## Usage

- Run implementation-specific command, e.g. `make run ARGS="--date 2025-08-15 --tolerance 0.01"`

## Options

- --date YYYY-MM-DD (default today in TZ)
- --tolerance FLOAT fraction (default 0.0)
- --output PATH (default ./out)

## Error modes

- 1: Config or schema validation failed
- 2: Source fetch failed (OMS/DWH)
- 3: Comparison produced errors but continued

## Notes

- Align time zones and rounding rules across sources.
