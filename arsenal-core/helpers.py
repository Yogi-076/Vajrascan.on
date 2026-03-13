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
    import time
    
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
        
        # Correctly determine if we should use python or python3
        if cmd.startswith("python3 "):
            cmd = cmd.replace("python3 ", sys.executable + " ", 1)
        elif cmd.startswith("python "):
            cmd = cmd.replace("python ", sys.executable + " ", 1)

        start_time = time.time()
        process = subprocess.Popen(
            cmd if use_shell else cmd.split(),
            shell=use_shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Non-blocking read loop
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(line.strip())
                sys.stdout.flush()
            
            # Check timeout
            if timeout and (time.time() - start_time) > timeout:
                warn(f"{tool} timed out after {timeout}s (hard kill)")
                if is_windows:
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    process.terminate()
                break

        ret_code = process.poll() or 0
        if out_file and os.path.exists(out_file):
            return ret_code, out_file
        return ret_code, ""
        
    except FileNotFoundError:
        skip(f"[SKIP] Tool '{tool}' not found in PATH — install it to enable this phase step.")
        sys.stdout.flush()
        return -1, ""
    except Exception as e:
        err(f"{tool} execution failed: {str(e)}")
        sys.stdout.flush()
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
