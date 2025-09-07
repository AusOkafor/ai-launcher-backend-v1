import { prisma } from './src/db.js';

async function createManualTestCart() {
    try {
        const storeId = 'cmf3e8nzb0071n9yz7eviag2q'; // Fringo-motion
        
        console.log('🛒 Creating manual test cart with your email...');
        
        // Use real customer email
        const customerEmail = 'test@fringo-motion.com'; // Test email for dashboard
        
        // Create customer
        const customer = await prisma.customer.create({
            data: {
                storeId: storeId,
                email: customerEmail,
                phone: '+1-555-0100',
                firstName: 'Test',
                lastName: 'User',
                country: 'US'
            }
        });
        
        // Create cart with recent real product
        const cart = await prisma.cart.create({
            data: {
                storeId: storeId,
                customerId: customer.id,
                items: JSON.stringify([{
                    id: 42735480832241,
                    product_id: 7651248144625,
                    variant_id: 42735480832241,
                    title: "14k Dangling Pendant Earrings",
                    price: 6.19,
                    quantity: 1,
                    sku: "",
                    vendor: "Supply Dark"
                }]),
                subtotal: 6.19,
                status: 'ACTIVE',
                metadata: {
                    cartToken: '42735480832241',
                    sessionId: 'manual_test_session',
                    shop: 'fringo-motion.myshopify.com',
                    checkoutStarted: new Date().toISOString()
                },
                createdAt: new Date(Date.now() - (10 * 60 * 1000)) // 10 minutes ago
            }
        });
        
        console.log('✅ Manual test cart created!');
        console.log(`Email: ${customerEmail}`);
        console.log(`Cart ID: ${cart.id}`);
        console.log(`Product: 14k Dangling Pendant Earrings ($6.19)`);
        console.log('');
        console.log('🎯 This cart should appear in your dashboard now!');
        console.log('   1. Go to Cart Recovery AI');
        console.log('   2. Select "Fringo-motion"');
        console.log('   3. Set hours to 0.1');
        console.log('   4. Click refresh');
        console.log('   5. You should see the abandoned cart with email!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createManualTestCart();
