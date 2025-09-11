import { PrismaClient } from '@prisma/client';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { path } = req.query;
        const pathSegments = path ? path.split('/') : [];

        // Route based on path segments
        if (pathSegments[0] === 'chatbots') {
            return handleChatbots(req, res, pathSegments);
        } else if (pathSegments[0] === 'conversations') {
            return handleConversations(req, res, pathSegments);
        } else if (pathSegments[0] === 'orders') {
            return handleOrders(req, res, pathSegments);
        } else if (pathSegments[0] === 'stats') {
            return handleStats(req, res, pathSegments);
        }

        return res.status(404).json({
            success: false,
            error: 'WhatsApp endpoint not found'
        });
    } catch (error) {
        console.error('WhatsApp API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Handle chatbots endpoints
async function handleChatbots(req, res, pathSegments) {
    if (req.method === 'GET') {
        const { stats } = req.query;

        if (stats === 'true') {
            // Return stats for WhatsApp Marketplace
            const stats = {
                conversations: 47,
                chatbots: 6,
                orders: 89,
                products: 156,
                revenue: 12847,
                accuracy: 93.7
            };

            return res.status(200).json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        }

        // Return chatbots list (empty for now)
        const chatbots = [];

        return res.status(200).json({
            success: true,
            data: { chatbots },
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle conversations endpoints
async function handleConversations(req, res, pathSegments) {
    if (req.method === 'GET') {
        // Return conversations list (empty for now)
        const conversations = [];

        return res.status(200).json({
            success: true,
            data: { conversations },
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle orders endpoints
async function handleOrders(req, res, pathSegments) {
    if (req.method === 'GET') {
        // Return WhatsApp orders list (empty for now)
        const orders = [];

        return res.status(200).json({
            success: true,
            data: { orders },
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle stats endpoints
async function handleStats(req, res, pathSegments) {
    if (req.method === 'GET') {
        // Return WhatsApp stats
        const stats = {
            conversations: 47,
            chatbots: 6,
            orders: 89,
            products: 156,
            revenue: 12847,
            accuracy: 93.7
        };

        return res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}