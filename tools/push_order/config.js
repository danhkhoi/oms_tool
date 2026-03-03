'use strict';

// ─── Connection ───────────────────────────────────────────────────────────────
// const CONNECTION_URL = 'amqps://ti-owms-stg-syd:CVfthuPjBKWMze4x@localhost:5671';
const CONNECTION_URL = 'amqps://ti-owms-stg-syd:CVfthuPjBKWMze4x@localhost:5671';
const RABBITMQ_SERVERNAME = 'b-f99ce4a2-cc49-47d3-a170-f8abd1929417.mq.ap-southeast-2.amazonaws.com';

// ─── Default SKUs (cycling through these per order) ───────────────────────────
const DEFAULT_SKU = 'TESTINGSKU-009845';
const DEFAULT_SKUS = [
    'TESTINGSKU-009845',
    'TESTINGSKU-009846',
    'TESTINGSKU-009847',
    'TESTINGSKU-009848',
];

// ─── Customer / Address defaults ─────────────────────────────────────────────
const CUSTOMER = {
    email: 'tinh.nguyen+staging1@theiconic.com.au',
    first_name: 'Tinh',
    last_name: 'Nguyen',
    address1: '123 Sunset Strp',
    city: 'Ocean Grove',
    postcode: '3226',
    phone: '+61400444444',
    country_code: 'AU',
    region: 'Victoria',
};

// ─── Item defaults ────────────────────────────────────────────────────────────
const ITEM_DEFAULTS = {
    unit_price: '15.95',
    tax_amount: '1.45',
    paid_price: '15.95',
    name: 'Test Product',
    fk_catalog_shipment_type: '1',
    supplier_identifier: 'V000611',
    is_marketplace: false,
    weight: 0.1,
};

// ─── Test scenarios from spreadsheet ─────────────────────────────────────────
// Each scenario represents one row in the spreadsheet.
// "ordersBeforeCutoff" orders are created before customer cut-off time.
// "ordersAfterCutoff"  orders are created after customer cut-off time.
// "created_at" is used as the order/item timestamp.
// The spreadsheet says: ignore OMS cut-off time — only vary the order created_at
// relative to the CUSTOMER cut-off.
//
// Customer cut-off times per 3PL:
//   Sydney Standard / Express / Melbourne Standard / Express / Brisbane Standard /
//   Express / Interstate Standard / Express / Interstate Twilight / Sydney Twilight /
//   Sydney 3 Hour / Sydney Saturday: see column D in spreadsheet.
//
// Format for "cutoffTime": "HH:MM" (local — the script will build a full timestamp
// using today's date, so you can re-run it any day).

const SCENARIOS = [
    // ── Row 2 ──
    {
        name: 'Sydney Standard - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Sydney Standard',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '20:00',   // orders placed before this → same-day processing
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 3 ──
    {
        name: 'Sydney Express - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Sydney Express',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '20:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 4 ──
    {
        name: 'Melbourne Standard - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Melbourne Standard',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 5 ──
    {
        name: 'Melbourne Express - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Melbourne Express',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 6 ──
    {
        name: 'Brisbane Standard - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Brisbane Standard',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 7 ──
    {
        name: 'Brisbane Express - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Brisbane Express',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 8 ──
    {
        name: 'Interstate Standard - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Interstate Standard',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 9 ──
    {
        name: 'Interstate Express - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Interstate Express',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 10 ──
    {
        name: 'Interstate Twilight - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Interstate Twilight',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '08:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 11 ──
    {
        name: 'Sydney Twilight - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Sydney Twilight',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '14:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 12 ──
    {
        name: 'Sydney 3 Hour - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Sydney 3 Hour',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '14:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 13 ──
    {
        name: 'Sydney Saturday - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Sydney Saturday',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 14 ──
    {
        name: 'New Zealand Standard - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'New Zealand Standard',
        shipment_provider: 'NZ Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '07:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 15 ──
    {
        name: 'TGE Standard - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'TGE Standard',
        shipment_provider: 'TGE Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 16 ──
    {
        name: 'TGE Express - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'TGE Express',
        shipment_provider: 'TGE Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 17 ──
    {
        name: 'DHL Express - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'DHL Express',
        shipment_provider: 'DHL Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 18 ──
    {
        name: 'ParcelPoint - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'ParcelPoint',
        shipment_provider: 'ParcelPoint',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
];

module.exports = {
    CONNECTION_URL,
    RABBITMQ_SERVERNAME,
    DEFAULT_SKU,
    DEFAULT_SKUS,
    CUSTOMER,
    ITEM_DEFAULTS,
    SCENARIOS,
};
