DEFAULT_THREADS = 10
DEFAULT_DEPTH = 3
DEFAULT_OUTPUT_DIR = "./arsenal_output"

TIMEOUT_PROBE = 5       # Seconds per URL for liveliness probe
TIMEOUT_DALFOX = 10     # Seconds for Dalfox timeout
MAX_ARJUN_URLS = 200    # Rate limit Arjun targeting
MAX_WS_TARGETS = 20     # Avoid WebSocket hanging
MAX_AUTORIZE_URLS = 100 # Cap IDOR permutations
MAX_RACE_TARGETS = 10   # Racing is intense on the server

# User-Agent string to use across custom request operations
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Arsenal/1.0"
