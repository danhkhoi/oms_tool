#!/usr/bin/env python3
import argparse
import csv
import os
import sys
from typing import Iterable, List, Dict, Set, Optional


def sniff_delimiter(sample_path: str, default: str = ",") -> str:
    try:
        with open(sample_path, "r", encoding="utf-8") as f:
            sample = f.read(4096)
        dialect = csv.Sniffer().sniff(sample)
        return dialect.delimiter
    except Exception:
        return default


def read_sku_list(
    sku_values: Optional[List[str]],
    sku_file: Optional[str],
    sku_file_column: str,
    case_insensitive: bool,
) -> Set[str]:
    values: Set[str] = set()
    # From CLI values
    if sku_values:
        for v in sku_values:
            s = v.strip()
            if s:
                values.add(s.lower() if case_insensitive else s)

    # From file (supports CSV with header or one-per-line)
    if sku_file:
        if not os.path.isfile(sku_file):
            raise FileNotFoundError(f"SKU file not found: {sku_file}")
        # Try CSV with header first
        with open(sku_file, newline="", encoding="utf-8") as f:
            try:
                reader = csv.DictReader(f)
                if reader.fieldnames and sku_file_column in reader.fieldnames:
                    for row in reader:
                        s = (row.get(sku_file_column) or "").strip()
                        if s:
                            values.add(s.lower() if case_insensitive else s)
                else:
                    # Fallback: treat as simple lines (no header)
                    f.seek(0)
                    for line in f:
                        s = line.strip()
                        if s and not s.startswith("#"):
                            values.add(s.lower() if case_insensitive else s)
            except csv.Error:
                # Not a CSV: treat as simple lines
                f.seek(0)
                for line in f:
                    s = line.strip()
                    if s and not s.startswith("#"):
                        values.add(s.lower() if case_insensitive else s)

    return values


def stream_filter_csv(
    input_csv: str,
    output_csv: str,
    article_col: str,
    match_values: Set[str],
    plant_col: Optional[str],
    plant_values: Optional[Set[str]],
    select_columns: Optional[List[str]],
    case_insensitive: bool,
    invert: bool,
) -> int:
    if not os.path.isfile(input_csv):
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")

    os.makedirs(os.path.dirname(output_csv) or ".", exist_ok=True)

    # Detect delimiter for input
    delimiter = sniff_delimiter(input_csv, ",")

    written = 0
    with open(input_csv, newline="", encoding="utf-8") as in_f, open(
        output_csv, "w", newline="", encoding="utf-8"
    ) as out_f:
        reader = csv.DictReader(in_f, delimiter=delimiter)
        if article_col not in (reader.fieldnames or []):
            raise ValueError(
                f"Input CSV missing required column '{article_col}'. Found: {reader.fieldnames}"
            )
        if plant_values and plant_col and plant_col not in (reader.fieldnames or []):
            raise ValueError(
                f"Input CSV missing required column '{plant_col}' for plant filter. Found: {reader.fieldnames}"
            )

        # Determine output columns
        if select_columns and select_columns != ["*"]:
            out_fields = select_columns
        else:
            out_fields = reader.fieldnames or []

        writer = csv.DictWriter(out_f, fieldnames=out_fields)
        writer.writeheader()

        for row in reader:
            raw_val = (row.get(article_col) or "").strip()
            key = raw_val.lower() if case_insensitive else raw_val
            is_match = key in match_values if key else False

            # Apply plant filter if provided
            if is_match and plant_values is not None and plant_col:
                plant_raw = (row.get(plant_col) or "").strip()
                plant_key = plant_raw.lower() if case_insensitive else plant_raw
                is_match = plant_key in plant_values if plant_key else False
            if invert:
                keep = not is_match
            else:
                keep = is_match
            if keep:
                # Always construct the output row to avoid relying on identity semantics
                writer.writerow({k: row.get(k, "") for k in out_fields})
                written += 1

    return written


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Filter rows from a CSV by SKU/article values and export to a CSV"
    )
    parser.add_argument("--input-csv", required=True, help="Path to input CSV with rows to filter")
    parser.add_argument("--output-csv", required=True, help="Path to output CSV with filtered rows")
    parser.add_argument(
        "--csv-article-column",
        default="article",
        help="Column name in input CSV that contains SKU/article (default: article)",
    )
    parser.add_argument(
        "--csv-plant-column",
        default="plant",
        help="Column name in input CSV that contains plant/location (default: plant)",
    )
    parser.add_argument(
        "--sku",
        action="append",
        help="SKU/article value to include; can be passed multiple times",
    )
    parser.add_argument(
        "--sku-file",
        help="Path to a file containing SKU/article values (CSV with header or one-per-line)",
    )
    parser.add_argument(
        "--sku-file-column",
        default="article",
        help="If --sku-file is a CSV, use this column for values (default: article)",
    )
    parser.add_argument(
        "--columns",
        default="*",
        help="Comma-separated list of columns to write (default: '*')",
    )
    parser.add_argument(
        "--case-insensitive",
        action="store_true",
        help="Case-insensitive matching of SKU/article values",
    )
    parser.add_argument(
        "--invert",
        action="store_true",
        help="Invert selection (exclude matching rows instead of include)",
    )
    parser.add_argument(
        "--plant",
        action="append",
        help="Plant/location value to include; can be passed multiple times",
    )

    args = parser.parse_args(argv)

    try:
        match_values = read_sku_list(
            sku_values=args.sku,
            sku_file=args.sku_file,
            sku_file_column=args.sku_file_column,
            case_insensitive=args.case_insensitive,
        )
        if not match_values:
            print(
                "No SKU/article values provided. Use --sku and/or --sku-file.",
                file=sys.stderr,
            )
            return 2

        plant_values: Optional[Set[str]] = None
        if args.plant:
            plant_values = set(
                (p.strip().lower() if args.case_insensitive else p.strip())
                for p in args.plant
                if p and p.strip()
            ) or None

        cols = [c.strip() for c in args.columns.split(",")] if args.columns else ["*"]
        if len(cols) == 1 and cols[0] == "*":
            cols = ["*"]

        written = stream_filter_csv(
            input_csv=args.input_csv,
            output_csv=args.output_csv,
            article_col=args.csv_article_column,
            match_values=match_values,
            plant_col=args.csv_plant_column,
            plant_values=plant_values,
            select_columns=None if cols == ["*"] else cols,
            case_insensitive=args.case_insensitive,
            invert=args.invert,
        )
        print(f"Wrote {written} rows to {args.output_csv}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
