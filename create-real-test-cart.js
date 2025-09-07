import { prisma } from './src/db.js';

async function createRealTestCart() {
    try {
        const storeId = 'cmf3e8nzb0071n9yz7eviag2q'; // Fringo-motion

        console.log('🛒 Creating real test cart with customer info...');

        // Create customer with email
        const customer = await prisma.customer.create({
            data: {
                storeId: storeId,
                email: 'realcustomer@example.com',
                phone: '+1-555-0199',
                firstName: 'Real',
                lastName: 'Customer',
                country: 'US'
            }
        });

        // Create cart with real Shopify product data
        const cart = await prisma.cart.create({
            data: {
                storeId: storeId,
                customerId: customer.id,
                items: JSON.stringify([{
                    id: 42735480930545,
                    product_id: 7651248242929,
                    variant_id: 42735480930545,
                    title: "14k Dangling Obsidian Earrings",
                    price: 8.29,
                    quantity: 1,
                    sku: "",
                    vendor: "Supply Dark"
                }]),
                subtotal: 8.29,
                status: 'ACTIVE',
                metadata: {
                    cartToken: '42735480930545',
                    sessionId: 'session_real_test',
                    shop: 'fringo-motion.myshopify.com',
                    lastActivity: new Date().toISOString()
                },
                createdAt: new Date(Date.now() - (10 * 60 * 1000)) // 10 minutes ago
            }
        });

        console.log('✅ Real test cart created successfully!');
        console.log(`Cart ID: ${cart.id}`);
        console.log(`Customer: ${customer.email}`);
        console.log(`Product: 14k Dangling Obsidian Earrings ($8.29)`);
        console.log(`Created: 10 minutes ago (should be detected as abandoned)`);
        console.log('');
        console.log('🎯 This cart should now appear in your Cart Recovery AI dashboard!');
        console.log('   1. Go to Cart Recovery AI');
        console.log('   2. Select "Fringo-motion" store');
        console.log('   3. Set hours to 0.1 (6 minutes)');
        console.log('   4. Click refresh');

    } catch (error) {
        console.error('❌ Error creating test cart:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createRealTestCart();