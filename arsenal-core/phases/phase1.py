"""
Step 2 & 3 - PHASE 1: RECONNAISSANCE & SPIDERING
Tools: Katana, Gau, Aquatone
"""
import os
import concurrent.futures
import requests
from config import TIMEOUT_PROBE
from helpers import run_tool, read_lines, write_lines, log, ok, warn

def _probe_url(url: str) -> str:
    """Probes a URL. Returns the URL if it's a valid live endpoint, else None."""
    try:
        r = requests.get(url, timeout=TIMEOUT_PROBE, verify=False, allow_redirects=True)
        # Keep only 200, 301, 302, 403. Discard 404, 500+
        if r.status_code in [200, 301, 302, 403]:
            return url
    except:
        pass
    return None

def phase1_katana(state, threads, depth):
    log(1, "katana", f"Starting active crawl on {state.target} (depth={depth})")
    out_file = os.path.join(state.out_dir, "katana_urls.txt")
    
    cmd = f"katana -u {state.target} -d {depth} -c {threads} -nc -silent -o {out_file}"
    code, _ = run_tool(1, "katana", cmd, out_file, timeout=300)
    
    raw_urls = read_lines(out_file)
    ok(f"katana found {len(raw_urls)} raw URLs")
    return raw_urls

def phase1_gau(state, threads):
    log(1, "gau", f"Starting passive harvest on {state.domain}")
    out_file = os.path.join(state.out_dir, "gau_urls.txt")
    
    cmd = f"gau --threads {threads} --blacklist png,jpg,gif,svg,css,woff,woff2,ttf,ico,pdf --o {out_file} {state.domain}"
    code, _ = run_tool(1, "gau", cmd, out_file, timeout=180)
    
    raw_urls = read_lines(out_file)
    ok(f"gau found {len(raw_urls)} raw historical URLs")
    return raw_urls

def live_probe_and_classify(state, raw_urls, threads):
    log(1, "probe", f"Live probing {len(raw_urls)} deduplicated URLs to eliminate FPs...")
    unique_urls = list(set(raw_urls))
    
    live_urls = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
        futures = {executor.submit(_probe_url, u): u for u in unique_urls}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                live_urls.append(res)
                
    state.all_urls = list(set(live_urls))
    ok(f"Live probe complete: {len(state.all_urls)} confirmed live URLs")
    
    # Classification logic
    for u in state.all_urls:
        if "=" in u:
            state.param_urls.append(u)
        if u.startswith(("ws://", "wss://")):
            state.ws_urls.append(u)
            
    lfi_keywords = ["file=", "path=", "page=", "include=", "dir=", "load=", "template=", "view=", "document=", "folder=", "root="]
    for u in state.param_urls:
        u_lower = u.lower()
        if any(k in u_lower for k in lfi_keywords):
            state.lfi_urls.append(u)
            
    # Write to disk
    write_lines(os.path.join(state.out_dir, "all_urls.txt"), state.all_urls)
    write_lines(os.path.join(state.out_dir, "param_urls.txt"), state.param_urls)
    write_lines(os.path.join(state.out_dir, "ws_urls.txt"), state.ws_urls)
    write_lines(os.path.join(state.out_dir, "lfi_urls.txt"), state.lfi_urls)
    
    ok(f"Classification: {len(state.param_urls)} parameterized, {len(state.ws_urls)} websockets, {len(state.lfi_urls)} LFI candidates")

def phase1_aquatone(state, threads):
    if not state.all_urls:
        warn("No URLs found to screenshot with aquatone")
        return
        
    log(1, "aquatone", "Starting visual screenshot mapping...")
    in_file = os.path.join(state.out_dir, "all_urls.txt")
    aqua_dir = os.path.join(state.out_dir, "aquatone_report")
    
    # Use direct input redirection instead of cat for Windows compatibility
    cmd = f"aquatone -out {aqua_dir} -threads {threads} < {in_file}"
    run_tool(1, "aquatone", cmd, shell_cmd=True)
    ok(f"Aquatone report generated at {aqua_dir}/aquatone_report.html")

def run_phase1(state, threads, depth):
    # Active
    k_urls = phase1_katana(state, threads, depth)
    # Passive
    g_urls = phase1_gau(state, threads)
    
    # Merge, deduplicate, HTTP probe strictly according to FP rules
    combined = k_urls + g_urls
    live_probe_and_classify(state, combined, threads)
    
    # Visual analysis
    phase1_aquatone(state, threads)
