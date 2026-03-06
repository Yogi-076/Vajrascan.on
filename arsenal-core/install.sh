#!/bin/bash
echo "============================================="
echo "   ARSENAL PIPELINE - AUTO INSTALLER"
echo "============================================="

echo "[*] Installing Go-based tools..."
go install github.com/projectdiscovery/katana/cmd/katana@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/hahwul/dalfox/v2@latest
go install github.com/lc/gau/v2/cmd/gau@latest

echo "[*] Installing Python dependencies..."
# Would normally pull from requirements.txt
pip install requests aiohttp urllib3

echo "============================================="
echo "[+] Installation script finished!"
echo "[+] Ensure ~/go/bin is in your PATH."
echo "============================================="
