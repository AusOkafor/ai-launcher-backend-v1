import dotenv from 'dotenv';
import { aiService } from './src/services/ai.js';

// Load environment variables
dotenv.config();

async function testAI() {
    try {
        console.log('🧪 Testing AI Service Configuration...\n');

        // Check environment variables
        console.log('📋 Environment Variables:');
        console.log('TOGETHER_API_KEY:', process.env.TOGETHER_API_KEY ? '✅ Set' : '❌ Not set');
        console.log('TOGETHER_BASE_URL:', process.env.TOGETHER_BASE_URL || 'https://api.together.xyz (default)');
        console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
        console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set');
        console.log('');

        // Initialize AI service
        console.log('🔧 Initializing AI Service...');
        await aiService.initialize();
        console.log('✅ AI Service initialized\n');

        // Test simple text generation
        console.log('🤖 Testing Text Generation...');
        const testPrompt = 'Generate a short product description for a blue flower dress. Keep it under 100 words.';

        const result = await aiService.generateText(testPrompt, {
            model: 'mistralai/Mistral-7B-Instruct-v0.1',
            maxTokens: 200,
            temperature: 0.7,
            provider: 'togetherai'
        });

        console.log('✅ Text generation successful!');
        console.log('Provider:', result.provider);
        console.log('Model:', result.model);
        console.log('Generated Text:');
        console.log(result.text);
        console.log('');

        // Test with your product data
        console.log('🛍️ Testing with Product Data...');
        const productPrompt = `
Generate engaging social media content for this product:

Product: Blue Flower Dress
Price: $49
Category: Fashion
Brand: Your Brand
Description: A beautiful blue flower dress perfect for summer occasions.

Generate:
1. A catchy headline (max 60 characters)
2. Engaging post copy (max 280 characters)
3. 5 relevant hashtags
4. Call-to-action suggestion

Target audience: Young professionals
Tone: Professional but friendly
Platform: Instagram

Make it compelling and conversion-focused.
        `;

        const productResult = await aiService.generateText(productPrompt, {
            model: 'mistralai/Mistral-7B-Instruct-v0.1',
            maxTokens: 500,
            temperature: 0.7,
            provider: 'togetherai'
        });

        console.log('✅ Product content generation successful!');
        console.log('Generated Content:');
        console.log(productResult.text);

    } catch (error) {
        console.error('❌ AI Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testAI();