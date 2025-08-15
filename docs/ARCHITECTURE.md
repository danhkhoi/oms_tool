# Architecture Overview

This monorepo hosts independent OMS ops tools. There is no global build; each tool defines its own runtime. Shared docs and examples live at the root.

## Typical OMS ↔ DWH flows

- Pull stock snapshots from OMS API and DWH (SQL)
- Normalize to a common schema
- Compare measures (on_hand, reserved, available) by keys (sku, location)
- Output a diff report and optional remediation suggestions

## Layers per tool

1. Ingest
   - Sources: OMS REST/GraphQL, message topics, DWH (Postgres/BigQuery/Snowflake), CSV/Parquet
   - Authentication via env vars / secret manager
2. Normalize
   - Map source fields to a canonical model
   - Handle nulls, units, time zones
3. Compare / Validate
   - Keyed joins, tolerances, aggregates
4. Output
   - Console summary, JSON/CSV report files, exit code

## Multi-language support

- Each tool picks its language; include a Makefile to standardize commands.
- For Python, use `uv` or `pip` + `pyproject.toml`.
- For Node, use `pnpm` or `npm` with a lockfile.
- For Go, standard modules.

## CI/CD (optional)

- Lint and test per tool directory
- Build artifacts or containers as needed
- Scheduled runs for monitoring
