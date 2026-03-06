# Arsenal Automated Scanner

An automated web vulnerability scanner implementing 15 active/passive reconnaissance and exploitation tools in a deterministic 4-phase pipeline.

## 4 Phases
1. **Reconnaissance**: Katana, Gau, Aquatone
2. **Parameter Mining**: Paramninja, Arjun
3. **Template & Specialty Scanners**: Nuclei, Corsy, websocket-harness, Headi, Oralyzer
4. **Exploitation**: Dalfox, Commix, Liffy, Autorize, Razzer

## Quick Install
```bash
chmod +x install.sh
./install.sh
pip install -r requirements.txt
```

## Usage Examples
```bash
# Basic run
python3 main.py -u https://target.com

# Deep crawl, threaded
python3 main.py -u https://target.com -t 20 -d 5

# Resume only the active exploitation phases
python3 main.py -u https://target.com --from-phase 3

# Include Authorization / IDOR checks
python3 main.py -u https://target.com --high-cookie "session=abc" --low-cookie "session=xyz"
```

## Zero FP Policy
Arsenal forces physical verifications across the board:
- Re-querying exact matcher strings for Nuclei.
- Ensuring dynamic context execution with Dalfox.
- Requiring target-domain redirection confirmation from Oralyzer.
- Hardcoded command execution echoes `ARSENAL_CONFIRM_` for CMDi.
