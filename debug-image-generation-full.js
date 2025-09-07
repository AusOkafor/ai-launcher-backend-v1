import fetch from 'node-fetch';

const testImageGeneration = async() => {
    try {
        console.log('🔍 Testing image generation API...');

        // Test data
        const testData = {
            originalImageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop&crop=center",
            productData: {
                title: "Sleeveless Dress",
                price: "99.99",
                description: "Elegant sleeveless dress",
                category: "Clothing"
            },
            imageSettings: {
                headline: "Sleeveless",
                cta: "SHOP NOW",
                showPrice: true,
                productPrice: "99.99",
                headlinePosition: { x: 4, y: 4 },
                ctaPosition: { x: 4, y: 85 },
                pricePosition: { x: 85, y: 4 },
                headlineFont: "bold",
                headlineSize: 32,
                headlineColor: "#ffffff",
                ctaFont: "bold",
                ctaSize: 16,
                ctaColor: "#ffffff",
                ctaBackground: "#000000",
                filter: "none",
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
                background: "gradient",
                aspectRatio: "1:1",
                platform: "instagram"
            },
            platform: "instagram",
            count: 1
        };

        console.log('📤 Sending request to API...');
        console.log('Request data:', JSON.stringify(testData, null, 2));

        const response = await fetch('http://localhost:3000/api/images/creative/cmf1hqn3k000313a1miuwelwp/create-ad-creative', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            return;
        }

        const result = await response.json();
        console.log('✅ API Response:', JSON.stringify(result, null, 2));

        if (result.data && result.data.images && result.data.images.length > 0) {
            console.log('🖼️ Generated image URL:', result.data.images[0]);

            // Test if the image URL is accessible
            try {
                const imageResponse = await fetch(result.data.images[0]);
                console.log('🖼️ Image response status:', imageResponse.status);
                console.log('🖼️ Image content type:', imageResponse.headers.get('content-type'));

                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    console.log('🖼️ Image size:', imageBuffer.byteLength, 'bytes');
                }
            } catch (imageError) {
                console.error('❌ Error fetching generated image:', imageError.message);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

testImageGeneration();