#!/usr/bin/env python3
import argparse
import subprocess
import json
import os
import sys
import shutil
import tempfile
import datetime
import platform
from urllib.parse import urlparse

BANNER = """\033[94m
  ██╗ █████╗  ██████╗    ███████╗██████╗  █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ 
  ██║██╔══██╗██╔════╝    ██╔════╝██╔══██╗██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗
  ██║███████║██║         ███████╗██║  ██║███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
  ██║██╔══██║██║         ╚════██║██║  ██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
  ██║██║  ██║╚██████╗    ███████║██████╔╝██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║
  ╚═╝╚═╝  ╚═╝ ╚═════╝    ╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
  \033[96mUnified Infrastructure-as-Code Security Pipeline\033[0m
"""

COLORS = {
    "CRITICAL": "\033[91m",
    "HIGH": "\033[93m",
    "MEDIUM": "\033[93m",
    "LOW": "\033[92m",
    "INFO": "\033[94m",
    "RESET": "\033[0m",
    "SUCCESS": "\033[92m",
    "WARNING": "\033[93m"
}

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4, "UNKNOWN": 5}

SUPPORTED_TOOLS = ["checkov", "terrascan", "tfsec", "trivy", "kics"]

class ScannerRunner:
    def __init__(self, target_path, tools_to_run):
        self.target_path = target_path
        self.tools_to_run = tools_to_run
        self.results = []
        self.skipped = []
        self.run_tools = []
        self.temp_kics_dir = tempfile.mkdtemp()

    def find_tool(self, name):
        """
        Search for tool in PATH, project bin, and Windows Python Scripts folders.
        """
        # 1. Search in PATH
        path = shutil.which(name)
        if path: return path
        if platform.system() == "Windows":
            path = shutil.which(f"{name}.exe") or shutil.which(f"{name}.cmd")
            if path: return path

        # 2. Search in local project bin
        script_dir = os.path.dirname(os.path.abspath(__file__))
        local_bin = os.path.join(script_dir, "bin")
        
        if platform.system() == "Windows":
            for ext in [".exe", ".cmd", ".bat"]:
                p = os.path.join(local_bin, f"{name}{ext}")
                if os.path.exists(p): return p
        else:
            p = os.path.join(local_bin, name)
            if os.path.exists(p): return p

        # 3. Search in Windows Python Scripts (common for MS Store python)
        if platform.system() == "Windows":
            user_appdata = os.environ.get("LOCALAPPDATA", "")
            if user_appdata:
                # Based on discovery in this environment
                scripts_paths = [
                    os.path.join(user_appdata, "Packages", "PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0", "LocalCache", "local-packages", "Python311", "Scripts"),
                    os.path.join(user_appdata, "Python", "Python311", "Scripts"),
                    os.path.join(os.environ.get("APPDATA", ""), "Python", "Python311", "Scripts")
                ]
                for sp in scripts_paths:
                    for ext in [".exe", ".cmd", ".bat"]:
                        p = os.path.join(sp, f"{name}{ext}")
                        if os.path.exists(p): return p
        return None
    
    def normalize_severity(self, sev):
        sev_upper = str(sev).upper()
        if sev_upper in SEVERITY_ORDER:
            return sev_upper
        for s in SEVERITY_ORDER.keys():
            if s in sev_upper:
                return s
        return "INFO"

    def run_command(self, cmd, tool_name, cwd=None):
        try:
            print(f"[*] Running {tool_name} {cmd}")
            result = subprocess.run(
                cmd,
                cwd=cwd or self.target_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            return result.stdout, result.returncode
        except FileNotFoundError:
            print(f"[!] {tool_name} not found. Skipping... (Hint: install it first)")
            self.skipped.append(tool_name)
            return None, -1
        except subprocess.TimeoutExpired:
            print(f"[!] {tool_name} timed out after 5 minutes. Skipping...")
            self.skipped.append(tool_name)
            return None, -1
        except Exception as e:
            print(f"[!] {tool_name} failed: {str(e)}")
            self.skipped.append(tool_name)
            return None, -1

    def run_checkov(self):
        if "checkov" not in self.tools_to_run: return
        exe = self.find_tool("checkov")
        if not exe:
            self.skipped.append("checkov")
            return
        stdout, _ = self.run_command([exe, "-d", ".", "--output", "json", "--quiet", "--compact"], "checkov")
        if stdout:
            self.run_tools.append("checkov")
            try:
                # checkov might return a dict or a list of dicts
                parsed = json.loads(stdout)
                reports = parsed if isinstance(parsed, list) else [parsed]
                for report in reports:
                    results = report.get("results", {}).get("failed_checks", [])
                    for issue in results:
                        self.results.append({
                            "tool": "checkov",
                            "severity": self.normalize_severity(issue.get("severity", "MEDIUM")),
                            "rule_id": issue.get("check_id", "UNKNOWN"),
                            "title": issue.get("check_name", "Unknown Issue"),
                            "file": issue.get("file_path", "").lstrip('/'),
                            "line": issue.get("file_line_range", [0])[0],
                            "resource": issue.get("resource", "Unknown"),
                            "remediation": issue.get("guideline", "")
                        })
            except json.JSONDecodeError:
                print("[!] Failed to parse checkov output")

    def run_terrascan(self):
        if "terrascan" not in self.tools_to_run: return
        exe = self.find_tool("terrascan")
        if not exe:
            self.skipped.append("terrascan")
            return
        stdout, _ = self.run_command([exe, "scan", "-d", ".", "-o", "json"], "terrascan")
        if stdout:
            self.run_tools.append("terrascan")
            try:
                parsed = json.loads(stdout)
                for violation in parsed.get("results", {}).get("violations", []):
                    self.results.append({
                        "tool": "terrascan",
                        "severity": self.normalize_severity(violation.get("severity", "MEDIUM")),
                        "rule_id": violation.get("rule_name", "UNKNOWN"),
                        "title": violation.get("description", "Unknown Issue"),
                        "file": violation.get("file", ""),
                        "line": violation.get("line", 0),
                        "resource": violation.get("resource_name", violation.get("resource_type", "Unknown")),
                        "remediation": ""
                    })
            except json.JSONDecodeError:
                print("[!] Failed to parse terrascan output")

    def run_tfsec(self):
        if "tfsec" not in self.tools_to_run: return
        exe = self.find_tool("tfsec")
        if not exe:
            self.skipped.append("tfsec")
            return
        stdout, _ = self.run_command([exe, ".", "--format", "json", "--no-colour"], "tfsec")
        if stdout:
            self.run_tools.append("tfsec")
            try:
                parsed = json.loads(stdout)
                for issue in parsed.get("results", []):
                    self.results.append({
                        "tool": "tfsec",
                        "severity": self.normalize_severity(issue.get("severity", "MEDIUM")),
                        "rule_id": issue.get("rule_id", "UNKNOWN"),
                        "title": issue.get("description", "Unknown Issue"),
                        "file": issue.get("location", {}).get("filename", ""),
                        "line": issue.get("location", {}).get("start_line", 0),
                        "resource": issue.get("resource", "Unknown"),
                        "remediation": issue.get("resolution", "")
                    })
            except json.JSONDecodeError:
                print("[!] Failed to parse tfsec output")

    def run_trivy(self):
        if "trivy" not in self.tools_to_run: return
        exe = self.find_tool("trivy")
        if not exe:
            self.skipped.append("trivy")
            return
        stdout, _ = self.run_command([exe, "config", ".", "--format", "json", "--quiet"], "trivy")
        if stdout:
            self.run_tools.append("trivy")
            try:
                parsed = json.loads(stdout)
                for res in parsed.get("Results", []):
                    for issue in res.get("Misconfigurations", []):
                        self.results.append({
                            "tool": "trivy",
                            "severity": self.normalize_severity(issue.get("Severity", "MEDIUM")),
                            "rule_id": issue.get("ID", "UNKNOWN"),
                            "title": issue.get("Title", "Unknown Issue"),
                            "file": res.get("Target", ""),
                            "line": issue.get("IacMetadata", {}).get("StartLine", 0),
                            "resource": issue.get("IacMetadata", {}).get("Resource", "Unknown"),
                            "remediation": issue.get("Resolution", "")
                        })
            except json.JSONDecodeError:
                print("[!] Failed to parse trivy output")

    def run_kics(self):
        if "kics" not in self.tools_to_run: return
        output_path = os.path.join(self.temp_kics_dir, "results.json")
        stdout, _ = self.run_command(["kics", "scan", "-p", ".", "--report-formats", "json", "--output-path", self.temp_kics_dir, "--output-name", "results", "--no-progress"], "kics")
        
        if os.path.exists(output_path):
            self.run_tools.append("kics")
            try:
                with open(output_path, "r") as f:
                    parsed = json.loads(f.read())
                    for query in parsed.get("queries", []):
                        for file_info in query.get("files", []):
                            self.results.append({
                                "tool": "kics",
                                "severity": self.normalize_severity(query.get("severity", "MEDIUM")),
                                "rule_id": query.get("query_name", "UNKNOWN"),
                                "title": query.get("description", "Unknown Issue"),
                                "file": file_info.get("file_name", "").replace("../", ""),
                                "line": file_info.get("line", 0),
                                "resource": file_info.get("resource_name", "Unknown"),
                                "remediation": query.get("description", "")
                            })
            except Exception as e:
                print(f"[!] Failed to load kics output: {str(e)}")

    def cleanup(self):
        if os.path.exists(self.temp_kics_dir):
            shutil.rmtree(self.temp_kics_dir)

    def scan(self):
        print("\n\033[96m[+] Starting Pipeline Execution...\033[0m")
        self.run_checkov()
        self.run_terrascan()
        self.run_tfsec()
        self.run_trivy()
        self.run_kics()
        self.cleanup()
        return self.results

def clone_repo(url):
    temp_dir = tempfile.mkdtemp(prefix="iac_sec_")
    print(f"\n[*] Cloning {url} into {temp_dir}")
    res = subprocess.run(["git", "clone", "--depth=1", url, temp_dir], capture_output=True)
    if res.returncode != 0:
        print(f"\n[!] Error cloning repository:\n{res.stderr.decode('utf-8')}")
        shutil.rmtree(temp_dir)
        sys.exit(2)
    return temp_dir

def check_dependencies():
    # Use a dummy Runner to access find_tool logic
    runner = ScannerRunner("", [])
    results = {}
    for cmd in SUPPORTED_TOOLS:
        path = runner.find_tool(cmd)
        results[cmd] = True if path else False
    
    # Check if we are being called to output JSON (for the dashboard)
    if "--check-deps" in sys.argv or "-d" in sys.argv:
        print(json.dumps(results))
        sys.exit(0)

    print("\n[*] Checking installed scanners...\n")
    installed = 0
    for cmd, is_installed in results.items():
        if is_installed:
            path = runner.find_tool(cmd)
            print(f"  [+] {cmd.ljust(15)} : Found ({path})")
            installed += 1
        else:
            print(f"  [-] {cmd.ljust(15)} : Not installed")
    print(f"\nTotal installed: {installed}/{len(SUPPORTED_TOOLS)}\n")
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Unified IaC Security Scanner")
    parser.add_argument("--url", help="GitHub URL to clone")
    parser.add_argument("--local", help="Local directory to scan")
    parser.add_argument("--tools", default=",".join(SUPPORTED_TOOLS), help="Comma-separated tools to run")
    parser.add_argument("--output", default="report.json", help="JSON report output file")
    parser.add_argument("--check-deps", action="store_true", help="Check installed tools")

    args = parser.parse_args()

    if args.check_deps:
        check_dependencies()

    try:
        print(BANNER)
    except UnicodeEncodeError:
        print("\n=== Arsenal IaC Security Pipeline ===\n")

    if not args.url and not args.local:
        parser.print_help()
        sys.exit(2)

    target_dir = args.local
    is_cloned = False

    if args.url:
        target_dir = clone_repo(args.url)
        is_cloned = True
    else:
        target_dir = os.path.abspath(target_dir)

    tools_to_run = [t.strip().lower() for t in args.tools.split(",")]
    runner = ScannerRunner(target_dir, tools_to_run)
    results = runner.scan()

    if is_cloned:
        shutil.rmtree(target_dir)

    status = "success"
    if not runner.run_tools:
        print("\n[!] No tools successfully executed. Ensure requested tools are installed.")
        status = "failed"

    # Sort results
    results.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"], 99))

    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for r in results:
        sev = r["severity"]
        if sev in severity_counts: severity_counts[sev] += 1

    report = {
        "status": status,
        "scan_time": datetime.datetime.utcnow().isoformat() + "Z",
        "source": args.url if args.url else args.local,
        "tools_run": runner.run_tools,
        "tools_skipped": runner.skipped,
        "total_issues": len(results),
        "severity_summary": severity_counts,
        "issues": results
    }

    with open(args.output, "w") as f:
        json.dump(report, f, indent=2)

    has_critical_high = severity_counts["CRITICAL"] > 0 or severity_counts["HIGH"] > 0

    print("\n\n" + "="*60)
    if has_critical_high:
        print(f"{COLORS['CRITICAL']}[!] Pipeline FAILED — {severity_counts['CRITICAL']} CRITICAL, {severity_counts['HIGH']} HIGH issues{COLORS['RESET']}")
    else:
        print(f"{COLORS['SUCCESS']}[+] Pipeline PASSED{COLORS['RESET']}")
    print("="*60)

    print("\n[*] Severity Summary:")
    for sev, count in severity_counts.items():
        color = COLORS.get(sev, "")
        print(f"   {color}{sev.ljust(10)}{COLORS['RESET']}: {count}")

    print(f"\n[+] Output saved to {args.output}")

    print("\n[!] Top 30 Issues:")
    for i, issue in enumerate(results[:30]):
        color = COLORS.get(issue['severity'], "")
        print(f"[{i+1}] {color}{issue['severity']}{COLORS['RESET']} | {issue['tool']} | {issue['file']}:{issue['line']}")
        print(f"    {issue['title']}")

    sys.exit(1 if has_critical_high else 0)

if __name__ == "__main__":
    main()
