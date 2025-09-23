import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateProducts() {
    console.log('🧹 Starting to remove duplicate products...');

    try {
        // Get all products grouped by storeId and title
        const products = await prisma.product.findMany({
            include: {
                variants: true,
                store: true
            },
            orderBy: {
                createdAt: 'asc' // Keep the oldest (first created)
            }
        });

        console.log(`Found ${products.length} total products`);

        // Group products by storeId and title
        const productGroups = {};
        products.forEach(product => {
            const key = `${product.storeId}-${product.title}`;
            if (!productGroups[key]) {
                productGroups[key] = [];
            }
            productGroups[key].push(product);
        });

        // Find duplicates
        const duplicates = [];
        Object.entries(productGroups).forEach(([key, group]) => {
            if (group.length > 1) {
                console.log(`Found ${group.length} duplicates for: ${group[0].title} (Store: ${(group[0].store && group[0].store.name) || 'Unknown'})`);
                duplicates.push(...group.slice(1)); // Keep first, mark rest as duplicates
            }
        });

        console.log(`Found ${duplicates.length} duplicate products to remove`);

        // Remove duplicates
        let removedCount = 0;
        for (const duplicate of duplicates) {
            try {
                // Delete variants first (due to foreign key constraint)
                await prisma.variant.deleteMany({
                    where: { productId: duplicate.id }
                });

                // Delete the duplicate product
                await prisma.product.delete({
                    where: { id: duplicate.id }
                });

                removedCount++;
                console.log(`✅ Removed duplicate: ${duplicate.title} (ID: ${duplicate.id})`);
            } catch (error) {
                console.error(`❌ Failed to remove duplicate ${duplicate.title}:`, error.message);
            }
        }

        console.log(`✅ Successfully removed ${removedCount} duplicate products`);

        // Verify cleanup
        const remainingProducts = await prisma.product.count();
        console.log(`📊 Remaining products: ${remainingProducts}`);

    } catch (error) {
        console.error('❌ Error removing duplicate products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

removeDuplicateProducts();