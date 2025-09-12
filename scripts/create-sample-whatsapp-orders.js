import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleWhatsAppOrders() {
    console.log('🛍️ Creating sample WhatsApp orders...');

    try {
        // Get the first store to associate orders with
        const store = await prisma.store.findFirst({
            where: { platform: 'SHOPIFY' }
        });

        if (!store) {
            console.log('❌ No store found. Please sync products first to create a store.');
            return;
        }

        console.log(`📦 Using store: ${store.name} (${store.id})`);

        // Get some products to create orders for
        const products = await prisma.product.findMany({
            take: 5,
            include: {
                variants: true
            }
        });

        if (products.length === 0) {
            console.log('❌ No products found. Please sync products first.');
            return;
        }

        console.log(`📦 Found ${products.length} products to create orders for`);

        // Sample customer data
        const customers = [
            { firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '+1 234 567 8900' },
            { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com', phone: '+1 234 567 8901' },
            { firstName: 'Mike', lastName: 'Davis', email: 'mike.davis@example.com', phone: '+1 234 567 8902' },
            { firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@example.com', phone: '+1 234 567 8903' },
            { firstName: 'Alex', lastName: 'Brown', email: 'alex.brown@example.com', phone: '+1 234 567 8904' }
        ];

        // Create customers first
        const createdCustomers = [];
        for (const customerData of customers) {
            const customer = await prisma.customer.upsert({
                where: {
                    storeId_email: {
                        storeId: store.id,
                        email: customerData.email
                    }
                },
                update: {},
                create: {
                    storeId: store.id,
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    email: customerData.email,
                    phone: customerData.phone
                }
            });
            createdCustomers.push(customer);
        }

        console.log(`👥 Created/updated ${createdCustomers.length} customers`);

        // Create sample orders
        const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        const paymentMethods = ['WhatsApp Pay', 'Credit Card', 'PayPal', 'Bank Transfer'];

        const sampleOrders = [];
        for (let i = 0; i < 10; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
            const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

            // Calculate order total
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
            const total = parseFloat(product.price) * quantity;

            const order = await prisma.order.create({
                data: {
                    storeId: store.id,
                    customerId: customer.id,
                    externalId: `WA${String(Date.now() + i).slice(-6)}`,
                    orderNumber: `#WA${String(i + 1).padStart(3, '0')}`,
                    items: [{
                        name: product.title,
                        quantity: quantity,
                        price: parseFloat(product.price),
                        sku: product.sku,
                        image: product.images && product.images.length > 0 ? product.images[0] : null
                    }],
                    total: total,
                    status: status,
                    metadata: {
                        source: 'whatsapp',
                        paymentMethod: paymentMethod,
                        shippingAddress: `${Math.floor(Math.random() * 9999) + 1} Main St, City, State ${Math.floor(Math.random() * 90000) + 10000}`,
                        notes: `Order placed via WhatsApp chat`
                    }
                }
            });

            sampleOrders.push(order);
            console.log(`✅ Created order: ${order.orderNumber} - ${customer.firstName} ${customer.lastName} - $${total}`);
        }

        console.log(`🎉 Successfully created ${sampleOrders.length} sample WhatsApp orders`);

    } catch (error) {
        console.error('❌ Error creating sample WhatsApp orders:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createSampleWhatsAppOrders();