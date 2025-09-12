import { PrismaClient } from '@prisma/client';
import { detectIntent, extractProductDetails } from '../../src/utils/whatsapp/togetherClient.js';

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

export default async function handler(req, res) {
    // Set CORS headers
    const origin = req.headers.origin || '*';
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8081',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'POST') {
            const { message, workspaceId } = req.body;

            if (!message || !workspaceId) {
                return res.status(400).json({
                    success: false,
                    error: 'Message and workspaceId are required'
                });
            }

            console.log('🤖 Processing message:', message);

            // Detect intent using AI
            const intent = await detectIntent(message);
            console.log('🎯 Detected intent:', intent);

            let response = {};

            switch (intent) {
                case 'product_search':
                    response = await handleProductSearch(message, workspaceId);
                    break;
                case 'order_status':
                    response = await handleOrderStatus(message, workspaceId);
                    break;
                case 'recommendation':
                    response = await handleRecommendation(message, workspaceId);
                    break;
                case 'general_question':
                    response = await handleGeneralQuestion(message, workspaceId);
                    break;
                default:
                    response = {
                        type: 'text',
                        content: "I'm here to help you find products and answer questions about our store. What can I help you with today?"
                    };
            }

            return res.status(200).json({
                success: true,
                data: {
                    intent,
                    response
                }
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    } catch (error) {
        console.error('❌ Chat API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

async function handleProductSearch(message, workspaceId) {
    try {
        // Extract product details using AI
        const extracted = await extractProductDetails(message);
        const productName = extracted.productName || message;
        const attributes = extracted.attributes || [];

        console.log('🔍 Searching for product:', productName, 'with attributes:', attributes);

        // Search for products
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: productName, mode: 'insensitive' } },
                    { description: { contains: productName, mode: 'insensitive' } },
                    { category: { contains: productName, mode: 'insensitive' } },
                    { brand: { contains: productName, mode: 'insensitive' } },
                    ...attributes.map(attr => ({ title: { contains: attr, mode: 'insensitive' } })),
                    ...attributes.map(attr => ({ description: { contains: attr, mode: 'insensitive' } }))
                ],
                status: 'ACTIVE',
                whatsappEnabled: true,
                store: {
                    workspaceId: workspaceId
                }
            },
            include: {
                variants: {
                    orderBy: { price: 'asc' }
                },
                store: {
                    select: {
                        name: true,
                        domain: true
                    }
                }
            },
            take: 3
        });

        if (products.length === 0) {
            return {
                type: 'text',
                content: `Sorry, I couldn't find any products matching "${productName}". Try searching for something else or browse our catalog!`
            };
        }

        if (products.length === 1) {
            const product = products[0];
            return {
                type: 'product_card',
                product: {
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    images: product.images,
                    variants: product.variants,
                    store: product.store
                }
            };
        }

        // Multiple products found
        return {
            type: 'product_list',
            products: products.map(product => ({
                id: product.id,
                title: product.title,
                description: product.description,
                price: product.price,
                images: product.images,
                variants: product.variants,
                store: product.store
            }))
        };

    } catch (error) {
        console.error('❌ Product search error:', error);
        return {
            type: 'text',
            content: 'Sorry, I had trouble searching for products. Please try again!'
        };
    }
}

async function handleOrderStatus(message, workspaceId) {
    return {
        type: 'text',
        content: 'To check your order status, please provide your order number or contact our support team.'
    };
}

async function handleRecommendation(message, workspaceId) {
    return {
        type: 'text',
        content: 'I\'d be happy to help you find the perfect product! What are you looking for?'
    };
}

async function handleGeneralQuestion(message, workspaceId) {
    return {
        type: 'text',
        content: 'I\'m here to help you with your shopping needs. You can ask me about products, place orders, or get recommendations!'
    };
}