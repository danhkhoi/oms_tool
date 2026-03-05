'use strict';

const amqp = require('amqplib');
const { CONNECTION_URL, RABBITMQ_SERVERNAME, DEFAULT_SKUS, ITEM_DEFAULTS, SCENARIOS } = require('./config');

// ─── CLI args ─────────────────────────────────────────────────────────────────
// Usage:
//   node push_order.js                          → run all scenarios
//   node push_order.js --scenario 0             → run scenario at index 0
//   node push_order.js --scenario "Sydney Standard - SIO"
//   node push_order.js --sku BO646SA49HAK-579990
//   node push_order.js --dry-run                → print payloads, do not publish
const args = process.argv.slice(2);

const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
};

const DRY_RUN = args.includes('--dry-run');
const SKU = getArg('--sku') || null;
const SCENARIO_FILTER = getArg('--scenario'); // index or name

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona', 'George', 'Hannah', 'Ivan', 'Julia'];
const LAST_NAMES  = ['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Wilson', 'Johnson', 'Davis', 'Miller', 'Moore'];

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a random customer with a unique email per call.
 */
const randomCustomer = () => {
    const firstName = randomElement(FIRST_NAMES);
    const lastName  = randomElement(LAST_NAMES);
    const uid       = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return {
        email:       `test+${uid}@theiconic.com.au`,
        first_name:  firstName,
        last_name:   lastName,
        address1:    '123 Sunset Strp',
        city:        'Ocean Grove',
        postcode:    '3226',
        phone:       '+61400444444',
        country_code: 'AU',
        region:      'Victoria',
    };
};

/**
 * Build a "YYYY-MM-DD HH:MM:SS" timestamp.
 * @param {Date} date
 */
const toTimestamp = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Given a "HH:MM" cut-off string and an optional ISO date string "YYYY-MM-DD",
 * return a Date set to that time on that date (or today if no date given).
 * No timezone conversion — times are kept as local.
 */
const cutoffDate = (hhMM, isoDate) => {
    const [hh, mm] = hhMM.split(':').map(Number);
    const d = isoDate ? new Date(isoDate + 'T00:00:00') : new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
};

/**
 * Build an order timestamp that is `offsetMinutes` before/after the cut-off.
 * Negative offset → before cut-off.  Positive → after.
 */
const orderTimestamp = (cutoff, offsetMinutes) => {
    const d = new Date(cutoff.getTime() + offsetMinutes * 60 * 1000);
    return toTimestamp(d);
};

// ─── Payload builders ─────────────────────────────────────────────────────────
const buildOrderPayload = (scenario, skus, createdAt, customer) => {
    const ts = Date.now();
    const orderNr = `T${ts}`;

    // pickup_cutoff = owms_cutoff time on owms_cutoff_date (after) or created_date (before).
    const pickupCutoffTime = scenario.owms_cutoff || scenario.customer_cutoff;
    const pickupCutoffIsoDate = scenario.owms_cutoff_date || createdAt.slice(0, 10);
    const cutoffTs = orderTimestamp(cutoffDate(pickupCutoffTime, pickupCutoffIsoDate), 0);

    const skuList = Array.isArray(skus) ? skus : [skus];
    const salesOrderItems = {};
    skuList.forEach((sku, idx) => {
        const itemId = `${ts}${idx}`;
        salesOrderItems[itemId] = {
            id_sales_order_item: itemId,
            fk_sales_order_item_status: 1,
            unit_price: ITEM_DEFAULTS.unit_price,
            tax_amount: ITEM_DEFAULTS.tax_amount,
            paid_price: parseFloat(ITEM_DEFAULTS.paid_price),
            name: ITEM_DEFAULTS.name,
            sku,
            weight: ITEM_DEFAULTS.weight,
            created_at: createdAt,
            updated_at: createdAt,
            fk_catalog_shipment_type: scenario.fk_catalog_shipment_type,
            supplier_identifier: ITEM_DEFAULTS.supplier_identifier,
            is_marketplace: ITEM_DEFAULTS.is_marketplace ? 1 : 0,
            shipment_provider: scenario.allocated_3pl,
            pickup_cutoff: cutoffTs,
        };
    });

    const grandTotal = (parseFloat(ITEM_DEFAULTS.unit_price) * skuList.length).toFixed(2);
    const totalTax = (parseFloat(ITEM_DEFAULTS.tax_amount) * skuList.length).toFixed(2);

    return {
        sales_order: {
            customer_email: customer.email,
            order_nr: orderNr,
            grand_total: grandTotal,
            credit_amount: '0.00',
            tax_amount: totalTax,
            shipping_amount: '7.95',
            shipping_method: '1',
            payment_method: 'Iconic_Prepayment',
            created_at: createdAt,
            updated_at: createdAt,
        },
        billing_address: {
            first_name: customer.first_name,
            last_name: customer.last_name,
            address1: customer.address1,
            city: customer.city,
            postcode: customer.postcode,
            phone: customer.phone,
            country_code: customer.country_code,
            created_at: createdAt,
            updated_at: createdAt,
            customer_address_region_name: customer.region,
        },
        shipping_address: {
            first_name: customer.first_name,
            last_name: customer.last_name,
            address1: customer.address1,
            city: customer.city,
            postcode: customer.postcode,
            phone: customer.phone,
            country_code: customer.country_code,
            created_at: createdAt,
            updated_at: createdAt,
            customer_address_region_name: customer.region,
        },
        sales_order_payment: [{ created_at: createdAt }],
        sales_order_item: salesOrderItems,
    };
};

// ─── RabbitMQ helpers ─────────────────────────────────────────────────────────
const openConnection = async () => amqp.connect(CONNECTION_URL, { servername: RABBITMQ_SERVERNAME, rejectUnauthorized: false });

const closeConnection = async (connection) => {
    if (connection) {
        await connection.close();
        console.log('Connection closed.');
    }
};

const publish = async (connection, exchange, routingKey, payload) => {
    const channel = await connection.createChannel();
    await channel.assertExchange(exchange, 'topic', { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)));
    await channel.close();
};

const publishOrder = async (connection, payload) => {
    await publish(connection, 'salesorder', 'bob.au.new', payload);
};

// ─── SKU cycling counter ───────────────────────────────────────────────────────
const SKUS_PER_ORDER = 3;
let skuIndex = 0;
const nextSkus = (overrideSku) => {
    if (overrideSku) return [overrideSku, overrideSku, overrideSku]; // honour --sku flag (repeat 3 times)
    const skus = [];
    for (let i = 0; i < SKUS_PER_ORDER; i++) {
        skus.push(DEFAULT_SKUS[skuIndex % DEFAULT_SKUS.length]);
        skuIndex++;
    }
    return skus;
};

// ─── Scenario runner ──────────────────────────────────────────────────────────
const runScenario = async (connection, scenario, skuOverride) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Scenario    : ${scenario.name}`);
    console.log(`3PL         : ${scenario.allocated_3pl} (${scenario.sio_mio})`);
    console.log(`Provider    : ${scenario.allocated_3pl}`);
    console.log(`Cust. cutoff: ${scenario.customer_cutoff}`);
    if (scenario.owms_cutoff) {
        const cutoffDateLabel = scenario.owms_cutoff_date || scenario.created_date || 'today';
        console.log(`OWMS cutoff : ${scenario.owms_cutoff} on ${cutoffDateLabel}`);
    }
    if (scenario.created_date) {
        console.log(`Created date: ${scenario.created_date} (${scenario.before_after || 'before/after'})`);
    }
    console.log(`SKUs        : cycling [${DEFAULT_SKUS.join(', ')}] (${SKUS_PER_ORDER} per order)`);
    console.log(`Orders      : ${scenario.ordersBeforeCutoff} before cutoff + ${scenario.ordersAfterCutoff} after cutoff`);
    console.log(`${'─'.repeat(60)}`);

    const cutoff = cutoffDate(scenario.customer_cutoff, scenario.created_date || null);

    // ── Orders BEFORE cut-off (60 min before, spaced 5 min apart) ────────────
    console.log(`\n  [BEFORE cut-off]`);
    for (let i = 0; i < scenario.ordersBeforeCutoff; i++) {
        // Space orders starting 60 min before cutoff, 5 min apart
        const offset = -60 + i * 5;
        const createdAt = orderTimestamp(cutoff, offset);
        const skus = nextSkus(skuOverride);
        const customer = randomCustomer();
        const payload = buildOrderPayload(scenario, skus, createdAt, customer);

        if (DRY_RUN) {
            console.log(`  [DRY-RUN] order_nr=${payload.sales_order.order_nr} skus=[${skus.join(', ')}] email=${customer.email} name=${customer.first_name} ${customer.last_name} created_at=${createdAt}`);
        } else {
            await publishOrder(connection, payload);
            console.log(`  Published order_nr=${payload.sales_order.order_nr} skus=[${skus.join(', ')}] email=${customer.email} created_at=${createdAt}`);
        }
        await delay(100);
    }

    // ── Orders AFTER cut-off (starting 5 min after, spaced 5 min apart) ──────
    console.log(`\n  [AFTER cut-off]`);
    for (let i = 0; i < scenario.ordersAfterCutoff; i++) {
        const offset = 5 + i * 5;
        const createdAt = orderTimestamp(cutoff, offset);
        const skus = nextSkus(skuOverride);
        const customer = randomCustomer();
        const payload = buildOrderPayload(scenario, skus, createdAt, customer);

        if (DRY_RUN) {
            console.log(`  [DRY-RUN] order_nr=${payload.sales_order.order_nr} skus=[${skus.join(', ')}] email=${customer.email} name=${customer.first_name} ${customer.last_name} created_at=${createdAt}`);
        } else {
            await publishOrder(connection, payload);
            console.log(`  Published order_nr=${payload.sales_order.order_nr} skus=[${skus.join(', ')}] email=${customer.email} created_at=${createdAt}`);
        }
        await delay(100);
    }

    console.log(`\n  Done: ${scenario.name}`);
};

// ─── Entry point ──────────────────────────────────────────────────────────────
const main = async () => {
    // Resolve which scenarios to run
    let scenariosToRun = SCENARIOS;
    if (SCENARIO_FILTER !== null) {
        const byIndex = !isNaN(parseInt(SCENARIO_FILTER, 10));
        if (byIndex) {
            const idx = parseInt(SCENARIO_FILTER, 10);
            if (idx < 0 || idx >= SCENARIOS.length) {
                console.error(`Invalid scenario index: ${idx}. Valid range: 0–${SCENARIOS.length - 1}`);
                process.exit(1);
            }
            scenariosToRun = [SCENARIOS[idx]];
        } else {
            scenariosToRun = SCENARIOS.filter(s =>
                s.name.toLowerCase().includes(SCENARIO_FILTER.toLowerCase())
            );
            if (scenariosToRun.length === 0) {
                console.error(`No scenario found matching: "${SCENARIO_FILTER}"`);
                console.error('Available scenarios:');
                SCENARIOS.forEach((s, i) => console.error(`  [${i}] ${s.name}`));
                process.exit(1);
            }
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Push Order Tool`);
    console.log(`${'='.repeat(60)}`);
    console.log(`SKUs     : ${SKU ? SKU : DEFAULT_SKUS.join(', ')}`);
    console.log(`Dry-run  : ${DRY_RUN}`);
    console.log(`Scenarios: ${scenariosToRun.length}`);
    if (DRY_RUN) {
        console.log(`\n[DRY-RUN MODE] No messages will be published.`);
    }
    console.log();

    let connection;
    try {
        if (!DRY_RUN) {
            console.log('Connecting to RabbitMQ...');
            connection = await openConnection();
            console.log('Connected.');
        }

        for (const scenario of scenariosToRun) {
            await runScenario(connection, scenario, SKU);
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('All scenarios completed.');
        console.log(`${'='.repeat(60)}\n`);
    } catch (err) {
        console.error('Error:', err.message || err);
        process.exitCode = 1;
    } finally {
        await closeConnection(connection);
    }
};

main();
