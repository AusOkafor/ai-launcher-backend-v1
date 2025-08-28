import { prisma } from './src/db.js';
import { adCreativeService } from './src/services/adCreativeService.js';

async function testAdCreativeGeneration() {
    try {
        console.log('🎨 Testing AI Ad Creative Generation...\n');

        // Step 1: Get the product from database
        console.log('1️⃣ Getting product from database...');
        const product = await prisma.product.findFirst({
            where: { id: 'cmeqsror30007zrgucnesqez1' }
        });

        if (!product) {
            console.log('❌ Product not found');
            return;
        }

        console.log('✅ Product found:', product.title);
        console.log('Price: $' + product.price);
        console.log('Category:', product.category);
        console.log('Brand:', product.brand);

        // Step 2: Test Meta ad creative generation
        console.log('\n2️⃣ Generating Meta ad creative...');
        const metaCreative = await adCreativeService.generateAdCreative(product, 'meta', {
            targetAudience: 'Young professionals aged 25-35',
            tone: 'Professional and friendly',
            focus: 'benefits',
            includeCTA: true,
            maxLength: 125
        });

        console.log('✅ Meta ad creative generated:');
        console.log('Headline:', metaCreative.creative.headline);
        console.log('Description:', metaCreative.creative.description);
        console.log('CTA:', metaCreative.creative.cta);
        console.log('Keywords:', metaCreative.creative.keywords);
        console.log('Targeting:', metaCreative.creative.targeting);

        // Step 3: Test TikTok ad creative generation
        console.log('\n3️⃣ Generating TikTok ad creative...');
        const tiktokCreative = await adCreativeService.generateAdCreative(product, 'tiktok', {
            targetAudience: 'Young professionals aged 25-35',
            tone: 'Casual and trendy',
            focus: 'trends',
            includeCTA: true,
            maxLength: 150
        });

        console.log('✅ TikTok ad creative generated:');
        console.log('Headline:', tiktokCreative.creative.headline);
        console.log('Description:', tiktokCreative.creative.description);
        console.log('CTA:', tiktokCreative.creative.cta);
        console.log('Keywords:', tiktokCreative.creative.keywords);

        // Step 4: Test Google ad creative generation
        console.log('\n4️⃣ Generating Google ad creative...');
        const googleCreative = await adCreativeService.generateAdCreative(product, 'google', {
            targetAudience: 'Young professionals aged 25-35',
            tone: 'Professional',
            focus: 'features',
            includeCTA: true,
            maxLength: 30
        });

        console.log('✅ Google ad creative generated:');
        console.log('Headline:', googleCreative.creative.headline);
        console.log('Description:', googleCreative.creative.description);
        console.log('CTA:', googleCreative.creative.cta);
        console.log('Keywords:', googleCreative.creative.keywords);

        // Step 5: Test A/B test creation
        console.log('\n5️⃣ Testing A/B test creation...');
        const abTest = await adCreativeService.createABTest([{
                id: 'creative-1',
                headline: metaCreative.creative.headline,
                description: metaCreative.creative.description,
                cta: metaCreative.creative.cta
            },
            {
                id: 'creative-2',
                headline: tiktokCreative.creative.headline,
                description: tiktokCreative.creative.description,
                cta: tiktokCreative.creative.cta
            }
        ], {
            name: 'Blue Flower Dress A/B Test',
            duration: 7,
            budget: 500,
            platform: 'meta'
        });

        console.log('✅ A/B test created:');
        console.log('Test ID:', abTest.testId);
        console.log('Creatives:', abTest.creatives);
        console.log('Duration:', abTest.duration, 'days');

        // Step 6: Test performance tracking
        console.log('\n6️⃣ Testing performance tracking...');
        const performance = await adCreativeService.trackPerformance('test-creative-id', {
            impressions: 1000,
            clicks: 50,
            conversions: 5,
            spend: 100,
            ctr: 0.05,
            cpc: 2.0,
            cpm: 100,
            conversionRate: 0.1,
            platform: 'meta'
        });

        console.log('✅ Performance tracked:');
        console.log('CTR:', performance.metrics.ctr);
        console.log('CPC:', performance.metrics.cpc);
        console.log('Conversion Rate:', performance.metrics.conversionRate);

        console.log('\n🎉 All ad creative tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testAdCreativeGeneration();