import { prisma } from './db.js';
import { logger } from './utils/logger.js';

async function main() {
    logger.info('Starting database seeding...');

    try {
        // Create a demo workspace
        const workspace = await prisma.workspace.upsert({
            where: { id: 'demo-workspace' },
            update: {},
            create: {
                id: 'demo-workspace',
                name: 'Demo Workspace',
                slug: 'demo-workspace',
                plan: 'STARTER',
                ownerId: 'demo-user',
            },
        });

        // Create a demo user
        const user = await prisma.user.upsert({
            where: { id: 'demo-user' },
            update: {},
            create: {
                id: 'demo-user',
                email: 'demo@example.com',
                passwordHash: 'demo-hash',
                role: 'ADMIN',
                isActive: true,
            },
        });

        // Create workspace member
        await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace.id,
                    userId: user.id,
                }
            },
            update: {},
            create: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'OWNER',
            },
        });

        // Create a demo store
        const store = await prisma.store.upsert({
            where: { id: 'demo-store' },
            update: {},
            create: {
                id: 'demo-store',
                name: 'Demo Store',
                workspaceId: workspace.id,
                platform: 'SHOPIFY',
                domain: 'demo-store.myshopify.com',
                status: 'ACTIVE',
            },
        });

        // Create a demo product
        const product = await prisma.product.upsert({
            where: { id: 'demo-product' },
            update: {},
            create: {
                id: 'demo-product',
                storeId: store.id,
                title: 'Boho Bangle Bracelet',
                description: 'Handcrafted boho-style bracelet with natural stones and leather accents. Perfect for adding a touch of bohemian charm to any outfit.',
                category: 'Jewelry',
                brand: 'Boho Chic',
                price: 29.99,
                sku: 'BOHO-001',
                images: [
                    'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop'
                ],
                attributes: {
                    color: 'Mixed Natural',
                    size: 'Adjustable',
                    material: 'Leather & Stone',
                },
            },
        });

        // Create additional demo products
        const product2 = await prisma.product.upsert({
            where: { id: 'demo-product-2' },
            update: {},
            create: {
                id: 'demo-product-2',
                storeId: store.id,
                title: 'Wireless Bluetooth Headphones',
                description: 'Premium wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
                category: 'Electronics',
                brand: 'AudioTech',
                price: 149.99,
                sku: 'AUDIO-002',
                images: [
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop'
                ],
                attributes: {
                    color: 'Black',
                    connectivity: 'Bluetooth 5.0',
                    batteryLife: '30 hours',
                },
            },
        });

        const product3 = await prisma.product.upsert({
            where: { id: 'demo-product-3' },
            update: {},
            create: {
                id: 'demo-product-3',
                storeId: store.id,
                title: 'Organic Cotton T-Shirt',
                description: 'Comfortable and sustainable organic cotton t-shirt. Available in multiple colors and sizes.',
                category: 'Clothing',
                brand: 'EcoWear',
                price: 24.99,
                sku: 'ECO-003',
                images: [
                    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop'
                ],
                attributes: {
                    color: 'White',
                    size: 'Medium',
                    material: 'Organic Cotton',
                },
            },
        });

        logger.info('Database seeded successfully!');
        logger.info('Demo data created:');
        logger.info(`- Workspace: ${workspace.name}`);
        logger.info(`- User: ${user.email}`);
        logger.info(`- Store: ${store.domain}`);
        logger.info(`- Products: ${product.title}, ${product2.title}, ${product3.title}`);

    } catch (error) {
        logger.error('Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });