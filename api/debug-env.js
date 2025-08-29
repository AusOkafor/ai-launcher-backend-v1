// Debug environment variables
export default async function handler(req, res) {
    try {
        const allEnvVars = {};
        
        // Get all environment variables
        Object.keys(process.env).forEach(key => {
            // Only show non-sensitive values or mask sensitive ones
            if (key.includes('SECRET') || key.includes('TOKEN') || key.includes('KEY')) {
                allEnvVars[key] = process.env[key] ? '***SET***' : '***NOT SET***';
            } else {
                allEnvVars[key] = process.env[key] || '***NOT SET***';
            }
        });

        // Specifically check Shopify variables
        const shopifyVars = {
            SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID ? '***SET***' : '***NOT SET***',
            SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET ? '***SET***' : '***NOT SET***',
            SHOPIFY_REDIRECT_URI: process.env.SHOPIFY_REDIRECT_URI || '***NOT SET***',
            SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || '***NOT SET***'
        };

        res.json({
            success: true,
            message: 'Environment variables debug info',
            shopifyVars,
            totalEnvVars: Object.keys(process.env).length,
            allEnvVars
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
