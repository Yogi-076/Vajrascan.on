/**
 * Premium VAPT Report HTML Template
 */
const generateReportHTML = (data) => {
    const { 
        projectInfo, 
        uniqueFindings, 
        summary, 
        projectId, 
        reportVersion, 
        dateStr 
    } = data;

    const severityColors = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#3b82f6',
        info: '#64748b'
    };

    const severityBg = {
        critical: 'rgba(239, 68, 68, 0.1)',
        high: 'rgba(249, 115, 22, 0.1)',
        medium: 'rgba(245, 158, 11, 0.1)',
        low: 'rgba(59, 130, 246, 0.1)',
        info: 'rgba(100, 116, 139, 0.1)'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VAPT Report - ${projectInfo.companyName}</title>
    <style>
        :root {
            --primary: #38bdf8;
            --secondary: #0f172a;
            --accent: #0ea5e9;
            --bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
            color: var(--text-main);
            line-height: 1.6;
            background: var(--bg);
        }

        .page-break {
            page-break-after: always;
        }

        /* --- Cover Page --- */
        .cover-page {
            height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }

        .cover-page::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 70%);
            z-index: 1;
        }

        .cover-content {
            position: relative;
            z-index: 2;
        }

        .logo-box {
            width: 80px;
            height: 80px;
            background: var(--primary);
            margin-bottom: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            box-shadow: 0 0 30px rgba(56, 189, 248, 0.3);
        }

        .cover-title {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 10px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .cover-subtitle {
            font-size: 24px;
            color: var(--primary);
            font-weight: 500;
            margin-bottom: 60px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .cover-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            width: 100%;
            max-width: 600px;
            text-align: left;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 40px;
        }

        .info-item label {
            display: block;
            font-size: 12px;
            color: #94a3b8;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .info-item span {
            font-size: 16px;
            font-weight: 500;
        }

        /* --- Header & Footer --- */
        .report-header {
            padding: 20px 40px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--text-muted);
        }

        /* --- Main Content --- */
        .content {
            padding: 40px;
        }

        h1, h2, h3 {
            color: var(--secondary);
            margin-bottom: 20px;
        }

        h2 {
            font-size: 24px;
            border-left: 5px solid var(--primary);
            padding-left: 15px;
            margin-top: 40px;
        }

        p {
            margin-bottom: 15px;
        }

        /* --- Summary Cards --- */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin: 30px 0;
        }

        .summary-card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid var(--border);
        }

        .summary-card.critical { background: ${severityBg.critical}; border-color: ${severityColors.critical}; }
        .summary-card.high { background: ${severityBg.high}; border-color: ${severityColors.high}; }
        .summary-card.medium { background: ${severityBg.medium}; border-color: ${severityColors.medium}; }
        .summary-card.low { background: ${severityBg.low}; border-color: ${severityColors.low}; }
        .summary-card.info { background: ${severityBg.info}; border-color: ${severityColors.info}; }

        .summary-card .count { font-size: 28px; font-weight: 700; display: block; }
        .summary-card .label { font-size: 11px; text-transform: uppercase; font-weight: 600; }

        /* --- Finding Table --- */
        .findings-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .findings-table th {
            background: #f8fafc;
            text-align: left;
            padding: 12px 15px;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid var(--border);
        }

        .findings-table td {
            padding: 15px;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }

        .badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        /* --- Detailed Findings --- */
        .finding-detail {
            margin-bottom: 50px;
            padding: 30px;
            background: #fbfcfd;
            border-radius: 16px;
            border: 1px solid var(--border);
        }

        .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
        }

        .finding-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--secondary);
        }

        .section-label {
            font-size: 13px;
            font-weight: 700;
            color: var(--secondary);
            margin-top: 20px;
            margin-bottom: 8px;
            display: block;
        }

        .code-block {
            background: #0f172a;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            overflow-x: auto;
            margin: 10px 0;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .recommendation {
            border-left: 4px solid #10b981;
            background: rgba(16, 185, 129, 0.05);
            padding: 15px;
            border-radius: 0 8px 8px 0;
        }

    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover-page page-break">
        <div class="cover-content">
            <div class="logo-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            </div>
            <h1 class="cover-title">SECURITY ASSESSMENT</h1>
            <p class="cover-subtitle">Vulnerability Analysis & Penetration Test</p>
            
            <div class="cover-info">
                <div class="info-item">
                    <label>Client Organization</label>
                    <span>${projectInfo.companyName}</span>
                </div>
                <div class="info-item">
                    <label>Report Date</label>
                    <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="info-item">
                    <label>Project ID</label>
                    <span>${projectId}</span>
                </div>
                <div class="info-item">
                    <label>Report Version</label>
                    <span>v${reportVersion}.0</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Executive Summary -->
    <div class="content">
        <div class="report-header">
            <span>VAJRA SCANNER | VAPT REPORT</span>
            <span>Confidential Assessment</span>
        </div>

        <h2>1. Executive Summary</h2>
        <p>This comprehensive security assessment provides a deep-dive analysis of the target infrastructure associated with <strong>${projectInfo.companyName}</strong>. Our methodology combines automated scanning depth with advanced manual verification to identify critical security lapses before they can be exploited.</p>

        <div class="summary-grid">
            <div class="summary-card critical">
                <span class="count">${summary.critical}</span>
                <span class="label">Critical</span>
            </div>
            <div class="summary-card high">
                <span class="count">${summary.high}</span>
                <span class="label">High</span>
            </div>
            <div class="summary-card medium">
                <span class="count">${summary.medium}</span>
                <span class="label">Medium</span>
            </div>
            <div class="summary-card low">
                <span class="count">${summary.low}</span>
                <span class="label">Low</span>
            </div>
            <div class="summary-card info">
                <span class="count">${summary.info}</span>
                <span class="label">Info</span>
            </div>
        </div>

        <h3>Assessment Scope</h3>
        <p>The technical evaluation was restricted to the following endpoints:</p>
        <div class="code-block">
            ${(Array.isArray(projectInfo.targetUrls) ? projectInfo.targetUrls : [projectInfo.targetUrl]).join('<br>')}
        </div>

        <div class="page-break"></div>

        <h2>2. Findings Inventory</h2>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Ref</th>
                    <th>Vulnerability Name</th>
                    <th>Severity</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${uniqueFindings.map((f, i) => {
                    const sev = (f.severity || 'info').toLowerCase();
                    return `
                    <tr>
                        <td><strong>VULN-${String(i + 1).padStart(3, '0')}</strong></td>
                        <td>${f.title || f.name}</td>
                        <td><span class="badge" style="background: ${severityBg[sev]}; color: ${severityColors[sev]}">${f.severity}</span></td>
                        <td><span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444">Open</span></td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="page-break"></div>

        <h2>3. Detailed Technical Analysis</h2>
        ${uniqueFindings.map((f, i) => {
            const sev = (f.severity || 'info').toLowerCase();
            return `
            <div class="finding-detail">
                <div class="finding-header">
                    <div>
                        <span style="color: var(--text-muted); font-size: 12px; font-weight: 600;">VULN-${String(i + 1).padStart(3, '0')}</span>
                        <div class="finding-title">${f.title || f.name}</div>
                    </div>
                    <span class="badge" style="background: ${severityColors[sev]}; color: white; padding: 6px 15px; border-radius: 8px;">${f.severity} Risk</span>
                </div>

                <span class="section-label">AFFECTED ENDPOINT</span>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: var(--accent); white-space: pre-wrap; word-break: break-all;">${f.url || f.path || 'Infrastructure-wide'}</div>

                <span class="section-label">DESCRIPTION & IMPACT</span>
                <p>${f.description || 'Detailed security description not provided.'}</p>

                ${(f.evidence || f.proof) ? `
                    <span class="section-label">TECHNICAL EVIDENCE (PoC)</span>
                    <div class="code-block" style="white-space: pre-wrap; word-break: break-all;">${f.evidence || f.proof}</div>
                ` : ''}

                <span class="section-label">REMEDIATION STEPS</span>
                <div class="recommendation">
                    ${f.remediation || 'Standard security hardening following OWASP/NIST guidelines is recommended.'}
                </div>
            </div>
            `;
        }).join('')}

    </div>

    <footer style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 11px; border-top: 1px solid var(--border);">
        Generated by VajraScan VAPT Framework • Confidential document for ${projectInfo.companyName}
    </footer>
</body>
</html>
    `;
};

module.exports = { generateReportHTML };
