# Runbook — Stock Reconciliation

Purpose: Detect and quantify differences between OMS and DWH stock quantities.

## Preconditions

- Access to OMS API and DWH database
- Configured environment variables (see examples)
- Network access from runner to sources

## Steps

1) Prepare config from `examples/config.example.yaml` and set env vars.
2) Choose the date/time window (snapshot time or range).
3) Run the tool (see its README) with tolerance settings.
4) Review the summary and the generated diff report.
5) If mismatches are within tolerance, mark as pass. Otherwise, investigate:
   - Check late-arriving data or ingestion lags
   - Verify SKU/location mappings
   - Confirm reservation calculation rules

## Common causes

- Clock skew and time zone confusion
- Different definitions of "available" (on_hand - reserved - damaged)
- Partial ingestions or failed jobs

## Remediation

- Re-run after data backfill
- Apply mapping fixes and re-normalize
- Create adjustments in OMS if DWH is authoritative (or vice versa)

## Outputs

- Console summary (counts, totals, percent deltas)
- CSV/JSON diff file in `out/`
- Exit code (non-zero if outside tolerance)
