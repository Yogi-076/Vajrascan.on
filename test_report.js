const fs = require('fs');
const ReportTransformer = require('./server/utils/reportTransformer');

const rawData = fs.readFileSync('./temp_report.json', 'utf8');
const results = ReportTransformer.transform(JSON.parse(rawData));

console.log(JSON.stringify(results.summary, null, 2));
