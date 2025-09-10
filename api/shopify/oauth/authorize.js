// Standalone OAuth authorize function
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shop } = req.query;

        if (!shop) {
            return res.status(400).json({
                success: false,
                error: 'Shop parameter is required'
            });
        }

        // Clean and validate shop domain format
        let cleanShop = shop.trim();
        console.log(`DEBUG: Original shop parameter: "${shop}"`);
        console.log(`DEBUG: After trim: "${cleanShop}"`);

        // Remove duplicate .myshopify.com if present
        if (cleanShop.includes('.myshopify.com.myshopify.com')) {
            console.log(`DEBUG: Found duplicate .myshopify.com, cleaning...`);
            cleanShop = cleanShop.replace('.myshopify.com.myshopify.com', '.myshopify.com');
            console.log(`DEBUG: After duplicate removal: "${cleanShop}"`);
        }

        // Don't automatically add .myshopify.com - use exactly what user provided
        console.log(`DEBUG: Final domain before validation: "${cleanShop}"`);

        // Validate the cleaned domain - must be a valid Shopify domain
        if (!cleanShop.includes('.myshopify.com')) {
            console.log(`DEBUG: Domain validation failed - no .myshopify.com found`);
            return res.status(400).json({
                success: false,
                error: 'Invalid shop domain. Please enter your complete Shopify store URL (e.g., your-store.myshopify.com)'
            });
        }

        // Use the cleaned shop domain
        const finalShop = cleanShop;
        console.log(`Shop domain processed: ${shop} -> ${finalShop}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
        const defaultScopes = 'read_products,write_products,read_orders,write_orders,read_customers,write_customers';
        const scopes = process.env.SHOPIFY_SCOPES || defaultScopes;

        // Debug logging
        console.log('Environment variables:');
        console.log('SHOPIFY_CLIENT_ID:', clientId);
        console.log('SHOPIFY_REDIRECT_URI:', redirectUri);
        console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('SHOPIFY')));

        if (!clientId || clientId === 'undefined') {
            return res.status(500).json({
                success: false,
                error: 'SHOPIFY_CLIENT_ID not configured. Please set it in Vercel environment variables.'
            });
        }

        if (!redirectUri || redirectUri === 'undefined') {
            return res.status(500).json({
                success: false,
                error: 'SHOPIFY_REDIRECT_URI not configured. Please set it in Vercel environment variables.'
            });
        }

        const authUrl = `https://${finalShop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        console.log(`Redirecting to Shopify OAuth: ${authUrl}`);

        res.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate OAuth flow'
        });
    }
}