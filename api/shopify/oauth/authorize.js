// Minimal OAuth authorize function for debugging
export default async function handler(req, res) {
    console.log('=== OAuth Authorize Function Started ===');
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        if (req.method !== 'GET') {
            console.log('Method not allowed:', req.method);
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { shop } = req.query;
        console.log('Shop parameter:', shop);

        if (!shop) {
            console.log('No shop parameter provided');
            return res.status(400).json({
                success: false,
                error: 'Shop parameter is required'
            });
        }

        // Simple domain validation
        let cleanShop = shop.trim();
        console.log('Cleaned shop:', cleanShop);

        // Check if it's a valid Shopify domain
        if (!cleanShop.includes('.myshopify.com')) {
            console.log('Invalid domain - no .myshopify.com found');
            return res.status(400).json({
                success: false,
                error: 'Invalid shop domain. Please enter your complete Shopify store URL (e.g., your-store.myshopify.com)'
            });
        }

        // Get environment variables
        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const redirectUri = process.env.SHOPIFY_REDIRECT_URI || 'https://ai-launcher-backend-v1.vercel.app/api/shopify/oauth/callback';
        const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders,read_customers,write_customers';

        console.log('Environment check:');
        console.log('- SHOPIFY_CLIENT_ID:', clientId ? 'SET' : 'NOT SET');
        console.log('- SHOPIFY_REDIRECT_URI:', redirectUri);
        console.log('- SHOPIFY_SCOPES:', scopes);

        if (!clientId || clientId === 'undefined') {
            console.log('SHOPIFY_CLIENT_ID not configured');
            return res.status(500).json({
                success: false,
                error: 'SHOPIFY_CLIENT_ID not configured. Please set it in Vercel environment variables.'
            });
        }

        const authUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        console.log('Generated auth URL:', authUrl);
        console.log('Redirecting to Shopify OAuth...');

        res.redirect(authUrl);

    } catch (error) {
        console.error('=== OAuth Authorize Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            cause: error.cause,
            code: error.code
        });
        
        res.status(500).json({
            success: false,
            error: 'Failed to initiate OAuth flow',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}