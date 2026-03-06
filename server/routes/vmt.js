/**
 * VMT Routes — Vulnerability Management Tool + Snapshot endpoints.
 * Exported as a factory function because it requires the Socket.IO `io` instance
 * for real-time collaboration broadcasts.
 * Usage in index.js: app.use('/', createVmtRouter(io));
 */
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const storage = require('../utils/storage');

module.exports = function createVmtRouter(io) {
    const router = express.Router();

    // ── Get All Findings for a Project ───────────────────────────────────────
    router.get('/api/vulnerabilities/:projectId', (req, res) => {
        const { projectId } = req.params;
        const scan = storage.getScan(projectId);
        if (!scan) return res.status(404).json({ error: 'Project (Scan) not found' });
        res.json(scan.findings || []);
    });

    // ── Update a Single Finding Field ─────────────────────────────────────────
    router.patch('/api/vulnerabilities/:id', (req, res) => {
        const { id } = req.params;
        const { projectId, field, value } = req.body || {};

        const scan = storage.getScan(projectId);
        if (!scan) return res.status(404).json({ error: 'Project not found' });

        if (!scan.findings) scan.findings = [];
        const findingIndex = scan.findings.findIndex(f => f.id === id);

        if (findingIndex === -1) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        scan.findings[findingIndex][field] = value;
        storage.saveScan(scan);

        io.to(projectId).emit('row_updated', scan.findings[findingIndex]);
        res.json({ success: true, finding: scan.findings[findingIndex] });
    });

    // ── Add a Manual Finding ──────────────────────────────────────────────────
    router.post('/api/vulnerabilities/:projectId', (req, res) => {
        const { projectId } = req.params;
        const vuln = { id: uuidv4(), ...(req.body || {}), project_id: projectId, created_at: new Date() };

        const scan = storage.getScan(projectId);
        if (!scan) return res.status(404).json({ error: 'Project not found' });

        if (!scan.findings) scan.findings = [];
        scan.findings.push(vuln);
        storage.saveScan(scan);

        io.to(projectId).emit('row_added', vuln);
        res.json(vuln);
    });

    // ── Delete a Finding ──────────────────────────────────────────────────────
    router.delete('/api/vulnerabilities/:projectId/:id', (req, res) => {
        const { projectId, id } = req.params;
        const scan = storage.getScan(projectId);
        if (!scan) return res.status(404).json({ error: 'Project not found' });
        if (!scan.findings) return res.status(404).json({ error: 'No findings' });

        const initialLength = scan.findings.length;
        scan.findings = scan.findings.filter(f => f.id !== id);

        if (scan.findings.length === initialLength) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        storage.saveScan(scan);
        io.to(projectId).emit('row_deleted', id);
        res.json({ success: true });
    });

    // ── Save Snapshot ─────────────────────────────────────────────────────────
    router.post('/api/vmt/snapshots/:projectId', async (req, res) => {
        try {
            const { projectId } = req.params;
            const { name, data } = req.body;
            const snapshot = await storage.saveSnapshot(projectId, name, data);
            res.json(snapshot);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── List Snapshots ────────────────────────────────────────────────────────
    router.get('/api/vmt/snapshots/:projectId', async (req, res) => {
        try {
            const { projectId } = req.params;
            const snapshots = await storage.getSnapshots(projectId);
            res.json(snapshots);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Load Snapshot by ID ───────────────────────────────────────────────────
    router.get('/api/vmt/snapshot/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const snapshot = await storage.getSnapshot(id);
            if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
            res.json(snapshot);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
