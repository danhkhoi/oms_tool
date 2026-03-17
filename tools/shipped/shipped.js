'use strict';

const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = process.env.SHIPPED_BASE_URL;
const API_KEY = process.env.SHIPPED_API_KEY;

if (!BASE_URL || !API_KEY) {
    console.error('Missing SHIPPED_BASE_URL or SHIPPED_API_KEY in .env');
    process.exit(1);
}

// ─── Order Item IDs ──────────────────────────────────────────────────────────
const ORDER_ITEM_IDS = [
    25407572, 25532857, 25909124, 26164538, 26178429, 26193372, 26293270,
    26301821, 26301822, 26305513, 26305514, 26305515, 26308366, 26309583,
    26312455, 26315194, 26320264, 26321667, 26321668, 26321702, 26322394,
    26323533, 26323788, 26328215, 26329403, 26330228, 26332435, 26333415,
    26335696, 26336052, 26336669, 26344201, 26348625, 26348783, 26352417,
    26363614, 26363615, 26366524, 26366677, 26366678, 26379759, 26392545,
    26410391, 26419258, 26449121, 26579742, 26824019, 26877354, 26886041,
    26950361, 26966676, 26968397, 26971024, 26975751, 26983396, 26989500,
    27000235, 27002860, 27003159, 27003160, 27008665, 27011571, 27020327,
    27034222, 27035938, 27037897, 27037898, 27039841, 27045899, 27051433,
    27053577, 27057056, 27057057, 27062798, 27075891, 27130399, 27135365,
    27203645, 27284266, 27299006, 27323203,
];

// ─── CLI args ────────────────────────────────────────────────────────────────
// Usage:
//   node shipped.js              → run all IDs
//   node shipped.js --dry-run    → print URLs, do not call
const args = process.argv.slice(2);

const DRY_RUN = args.includes('--dry-run');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Build the full URL for a single order item ID.
 */
const buildUrl = (orderItemId) => {
    const params = new URLSearchParams();
    params.set('method', 'setStatusToShippedV2');
    params.set('apikey', API_KEY);
    params.set('orderItemId', orderItemId);
    return `${BASE_URL}?${params.toString()}`;
};

/**
 * Call the API for a single order item ID.
 */
const callApi = async (orderItemId) => {
    const url = buildUrl(orderItemId);

    const response = await fetch(url, {
        method: 'POST',
    });

    const text = await response.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        body = text;
    }

    return { status: response.status, body };
};

// ─── Main ────────────────────────────────────────────────────────────────────
const main = async () => {
    console.log(`${'='.repeat(60)}`);
    console.log('Shipped Tool');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total IDs  : ${ORDER_ITEM_IDS.length}`);
    console.log(`Base URL   : ${BASE_URL}`);
    console.log(`Dry-run    : ${DRY_RUN}`);
    console.log();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ORDER_ITEM_IDS.length; i++) {
        const id = ORDER_ITEM_IDS[i];
        const label = `[${i + 1}/${ORDER_ITEM_IDS.length}]`;

        if (DRY_RUN) {
            console.log(`${label} [DRY-RUN] ID: ${id}`);
            console.log(`  URL: ${buildUrl(id)}`);
            continue;
        }

        try {
            const result = await callApi(id);
            if (result.status >= 200 && result.status < 300) {
                console.log(`${label} OK (${result.status}) ID: ${id}`);
                successCount++;
            } else {
                console.error(`${label} FAIL (${result.status}) ID: ${id}`);
                console.error(`  Response: ${JSON.stringify(result.body)}`);
                failCount++;
            }
        } catch (err) {
            console.error(`${label} ERROR ID: ${id} → ${err.message}`);
            failCount++;
        }

        // Small delay between requests
        if (i < ORDER_ITEM_IDS.length - 1) {
            await delay(200);
        }
    }

    if (!DRY_RUN) {
        console.log();
        console.log(`${'='.repeat(60)}`);
        console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);
        console.log(`${'='.repeat(60)}`);
    }
};

main();
