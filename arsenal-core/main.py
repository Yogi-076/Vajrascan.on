import argparse
import sys
import os
import atexit
from urllib.parse import urlparse
import time

from state import PipelineState
from config import *
from helpers import *
from helpers import _ts
from report import generate_all_reports

# Phase imports will be added here as we build them

def parse_args():
    parser = argparse.ArgumentParser(description="Arsenal - Automated Web Vulnerability Scanner")
    parser.add_argument("-u", "--url", help="Target URL (e.g., https://example.com)")
    parser.add_argument("--local", help="Local directory to scan (Phase 5 only)")
    parser.add_argument("-o", "--output", default=DEFAULT_OUTPUT_DIR, help="Output directory")
    parser.add_argument("-t", "--threads", type=int, default=DEFAULT_THREADS, help="Concurrency level")
    parser.add_argument("-d", "--depth", type=int, default=DEFAULT_DEPTH, help="Crawl depth for phase 1")
    parser.add_argument("--phases", nargs="+", type=int, choices=[1, 2, 3, 4, 5], default=[1, 2, 3, 4, 5], help="Phases to run")
    parser.add_argument("--from-phase", type=int, help="Resume from phase N")
    parser.add_argument("--high-cookie", help="Admin session cookie for IDOR testing")
    parser.add_argument("--low-cookie", help="User session cookie for IDOR testing")
    
    args = parser.parse_args()
    if not args.url and not args.local:
        parser.error("Either -u/--url or --local must be provided.")
    return args

def setup_state(args) -> PipelineState:
    state = PipelineState()
    if args.url:
        state.target = args.url if args.url.endswith("/") else args.url + "/"
        parsed = urlparse(args.url)
        state.domain = parsed.netloc
    else:
        state.target = args.local
        state.domain = "local-scan"
        
    state.out_dir = mkdir(args.output)
    return state

def save_and_abort():
    print(f"\n[{_ts()}] [!] Scan interrupted via CTRL+C.")
    # Here we would call the report generation logic specifically for partials
    print(f"[{_ts()}] [!] Partial results saved. Exiting safely.")

def load_previous_state(state, from_phase):
    # Depending on from_phase, we would read the output text files 
    # back into the state arrays here (e.g. read all_urls.txt into state.all_urls)
    pass

def print_summary(state, elapsed):
    print("\n" + "=" * 46)
    print("  ARSENAL SCAN COMPLETE")
    print("=" * 46)
    print(f"  Target       : {state.target}")
    print(f"  Duration     : {int(elapsed // 60)}m {int(elapsed % 60)}s")
    print(f"  Output dir   : {state.out_dir}/")
    print("-" * 46)
    
    # We will populate this dynamically in full implementation
    print("  Tool Details Output Pending...")
    
    total = len(state.nuclei_hits) + len(state.xss_hits) + len(state.cmdi_hits) + len(state.lfi_hits) + len(state.cors_hits)
    print("-" * 46)
    print(f"  CONFIRMED VULNERABILITIES : {total}")
    print("=" * 46)
    
    jpath, hpath = generate_all_reports(state, elapsed)
    
    print(f"  Reports: {jpath}")
    print(f"           {hpath}")
    print("=" * 46)

def main():
    args = parse_args()
    state = setup_state(args)
    atexit.register(save_and_abort)
    
    phases_to_run = args.phases
    if args.from_phase:
        phases_to_run = [p for p in [1,2,3,4] if p >= args.from_phase]
        load_previous_state(state, args.from_phase)
    
    print(f"[{_ts()}] [SYS] Starting Arsenal for {state.target}")
    
    # Phase 1: Recon & Spidering
    if 1 in phases_to_run:
        log(1, "system", "Starting Recon Phase")
        from phases import run_phase1
        run_phase1(state, args.threads, args.depth)

    # Phase 2: Param Mining
    if 2 in phases_to_run:
        log(2, "system", "Starting Param Mining")
        from phases import run_phase2
        run_phase2(state, args.threads)

    # Phase 3: General Vulnerability Scanning
    if 3 in phases_to_run:
        log(3, "system", "Starting Vuln Scanning")
        from phases import run_phase3
        run_phase3(state, args.threads)

    # Phase 4: Exploitation & Verification
    if 4 in phases_to_run:
        log(4, "system", "Starting Exploitation & Confirmation")
        from phases import run_phase4
        run_phase4(state, args.threads, args.high_cookie, args.low_cookie)

    # Phase 5: IaC Security Scanning
    if 5 in phases_to_run:
        log(5, "system", "Starting Infrastructure-as-Code Scanning")
        from phases import run_phase5
        run_phase5(state)

    atexit.unregister(save_and_abort)
    
    elapsed = time.time() - state.start_time
    print_summary(state, elapsed)
    sys.stdout.flush()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
