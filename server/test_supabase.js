const supabase = require('./utils/supabaseClient');

async function testSupabase() {
    try {
        const { data, error } = await supabase.from('scans').select('*').limit(2);
        console.log('Error:', error);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}
testSupabase();
