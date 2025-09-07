import { prisma } from '../db.js';
import { shopifyService } from '../services/shopify.js';
import { logger } from '../utils/logger.js';

async function syncProducts(storeDomain = null) {
    try {
        console.log('🔄 Syncing products from Shopify...\n');

        // Build query to find stores
        let whereClause = {
            platform: 'SHOPIFY',
            accessToken: { not: null }
        };

        // If specific domain provided, filter by it
        if (storeDomain) {
            whereClause.domain = storeDomain;
        }

        // Get stores with access tokens
        const stores = await prisma.store.findMany({
            where: whereClause
        });

        if (stores.length === 0) {
            console.log('❌ No Shopify stores found with access tokens.');
            console.log('Make sure you have connected a Shopify store first.');
            return;
        }

        console.log(`📦 Found ${stores.length} connected store(s):`);
        stores.forEach((store, index) => {
            console.log(`   ${index + 1}. ${store.name} (${store.domain})`);
        });
        console.log('');

        // If multiple stores and no specific domain, ask user to choose
        if (stores.length > 1 && !storeDomain) {
            console.log('Multiple stores found. Please specify a store domain to sync from.');
            console.log('Usage: node src/scripts/sync-products.js <store-domain>');
            console.log('Example: node src/scripts/sync-products.js mystore.myshopify.com');
            return;
        }

        const store = stores[0];
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

// Get store domain from command line arguments
const storeDomain = process.argv[2] || null;

// Run the sync
syncProducts(storeDomain);