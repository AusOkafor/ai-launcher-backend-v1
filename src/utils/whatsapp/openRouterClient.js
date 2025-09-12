// utils/whatsapp/openRouterClient.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free model - Microsoft Phi-3 Mini
const DEFAULT_MODEL = 'microsoft/phi-3-mini-4k-instruct';

export const sendPromptToOpenRouter = async(prompt, model = DEFAULT_MODEL) => {
    try {
        const response = await axios.post(OPENROUTER_BASE_URL, {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ai-launcher-backend-v1.vercel.app', // Optional: for tracking
                'X-Title': 'WhatsApp Chatbot', // Optional: for tracking
            },
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('OpenRouter API error:', error.response ? .data || error.message);
        throw error;
    }
};

export const detectIntent = async(message) => {
    const prompt = `Classify the following message into one of these categories: recommendation, order_status, product_search, general_question, other.

Message: "${message}"

Respond with only the category name.`;

    try {
        const response = await sendPromptToOpenRouter(prompt);
        return response.trim().toLowerCase();
    } catch (error) {
        console.error('Intent detection error:', error);
        return 'other';
    }
};

export const extractProductDetails = async(message) => {
    const prompt = `Extract product name and attributes from this message: "${message}"

Respond in JSON format:
{
  "productName": "extracted product name",
  "attributes": ["color", "size", "style"]
}`;

    try {
        const response = await sendPromptToOpenRouter(prompt);
        return JSON.parse(response);
    } catch (error) {
        console.error('Product extraction error:', error);
        return { productName: '', attributes: [] };
    }
};

export const searchProducts = async(message, products) => {
        const prompt = `Based on this user message: "${message}"

And these available products:
${products.map(p => `- ${p.title} (${p.category}) - $${p.price}`).join('\n')}

Find the most relevant products. Respond with a JSON array of product titles that match the user's request:
["Product 1", "Product 2", "Product 3"]`;

    try {
        const response = await sendPromptToOpenRouter(prompt);
        return JSON.parse(response);
    } catch (error) {
        console.error('Product search error:', error);
        return [];
    }
};