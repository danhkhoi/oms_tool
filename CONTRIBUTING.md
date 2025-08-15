# Contributing

Thanks for helping improve this OMS tools monorepo.

## Workflow

- One tool per folder in `tools/`.
- Small, focused PRs with docs and tests.
- Use the tool README template.

## Style and tooling

- Keep dependency footprints minimal.
- Prefer Makefile targets: setup, run, test, lint, fmt, clean
- Log clearly and fail fast on invalid input.

## Commits and PRs

- Conventional Commits style is encouraged (feat:, fix:, docs:, chore:)
- Include before/after behavior in the PR description.
- Add or update example configs when user-facing options change.

## Testing

- Include a fast smoke test for the CLI.
- Mock external calls for unit tests.

## Security

- Never commit secrets.
- Validate and sanitize any SQL or API inputs.
