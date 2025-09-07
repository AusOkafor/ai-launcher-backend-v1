import { prisma } from './src/db.js';

async function checkRealCarts() {
    try {
        const storeId = 'cmf3e8nzb0071n9yz7eviag2q'; // Fringo-motion

        console.log('🔍 Checking real cart data...\n');

        // Get recent carts
        const recentCarts = await prisma.cart.findMany({
            where: { storeId },
            include: { customer: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log(`📦 Found ${recentCarts.length} carts for Fringo-motion:\n`);

        recentCarts.forEach((cart, index) => {
            const ageMinutes = Math.round((Date.now() - cart.createdAt) / (1000 * 60));
            console.log(`${index + 1}. Cart ID: ${cart.id}`);
            console.log(`   Status: ${cart.status}`);
            console.log(`   Created: ${cart.createdAt} (${ageMinutes} minutes ago)`);
            console.log(`   Customer: ${(cart.customer && cart.customer.email) || 'No customer'}`);
            console.log(`   Total: $${cart.subtotal}`);
            console.log(`   Items: ${cart.items}`);
            if (cart.metadata) {
                const metadata = typeof cart.metadata === 'string' ? JSON.parse(cart.metadata) : cart.metadata;
                console.log(`   Cart Token: ${metadata.cartToken || 'N/A'}`);
                console.log(`   Session: ${metadata.sessionId || 'N/A'}`);
            }
            console.log('');
        });

        // Check abandoned cart detection
        console.log('🧪 Testing abandoned cart detection with 0.1 hour threshold...\n');

        const cutoffTime = new Date(Date.now() - (0.1 * 60 * 60 * 1000)); // 6 minutes ago

        const shouldBeAbandoned = recentCarts.filter(cart => {
            const isOldEnough = cart.createdAt < cutoffTime;
            const hasContact = cart.customer && (cart.customer.email || cart.customer.phone);
            const isAbandonedStatus = cart.status === 'ABANDONED';
            const isActiveStatus = cart.status === 'ACTIVE';
            const isCheckoutStartedStatus = cart.status === 'CHECKOUT_STARTED';

            console.log(`Cart ${cart.id}:`);
            console.log(`  - Old enough (>6min): ${isOldEnough}`);
            console.log(`  - Has contact: ${hasContact ? 'Yes' : 'No'}`);
            console.log(`  - Current status: ${cart.status}`);
            console.log(`  - Should be detected: ${isOldEnough && hasContact && (isAbandonedStatus || isActiveStatus || isCheckoutStartedStatus)}`);
            console.log('');

            return isOldEnough && hasContact && (isAbandonedStatus || isActiveStatus || isCheckoutStartedStatus);
        });

        console.log(`📊 Summary:`);
        console.log(`- Total carts: ${recentCarts.length}`);
        console.log(`- Should be detected as abandoned: ${shouldBeAbandoned.length}`);
        console.log(`- Cutoff time: ${cutoffTime}`);

        if (shouldBeAbandoned.length === 0) {
            console.log('\n⚠️  No carts should be detected as abandoned yet.');
            console.log('   This could be because:');
            console.log('   1. Carts are less than 6 minutes old');
            console.log('   2. No customer email/phone provided');
            console.log('   3. Cart status needs to be updated');
        }

    } catch (error) {
        console.error('❌ Error checking carts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRealCarts();