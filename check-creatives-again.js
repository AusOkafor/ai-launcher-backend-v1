import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const checkCreatives = async() => {
    try {
        console.log('🔍 Checking available creatives...');

        const creatives = await prisma.adCreative.findMany({
            include: {
                launch: {
                    include: {
                        product: true
                    }
                }
            },
            take: 5
        });

        console.log(`📊 Found ${creatives.length} creatives:`);

        creatives.forEach((creative, index) => {
            console.log(`\n${index + 1}. Creative ID: ${creative.id}`);
            console.log(`   Launch Name: ${creative.launchName || 'N/A'}`);
            console.log(`   Platform: ${creative.platform || 'N/A'}`);
            console.log(`   Product: ${(creative.launch && creative.launch.product && creative.launch.product.title) || 'N/A'}`);
            console.log(`   Price: $${(creative.launch && creative.launch.product && creative.launch.product.price) || 'N/A'}`);
            console.log(`   Images: ${((creative.launch && creative.launch.product && creative.launch.product.images) ? creative.launch.product.images.length : 0)}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

checkCreatives();