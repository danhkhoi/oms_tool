# <Tool Name>

Brief description of purpose and where it fits (e.g., reconciles stock between OMS and DWH).

## Inputs and contracts

- Config: `config.yaml` (see example)
- Env vars:
  - OMS_BASE_URL
  - OMS_API_KEY
  - DWH_DSN (e.g., postgres://...)
  - TZ (default UTC)
- Data contracts:
  - Expected input fields: sku, location_id, on_hand, reserved, available, as_of
  - Output: CSV/JSON diff with columns: sku, location_id, metric, oms_value, dwh_value, delta, pct_delta

## Install

- Dependencies: <language/toolchain>
- Setup:
  - make setup

## Usage

- Run:
  - make run ARGS="--date 2025-08-15 --tolerance 0.01"

## Options

- --date YYYY-MM-DD (default today in TZ)
- --tolerance FLOAT fraction (default 0.0)
- --output PATH (default ./out)

## Error modes

- 1: Config or schema validation failed
- 2: Source fetch failed (OMS/DWH)
- 3: Comparison produced errors but continued

## Development

- make test
- make lint

## Notes

- Time zone handling and rounding rules must be consistent across sources.
