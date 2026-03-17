'use strict';

const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = process.env.PACKED_MARKETPLACE_BASE_URL;
const API_KEY = process.env.PACKED_MARKETPLACE_API_KEY;

if (!BASE_URL || !API_KEY) {
    console.error('Missing PACKED_MARKETPLACE_BASE_URL or PACKED_MARKETPLACE_API_KEY in .env');
    process.exit(1);
}

// ─── Order Item IDs ──────────────────────────────────────────────────────────
const ORDER_ITEM_IDS = [
    26329403, 26366677, 26366678, 26966676, 26968397, 26971024, 26975751,
    26983396, 26989500, 27000235, 27002860, 27003159, 27003160, 27008665,
    27011571, 27020327, 27034222, 27035938, 27037897, 27037898, 27039841,
    27051433, 27053577, 27057056, 27057057, 27062798, 27075891, 27203645,
    27284266, 27824244, 27830710, 27995202, 27995413, 27995439, 27995490,
    28036334, 28040518, 28040579, 28042667, 28044849, 28046726, 28046727,
    28052552, 28055683, 28055684, 28055694, 28055696, 28055724, 28055756,
    28055846, 28055850, 28055853, 28055975, 28056005, 28056184, 28056185,
    28056187, 28056199, 28056201, 28056211, 28056219, 28056220, 28056224,
    28056423, 28056530, 28056592, 28058674,
];

// ─── CLI args ────────────────────────────────────────────────────────────────
// Usage:
//   node packed_marketplace.js                  → run all IDs
//   node packed_marketplace.js --dry-run        → print URLs, do not call
//   node packed_marketplace.js --iso2 AU        → override iso2 (default: AU)
//   node packed_marketplace.js --batch 10       → batch size (default: 1, one ID per request)
const args = process.argv.slice(2);

const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
};

const DRY_RUN = args.includes('--dry-run');
const ISO2 = getArg('--iso2') || 'AU';
const BATCH_SIZE = parseInt(getArg('--batch') || '1', 10);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Build the full URL for a batch of order item IDs.
 */
const buildUrl = (ids) => {
    const params = new URLSearchParams();
    params.set('method', 'setStatusToPackedByMarketplaceV2');
    params.set('deliveryType', 'dropship');
    params.set('apikey', API_KEY);
    params.set('iso2', ISO2);

    // URLSearchParams doesn't handle array params well, so build manually
    const arrayParams = ids.map(id => `orderItemIds[]=${id}`).join('&');
    return `${BASE_URL}?${params.toString()}&${arrayParams}`;
};

/**
 * Call the API for a batch of order item IDs.
 */
const callApi = async (ids) => {
    const url = buildUrl(ids);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', variables: {} }),
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

// ─── Batch helper ────────────────────────────────────────────────────────────
const chunk = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

// ─── Main ────────────────────────────────────────────────────────────────────
const main = async () => {
    const batches = chunk(ORDER_ITEM_IDS, BATCH_SIZE);

    console.log(`${'='.repeat(60)}`);
    console.log('Packed Marketplace Tool');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total IDs  : ${ORDER_ITEM_IDS.length}`);
    console.log(`Batch size : ${BATCH_SIZE}`);
    console.log(`Batches    : ${batches.length}`);
    console.log(`ISO2       : ${ISO2}`);
    console.log(`Base URL   : ${BASE_URL}`);
    console.log(`Dry-run    : ${DRY_RUN}`);
    console.log();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchLabel = `[${i + 1}/${batches.length}]`;

        if (DRY_RUN) {
            console.log(`${batchLabel} [DRY-RUN] IDs: ${batch.join(', ')}`);
            console.log(`  URL: ${buildUrl(batch)}`);
            continue;
        }

        try {
            const result = await callApi(batch);
            if (result.status >= 200 && result.status < 300) {
                console.log(`${batchLabel} OK (${result.status}) IDs: ${batch.join(', ')}`);
                successCount += batch.length;
            } else {
                console.error(`${batchLabel} FAIL (${result.status}) IDs: ${batch.join(', ')}`);
                console.error(`  Response: ${JSON.stringify(result.body)}`);
                failCount += batch.length;
            }
        } catch (err) {
            console.error(`${batchLabel} ERROR IDs: ${batch.join(', ')} → ${err.message}`);
            failCount += batch.length;
        }

        // Small delay between requests to avoid hammering the API
        if (i < batches.length - 1) {
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
