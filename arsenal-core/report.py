import os
import json
import datetime

def generate_json_report(state, elapsed):
    """Generates the JSON assessment report."""
    total_findings = len(state.nuclei_hits) + len(state.xss_hits) + len(state.cmdi_hits) + len(state.lfi_hits) + len(state.cors_hits)
    
    report = {
        "meta": {
            "target": state.target,
            "domain": state.domain,
            "timestamp": datetime.datetime.now().isoformat(),
            "duration_seconds": int(elapsed),
            "scanner": "Arsenal v1.0"
        },
        "summary": {
            "total_urls": len(state.all_urls),
            "total_params": len(state.params),
            "total_fuzz_urls": len(state.fuzz_urls),
            "confirmed_vulns": total_findings
        },
        "findings": [
            # In a full implementation, these arrays would contain dicts.
            # Using raw data for skeleton example.
            *[{ "type": "Nuclei Match", "details": str(x) } for x in state.nuclei_hits],
            *[{ "type": "XSS (Dalfox)", "details": str(x) } for x in state.xss_hits],
            *[{ "type": "CMDi", "details": str(x) } for x in state.cmdi_hits],
            *[{ "type": "LFI", "details": str(x) } for x in state.lfi_hits],
            *[{ "type": "CORS", "details": str(x) } for x in state.cors_hits],
            *[{ "type": "IDOR/Auth Bypass", "details": str(x) } for x in state.idor_hits],
            *[{ "type": "Race Condition", "details": str(x) } for x in state.race_hits]
        ]
    }
    
    out_path = os.path.join(state.out_dir, "arsenal_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)
    return out_path

def generate_html_report(state, elapsed):
    """Generates the HTML assessment report with terminal theming."""
    out_path = os.path.join(state.out_dir, "arsenal_report.html")
    
    total_findings = len(state.nuclei_hits) + len(state.xss_hits) + len(state.cmdi_hits) + len(state.lfi_hits) + len(state.cors_hits)
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Arsenal Scan Report: {state.target}</title>
    <style>
        body {{ background-color: #0d1117; color: #c9d1d9; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; margin: 0; padding: 20px; }}
        h1, h2, h3 {{ color: #58a6ff; }}
        .badge {{ display: inline-block; padding: 5px 10px; border-radius: 5px; font-weight: bold; font-size: 14px; }}
        .badge-critical {{ background-color: #f85149; color: white; }}
        .badge-high {{ background-color: #d29922; color: white; }}
        .card {{ background-color: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 15px; margin-bottom: 20px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th, td {{ border: 1px solid #30363d; padding: 10px; text-align: left; }}
        th {{ background-color: #21262d; }}
    </style>
</head>
<body>
    <h1>Arsenal Vulnerability Report</h1>
    
    <div class="card">
        <h2>Executive Summary</h2>
        <p><strong>Target:</strong> {state.target}</p>
        <p><strong>Duration:</strong> {int(elapsed//60)}m {int(elapsed%60)}s</p>
        <p><strong>Total URLs Discovered:</strong> {len(state.all_urls)}</p>
        <p><strong>Confirmed Vulnerabilities:</strong> {total_findings}</p>
    </div>
    
    <div class="card">
        <h2>Findings Dump</h2>
        <!-- Normally rendered natively via Jinja or specific looping -->
        <p>Nuclei Hits: {len(state.nuclei_hits)}</p>
        <p>XSS Hits: {len(state.xss_hits)}</p>
        <p>CMDi Hits: {len(state.cmdi_hits)}</p>
        <p>LFI Hits: {len(state.lfi_hits)}</p>
        <p>CORS Hits: {len(state.cors_hits)}</p>
        <p>IDOR Hits: {len(state.idor_hits)}</p>
        <p>Web Race Conditions: {len(state.race_hits)}</p>
    </div>
</body>
</html>
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path

def generate_all_reports(state, elapsed):
    jpath = generate_json_report(state, elapsed)
    hpath = generate_html_report(state, elapsed)
    return jpath, hpath
