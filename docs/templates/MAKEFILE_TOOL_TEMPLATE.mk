# Common targets for a tool; copy into tools/<tool>/Makefile and customize

.PHONY: setup run test lint fmt clean

setup:
	@echo "Implement environment setup here (e.g., create venv, install deps)"

run:
	@echo "Implement run command, e.g., python -m src.main $${ARGS}"

test:
	@echo "Implement tests, e.g., pytest -q"

lint:
	@echo "Implement lints, e.g., ruff check . | eslint ."

fmt:
	@echo "Implement formatting, e.g., ruff format . | prettier -w ."

clean:
	@rm -rf .venv dist build out .pytest_cache __pycache__ node_modules
