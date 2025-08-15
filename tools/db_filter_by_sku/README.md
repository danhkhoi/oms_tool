# CSV Filter by SKU

A small CLI tool to filter rows in a CSV by SKU (article) values and export the result to another CSV. No database required.

## Inputs

- Input CSV with a header. Default article column name: `article`.
- SKU values specified via `--sku` flags and/or a list file via `--sku-file`.

Example input CSV columns (from your sample):
- `__source, article, plant, customer_order_no, po_item_no`

## Install

```zsh
cd tools/db_filter_by_sku
make setup
```

Requirements:
- Python 3.8+

## Usage

```zsh
# Include by specific SKUs
make run ARGS="--input-csv ../../examples/sample_articles.csv \
  --output-csv ./out/results.csv \
  --sku 0F29FGLADE5D6FGS-044MZJ \
  --sku 877A6SH1C65E84GS-061KOO"

# Or provide a file with SKUs (CSV with 'article' column or one-per-line)
make run ARGS="--input-csv ../../examples/sample_articles.csv \
  --output-csv ./out/results.csv \
  --sku-file ../../examples/sku_list.txt"
```

### Flags
- `--input-csv` Path to CSV with an `article` column (required)
- `--output-csv` Path for results CSV (required)
- `--csv-article-column` Column in input CSV with SKU values (default: `article`)
- `--sku` SKU value to include; repeatable
- `--sku-file` Path to file with SKUs (CSV header with `article` or one-per-line)
- `--sku-file-column` Column name in `--sku-file` if it's a CSV (default: `article`)
- `--columns` Comma-separated columns to write (default: `*` for all)
- `--case-insensitive` Case-insensitive matching
- `--invert` Exclude rows that match instead of include

## Behavior
- Collects SKUs from flags and/or list file (deduped)
- Streams input CSV and writes only matching rows
- Optional case-insensitive matching and column selection
- Exits non-zero on errors (invalid input)

## Makefile
- `make setup` Create venv and install deps
- `make run ARGS="..."` Run the CLI
- `make clean` Clean artifacts

## Notes
- Delimiter is auto-detected; expects a header row
- For large files, this streams line-by-line to keep memory stable
