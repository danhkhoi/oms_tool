PYTHON := python3
VENV := .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

.PHONY: setup run clean

setup:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	@if [ -s requirements.txt ]; then $(PIP) install -r requirements.txt; else echo "No requirements to install"; fi

run:
	@[ -d $(VENV) ] || (echo "Run 'make setup' first" && exit 1)
	@mkdir -p out
	$(PY) filter_by_sku.py $(ARGS)

clean:
	rm -rf $(VENV) out __pycache__ .pytest_cache *.pyc
