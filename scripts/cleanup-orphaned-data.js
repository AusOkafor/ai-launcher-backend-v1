import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedData() {
    console.log('🧹 Starting cleanup of orphaned store data...');

    try {
        // Find all stores that don't have a ShopifyConnection
        const orphanedStores = await prisma.store.findMany({
            where: {
                shopifyConnection: null
            },
            include: {
                products: true,
                customers: true,
                orders: true,
                carts: true
            }
        });

        console.log(`📊 Found ${orphanedStores.length} orphaned stores`);

        if (orphanedStores.length === 0) {
            console.log('✅ No orphaned data found. Database is clean!');
            return;
        }

        // Clean up each orphaned store
        for (const store of orphanedStores) {
            console.log(`\n🗑️ Cleaning up store: ${store.name} (${store.id})`);
            console.log(`   - Products: ${store.products.length}`);
            console.log(`   - Customers: ${store.customers.length}`);
            console.log(`   - Orders: ${store.orders.length}`);
            console.log(`   - Carts: ${store.carts.length}`);

            // Delete in order to respect foreign key constraints
            // 1. Delete cart items first (they reference products)
            // Note: CartItem doesn't have direct store relationship, so we delete by product
            const cartItemsDeleted = await prisma.cartItem.deleteMany({
                where: {
                    product: { storeId: store.id }
                }
            });
            console.log(`   - Deleted ${cartItemsDeleted.count} cart items`);

            // 2. Delete carts
            const cartsDeleted = await prisma.cart.deleteMany({
                where: { storeId: store.id }
            });
            console.log(`   - Deleted ${cartsDeleted.count} carts`);

            // 3. Delete orders
            const ordersDeleted = await prisma.order.deleteMany({
                where: { storeId: store.id }
            });
            console.log(`   - Deleted ${ordersDeleted.count} orders`);

            // 4. Delete customers
            const customersDeleted = await prisma.customer.deleteMany({
                where: { storeId: store.id }
            });
            console.log(`   - Deleted ${customersDeleted.count} customers`);

            // 5. Delete product variants first (they reference products)
            const variantsDeleted = await prisma.variant.deleteMany({
                where: {
                    product: { storeId: store.id }
                }
            });
            console.log(`   - Deleted ${variantsDeleted.count} product variants`);

            // 6. Delete products
            const productsDeleted = await prisma.product.deleteMany({
                where: { storeId: store.id }
            });
            console.log(`   - Deleted ${productsDeleted.count} products`);

            // 7. Delete the store
            await prisma.store.delete({
                where: { id: store.id }
            });
            console.log(`   - Deleted store: ${store.name}`);

            console.log(`✅ Successfully cleaned up store: ${store.name}`);
        }

        // Also check for any orphaned ShopifyConnections without stores
        const orphanedConnections = await prisma.shopifyConnection.findMany({
            where: {
                store: null
            }
        });

        if (orphanedConnections.length > 0) {
            console.log(`\n🗑️ Found ${orphanedConnections.length} orphaned Shopify connections`);

            for (const connection of orphanedConnections) {
                console.log(`   - Deleting connection: ${connection.shop}`);
                await prisma.shopifyConnection.delete({
                    where: { id: connection.id }
                });
            }

            console.log(`✅ Deleted ${orphanedConnections.length} orphaned connections`);
        }

        console.log('\n🎉 Cleanup completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Orphaned stores cleaned: ${orphanedStores.length}`);
        console.log(`   - Orphaned connections cleaned: ${orphanedConnections.length}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupOrphanedData()
    .then(() => {
        console.log('✅ Cleanup script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup script failed:', error);
        process.exit(1);
    });