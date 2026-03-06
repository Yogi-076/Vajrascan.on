const supabase = require('./utils/supabaseClient');
async function test() {
    const { data, error } = await supabase.from('scans').delete().eq('id', 'non-existent-id');
    console.log("Error:", error);
    console.log("Data:", data);
}
test();
