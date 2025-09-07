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

        // Validate shop domain format
        if (!shop.includes('.myshopify.com')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid shop domain. Must be in format: your-store.myshopify.com'
            });
        }

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

        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

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