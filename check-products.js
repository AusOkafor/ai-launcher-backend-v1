import { prisma } from './src/db.js';

async function checkProducts() {
    try {
        console.log('🔍 Checking products in database...\n');

        // Get all products
        const products = await prisma.product.findMany({
            include: {
                store: {
                    include: {
                        workspace: true
                    }
                },
                variants: true
            },
            take: 5 // Limit to first 5 products
        });

        if (products.length === 0) {
            console.log('❌ No products found in database');
            console.log('Make sure you have synced products from Shopify');
            return;
        }

        console.log(`✅ Found ${products.length} products:\n`);

        products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.title}`);
            console.log(`   ID: ${product.id}`);
            console.log(`   Price: $${product.price}`);
            console.log(`   Store: ${product.store.name}`);
            console.log(`   Workspace: ${product.store.workspace.name}`);
            console.log(`   Variants: ${product.variants.length}`);
            console.log('');
        });

        // Test AI launch with first product
        console.log('🧪 Testing AI launch system...\n');

        const testProduct = products[0];
        console.log(`Using product: ${testProduct.title} (ID: ${testProduct.id})`);

        // Test the AI launch service
        const { aiLaunchService } = await
        import ('./src/services/aiLaunchService.js');

        try {
            const launch = await aiLaunchService.generateLaunch(
                testProduct.id,
                'social_media', {
                    targetAudience: 'Young professionals',
                    tone: 'Professional but friendly',
                    platform: 'Instagram'
                }
            );

            console.log('✅ AI Launch generated successfully!');
            console.log('Launch ID:', launch.id);
            console.log('Launch Name:', launch.name);
            console.log('Status:', launch.status);

            if (launch.outputs && launch.outputs.content) {
                console.log('\n📝 Generated Content:');
                console.log('Headline:', launch.outputs.content.headline);
                console.log('Post Copy:', launch.outputs.content.postCopy);
                console.log('Hashtags:', launch.outputs.content.hashtags);
                console.log('Call to Action:', launch.outputs.content.callToAction);
            }

        } catch (error) {
            console.log('❌ AI Launch generation failed:', error.message);
            console.log('This might be due to AI service configuration');
        }

    } catch (error) {
        console.error('❌ Error checking products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProducts();