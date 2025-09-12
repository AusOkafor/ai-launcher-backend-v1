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
        if (req.method === 'GET') {
            // Get cart by sessionId or customerId
            const { sessionId, customerId, storeId } = req.query;

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    error: 'storeId is required'
                });
            }

            const cart = await prisma.cart.findFirst({
                where: {
                    storeId,
                    ...(sessionId && { metadata: { path: ['sessionId'], equals: sessionId } }),
                    ...(customerId && { customerId }),
                    status: 'ACTIVE'
                },
                include: {
                    store: {
                        select: {
                            name: true,
                            domain: true
                        }
                    }
                }
            });

            return res.status(200).json({
                success: true,
                data: { cart: cart || null }
            });

        } else if (req.method === 'POST') {
            // Add item to cart or create new cart
            const {
                storeId,
                sessionId,
                customerId,
                items,
                subtotal
            } = req.body;

            if (!storeId || !items || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    error: 'storeId and items array are required'
                });
            }

            // Find existing cart
            let cart = await prisma.cart.findFirst({
                where: {
                    storeId,
                    ...(sessionId && { metadata: { path: ['sessionId'], equals: sessionId } }),
                    ...(customerId && { customerId }),
                    status: 'ACTIVE'
                }
            });

            if (cart) {
                // Update existing cart
                cart = await prisma.cart.update({
                    where: { id: cart.id },
                    data: {
                        items: items,
                        subtotal: subtotal || 0,
                        updatedAt: new Date()
                    }
                });
            } else {
                // Create new cart
                cart = await prisma.cart.create({
                    data: {
                        storeId,
                        customerId,
                        items: items,
                        subtotal: subtotal || 0,
                        status: 'ACTIVE',
                        metadata: sessionId ? { sessionId } : null
                    }
                });
            }

            return res.status(200).json({
                success: true,
                data: { cart },
                message: 'Cart updated successfully'
            });

        } else if (req.method === 'DELETE') {
            // Clear cart
            const { sessionId, customerId, storeId } = req.body;

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    error: 'storeId is required'
                });
            }

            const cart = await prisma.cart.findFirst({
                where: {
                    storeId,
                    ...(sessionId && { metadata: { path: ['sessionId'], equals: sessionId } }),
                    ...(customerId && { customerId }),
                    status: 'ACTIVE'
                }
            });

            if (cart) {
                await prisma.cart.update({
                    where: { id: cart.id },
                    data: { status: 'ABANDONED' }
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Cart cleared successfully'
            });

        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Cart API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}