import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function testAdCreativeAPI() {
    try {
        console.log('🎨 Testing Ad Creative API Endpoints...\n');

        // Test 1: Get supported platforms
        console.log('1️⃣ Testing GET /ad-creatives/platforms');
        const platformsResponse = await fetch(`${BASE_URL}/ad-creatives/platforms`);
        const platforms = await platformsResponse.json();
        console.log('✅ Platforms:', Object.keys(platforms.data));
        console.log('Meta features:', platforms.data.meta.features);

        // Test 2: Generate Meta ad creative
        console.log('\n2️⃣ Testing POST /ad-creatives/generate (Meta)');
        const metaCreativeResponse = await fetch(`${BASE_URL}/ad-creatives/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product: {
                    id: 'cmeqsror30007zrgucnesqez1',
                    title: 'Blue Flower Dress',
                    price: '49',
                    category: 'Dress',
                    brand: 'Fashion Udemy',
                    description: 'Professional blue flower dress for young professionals'
                },
                platform: 'meta',
                options: {
                    targetAudience: 'Young professionals aged 25-35',
                    tone: 'Professional and friendly',
                    focus: 'benefits',
                    includeCTA: true,
                    maxLength: 125
                }
            })
        });
        const metaCreative = await metaCreativeResponse.json();
        console.log('✅ Meta Creative Generated:');
        console.log('Headline:', metaCreative.data.creative.headline);
        console.log('Description:', metaCreative.data.creative.description);
        console.log('CTA:', metaCreative.data.creative.cta);

        // Test 3: Generate TikTok ad creative
        console.log('\n3️⃣ Testing POST /ad-creatives/generate (TikTok)');
        const tiktokCreativeResponse = await fetch(`${BASE_URL}/ad-creatives/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product: {
                    id: 'cmeqsror30007zrgucnesqez1',
                    title: 'Blue Flower Dress',
                    price: '49',
                    category: 'Dress',
                    brand: 'Fashion Udemy',
                    description: 'Professional blue flower dress for young professionals'
                },
                platform: 'tiktok',
                options: {
                    targetAudience: 'Young professionals aged 25-35',
                    tone: 'Casual and trendy',
                    focus: 'trends',
                    includeCTA: true,
                    maxLength: 150
                }
            })
        });
        const tiktokCreative = await tiktokCreativeResponse.json();
        console.log('✅ TikTok Creative Generated:');
        console.log('Headline:', tiktokCreative.data.creative.headline);
        console.log('Description:', tiktokCreative.data.creative.description);
        console.log('CTA:', tiktokCreative.data.creative.cta);

        // Test 4: Create A/B test
        console.log('\n4️⃣ Testing POST /ad-creatives/ab-test');
        const abTestResponse = await fetch(`${BASE_URL}/ad-creatives/ab-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                creatives: [{
                        id: 'creative-1',
                        headline: metaCreative.data.creative.headline,
                        description: metaCreative.data.creative.description,
                        cta: metaCreative.data.creative.cta
                    },
                    {
                        id: 'creative-2',
                        headline: tiktokCreative.data.creative.headline,
                        description: tiktokCreative.data.creative.description,
                        cta: tiktokCreative.data.creative.cta
                    }
                ],
                options: {
                    name: 'Blue Flower Dress A/B Test',
                    duration: 7,
                    budget: 500,
                    platform: 'meta'
                }
            })
        });
        const abTest = await abTestResponse.json();
        console.log('✅ A/B Test Created:');
        console.log('Test ID:', abTest.data.testId);
        console.log('Creatives:', abTest.data.creatives);
        console.log('Duration:', abTest.data.duration, 'days');

        // Test 5: Get analytics
        console.log('\n5️⃣ Testing GET /ad-creatives/analytics');
        const analyticsResponse = await fetch(`${BASE_URL}/ad-creatives/analytics?storeId=test-store&platform=meta&days=30`);
        const analytics = await analyticsResponse.json();
        console.log('✅ Analytics Retrieved:');
        console.log('Total Creatives:', analytics.data.totalCreatives);
        console.log('Average CTR:', analytics.data.averageCTR);

        console.log('\n🎉 All Ad Creative API tests completed successfully!');

    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

testAdCreativeAPI();