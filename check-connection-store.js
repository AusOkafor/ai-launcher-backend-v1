import { prisma } from './src/db.js';

async function checkConnectionStore() {
    try {
        const connectionId = 'cmf3d0sr200022hpf1yfhb0hv';

        console.log('🔍 Checking connection and store relationship...');

        // Get the connection with store details
        const connection = await prisma.shopifyConnection.findFirst({
            where: { id: connectionId },
            include: { store: true }
        });

        if (!connection) {
            console.log('❌ Connection not found');
            return;
        }

        console.log('📋 Connection Details:');
        console.log(`- ID: ${connection.id}`);
        console.log(`- Shop: ${connection.shop}`);
        console.log(`- Store ID: ${connection.storeId}`);
        console.log(`- Store Object:`, connection.store);

        // Get the actual store ID to use
        const storeId = connection.storeId || (connection.store && connection.store.id);
        console.log(`\n🎯 Store ID to use: ${storeId}`);

        if (!storeId) {
            console.log('❌ No store ID found for this connection');
            return;
        }

        // Check carts for this store
        const carts = await prisma.cart.findMany({
            where: { storeId },
            include: { customer: true }
        });

        console.log(`\n📦 Found ${carts.length} carts for store ${storeId}:`);
        carts.forEach((cart, index) => {
            console.log(`${index + 1}. Cart ${cart.id}:`);
            console.log(`   - Status: ${cart.status}`);
            console.log(`   - Created: ${cart.createdAt}`);
            console.log(`   - Customer: ${(cart.customer && cart.customer.email) || 'No customer'}`);
            console.log(`   - Age: ${Math.round((Date.now() - cart.createdAt) / (1000 * 60))} minutes`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkConnectionStore();