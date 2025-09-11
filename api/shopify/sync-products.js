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

            if (!connectionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Connection ID is required'
                });
            }

            console.log('🔄 Starting product sync...', { connectionId, storeId, workspaceId });

            // Get the Shopify connection
            const connection = await prisma.shopifyConnection.findFirst({
                where: {
                    id: connectionId,
                    workspaceId: workspaceId,
                    status: 'ACTIVE'
                },
                include: {
                    store: true
                }
            });

            if (!connection) {
                console.log('❌ No connection found for:', { connectionId, workspaceId });
                return res.status(404).json({
                    success: false,
                    error: 'No active Shopify connection found',
                    details: `Connection ID: ${connectionId}, Workspace ID: ${workspaceId}`
                });
            }

            console.log('📦 Found connection:', connection.shopName);

            // Fetch real products from Shopify API
            console.log('🔄 Fetching products from Shopify API...');
            const shopifyProductsResponse = await fetch(`https://${connection.shop}/admin/api/2023-10/products.json`, {
                headers: {
                    'X-Shopify-Access-Token': connection.accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!shopifyProductsResponse.ok) {
                const errorText = await shopifyProductsResponse.text();
                console.error('❌ Shopify API error:', errorText);
                throw new Error(`Failed to fetch products from Shopify: ${shopifyProductsResponse.statusText}`);
            }

            const shopifyData = await shopifyProductsResponse.json();
            const shopifyProducts = shopifyData.products || [];

            console.log(`📦 Found ${shopifyProducts.length} products in Shopify store`);

            // Transform Shopify products to our database format
            const transformedProducts = shopifyProducts.map(shopifyProduct => {
                // Get all image URLs
                const imageUrls = shopifyProduct.images ? shopifyProduct.images.map(img => img.src) : [];

                // Get the first variant for basic product info
                const firstVariant = shopifyProduct.variants && shopifyProduct.variants[0];

                return {
                    title: shopifyProduct.title,
                    description: shopifyProduct.body_html ? shopifyProduct.body_html.replace(/<[^>]*>/g, '') : null, // Strip HTML tags
                    price: parseFloat((firstVariant && firstVariant.price) || 0),
                    sku: (firstVariant && firstVariant.sku) || null,
                    status: shopifyProduct.status === 'active' ? 'ACTIVE' : 'INACTIVE',
                    category: shopifyProduct.product_type || null,
                    brand: shopifyProduct.vendor || null,
                    images: imageUrls,
                    storeId: connection.storeId,
                    // Store variants data for later processing
                    shopifyVariants: shopifyProduct.variants || []
                };
            });

            // Create or update products in database
            const syncedProducts = [];
            for (const productData of transformedProducts) {
                try {
                    // Extract variants data before creating/updating product
                    const { shopifyVariants, ...productCreateData } = productData;

                    // Check if product already exists (by storeId and title)
                    const existingProduct = await prisma.product.findFirst({
                        where: {
                            storeId: productCreateData.storeId,
                            title: productCreateData.title
                        }
                    });

                    let product;
                    if (existingProduct) {
                        // Update existing product
                        product = await prisma.product.update({
                            where: { id: existingProduct.id },
                            data: {
                                ...productCreateData,
                                updatedAt: new Date()
                            }
                        });
                        console.log(`🔄 Updated existing product: ${product.title}`);

                        // Delete existing variants to avoid duplicates
                        await prisma.variant.deleteMany({
                            where: { productId: product.id }
                        });
                    } else {
                        // Create new product
                        product = await prisma.product.create({
                            data: {
                                ...productCreateData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        console.log(`✅ Created new product: ${product.title}`);
                    }

                    // Create variants for this product
                    if (shopifyVariants && shopifyVariants.length > 0) {
                        for (const shopifyVariant of shopifyVariants) {
                            try {
                                await prisma.variant.create({
                                    data: {
                                        productId: product.id,
                                        options: {
                                            title: shopifyVariant.title || 'Default',
                                            price: shopifyVariant.price,
                                            sku: shopifyVariant.sku,
                                            inventory_quantity: shopifyVariant.inventory_quantity,
                                            weight: shopifyVariant.weight,
                                            weight_unit: shopifyVariant.weight_unit
                                        },
                                        price: parseFloat(shopifyVariant.price || 0),
                                        stock: parseInt(shopifyVariant.inventory_quantity || 0),
                                        sku: shopifyVariant.sku || null
                                    }
                                });
                                console.log(`✅ Created variant for ${product.title}: ${shopifyVariant.title} (Stock: ${shopifyVariant.inventory_quantity})`);
                            } catch (variantError) {
                                console.error(`❌ Failed to create variant for ${product.title}:`, variantError.message);
                            }
                        }
                    }

                    syncedProducts.push(product);
                    console.log(`✅ Processed product: ${product.title} with ${shopifyVariants.length} variants`);
                } catch (error) {
                    console.error(`❌ Failed to process product ${productData.title}:`, error.message);
                    // Continue with other products even if one fails
                }
            }

            // Update connection last sync time
            await prisma.shopifyConnection.update({
                where: { id: connection.id },
                data: {
                    updatedAt: new Date()
                }
            });

            console.log('✅ Product sync completed:', syncedProducts.length, 'products');

            return res.status(200).json({
                success: true,
                message: `Successfully synced ${syncedProducts.length} products`,
                data: {
                    syncedCount: syncedProducts.length,
                    connectionId: connection.id,
                    storeName: connection.shopName,
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