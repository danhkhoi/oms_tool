#!/usr/bin/env python3
import argparse
import csv
import os
import sys
from typing import List, Optional, Set, Dict


def sniff_delimiter(path: str, default: str = ",") -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            sample = f.read(4096)
        dialect = csv.Sniffer().sniff(sample)
        return dialect.delimiter
    except Exception:
        return default


def read_unique_values(
    input_csv: str,
    column: Optional[str],
    no_header: bool,
    case_insensitive: bool,
    sort_values: bool,
    exactly_once: bool,
) -> List[str]:
    if not os.path.isfile(input_csv):
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")

    delimiter = sniff_delimiter(input_csv, ",")

    counts: Dict[str, int] = {}
    order: List[str] = []  # preserve first-seen order of keys
    display: Dict[str, str] = {}  # key -> original display value

    with open(input_csv, newline="", encoding="utf-8") as f:
        if not no_header:
            reader = csv.DictReader(f, delimiter=delimiter)
            if reader.fieldnames is None:
                # Fallback to reader if header not detected
                f.seek(0)
                rdr = csv.reader(f, delimiter=delimiter)
                for row in rdr:
                    if not row:
                        continue
                    val = (row[0] or "").strip()
                    if not val:
                        continue
                    key = val.lower() if case_insensitive else val
                    if key not in counts:
                        order.append(key)
                        display[key] = val
                        counts[key] = 0
                    counts[key] += 1
            else:
                # Determine column to use
                col = column or (reader.fieldnames[0] if reader.fieldnames else "value")
                if col not in reader.fieldnames:
                    raise ValueError(
                        f"Column '{col}' not found in header. Available: {reader.fieldnames}"
                    )
                for row in reader:
                    val = (row.get(col) or "").strip()
                    if not val:
                        continue
                    key = val.lower() if case_insensitive else val
                    if key not in counts:
                        order.append(key)
                        display[key] = val
                        counts[key] = 0
                    counts[key] += 1
        else:
            rdr = csv.reader(f, delimiter=delimiter)
            for row in rdr:
                if not row:
                    continue
                val = (row[0] or "").strip()
                if not val:
                    continue
                key = val.lower() if case_insensitive else val
                if key not in counts:
                    order.append(key)
                    display[key] = val
                    counts[key] = 0
                counts[key] += 1

    if exactly_once:
        values = [display[k] for k in order if counts.get(k, 0) == 1]
    else:
        values = [display[k] for k in order]

    if sort_values:
        values = sorted(values, key=lambda s: s.lower() if case_insensitive else s)

    return values


def write_output(values: List[str], output: str, fmt: str, header: Optional[str]) -> None:
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    if fmt == "txt":
        with open(output, "w", encoding="utf-8") as f:
            for v in values:
                f.write(f"{v}\n")
    else:
        with open(output, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([header or "value"])
            for v in values:
                writer.writerow([v])


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Extract unique values from a CSV list")
    parser.add_argument("--input-csv", required=True, help="Path to input CSV")
    parser.add_argument("--output", required=True, help="Path to output file")
    parser.add_argument("--column", help="Column name to read (if header present)")
    parser.add_argument("--no-header", action="store_true", help="Treat input as no header; use first column")
    parser.add_argument("--case-insensitive", action="store_true", help="Case-insensitive uniqueness")
    parser.add_argument("--sort", action="store_true", help="Sort unique values alphabetically")
    parser.add_argument(
        "--exactly-once",
        action="store_true",
        help="Output only values that appear exactly once (exclude duplicates entirely)",
    )
    parser.add_argument("--format", choices=["csv", "txt"], default="csv", help="Output format")
    parser.add_argument("--output-header", help="Header name for CSV output (default: column or 'value')")

    args = parser.parse_args(argv)

    try:
        values = read_unique_values(
            input_csv=args.input_csv,
            column=args.column,
            no_header=args.no_header,
            case_insensitive=args.case_insensitive,
            sort_values=args.sort,
            exactly_once=args.exactly_once,
        )
        write_output(values, args.output, args.format, args.output_header or args.column or "value")
        print(f"Wrote {len(values)} unique values to {args.output}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
