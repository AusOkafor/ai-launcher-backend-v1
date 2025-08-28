import { prisma } from './src/db.js';
import { aiService } from './src/services/ai.js';
import { aiLaunchService } from './src/services/aiLaunchService.js';

async function debugAIGeneration() {
    try {
        console.log('🔍 Debugging AI Generation...\n');

        // Step 1: Get the launch
        console.log('1️⃣ Getting launch from database...');
        const launch = await prisma.launch.findFirst({
            where: { id: 'cmeuny9o80001a4zn8sbcxuyg' },
            include: { product: true }
        });

        if (!launch) {
            console.log('❌ Launch not found');
            return;
        }

        console.log('✅ Launch found:', launch.name);
        console.log('Product:', launch.product.title);
        console.log('Status:', launch.status);
        console.log('Outputs:', launch.outputs);

        // Step 2: Initialize AI service
        console.log('\n2️⃣ Initializing AI service...');
        await aiService.initialize();
        console.log('✅ AI service initialized');

        // Step 3: Test direct AI generation
        console.log('\n3️⃣ Testing direct AI generation...');
        const testPrompt = `
Generate engaging social media content for this product:

Product: ${launch.product.title}
Price: $${launch.product.price}
Category: ${launch.product.category}
Brand: ${launch.product.brand}
Description: ${launch.product.description}

Generate:
1. A catchy headline (max 60 characters)
2. Engaging post copy (max 280 characters)
3. 5 relevant hashtags
4. Call-to-action suggestion

Target audience: ${launch.inputs.targetAudience}
Tone: ${launch.inputs.brandTone}
Platform: Instagram

Make it compelling and conversion-focused.
        `;

        console.log('Sending prompt to AI...');
        const aiResponse = await aiService.generateText(testPrompt, {
            model: 'mistralai/Mistral-7B-Instruct-v0.1',
            maxTokens: 500,
            temperature: 0.7,
            provider: 'togetherai'
        });

        console.log('✅ AI response received:');
        console.log(aiResponse.text);

        // Step 4: Test AI launch service
        console.log('\n4️⃣ Testing AI launch service...');
        try {
            const aiLaunch = await aiLaunchService.generateLaunch(
                launch.productId,
                'social_media', {
                    targetAudience: launch.inputs.targetAudience,
                    tone: launch.inputs.brandTone,
                    platform: launch.inputs.platforms && launch.inputs.platforms[0] || 'Instagram'
                }
            );

            console.log('✅ AI launch service response:');
            console.log('Launch ID:', aiLaunch.id);
            console.log('Status:', aiLaunch.status);
            console.log('Outputs:', JSON.stringify(aiLaunch.outputs, null, 2));

        } catch (error) {
            console.log('❌ AI launch service failed:', error.message);
            console.log('Stack trace:', error.stack);
        }

        // Step 5: Test content extraction
        console.log('\n5️⃣ Testing content extraction...');
        const sampleResponse = `
1. Headline: Summer Blossom: Blue Flower Dress for Young Professionals
2. Post copy: Make a statement this summer with our Blue Flower Dress. Perfect for young professionals, this dress is a must-have for any occasion. With its bold blue hue and intricate floral design, you'll turn heads wherever you go.
3. Hashtags: #YourBrand, #SummerDress, #BlueFlower, #YoungProfessionals, #FashionStatement
4. Call-to-action: Shop now and elevate your summer wardrobe!
        `;

        // Test the extraction methods
        const headline = aiLaunchService._extractHeadline(sampleResponse);
        const postCopy = aiLaunchService._extractPostCopy(sampleResponse);
        const hashtags = aiLaunchService._extractHashtags(sampleResponse);
        const callToAction = aiLaunchService._extractCallToAction(sampleResponse);

        console.log('✅ Extracted content:');
        console.log('Headline:', headline);
        console.log('Post Copy:', postCopy);
        console.log('Hashtags:', hashtags);
        console.log('Call to Action:', callToAction);

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

debugAIGeneration();