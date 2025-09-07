import { prisma } from './src/db.js';

async function debugCartDetection() {
    try {
        const storeId = 'cmf3e8nzb0071n9yz7eviag2q';

        console.log('🔍 Debugging cart detection...');
        console.log(`Store ID: ${storeId}`);

        // Check what carts exist
        const carts = await prisma.cart.findMany({
            where: { storeId },
            include: {
                customer: true,
                store: true
            }
        });

        console.log(`\n📦 Found ${carts.length} carts:`);
        carts.forEach((cart, index) => {
            console.log(`${index + 1}. Cart ID: ${cart.id}`);
            console.log(`   Status: ${cart.status}`);
            console.log(`   Created: ${cart.createdAt}`);
            console.log(`   Customer: ${(cart.customer && cart.customer.email) || 'No customer'}`);
            console.log(`   Items: ${cart.items}`);
            console.log('');
        });

        // Check what orders exist for this store
        const orders = await prisma.order.findMany({
            where: { storeId },
            include: { customer: true }
        });

        console.log(`📋 Found ${orders.length} orders:`);
        orders.forEach((order, index) => {
            console.log(`${index + 1}. Order ID: ${order.id}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Created: ${order.createdAt}`);
            console.log(`   Customer: ${(order.customer && order.customer.email) || 'No customer'}`);
            console.log('');
        });

        // Test the detection logic manually
        console.log('🧪 Testing detection logic...');

        const cutoffTime = new Date(Date.now() - (6 * 60 * 1000)); // 6 minutes
        console.log(`Cutoff time: ${cutoffTime}`);

        const abandonedCarts = carts.filter(cart => {
            const isOldEnough = cart.createdAt < cutoffTime;
            const hasCustomer = cart.customer && (cart.customer.email || cart.customer.phone);
            const isAbandoned = cart.status === 'ABANDONED';

            console.log(`Cart ${cart.id}:`);
            console.log(`  - Old enough: ${isOldEnough} (created: ${cart.createdAt})`);
            console.log(`  - Has contact: ${hasCustomer}`);
            console.log(`  - Is abandoned: ${isAbandoned}`);
            console.log(`  - Should detect: ${isOldEnough && hasCustomer && isAbandoned}`);

            return isOldEnough && hasCustomer && isAbandoned;
        });

        console.log(`\n✅ Would detect ${abandonedCarts.length} abandoned carts`);

    } catch (error) {
        console.error('Error debugging cart detection:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugCartDetection();