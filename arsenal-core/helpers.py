import os
import subprocess
import shutil
import requests
import urllib3
import sys

urllib3.disable_warnings()

def _worker(args_list, shell_arg):
    try:
        subprocess.run(
            args_list,
            shell=shell_arg,
            text=True
        )
    except Exception:
        pass

def check_tool(name: str) -> bool:
    """Check if a tool is built-in or in system PATH."""
    return shutil.which(name) is not None

def run_tool(phase: int, tool: str, cmd: str, out_file: str = None, timeout: int = None, shell_cmd: bool = False) -> tuple[int, str]:
    """Run an external CLI command and stream output live without buffering."""
    # Check if the tool binary exists before attempting to run it
    binary = cmd.split()[0] if not shell_cmd else tool
    if not shell_cmd and not shutil.which(binary):
        skip(f"[SKIP] Tool '{binary}' not found in PATH — install it to enable this phase step. Continuing...")
        sys.stdout.flush()
        return -1, ""

    log(phase, tool, f"Running: {cmd}")
    sys.stdout.flush()
    try:
        is_windows = os.name == 'nt'
        use_shell = shell_cmd or is_windows
        args = cmd if use_shell else cmd.split()
        
        # Use multiprocessing to strictly enforce timeouts against Windows pipe hangs
        import multiprocessing
        p = multiprocessing.Process(target=_worker, args=(args, use_shell))
        p.start()
        p.join(timeout=timeout)
        
        if p.is_alive():
            warn(f"{tool} timed out after {timeout}s (hard kill)")
            p.terminate()
            p.join()
            
            if is_windows:
                binary = tool + ".exe"
                subprocess.call(["taskkill", "/F", "/T", "/IM", binary], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if tool == "katana":
                    subprocess.call(["taskkill", "/F", "/T", "/IM", "chrome.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return -1, ""
            
        ret_code = p.exitcode if p.exitcode is not None else 0
        if out_file and os.path.exists(out_file):
            return ret_code, out_file
        return ret_code, ""
        
    except FileNotFoundError:
        skip(f"[SKIP] Tool '{tool}' not found in PATH — install it to enable this phase step.")
        sys.stdout.flush()
        sys.stdout.flush()
        return -1, ""
    except Exception as e:
        err(f"{tool} execution failed: {e}")
        return -1, ""

def read_lines(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return [l.strip() for l in f if l.strip()]

def write_lines(path: str, lines: list[str]) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(f"{line}\n")

def mkdir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path

def verify(url: str, payload: str, proof: str, method="GET", headers=None, post_data=None, timeout=10) -> bool:
    """
    CRITICAL FUNCTION DO NOT CHANGE: Zero false-positives verifier.
    Sends raw HTTP request and returns True ONLY if proof text appears EXACTLY in the body.
    """
    try:
        h = headers or {}
        if "User-Agent" not in h:
            from config import USER_AGENT
            h["User-Agent"] = USER_AGENT

        if method.upper() == "GET":
            # If payload is provided for GET, we typically just fetch the URL as it already contains the payload
            target = url
            if payload and payload not in url and "?" not in url:
                target = f"{url}?{payload}"
            res = requests.get(target, headers=h, verify=False, timeout=timeout, allow_redirects=True)
        else:
            res = requests.request(method, url, headers=h, data=post_data, verify=False, timeout=timeout, allow_redirects=True)
            
        return proof in res.text
    except Exception:
        # Never log here, just silently discard FP
        return False

# Logging Utilities
import datetime
class Colors:
    OKBLUE = ''
    OKCYAN = ''
    OKGREEN = ''
    WARNING = ''
    FAIL = ''
    ENDC = ''
    BOLD = ''

def _ts(): return datetime.datetime.now().strftime("%H:%M:%S")

def log(phase, tool, msg):
    print(f"[{_ts()}] [P{phase}] [{Colors.OKBLUE}{tool}{Colors.ENDC}] {msg}")

def ok(msg): print(f"[{_ts()}] [{Colors.OKGREEN}OK{Colors.ENDC}] {msg}")
def warn(msg): print(f"[{_ts()}] [{Colors.WARNING}WARN{Colors.ENDC}] {msg}")
def err(msg): print(f"[{_ts()}] [{Colors.FAIL}ERR{Colors.ENDC}] {msg}")
def skip(msg): print(f"[{_ts()}] [{Colors.OKCYAN}SKIP{Colors.ENDC}] {msg}")
