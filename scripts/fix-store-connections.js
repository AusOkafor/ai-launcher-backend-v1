import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStoreConnections() {
    console.log('🔧 Starting to fix Store-Connection relationships...');

    try {
        // Find all ShopifyConnections that don't have a linked Store
        const connectionsWithoutStore = await prisma.shopifyConnection.findMany({
            where: {
                storeId: null
            },
            include: {
                workspace: true
            }
        });

        console.log(`Found ${connectionsWithoutStore.length} connections without Store records`);

        for (const connection of connectionsWithoutStore) {
            console.log(`Processing connection: ${connection.shop} (${connection.shopName})`);

            // Create a Store record for this connection
            const store = await prisma.store.create({
                data: {
                    workspaceId: connection.workspaceId,
                    platform: 'SHOPIFY',
                    name: connection.shopName || connection.shop,
                    domain: connection.shop,
                    accessToken: connection.accessToken,
                    status: 'ACTIVE'
                }
            });

            console.log(`Created Store: ${store.id} for ${connection.shop}`);

            // Update the ShopifyConnection to link to the Store
            await prisma.shopifyConnection.update({
                where: { id: connection.id },
                data: { storeId: store.id }
            });

            console.log(`Linked ShopifyConnection ${connection.id} to Store ${store.id}`);
        }

        console.log('✅ All Store-Connection relationships fixed!');

        // Verify the fix
        const remainingUnlinked = await prisma.shopifyConnection.count({
            where: { storeId: null }
        });

        console.log(`Remaining unlinked connections: ${remainingUnlinked}`);

    } catch (error) {
        console.error('❌ Error fixing Store-Connection relationships:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStoreConnections();