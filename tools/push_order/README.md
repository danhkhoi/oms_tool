# push_order

Pushes test orders to RabbitMQ (`salesorder` exchange, `bob.au.new` routing key) to test OMS cut-off time behaviour across all 3PLs.

## Setup

```bash
npm install
```

## Usage

```bash
# Run all 17 scenarios (all 3PLs)
node push_order.js

# Run a single scenario by index (0-based)
node push_order.js --scenario 0

# Run a single scenario by name (partial match, case-insensitive)
node push_order.js --scenario "Sydney Standard"

# Override the SKU (default: BO646SA49HAK-579990)
node push_order.js --sku YOUR-SKU-HERE

# Dry-run: print what would be published without connecting to RabbitMQ
node push_order.js --dry-run

# Combine flags
node push_order.js --scenario "Brisbane" --sku BO646SA49HAK-579990 --dry-run
```

## Test scenario logic

Each scenario maps to one row in the spreadsheet:

| # | 3PL | SIO/MIO | Customer cutoff |
|---|-----|---------|-----------------|
| 0 | Sydney Standard | SIO | 20:00 |
| 1 | Sydney Express | MIO | 20:00 |
| 2 | Melbourne Standard | MIO | 13:00 |
| 3 | Melbourne Express | SIO | 13:00 |
| 4 | Brisbane Standard | SIO | 12:00 |
| 5 | Brisbane Express | MIO | 12:00 |
| 6 | Interstate Standard | MIO | 15:00 |
| 7 | Interstate Express | SIO | 15:00 |
| 8 | Interstate Twilight | SIO | 08:00 |
| 9 | Sydney Twilight | MIO | 14:00 |
| 10 | Sydney 3 Hour | MIO | 14:00 |
| 11 | Sydney Saturday | SIO | 13:00 |
| 12 | New Zealand Standard | MIO | 07:00 |
| 13 | TGE Standard | SIO | 15:00 |
| 14 | TGE Express | SIO | 15:00 |
| 15 | DHL Express | MIO | 12:00 |
| 16 | ParcelPoint | MIO | 12:00 |

For each scenario, **5 orders are created before** the customer cut-off and **5 orders after**. The `created_at` field on the order and item is set relative to today's cut-off time:
- Before: starting 60 min before cutoff, 5 min apart
- After: starting 5 min after cutoff, 5 min apart

## Configuration

Edit `config.js` to change:
- `CONNECTION_URL` — RabbitMQ AMQP connection string
- `DEFAULT_SKU` — default SKU used when `--sku` is not supplied
- `CUSTOMER` — customer / address defaults
- `ITEM_DEFAULTS` — item price, supplier, shipment type, etc.
- `SCENARIOS` — add/remove/edit scenarios or change `ordersBeforeCutoff` / `ordersAfterCutoff` counts
