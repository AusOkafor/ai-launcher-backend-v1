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
        'http://localhost:8081',
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

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Connection ID is required'
                });
            }

            // First, get the connection to find the associated store
            const connection = await prisma.shopifyConnection.findUnique({
                where: { id },
                include: { store: true }
            });

            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Connection not found'
                });
            }

            const storeId = connection.storeId;

            // If there's an associated store, clean up all related data
            if (storeId) {
                console.log(`🧹 Cleaning up all data for store: ${storeId}`);

                // Delete in order to respect foreign key constraints
                // 1. Delete cart items first (they reference products)
                await prisma.cartItem.deleteMany({
                    where: {
                        cart: { storeId }
                    }
                });

                // 2. Delete carts
                await prisma.cart.deleteMany({
                    where: { storeId }
                });

                // 3. Delete orders
                await prisma.order.deleteMany({
                    where: { storeId }
                });

                // 4. Delete customers
                await prisma.customer.deleteMany({
                    where: { storeId }
                });

                // 5. Delete product variants first (they reference products)
                await prisma.variant.deleteMany({
                    where: {
                        product: { storeId }
                    }
                });

                // 6. Delete products
                await prisma.product.deleteMany({
                    where: { storeId }
                });

                // 7. Delete the store
                await prisma.store.delete({
                    where: { id: storeId }
                });

                console.log(`✅ Successfully cleaned up all data for store: ${storeId}`);
            }

            // Finally, delete the Shopify connection
            await prisma.shopifyConnection.delete({
                where: { id }
            });

            res.json({
                success: true,
                message: 'Connection and all associated data disconnected successfully'
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