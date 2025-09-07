// utils/whatsapp/togetherClient.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = 'https://api.together.xyz/v1/chat/completions';

export const sendPromptToTogether = async(prompt, model = 'meta-llama/Llama-2-7b-chat-hf') => {
    try {
        const response = await axios.post(TOGETHER_BASE_URL, {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${TOGETHER_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Together AI API error:', error);
        throw error;
    }
};

export const detectIntent = async(message) => {
    const prompt = `Classify the following message into one of these categories: recommendation, order_status, product_search, general_question, other.

Message: "${message}"

Respond with only the category name.`;

    try {
        const response = await sendPromptToTogether(prompt);
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
        const response = await sendPromptToTogether(prompt);
        return JSON.parse(response);
    } catch (error) {
        console.error('Product extraction error:', error);
        return { productName: '', attributes: [] };
    }
};