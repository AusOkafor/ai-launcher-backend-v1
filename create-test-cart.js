import { prisma } from './src/db.js';

async function createTestCart() {
    try {
        console.log('Creating test abandoned cart...');

        // Get specific shopify connection for testing
        const connection = await prisma.shopifyConnection.findFirst({
            where: { id: 'cmf3d0sr200022hpf1yfhb0hv' },
            include: { store: true }
        });

        if (!connection) {
            console.log('Connection not found, checking all connections...');
            const allConnections = await prisma.shopifyConnection.findMany({
                select: { id: true, shop: true, shopName: true }
            });
            console.log('Available connections:');
            allConnections.forEach(c => console.log(`- ${c.id}: ${c.shopName || c.shop}`));
            return;
        }

        console.log(`Using connection: ${connection.shopName || connection.shop} (${connection.id})`);

        // Get the store ID (either from connection.storeId or create/find store)
        let storeId = connection.storeId;
        if (!storeId && connection.store) {
            storeId = connection.store.id;
        }
        if (!storeId) {
            console.log('No store linked to this connection');
            return;
        }

        // Find or create test customer
        let customer = await prisma.customer.findFirst({
            where: {
                storeId: storeId,
                email: 'test.customer@example.com'
            }
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    storeId: storeId,
                    email: 'test.customer@example.com',
                    phone: '+1234567890',
                    firstName: 'Test',
                    lastName: 'Customer',
                    country: 'US'
                }
            });
        }

        // Create test cart
        const cart = await prisma.cart.create({
            data: {
                storeId: storeId,
                customerId: customer.id,
                items: JSON.stringify([{
                    id: 'test-item-1',
                    title: 'Test Product',
                    price: 29.99,
                    quantity: 1,
                    sku: 'TEST-001'
                }]),
                subtotal: 29.99,
                status: 'ABANDONED',
                createdAt: new Date(Date.now() - (7 * 60 * 1000)) // 7 minutes ago
            }
        });

        console.log('✅ Test cart created successfully!');
        console.log(`Cart ID: ${cart.id}`);
        console.log(`Customer: ${customer.email}`);
        console.log(`Store: ${connection.shopName || connection.shop}`);
        console.log('This cart should now appear as abandoned in your dashboard.');

    } catch (error) {
        console.error('Error creating test cart:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestCart();