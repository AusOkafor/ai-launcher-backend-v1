// Standalone Shopify connections function
import { PrismaClient } from '@prisma/client';

let prisma

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

export default async function handler(req, res) {
    // Set CORS headers (allow local dev frontends and production hosts)
    const origin = req.headers.origin || '*'
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ]
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method === 'GET') {
        try {
            const workspaceId = req.query.workspaceId || 'test-workspace-id';

            const connections = await prisma.shopifyConnection.findMany({
                where: { workspaceId },
                select: {
                    id: true,
                    shop: true,
                    shopName: true,
                    email: true,
                    country: true,
                    currency: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            res.json({
                success: true,
                connections
            });
        } catch (error) {
            console.error('Error getting connections:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;

            await prisma.shopifyConnection.delete({
                where: { id }
            });

            res.json({
                success: true,
                message: 'Connection disconnected successfully'
            });
        } catch (error) {
            console.error('Error disconnecting connection:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}