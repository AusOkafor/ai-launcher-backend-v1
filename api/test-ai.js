import { detectIntent, extractProductDetails } from '../src/utils/whatsapp/togetherClient.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'POST') {
            const { message } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            console.log('🤖 Testing AI with message:', message);

            // Test intent detection
            const intent = await detectIntent(message);
            console.log('🎯 Detected intent:', intent);

            // Test product extraction
            const productDetails = await extractProductDetails(message);
            console.log('📦 Extracted product details:', productDetails);

            return res.status(200).json({
                success: true,
                data: {
                    message,
                    intent,
                    productDetails
                }
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    } catch (error) {
        console.error('❌ AI Test Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
