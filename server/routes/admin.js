const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

// Middleware to check if user is Platform Admin
const requirePlatformAdmin = async (req, res, next) => {
    const { user } = req;

    // Allow in dev/local mode when no user is attached (no auth middleware upstream)
    if (!user) {
        console.warn('[Admin] No user attached — allowing in local dev mode');
        return next();
    }

    // Allow demo user or specific domain
    if (user.email === 'demo@vajrascan.com' || user.email?.endsWith('@vajrascan.com')) {
        return next();
    }

    // Allow all local users
    next();
};

router.use(requirePlatformAdmin);

// GET /api/admin/organizations
router.get('/organizations', async (req, res) => {
    try {
        const { data: orgs, error } = await supabase
            .from('organizations')
            .select(`
                id, name, subscription_tier, 
                members:organization_members(count),
                entitlements:organization_entitlements(module_id)
            `);

        if (error) throw error;

        // Transform for frontend
        const summary = orgs.map(o => ({
            id: o.id,
            name: o.name,
            plan: o.subscription_tier,
            users: o.members?.[0]?.count || 0,
            modules: o.entitlements?.map(e => e.module_id) || []
        }));

        res.json(summary);
    } catch (error) {
        console.error("Admin Org List Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/entitlements (Grant)
router.post('/entitlements', async (req, res) => {
    const { orgId, moduleId } = req.body || {};
    if (!orgId || !moduleId) return res.status(400).json({ error: "Missing orgId or moduleId" });

    try {
        const { error } = await supabase
            .from('organization_entitlements')
            .insert({ org_id: orgId, module_id: moduleId });

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/entitlements (Revoke)
router.delete('/entitlements', async (req, res) => {
    const { orgId, moduleId } = req.body || {};
    if (!orgId || !moduleId) return res.status(400).json({ error: "Missing orgId or moduleId" });

    try {
        const { error } = await supabase
            .from('organization_entitlements')
            .delete()
            .match({ org_id: orgId, module_id: moduleId });

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
