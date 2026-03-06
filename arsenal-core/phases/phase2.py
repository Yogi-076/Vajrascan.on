"""
Step 4 - PHASE 2: PARAMETER MINING
Tools: Paramninja/Paramspider, Arjun
"""
import os
import json
from config import MAX_ARJUN_URLS
from helpers import run_tool, read_lines, write_lines, check_tool, log, ok, warn

def phase2_paramninja(state, threads):
    log(2, "paramninja", f"Starting passive param mining on {state.domain}")
    out_dir = os.path.join(state.out_dir, "paramninja")
    os.makedirs(out_dir, exist_ok=True)
    
    # Try paramninja, fallback to paramspider
    tool_name = "paramninja" if check_tool("paramninja") else "paramspider"
    
    cmd = f"{tool_name} -d {state.domain} -o {out_dir}"
    if tool_name == "paramninja":
        cmd += " --quiet"
        
    run_tool(2, tool_name, cmd)
    
    # Parse parameter names from URLs
    candidates = set()
    for root, _, files in os.walk(out_dir):
        for file in files:
            lines = read_lines(os.path.join(root, file))
            for line in lines:
                if "=" in line and "?" in line:
                    try:
                        param = line.split("?")[1].split("=")[0]
                        if param:
                            candidates.add(param)
                    except IndexError:
                        pass
    
    ok(f"{tool_name} identified {len(candidates)} candidate parameters")
    return list(candidates)

def phase2_arjun(state, threads, ninja_candidates):
    log(2, "arjun", "Starting active parameter confirmation")
    
    in_file = os.path.join(state.out_dir, "arjun_input.txt")
    out_json = os.path.join(state.out_dir, "arjun_params.json")
    
    # Cap URLs to avoid rate limits per instructions
    targets = state.all_urls[:MAX_ARJUN_URLS]
    if not targets:
        warn("No URLs available for Arjun")
        return
        
    write_lines(in_file, targets)
    
    cmd = f"arjun -i {in_file} --stable -t {threads} -oJ {out_json}"
    run_tool(2, "arjun", cmd, timeout=300)
    
    # Parse JSON
    confirmed_params = set()
    if os.path.exists(out_json):
        try:
            with open(out_json, "r") as f:
                data = json.load(f)
                
            for url, params_obj in data.items():
                params = params_obj.get("params", []) if isinstance(params_obj, dict) else params_obj
                for p in params:
                    confirmed_params.add(p)
                    fuzz_url = f"{url}?{p}=FUZZ" if "?" not in url else f"{url}&{p}=FUZZ"
                    state.fuzz_urls.append(fuzz_url)
        except Exception as e:
            warn(f"Failed to parse Arjun JSON: {e}")
            
    # Seed fuzz_urls from phase1 param_urls
    for u in state.param_urls:
        if "=" in u:
            try:
                base, query = u.split("?", 1)
                for kv in query.split("&"):
                    if "=" in kv:
                        p = kv.split("=")[0]
                        state.fuzz_urls.append(f"{base}?{p}=FUZZ")
            except:
                pass
                
    state.params = list(confirmed_params)
    state.fuzz_urls = list(set(state.fuzz_urls))
    
    ok(f"Arjun confirmed {len(state.params)} unique parameters")
    ok(f"Prepared {len(state.fuzz_urls)} deduplicated FUZZ URLs for phase 4")
    
    write_lines(os.path.join(state.out_dir, "fuzz_urls.txt"), state.fuzz_urls)
    write_lines(os.path.join(state.out_dir, "params.txt"), state.params)

def run_phase2(state, threads):
    candidates = phase2_paramninja(state, threads)
    phase2_arjun(state, threads, candidates)
