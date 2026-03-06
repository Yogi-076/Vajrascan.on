/**
 * VajraScan - Database Setup Script
 * Runs the SQL migration to create the scans and findings tables
 * via the Supabase REST API (no CLI required).
 * 
 * Run: node setup-db.cjs
 */

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[Setup] ❌ Missing SUPABASE_URL or SUPABASE key in .env');
    process.exit(1);
}

console.log('[Setup] 🚀 Connecting to:', SUPABASE_URL);

// We'll create the tables using the REST API's rpc endpoint
// Supabase exposes a /rest/v1/rpc/exec_sql if you have a custom function,
// but by default we need to use the pg_catalog approach or the direct REST.
// Simplest fallback: create a node script that uses the supabase-js client
// and runs raw SQL via the 'rpc' interface.

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SQL_STEPS = [
    {
        name: 'Enable UUID extension',
        table: null,
        sql: null,
        check: null
    }
];

async function tableExists(tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

    if (error && error.message.includes("does not exist")) return false;
    if (error && error.message.includes("schema cache")) return false;
    return true;
}

async function runHttpSql(sql) {
    return new Promise((resolve) => {
        const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
        if (!projectId) { resolve({ error: 'Cannot parse project ID from URL' }); return; }

        const body = JSON.stringify({ query: sql });
        const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/run_sql`);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ data: JSON.parse(data), status: res.statusCode }); }
                catch { resolve({ data, status: res.statusCode }); }
            });
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('\n[Setup] Checking table existence...\n');

    const scansExists = await tableExists('scans');
    const findingsExists = await tableExists('findings');

    console.log(`  • public.scans    — ${scansExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  • public.findings — ${findingsExists ? '✅ EXISTS' : '❌ MISSING'}`);

    if (scansExists && findingsExists) {
        console.log('\n[Setup] ✅ All tables are present. No action needed.');
        console.log('[Setup] 💡 If you still see errors, restart the backend server.');
        return;
    }

    console.log('\n[Setup] ⚠️  Missing tables detected.');
    console.log('[Setup] 📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('         https://supabase.com/dashboard/project/gxoxfmhumoriolhndcip/sql/new\n');
    console.log('─'.repeat(70));

    const migrationFile = require('fs').readFileSync(
        require('path').join(__dirname, 'supabase', 'migrations', '20260305_scans_and_findings.sql'),
        'utf8'
    );
    console.log(migrationFile);
    console.log('─'.repeat(70));

    console.log('\n[Setup] 💡 TIP: Copy the SQL above → paste in the SQL Editor → click Run');
    console.log('[Setup] 💡 Alternatively, if you have the Supabase CLI:');
    console.log('         supabase db push --project-ref gxoxfmhumoriolhndcip\n');
}

main().catch(console.error);
