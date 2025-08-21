# Unique Values Extractor

A tiny CLI to find unique items from a CSV list. Input is a CSV file where each row is a value (optionally with a header). Output is a file containing unique values.

## Features

- Preserves first occurrence order by default
- Optional case-insensitive matching
- Auto-detects CSV delimiter
- Choose input column, handle header or no-header
- Output as CSV (default) or plain text

## Install

```zsh
cd tools/unique_values
make setup
```

Requirements: Python 3.8+

## Usage

```zsh
# Basic: single-column CSV with header 'value'
make run ARGS="--input-csv ../../examples/values.csv --output ./out/unique.csv"

# No header, take first column
make run ARGS="--input-csv ../../examples/values_no_header.csv --output ./out/unique.csv --no-header"

# Explicit column name and case-insensitive uniques
make run ARGS="--input-csv ../../examples/sample_articles.csv \
  --output ./out/unique_articles.csv \
  --column article \
  --case-insensitive"

# Output as text (one per line)
make run ARGS="--input-csv ../../examples/values.csv --output ./out/unique.txt --format txt"
```

### Flags

- `--input-csv` Path to input CSV (required)
- `--output` Path to output file (required)
- `--column` Column name to read (if header present). If omitted, uses first column or 'value'.
- `--no-header` Treat input as no header; read first column
- `--case-insensitive` Treat values differing only by case as the same
- `--sort` Sort the unique values alphabetically (default: preserve order)
- `--format` `csv` (default) or `txt`
- `--output-header` Header name for CSV output (default: the column name or 'value')
- `--exactly-once` Output only values that appear exactly once (exclude any duplicates entirely)

## Notes

- Empty lines are ignored
- Whitespace is trimmed
