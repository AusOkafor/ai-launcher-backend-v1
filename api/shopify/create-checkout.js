import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

export default async function handler(req, res) {
    // Set CORS headers
    const origin = req.headers.origin || '*';
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8081',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'POST') {
            const { items, customerInfo, storeId } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Items array is required'
                });
            }

            console.log('🛒 Creating Shopify checkout for items:', items.length);

            // Get store information
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: {
                    shopifyConnection: true
                }
            });

            if (!store || !store.shopifyConnection) {
                return res.status(400).json({
                    success: false,
                    error: 'Store or Shopify connection not found'
                });
            }

            // Create Shopify checkout using Storefront API
            const checkoutData = {
                lineItems: items.map(item => ({
                    variantId: item.variantId || `gid://shopify/ProductVariant/${item.variantId}`,
                    quantity: item.quantity
                })),
                ...(customerInfo && {
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                    shippingAddress: customerInfo.address ? {
                        address1: customerInfo.address,
                        city: 'City',
                        country: 'US',
                        firstName: customerInfo.name ? .split(' ')[0] || 'Customer',
                        lastName: customerInfo.name ? .split(' ').slice(1).join(' ') || '',
                        zip: '12345'
                    } : undefined
                })
            };

            // For now, create a mock checkout URL
            // In production, you would call Shopify's Storefront API
            const checkoutId = `checkout_${Date.now()}`;
            const checkoutUrl = `https://${store.domain}/checkout/${checkoutId}`;

            // Store checkout in database for tracking
            const checkout = await prisma.cart.create({
                data: {
                    storeId: store.id,
                    customerId: null, // Will be updated when customer completes checkout
                    shopifyCartId: checkoutId,
                    status: 'CHECKOUT_CREATED',
                    items: JSON.stringify(items),
                    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    currency: 'USD',
                    metadata: JSON.stringify({
                        checkoutUrl,
                        source: 'whatsapp_simulator',
                        customerInfo
                    })
                }
            });

            console.log('✅ Checkout created:', checkout.id);

            return res.status(200).json({
                success: true,
                data: {
                    checkoutUrl,
                    checkoutId,
                    total: checkout.total,
                    items: items.length
                }
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    } catch (error) {
        console.error('❌ Checkout creation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}