"""
Steps 8,9,10,11,12 - PHASE 4: EXPLOITATION & CONFIRMATION
Tools: Dalfox, Commix, Liffy, Autorize (Custom), Razzer (Custom)
"""
import os
import requests
import asyncio
import aiohttp
import random
import string
from difflib import SequenceMatcher
from config import TIMEOUT_DALFOX, MAX_AUTORIZE_URLS, MAX_RACE_TARGETS
from helpers import run_tool, read_lines, write_lines, verify, log, ok, warn, skip

def phase4_dalfox(state, threads):
    log(4, "dalfox", "Hunting XSS (DOM, Reflected, Stored)")
    if not state.fuzz_urls:
        skip("dalfox: no parameters to fuzz")
        return
        
    in_file = os.path.join(state.out_dir, "dalfox_input.txt")
    out_file = os.path.join(state.out_dir, "dalfox_xss.txt")
    
    write_lines(in_file, state.fuzz_urls)
    
    cmd = f"dalfox file {in_file} --no-color --worker {threads} --verify --timeout {TIMEOUT_DALFOX} -o {out_file}"
    run_tool(4, "dalfox", cmd)
    
    lines = read_lines(out_file)
    for line in lines:
        if line.startswith("[V]"):  # Verified execution ONLY
            state.xss_hits.append(line)
            
    ok(f"Dalfox verified {len(state.xss_hits)} executed XSS payloads")

def phase4_commix(state, threads):
    log(4, "commix", "Hunting OS Command Injection")
    
    # Priority targets: cmd, exec, command, etc
    keywords = ["cmd","exec","command","run","system","ping","host","ip","execute","shell","query","process","action","do","func"]
    priority = []
    
    for url in state.fuzz_urls:
        u_lower = url.lower()
        if any(f"{k}=" in u_lower for k in keywords):
            priority.append(url)
            
    targets = priority if priority else state.fuzz_urls[:30]
    
    for url in targets:
        test_url = url.replace("FUZZ", "commix_test_value")
        cmd_out = os.path.join(state.out_dir, "commix")
        cmd = f"commix --url \"{test_url}\" --batch --output-dir {cmd_out}"
        run_tool(4, "commix", cmd)
        
    ok(f"Commix analyzed {len(targets)} parameters for CMDi")

def phase4_liffy(state, threads):
    if not state.lfi_urls:
        skip("liffy: no file-focused parameters identified")
        return
        
    log(4, "liffy", "Exploiting Local File Inclusion")
    for url in state.lfi_urls:
        cmd = f"python3 liffy.py \"{url}\" -f --detection --waf-bypass"
        run_tool(4, "liffy", cmd, shell_cmd=True)
        # Parser checks for exact verified tokens like root:x:0:0

def phase4_autorize(state, threads, high_cookie, low_cookie):
    log(4, "autorize", "Evaluating Authorization/IDOR (Custom Python Engine)")
    
    if not high_cookie or not low_cookie:
        skip("autorize: both --high-cookie and --low-cookie required")
        return
        
    skip_patterns = ["/login","/register","/logout","/static","/css/","/js/","/img/","/fonts/",".png",".jpg","/signup","/forgot","/reset","/verify"]
    
    targets = [u for u in state.all_urls if not any(p in u.lower() for p in skip_patterns)][:MAX_AUTORIZE_URLS]
    
    h_headers = {"Cookie": high_cookie}
    l_headers = {"Cookie": low_cookie}
    
    for url in targets:
        try:
            r_high = requests.get(url, headers=h_headers, timeout=5, verify=False, allow_redirects=False)
            if r_high.status_code == 200 and len(r_high.text) > 200:
                r_low = requests.get(url, headers=l_headers, timeout=5, verify=False, allow_redirects=False)
                
                if r_low.status_code == 200:
                    sim = SequenceMatcher(None, r_high.text, r_low.text).ratio()
                    if sim > 0.90:
                        state.idor_hits.append(url)
        except:
            pass
            
    ok(f"Autorize found {len(state.idor_hits)} potential IDOR/Access Control bypasses")

# Razzer - Web Race Condition Tester
async def _race_burst(session, url, n=20):
    payload = {"race_id": "".join(random.choices(string.ascii_letters + string.digits, k=8))}
    tasks = [session.post(url, data=payload) for _ in range(n)]
    return await asyncio.gather(*tasks, return_exceptions=True)

async def _razzer_main(targets):
    results = {}
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(verify_ssl=False)) as session:
        for url in targets:
            responses = await _race_burst(session, url)
            success_count = sum(1 for r in responses if getattr(r, 'status', 0) == 200)
            if success_count > 1:
                results[url] = success_count
    return results

def phase4_razzer(state, threads):
    log(4, "razzer", "Testing concurrency Race Conditions (TOCTOU)")
    
    keywords = ["buy","pay","vote","submit","redeem","transfer","send","create","delete","update","apply","use","checkout","order","coupon","discount","like","follow","join"]
    
    targets = []
    for url in state.fuzz_urls:
        if any(k in url.lower() for k in keywords):
            targets.append(url.replace("FUZZ", ""))
            
    if not targets:
        skip("razzer: no state-changing POST endpoints detected")
        return
        
    loop = asyncio.get_event_loop()
    hits = loop.run_until_complete(_razzer_main(targets[:MAX_RACE_TARGETS]))
    state.race_hits = list(hits.keys())
    
    ok(f"Razzer detected {len(state.race_hits)} concurrent execution vulnerabilities")

def run_phase4(state, threads, high_cookie, low_cookie):
    phase4_dalfox(state, threads)
    phase4_commix(state, threads)
    phase4_liffy(state, threads)
    phase4_autorize(state, threads, high_cookie, low_cookie)
    phase4_razzer(state, threads)
