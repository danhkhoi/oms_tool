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
    // ── Row 1 ──
    {
        name: 'Australia Post Standard Sydney - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Australia Post Standard Sydney',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '20:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 2 ──
    {
        name: 'Australia Post Express Sydney - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Australia Post Express Sydney',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '20:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 3 ──
    {
        name: 'Australia Post Standard Melbourne - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Australia Post Standard Melbourne',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 4 ──
    {
        name: 'Australia Post Express Melbourne - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Australia Post Express Melbourne',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 5 ──
    {
        name: 'Australia Post Standard Brisbane - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Australia Post Standard Brisbane',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 6 ──
    {
        name: 'Australia Post Express Brisbane - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Australia Post Express Brisbane',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 7 ──
    {
        name: 'Australia Post Standard Interstate - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Australia Post Standard Interstate',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 8 ──
    {
        name: 'Australia Post Express Interstate - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Australia Post Express Interstate',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '15:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 9 ──
    {
        name: 'Melbourne/Victoria Startrack Twilight - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Melbourne/Victoria Startrack Twilight',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '08:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 10 ──
    {
        name: 'Brisbane/Queensland Startrack Twilight - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Brisbane/Queensland Startrack Twilight',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '08:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 11 ──
    {
        name: 'Startrack Twilight Delivery - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Startrack Twilight Delivery',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '14:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 12 ──
    {
        name: 'Startrack 3 Hour Delivery - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Startrack 3 Hour Delivery',
        shipment_provider: 'Australia Post Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '14:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 13 ──
    {
        name: 'Startrack Saturday Delivery - SIO',
        sio_mio: 'SIO',
        allocated_3pl: 'Startrack Saturday Delivery',
        shipment_provider: 'Australia Post Standard',
        fk_catalog_shipment_type: '1',
        customer_cutoff: '13:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 14 ──
    {
        name: 'Australia Post New Zealand - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Australia Post New Zealand',
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
        name: 'DHL Express New Zealand - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'DHL Express New Zealand',
        shipment_provider: 'DHL Express',
        fk_catalog_shipment_type: '2',
        customer_cutoff: '12:00',
        ordersBeforeCutoff: 5,
        ordersAfterCutoff: 5,
    },
    // ── Row 18 ──
    {
        name: 'Parcelpoint - MIO',
        sio_mio: 'MIO',
        allocated_3pl: 'Parcelpoint',
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
