const WapitiService = require('./services/wapitiService');
const KatanaService = require('./services/katanaService');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function test() {
    let out = "Starting test scan...\n";
    let urlsFile = null;
    try {
        const katana = new KatanaService();
        const target = 'https://juice-shop.herokuapp.com/#/';
        out += "Starting Katana pre-crawl...\n";
        const katanaResults = await katana.crawl(target, { headless: true }, 'test-scan-1');

        if (katanaResults.urls && katanaResults.urls.length > 0) {
            out += `Katana found ${katanaResults.urls.length} URLs.\n`;
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'katana-urls-'));
            urlsFile = path.join(tempDir, 'urls.txt');
            fs.writeFileSync(urlsFile, katanaResults.urls.join('\n'), 'utf8');
        } else {
            out += "Katana found 0 URLs.\n";
        }

        const service = new WapitiService();
        out += `Detected Wapiti path: ${service.detectWapitiPath()}\n`;
        const result = await service.scan(target, { urlsFile }, 'test-scan-1');

        out += `Scan result keys: ${Object.keys(result)}\n`;
        if (result.vulnerabilities) {
            out += `Vulnerabilities count: ${Object.keys(result.vulnerabilities).length}\n`;
            for (const key of Object.keys(result.vulnerabilities)) {
                if (result.vulnerabilities[key].length > 0) {
                    out += `Found ${result.vulnerabilities[key].length} for ${key}\n`;
                }
            }
        } else {
            out += "No vulnerabilities section.\n";
        }
    } catch (err) {
        out += `Error executing scan: ${err.message}\n${err.stack}\n`;
    } finally {
        if (urlsFile) {
            try { fs.unlinkSync(urlsFile); } catch (e) { /* ignore */ }
        }
    }
    fs.writeFileSync('wapiti_test_out.txt', out);
    console.log(out);
}
test();
