import { prisma } from '../db.js';

async function listShopifyConnections() {
    try {
        console.log('📋 Listing all Shopify connections...\n');

        const connections = await prisma.shopifyConnection.findMany({
            include: {
                workspace: {
                    select: { name: true, slug: true }
                },
                store: {
                    select: { id: true, name: true, status: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (connections.length === 0) {
            console.log('❌ No Shopify connections found.');
            console.log('Make sure you have connected a Shopify store first.');
            return;
        }

        console.log(`Found ${connections.length} Shopify connection(s):\n`);

        connections.forEach((connection, index) => {
                    console.log(`${index + 1}. ${connection.shopName || connection.shop}`);
                    console.log(`   Shop Domain: ${connection.shop}`);
                    console.log(`   Workspace: ${connection.workspace.name}`);
                    console.log(`   Email: ${connection.email || 'N/A'}`);
                    console.log(`   Country: ${connection.country || 'N/A'}`);
                    console.log(`   Currency: ${connection.currency || 'N/A'}`);
                    console.log(`   Status: ${connection.status}`);
                    console.log(`   Has Access Token: ${connection.accessToken ? 'Yes' : 'No'}`);
                    console.log(`   Store Record: ${connection.store ? `${connection.store.name} (${connection.store.status})` : 'Not created'}`);
            console.log(`   Created: ${connection.createdAt.toLocaleDateString()}`);
            console.log('');
        });

        console.log('To sync products from a specific connection, run:');
        console.log('node src/scripts/sync-products-from-connections.js <shop-domain>');
        console.log('');
        console.log('Example:');
        console.log('node src/scripts/sync-products-from-connections.js mystore.myshopify.com');

    } catch (error) {
        console.error('❌ Error listing Shopify connections:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listShopifyConnections();