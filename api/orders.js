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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            const { source, status, storeId } = req.query;

            // Build where clause
            const where = {};
            if (source === 'whatsapp') {
                // For WhatsApp orders, we can filter by metadata or other criteria
                where.metadata = {
                    path: ['source'],
                    equals: 'whatsapp'
                };
            }
            if (status && status !== 'all') {
                where.status = status.toUpperCase();
            }
            if (storeId && storeId !== 'all') {
                where.storeId = storeId;
            }

            const orders = await prisma.order.findMany({
                where,
                include: {
                    store: {
                        select: {
                            name: true,
                            platform: true
                        }
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return res.status(200).json({
                success: true,
                data: { orders },
                timestamp: new Date().toISOString()
            });
        }

        if (req.method === 'POST') {
            const {
                storeId,
                customerName,
                phone,
                email,
                items,
                total,
                shippingAddress,
                paymentMethod,
                source = 'whatsapp_simulator',
                cartId // Optional: if converting from cart
            } = req.body;

            if (!storeId || !customerName || !items || !total) {
                return res.status(400).json({
                    success: false,
                    error: 'Store ID, customer name, items, and total are required'
                });
            }

            console.log('🛍️ Creating new order:', { customerName, total, source });

            // Create or find customer
            let customer = null;
            if (email) {
                customer = await prisma.customer.upsert({
                    where: {
                        storeId_email: {
                            storeId: storeId,
                            email: email
                        }
                    },
                    update: {
                        firstName: customerName.split(' ')[0] || customerName,
                        lastName: customerName.split(' ').slice(1).join(' ') || '',
                        phone: phone || null
                    },
                    create: {
                        storeId: storeId,
                        firstName: customerName.split(' ')[0] || customerName,
                        lastName: customerName.split(' ').slice(1).join(' ') || '',
                        email: email,
                        phone: phone || null
                    }
                });
            }

            // If cartId is provided, mark cart as completed
            if (cartId) {
                await prisma.cart.update({
                    where: { id: cartId },
                    data: { status: 'COMPLETED' }
                });
            }

            // Generate order number
            const orderNumber = `#WA${Date.now().toString().slice(-6)}`;

            // Create order
            const order = await prisma.order.create({
                data: {
                    storeId: storeId,
                    customerId: customer ? .id || null,
                    externalId: orderNumber,
                    orderNumber: orderNumber,
                    items: items,
                    total: parseFloat(total),
                    status: 'PENDING',
                    metadata: {
                        source: source,
                        paymentMethod: paymentMethod || 'WhatsApp Pay',
                        shippingAddress: shippingAddress || 'Not provided',
                        customerName: customerName,
                        phone: phone,
                        email: email
                    }
                },
                include: {
                    store: {
                        select: {
                            name: true,
                            platform: true
                        }
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            });

            console.log('✅ Order created:', order.orderNumber);

            return res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    order: order
                }
            });
        }

        if (req.method === 'PATCH') {
            const { orderId, status } = req.body;

            if (!orderId || !status) {
                return res.status(400).json({
                    success: false,
                    error: 'Order ID and status are required'
                });
            }

            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: status.toUpperCase(),
                    updatedAt: new Date()
                },
                include: {
                    store: {
                        select: {
                            name: true,
                            platform: true
                        }
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            });

            return res.status(200).json({
                success: true,
                message: `Order status updated to ${status}`,
                data: {
                    order: updatedOrder
                }
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    } catch (error) {
        console.error('Error in orders API:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
}