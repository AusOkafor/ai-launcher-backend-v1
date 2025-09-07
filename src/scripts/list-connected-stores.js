import { prisma } from '../db.js';

async function listConnectedStores() {
    try {
        console.log('📋 Listing all connected Shopify stores...\n');

        const stores = await prisma.store.findMany({
            where: {
                platform: 'SHOPIFY',
                accessToken: { not: null }
            },
            include: {
                workspace: {
                    select: { name: true, slug: true }
                }
            }
        });

        if (stores.length === 0) {
            console.log('❌ No connected Shopify stores found.');
            console.log('Make sure you have connected a Shopify store first.');
            return;
        }

        console.log(`Found ${stores.length} connected Shopify store(s):\n`);

        stores.forEach((store, index) => {
            console.log(`${index + 1}. ${store.name}`);
            console.log(`   Domain: ${store.domain}`);
            console.log(`   Workspace: ${store.workspace.name}`);
            console.log(`   Status: ${store.status}`);
            console.log(`   Created: ${store.createdAt.toLocaleDateString()}`);
            console.log('');
        });

        console.log('To sync products from a specific store, run:');
        console.log('node src/scripts/sync-products.js <store-domain>');
        console.log('');
        console.log('Example:');
        console.log('node src/scripts/sync-products.js mystore.myshopify.com');

    } catch (error) {
        console.error('❌ Error listing stores:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listConnectedStores();