const storage = require('./utils/storage');

async function testStorage() {
    const scans = await storage.getAllScans();
    console.log("Returned scans length:", scans.length);
    if (scans.length > 0) {
        console.log("First scan ID:", scans[0].id);
        console.log("First scan:", JSON.stringify(scans[0], null, 2));
    }
}
testStorage();
