"""
PHASE 5: IaC SECURITY SCANNING
Tools: Checkov, Terrascan, tfsec, Trivy, KICS
"""
import os
import sys
import subprocess
import json
from helpers import log, ok, warn

# Local import for integrated iac-security-pipeline
# In Python 3, this works cleanly for a file in the same directory.
def run_phase5(state, target_url=None, local_path=None):
    log(5, "iac-sec", "Starting Infrastructure-as-Code Security Pipeline...")
    
    try:
        from iac_security_pipeline import ScannerRunner
    except ImportError:
        warn("IaC Security Pipeline modules not found. Ensure the package is correctly placed.")
        return

    # Use state.target as default or cloned path
    # For Arsenal, we might be scanning the same target if it's a repo, 
    # but usually Arsenal scans URLs. IaC scans code.
    # If a URL is provided and it looks like a git repo, we clone it.
    
    tools = ["checkov", "terrascan", "tfsec", "trivy", "kics"]
    
    # If we are in a broader Arsenal context, we might want to scan the local dir if it was a git clone repo
    # or the specific URL if it's a github repo.
    
    # Define the scan target
    # 1. Explicit local_path
    # 2. state.target (if it's not a remote URL)
    # 3. Default to current directory
    scan_target = local_path
    if not scan_target:
        if state.target and not state.target.startswith(('http://', 'https://')):
            scan_target = state.target
        else:
            scan_target = "."
    
    runner = ScannerRunner(scan_target, tools)
    results = runner.scan()
    
    # Save to Arsenal state/output
    # Always write the report so the frontend can display status even if 0 findings
    out_file = os.path.join(state.out_dir, "iac_security_report.json")
    
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for r in results:
        sev = r.get("severity", "INFO")
        if sev in severity_counts: severity_counts[sev] += 1
        
    report = {
        "status": "success" if runner.run_tools else "failed",
        "total_issues": len(results),
        "severity_summary": severity_counts,
        "tools_run": runner.run_tools,
        "tools_skipped": runner.skipped,
        "issues": results
    }
    
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)
        
    ok(f"IaC Report saved to {out_file} ({len(results)} issues)")
