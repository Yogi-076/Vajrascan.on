async function test() {
    const res = await fetch('http://localhost:3001/api/scan/history');
    const data = await res.json();
    if (data && data.length > 0) {
        console.log('Got History Item:', data[0]);
    } else {
        console.log('No history found');
    }
}
test();
