const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const { generateReportHTML } = require('../utils/reportTemplate');

// ═══════════════════════════════════════════
// POST /api/reports/generate
// Generates a VAPT report for a specific project
// ═══════════════════════════════════════════
router.post('/generate', async (req, res) => {
    const { projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ error: "projectId is required" });
    }

    const projectDir = path.join(DATA_DIR, 'projects', projectId);
    const infoPath = path.join(projectDir, 'project_info.json');
    const scansDir = path.join(projectDir, 'scans');
    const reportsDir = path.join(projectDir, 'reports');

    if (!fs.existsSync(infoPath)) {
        return res.status(404).json({ error: "Project not found" });
    }

    const projectInfo = readJsonSafe(infoPath);
    ensureDir(reportsDir);

    const reportVersion = (projectInfo.reportVersion || 0) + 1;
    let allFindings = [];
    let summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    // Gather findings (Scans + Manual)
    if (fs.existsSync(scansDir)) {
        const scanFolders = fs.readdirSync(scansDir).filter(f => fs.lstatSync(path.join(scansDir, f)).isDirectory());
        for (const scanId of scanFolders) {
            const resultsPath = path.join(scansDir, scanId, 'results.json');
            const scanData = readJsonSafe(resultsPath);
            if (scanData && scanData.status === 'completed' && scanData.findings) {
                allFindings = [...allFindings, ...scanData.findings];
                if (scanData.summary) {
                    summary.critical += scanData.summary.critical || 0;
                    summary.high += scanData.summary.high || 0;
                    summary.medium += scanData.summary.medium || 0;
                    summary.low += scanData.summary.low || 0;
                    summary.info += scanData.summary.info || 0;
                }
            }
        }
    }

    const manualPath = path.join(projectDir, 'findings', 'manual.json');
    const manualFindings = readJsonSafe(manualPath) || [];
    manualFindings.forEach(f => {
        allFindings.push(f);
        const sev = (f.severity || 'info').toLowerCase();
        if (summary[sev] !== undefined) summary[sev]++;
        else summary.info++;
    });

    const severityMap = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    allFindings.sort((a, b) => (severityMap[(b.severity || 'info').toLowerCase()] || 0) - (severityMap[(a.severity || 'info').toLowerCase()] || 0));

    const uniqueFindingsMap = new Map();
    allFindings.forEach(f => {
        const key = `${f.title || f.name}-${f.url || f.path}`;
        if (!uniqueFindingsMap.has(key)) uniqueFindingsMap.set(key, f);
    });
    const uniqueFindings = Array.from(uniqueFindingsMap.values());

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const reportFilename = `${projectId}_Report_v${reportVersion}.0_${dateStr}.pdf`;
    const reportPath = path.join(reportsDir, reportFilename);

    let browser;
    try {
        console.log(`[*] Generating premium PDF for ${projectId}...`);
        
        console.log("[1] Launching headless browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);

        // Block ALL external network requests so we never hang
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const url = req.url();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                req.abort(); // block external resources (fonts, CDN, etc)
            } else {
                req.continue();
            }
        });
        
        const htmlContent = generateReportHTML({
            projectInfo,
            uniqueFindings,
            summary,
            projectId,
            reportVersion,
            dateStr
        });

        console.log("[2] Setting page content...");
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

        console.log("[3] Generating PDF...");
        await page.pdf({
            path: reportPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        await browser.close();

        // Update project metadata
        projectInfo.reportVersion = reportVersion;
        projectInfo.activity = projectInfo.activity || [];
        projectInfo.activity.push({
            action: `Report (Premium) generated: ${reportFilename}`,
            at: new Date().toISOString()
        });
        fs.writeFileSync(infoPath, JSON.stringify(projectInfo, null, 2));

        console.log(`[✓] Premium report saved: ${reportFilename}`);

        res.json({
            message: "Premium report generated successfully",
            version: reportVersion,
            filename: reportFilename,
            downloadUrl: `/api/projects/${projectId}/reports/${reportFilename}`
        });

    } catch (err) {
        if (browser) await browser.close();
        console.error("Premium PDF Gen Error:", err);
        res.status(500).json({ error: "Failed to generate premium PDF document. Ensure system dependencies are installed." });
    }
});

module.exports = router;
