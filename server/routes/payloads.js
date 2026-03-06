/**
 * Payloads Routes — Apex-Vault payload management & contextual encoding engine.
 * GET  /api/payloads
 * POST /api/payloads/encode
 * GET  /api/v1/generate
 * POST /api/payloads/success
 *
 * Bug fixed: `offset` was used but never declared in the original index.js.
 */
'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { weaponize, encodePayload } = require('../tools/transformationPipeline');

const PAYLOADS_PATH = path.join(__dirname, '..', 'data', 'master_payloads.json');

function loadPayloads() {
    try {
        const raw = fs.readFileSync(PAYLOADS_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('[Apex-Vault] Failed to load payloads:', e.message);
        return [];
    }
}

function savePayloads(payloads) {
    try {
        fs.writeFileSync(PAYLOADS_PATH, JSON.stringify(payloads, null, 4), 'utf-8');
    } catch (e) {
        console.error('[Apex-Vault] Failed to save payloads:', e.message);
    }
}

console.log('[Apex-Vault] Payload engine loaded —', loadPayloads().length, 'payloads in database');

// ── List / Filter Payloads ────────────────────────────────────────────────────
router.get('/api/payloads', (req, res) => {
    // FIX: `offset` was not destructured in the original code, causing a ReferenceError.
    const { category, tag, search, waf, os, bypass_level, sort, limit, offset } = req.query;
    let payloads = loadPayloads();

    if (category) {
        payloads = payloads.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (tag) {
        payloads = payloads.filter(p => p.tags && p.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())));
    }
    if (search) {
        const q = search.toLowerCase();
        payloads = payloads.filter(p =>
            p.payload.toLowerCase().includes(q) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
            p.category.toLowerCase().includes(q)
        );
    }
    if (waf) {
        payloads = payloads.filter(p => p.waf_signatures && p.waf_signatures.some(w => w.toLowerCase().includes(waf.toLowerCase())));
    }
    if (os) {
        payloads = payloads.filter(p => p.target_os === 'any' || p.target_os.toLowerCase() === os.toLowerCase());
    }
    if (bypass_level) {
        payloads = payloads.filter(p => p.bypass_level >= parseInt(bypass_level));
    }
    if (sort === 'effectiveness') {
        payloads.sort((a, b) => (b.success_count || 0) - (a.success_count || 0));
    }

    const total = payloads.length;
    const offsetVal = parseInt(offset) || 0;
    const limitVal = parseInt(limit) || 20;

    payloads = payloads.slice(offsetVal, offsetVal + limitVal);
    const categories = [...new Set(loadPayloads().map(p => p.category))];

    res.json({ total, offset: offsetVal, limit: limitVal, categories, payloads });
});

// ── Encode a Single Payload ───────────────────────────────────────────────────
router.post('/api/payloads/encode', (req, res) => {
    const { payload, context } = req.body;
    if (!payload) return res.status(400).json({ error: 'Payload text required' });

    try {
        const encoded = encodePayload(payload, context || 'url');
        res.json({ original: payload, context: context || 'url', encoded });
    } catch (e) {
        res.status(500).json({ error: 'Encoding failed', details: e.message });
    }
});

// ── Generate Weaponized Payload Variations ────────────────────────────────────
router.get('/api/v1/generate', (req, res) => {
    const { vuln, context, waf, payload: rawPayload, max } = req.query;

    let basePayload = rawPayload;

    if (!basePayload && vuln) {
        const all = loadPayloads();
        const filtered = all.filter(p => p.category.toLowerCase() === vuln.toLowerCase());
        if (waf === 'true') {
            filtered.sort((a, b) => b.bypass_level - a.bypass_level);
        } else {
            filtered.sort((a, b) => (b.success_count || 0) - (a.success_count || 0));
        }
        basePayload = filtered[0]?.payload;
    }

    if (!basePayload) {
        return res.status(400).json({ error: 'No payload found. Provide ?payload= or ?vuln= parameter.' });
    }

    const variations = weaponize(basePayload, {
        context: context || 'raw',
        category: vuln || 'XSS',
        waf: waf === 'true',
        maxVariations: parseInt(max) || 10,
    });

    res.json({
        base: basePayload,
        context: context || 'raw',
        waf_mode: waf === 'true',
        count: variations.length,
        variations
    });
});

// ── Increment Payload Success Count ──────────────────────────────────────────
router.post('/api/payloads/success', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Payload ID required' });

    const payloads = loadPayloads();
    const idx = payloads.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Payload not found' });

    payloads[idx].success_count = (payloads[idx].success_count || 0) + 1;
    savePayloads(payloads);

    res.json({ success: true, payload: payloads[idx] });
});

module.exports = router;
