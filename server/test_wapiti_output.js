const WapitiService = require('./services/wapitiService');
const ReportTransformer = require('./utils/reportTransformer');

async function testWapiti() {
    const service = new WapitiService();
    const target = 'http://testphp.vulnweb.com/login.php';
    const scanId = 'test-scan-' + Date.now();

    console.log(`Starting scan against ${target}`);
    try {
        const rawResults = await service.scan(target, { depth: 1 }, scanId);
        console.log('--- Raw Results JSON Keys ---');
        console.log(Object.keys(rawResults));

        const transformed = ReportTransformer.transform(rawResults);
        console.log('--- Transformed Summary ---');
        console.log(transformed.summary);

        console.log('--- Scan Logs ---');
        console.log(service.getProgress(scanId).logs.join('\n'));
    } catch (e) {
        console.error('Error:', e);
    }
}

testWapiti();
