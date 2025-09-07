import { prisma } from '../db.js';
import { shopifyService } from '../services/shopify.js';
import { logger } from '../utils/logger.js';

async function syncProductsFromConnections(shopDomain = null) {
    try {
        console.log('🔄 Syncing products from Shopify connections...\n');

        // Build query to find Shopify connections
        let whereClause = {
            status: 'ACTIVE'
        };

        // If specific shop domain provided, filter by it
        if (shopDomain) {
            whereClause.shop = shopDomain;
        }

        // Get active Shopify connections
        const connections = await prisma.shopifyConnection.findMany({
            where: whereClause,
            include: {
                workspace: {
                    select: { name: true, slug: true }
                }
            }
        });

        if (connections.length === 0) {
            console.log('❌ No active Shopify connections found.');
            console.log('Make sure you have connected a Shopify store first.');
            return;
        }

        console.log(`📦 Found ${connections.length} active Shopify connection(s):`);
        connections.forEach((connection, index) => {
            console.log(`   ${index + 1}. ${connection.shopName || connection.shop} (${connection.shop})`);
            console.log(`      Workspace: ${connection.workspace.name}`);
            console.log(`      Email: ${connection.email || 'N/A'}`);
            console.log(`      Country: ${connection.country || 'N/A'}`);
            console.log('');
        });

        // If multiple connections and no specific domain, ask user to choose
        if (connections.length > 1 && !shopDomain) {
            console.log('Multiple connections found. Please specify a shop domain to sync from.');
            console.log('Usage: node src/scripts/sync-products-from-connections.js <shop-domain>');
            console.log('Example: node src/scripts/sync-products-from-connections.js mystore.myshopify.com');
            return;
        }

        const connection = connections[0];
        console.log(`📦 Syncing products for shop: ${connection.shopName || connection.shop} (${connection.shop})`);

        // Check if we have a corresponding store record
        let store = null;
        if (connection.storeId) {
            store = await prisma.store.findUnique({
                where: { id: connection.storeId }
            });
        }

        // If no store record exists, create one
        if (!store) {
            console.log('Creating store record for this connection...');
            store = await prisma.store.create({
                data: {
                    workspaceId: connection.workspaceId,
                    platform: 'SHOPIFY',
                    name: connection.shopName || connection.shop,
                    domain: connection.shop,
                    accessToken: connection.accessToken,
                    status: 'ACTIVE',
                    metadata: {
                        shopifyConnectionId: connection.id,
                        shopifyId: connection.shopifyId,
                        email: connection.email,
                        country: connection.country,
                        currency: connection.currency,
                        timezone: connection.timezone
                    }
                }
            });

            // Update the connection to link to the store
            await prisma.shopifyConnection.update({
                where: { id: connection.id },
                data: { storeId: store.id }
            });

            console.log(`✅ Created store record: ${store.id}`);
        }

        console.log(`📦 Syncing products for store: ${store.name} (${store.domain})`);

        // Sync all products (no limit)
        const products = await shopifyService.syncProducts(store.id, 250);

        console.log(`✅ Successfully synced ${products.length} products!`);

        if (products.length > 0) {
            console.log('\n📋 Sample products:');
            products.slice(0, 10).forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.title} ($${product.price})`);
            });

            if (products.length > 10) {
                console.log(`   ... and ${products.length - 10} more products`);
            }
        }

        // Get updated store stats
        const stats = await shopifyService.getStoreStats(store.id);
        console.log(`\n📊 Store Statistics:`);
        console.log(`   Total products in Shopify: ${stats.products}`);
        console.log(`   Products synced to database: ${products.length}`);
        console.log(`   Total orders: ${stats.orders}`);

        // Check database count
        const dbProductCount = await prisma.product.count({
            where: { storeId: store.id }
        });

        console.log(`   Products in database: ${dbProductCount}`);

        if (dbProductCount < stats.products) {
            console.log(`\n⚠️  Note: Only ${dbProductCount} products synced out of ${stats.products} total products.`);
            console.log('   This might be due to API rate limits or pagination limits.');
        }

    } catch (error) {
        console.error('❌ Sync failed:', error);
        logger.error('Product sync failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get shop domain from command line arguments
const shopDomain = process.argv[2] || null;

// Run the sync
syncProductsFromConnections(shopDomain);