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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const { connectionId, storeId } = req.body;
            const workspaceId = req.query.workspaceId || 'test-workspace-id';

            console.log('🔄 Starting product sync...', { connectionId, storeId, workspaceId });

            // Get the Shopify connection
            const connection = await prisma.shopifyConnection.findFirst({
                where: {
                    id: connectionId || { not: null },
                    workspaceId: workspaceId,
                    status: 'ACTIVE'
                },
                include: {
                    store: true
                }
            });

            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'No active Shopify connection found'
                });
            }

            console.log('📦 Found connection:', connection.shop);

            // For now, we'll create some sample products since we don't have Shopify API integration yet
            // In a real implementation, this would call the Shopify API to fetch products
            const sampleProducts = [{
                    title: 'Sample Product 1',
                    description: 'This is a sample product from your Shopify store',
                    price: 29.99,
                    comparePrice: 39.99,
                    sku: 'SAMPLE-001',
                    inventory: 50,
                    status: 'ACTIVE',
                    category: 'General',
                    vendor: 'Your Store',
                    tags: ['sample', 'test'],
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
                    storeId: connection.storeId,
                    shopifyId: 'shopify_001',
                    shopifyHandle: 'sample-product-1',
                    whatsappEnabled: true
                },
                {
                    title: 'Sample Product 2',
                    description: 'Another sample product from your Shopify store',
                    price: 49.99,
                    comparePrice: null,
                    sku: 'SAMPLE-002',
                    inventory: 25,
                    status: 'ACTIVE',
                    category: 'Electronics',
                    vendor: 'Your Store',
                    tags: ['electronics', 'sample'],
                    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
                    storeId: connection.storeId,
                    shopifyId: 'shopify_002',
                    shopifyHandle: 'sample-product-2',
                    whatsappEnabled: false
                },
                {
                    title: 'Sample Product 3',
                    description: 'Third sample product from your Shopify store',
                    price: 19.99,
                    comparePrice: 24.99,
                    sku: 'SAMPLE-003',
                    inventory: 100,
                    status: 'ACTIVE',
                    category: 'Accessories',
                    vendor: 'Your Store',
                    tags: ['accessories', 'sample'],
                    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
                    storeId: connection.storeId,
                    shopifyId: 'shopify_003',
                    shopifyHandle: 'sample-product-3',
                    whatsappEnabled: true
                }
            ];

            // Upsert products (create or update)
            const syncedProducts = [];
            for (const productData of sampleProducts) {
                const product = await prisma.product.upsert({
                    where: {
                        shopifyId: productData.shopifyId
                    },
                    update: {
                        title: productData.title,
                        description: productData.description,
                        price: productData.price,
                        comparePrice: productData.comparePrice,
                        sku: productData.sku,
                        inventory: productData.inventory,
                        status: productData.status,
                        category: productData.category,
                        vendor: productData.vendor,
                        tags: productData.tags,
                        image: productData.image,
                        whatsappEnabled: productData.whatsappEnabled,
                        updatedAt: new Date()
                    },
                    create: {
                        ...productData,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                syncedProducts.push(product);
            }

            // Update connection last sync time
            await prisma.shopifyConnection.update({
                where: { id: connection.id },
                data: {
                    updatedAt: new Date(),
                    lastSyncAt: new Date()
                }
            });

            console.log('✅ Product sync completed:', syncedProducts.length, 'products');

            return res.status(200).json({
                success: true,
                message: `Successfully synced ${syncedProducts.length} products`,
                data: {
                    syncedCount: syncedProducts.length,
                    connectionId: connection.id,
                    storeName: connection.shop,
                    lastSync: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Error syncing products:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to sync products',
                details: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
}