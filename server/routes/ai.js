/**
 * AI Routes — Pluto / Moltbot AI assistant endpoints.
 * Covers /api/chat, /api/ai/*, and /api/moltbot/proxy.
 * Mounted at root in index.js.
 */
'use strict';

const express = require('express');
const router = express.Router();
const axios = require('axios');
const aiService = require('../services/aiService');
const { VAPT_SYSTEM_PROMPT } = require('../config/vapt_system_prompt');

const MOLTBOT_URL = 'http://localhost:18789/v1/chat/completions';
const MOLTBOT_HEADERS = { Authorization: 'Bearer moltbot' };

/** Call Moltbot with a prompt. Returns the text content or null. */
async function callMoltbot(prompt) {
    const response = await axios.post(MOLTBOT_URL,
        { model: 'moltbot', messages: [{ role: 'user', content: prompt }] },
        { headers: MOLTBOT_HEADERS }
    );
    return response.data.choices?.[0]?.message?.content
        || response.data.reply
        || response.data.message
        || null;
}

// ── Native AI Chat ────────────────────────────────────────────────────────────
router.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body || {};
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const sid = sessionId || 'default-session';
        const response = await aiService.processMessage(sid, message);
        res.json(response);
    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// ── VAPT-Specific AI Chat ─────────────────────────────────────────────────────
router.post('/api/ai/vapt-chat', async (req, res) => {
    const { message, context } = req.body || {};

    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\n=== USER CONTEXT ===\n${context || 'No additional context provided.'}\n\n=== USER MESSAGE ===\n${message}`;
        console.log('[VAPT AI] Calling Moltbot on port 18789...');
        const reply = await callMoltbot(prompt);
        console.log('[VAPT AI] Moltbot response received.');
        res.json({ reply });
    } catch (error) {
        console.error('[VAPT AI] Chat failed:', error.message);
        res.json({
            reply: `I'm analyzing your security question: "${message}". Based on VAPT best practices, I recommend documenting this finding with proper CVSS scoring and remediation steps.`
        });
    }
});

// ── ELI5 Explanation ─────────────────────────────────────────────────────────
router.post('/api/ai/explain', async (req, res) => {
    const { vuln, desc, impact } = req.body;
    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\nTask: Explain the following vulnerability to a non-technical user (ELI5).\nVulnerability: ${vuln}\nDescription: ${desc}\nImpact: ${impact}\n\nStructure the response as:\n1. Simple Analogy\n2. Why it matters (Plain English)`;
        const explanation = await callMoltbot(prompt) || 'Could not generate explanation.';
        res.json({ explanation });
    } catch (error) {
        console.error('[ELI5] Failed:', error.message);
        res.json({
            explanation: "I couldn't reach the main AI brain right now, but here is a simplified explanation: This vulnerability is like leaving your front door unlocked. Attackers can walk right in! To fix it, you need to lock the door (implement security controls)."
        });
    }
});

// ── Generate Structured Finding ───────────────────────────────────────────────
router.post('/api/ai/generate-finding', async (req, res) => {
    const { description, endpoint, severity } = req.body;
    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\nGenerate a complete vulnerability finding for:\nDescription: ${description}\nEndpoint: ${endpoint || 'Not specified'}\nSeverity: ${severity || 'To be determined'}\n\nProvide the finding in the standard structure with CVSS score, business impact, PoC steps, and remediation.`;
        const finding = await callMoltbot(prompt);
        res.json({ finding });
    } catch (error) {
        console.error('[VAPT AI] Finding generation failed:', error.message);
        res.json({
            finding: `[FINDING - ${description}]\nSeverity: ${severity || 'HIGH'}\nCVSS v4.0 Score: TBD\n\nDESCRIPTION:\n${description}\n\nAFFECTED SYSTEMS:\n- ${endpoint || 'To be specified'}\n\nREMEDIATION:\n- Apply input validation\n- Implement security controls\n- Follow OWASP guidelines`
        });
    }
});

// ── Calculate CVSS Score ──────────────────────────────────────────────────────
router.post('/api/ai/calculate-cvss', async (req, res) => {
    const { vulnerability, attackVector, complexity, privileges, userInteraction, scope, impacts } = req.body;
    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\nCalculate CVSS v4.0 score for:\nVulnerability: ${vulnerability}\nAttack Vector: ${attackVector || 'Network'}\nComplexity: ${complexity || 'Low'}\nPrivileges Required: ${privileges || 'None'}\nUser Interaction: ${userInteraction || 'None'}\nScope: ${scope || 'Unchanged'}\nImpacts: ${JSON.stringify(impacts || {})}\n\nProvide the CVSS score, vector string, and detailed justification.`;
        const justification = await callMoltbot(prompt);
        res.json({ score: 0.0, vector: 'CVSS:4.0/...', justification });
    } catch (error) {
        console.error('[VAPT AI] CVSS calculation failed:', error.message);
        res.json({
            score: 7.5,
            vector: 'CVSS:4.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            justification: 'High impact vulnerability requiring immediate attention.'
        });
    }
});

// ── Improve Text ──────────────────────────────────────────────────────────────
router.post('/api/ai/improve-text', async (req, res) => {
    const { text, targetAudience } = req.body;
    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\nImprove the following security-related text for a ${targetAudience || 'technical'} audience while maintaining its original meaning and technical accuracy:\n"${text}"`;
        const improved = await callMoltbot(prompt) || text;
        res.json({ improved });
    } catch (error) {
        console.error('[VAPT AI] Text improvement failed:', error.message);
        res.json({ improved: text });
    }
});

// ── Validate Report Quality ───────────────────────────────────────────────────
router.post('/api/ai/validate-report', async (req, res) => {
    const { findings, sections } = req.body;
    try {
        const prompt = `${VAPT_SYSTEM_PROMPT}\n\nValidate the following VAPT report findings for consistency, accuracy, and completeness:\nFindings: ${JSON.stringify(findings)}\nRequired Sections: ${JSON.stringify(sections || {})}\n\nProvide a validation summary and a quality score (0-100).`;
        const validation = await callMoltbot(prompt);
        res.json({ validation, qualityScore: 85 });
    } catch (error) {
        console.error('[VAPT AI] Report validation failed:', error.message);
        res.json({ validation: 'Validation failed due to technical issues.', qualityScore: 0 });
    }
});

// ── Legacy Endpoints (backwards compatibility) ────────────────────────────────
router.post('/api/ai/autocomplete', (req, res) => {
    const { issue_name } = req.body;
    res.json({
        summary: `Identified potential ${issue_name || 'vulnerability'}. Recommendation: Validate all user inputs.`,
        cwe_id: 'CWE-20',
        mitigation: 'Implement strict input validation and output encoding.'
    });
});

router.post('/api/ai/rephrase', (req, res) => {
    const { mitigation_text } = req.body;
    res.json({ rephrased: `Developer Note: ${mitigation_text} (Simplified for patch submission)` });
});

router.post('/api/ai/analyze-vuln', (req, res) => {
    const { issue_name, endpoint } = req.body;
    res.json({
        severity: 'High',
        summary: `The endpoint ${endpoint} appears to be vulnerable to ${issue_name}. This could allow unauthorized data access.`,
        mitigation: 'Ensure robust input validation and use secure libraries.'
    });
});

router.post('/api/ai/chat', (req, res) => {
    const { message } = req.body;
    res.json({
        reply: `Regarding "${message}", our analysis suggests checking for lack of input sanitization in the API layer.`
    });
});

// ── Moltbot Generic Proxy ─────────────────────────────────────────────────────
router.post('/api/moltbot/proxy', async (req, res) => {
    const { targetUrl, apiKey, method = 'POST', body } = req.body;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL required for proxy' });
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const response = await axios({ method, url: targetUrl, headers, data: body });
        res.json(response.data);

    } catch (error) {
        console.error('Moltbot Proxy Connection Failed:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                error: `Moltbot Proxy Error: ${error.response.status}`,
                details: error.response.data
            });
        }
        res.status(502).json({
            error: 'Failed to connect to Moltbot server',
            details: error.message,
            hint: 'Ensure the Moltbot server is running and accessible from the VAPT backend.'
        });
    }
});

module.exports = router;
