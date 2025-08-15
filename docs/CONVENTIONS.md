# Conventions

Keep tools simple, composable, and self-contained.

## Project structure per tool

- README.md — purpose, contract, usage, config
- src/ — source code
- tests/ — minimal tests (happy path + 1 edge case)
- config.example.yaml — config with env-var placeholders
- Makefile — setup, test, run, lint targets
- Dockerfile (optional)

## Coding

- Prefer small CLIs with clear flags and exit codes.
- Log structured JSON for automated consumption; human-friendly logs for local use.
- Validate inputs early; fail fast with actionable messages.
- Handle timeouts, retries with backoff for network calls.

## Configuration

- Use environment variables for secrets; reference them in YAML like ${ENV_VAR}.
- Support overriding via CLI flags.
- Keep schema versioned; validate on startup.

## Data contracts

- Document inputs/outputs with small examples.
- Include column names, types, and units for tabular outputs.
- Be explicit about time zones.

## Testing

- Unit tests for core logic.
- CLI smoke test.
- If accessing external systems, stub or use feature flags to run offline.

## Observability

- Exit codes: 0 success, non-zero for typed failures.
- Log correlation IDs for multi-call workflows.
- Emit summary at the end: counts, mismatches, duration.

## Versioning

- Use semantic versioning in tool manifests when possible.
- Record notable changes in a CHANGELOG.md per tool if it’s used externally.
