# push_order

Pushes test orders to RabbitMQ (`salesorder` exchange, `bob.au.new` routing key) to test OMS cut-off time behaviour across all 3PLs.

## Prerequisites

Before running this tool, you need an active RabbitMQ tunnel via AWS SSM port forwarding. The script connects to `localhost:5671`, so the tunnel must be open first.

**Step 1 — Install dependencies (first time only)**

```bash
# AWS CLI
brew install awscli

# AWS Session Manager Plugin
brew install --cask session-manager-plugin

# Python deps for the tunnel script
cd ../rabbitmq_connect
pip install -r requirements-rabbitmq.txt
```

**Step 2 — Open the RabbitMQ tunnel (keep this terminal open)**

Connect to staging:
```bash
cd ../rabbitmq_connect
python rabbitmq_connect.py --env staging
```

Connect to production:
```bash
cd ../rabbitmq_connect
python rabbitmq_connect.py
python rabbitmq_connect.py --amqp
```

The script will handle AWS SSO login automatically. Leave this terminal running — it forwards RabbitMQ traffic to `localhost:5671`.

```bash
python rabbitmq_connect.py --env staging --amqp
```

**Step 3 — Install Node dependencies (first time only)**

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

| # | Allocated 3PL in BOB | SIO/MIO | Customer cutoff |
|---|----------------------|---------|-----------------|
| 0 | Australia Post Standard Sydney | SIO | 20:00 |
| 1 | Australia Post Express Sydney | MIO | 20:00 |
| 2 | Australia Post Standard Melbourne | MIO | 13:00 |
| 3 | Australia Post Express Melbourne | SIO | 13:00 |
| 4 | Australia Post Standard Brisbane | SIO | 12:00 |
| 5 | Australia Post Express Brisbane | MIO | 12:00 |
| 6 | Australia Post Standard Interstate | MIO | 15:00 |
| 7 | Australia Post Express Interstate | SIO | 15:00 |
| 8 | Melbourne/Victoria Startrack Twilight | SIO | 08:00 |
| 9 | Brisbane/Queensland Startrack Twilight | MIO | 08:00 |
| 10 | Startrack Twilight Delivery | MIO | 14:00 |
| 11 | Startrack 3 Hour Delivery | MIO | 14:00 |
| 12 | Startrack Saturday Delivery | SIO | 13:00 |
| 13 | Australia Post New Zealand | MIO | 07:00 |
| 14 | TGE Standard | SIO | 15:00 |
| 15 | TGE Express | SIO | 15:00 |
| 16 | DHL Express New Zealand | MIO | 12:00 |
| 17 | Parcelpoint | MIO | 12:00 |

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
