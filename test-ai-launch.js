import { prisma } from './src/db.js';
import { aiService } from './src/services/ai.js';
import { aiLaunchService } from './src/services/aiLaunchService.js';

async function testAILaunch() {
    try {
        console.log('🧪 Testing AI Launch System with Proper Initialization...\n');

        // Step 1: Initialize AI Service
        console.log('🔧 Step 1: Initializing AI Service...');
        await aiService.initialize();
        console.log('✅ AI Service initialized\n');

        // Step 2: Get a product
        console.log('🔍 Step 2: Getting product from database...');
        const product = await prisma.product.findFirst({
            include: {
                store: {
                    include: {
                        workspace: true
                    }
                },
                variants: true
            }
        });

        if (!product) {
            console.log('❌ No products found in database');
            return;
        }

        console.log(`✅ Found product: ${product.title} (ID: ${product.id})\n`);

        // Step 3: Test AI Launch Service
        console.log('🚀 Step 3: Testing AI Launch Service...');

        const launch = await aiLaunchService.generateLaunch(
            product.id,
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

        // Step 4: Test different launch types
        console.log('\n🔄 Step 4: Testing different launch types...');

        const launchTypes = ['email_campaign', 'ad_creative'];

        for (const launchType of launchTypes) {
            try {
                console.log(`\nGenerating ${launchType}...`);
                const newLaunch = await aiLaunchService.generateLaunch(
                    product.id,
                    launchType, {
                        targetAudience: 'Young professionals',
                        tone: 'Professional but friendly'
                    }
                );

                console.log(`✅ ${launchType} generated successfully!`);
                console.log('Launch ID:', newLaunch.id);

            } catch (error) {
                console.log(`❌ ${launchType} failed:`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testAILaunch();