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
            const {
                cartId,
                customerInfo,
                paymentMethod = 'whatsapp_checkout',
                source = 'whatsapp_simulator'
            } = req.body;

            if (!cartId || !customerInfo) {
                return res.status(400).json({
                    success: false,
                    error: 'cartId and customerInfo are required'
                });
            }

            console.log('🛒 Converting cart to order:', { cartId, customerInfo });

            // Get the cart
            const cart = await prisma.cart.findUnique({
                where: { id: cartId },
                include: {
                    store: {
                        select: {
                            name: true,
                            domain: true
                        }
                    }
                }
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    error: 'Cart not found'
                });
            }

            if (cart.status !== 'ACTIVE') {
                return res.status(400).json({
                    success: false,
                    error: 'Cart is not active'
                });
            }

            // Create or find customer
            let customer = null;
            if (customerInfo.email) {
                customer = await prisma.customer.upsert({
                    where: {
                        storeId_email: {
                            storeId: cart.storeId,
                            email: customerInfo.email
                        }
                    },
                    update: {
                        firstName: customerInfo.name.split(' ')[0] || customerInfo.name,
                        lastName: customerInfo.name.split(' ').slice(1).join(' ') || '',
                        phone: customerInfo.phone || null
                    },
                    create: {
                        storeId: cart.storeId,
                        firstName: customerInfo.name.split(' ')[0] || customerInfo.name,
                        lastName: customerInfo.name.split(' ').slice(1).join(' ') || '',
                        email: customerInfo.email,
                        phone: customerInfo.phone || null
                    }
                });
            }

            // Generate order number
            const orderNumber = `#WA${Date.now().toString().slice(-6)}`;

            // Create order from cart
            const order = await prisma.order.create({
                data: {
                    storeId: cart.storeId,
                    customerId: customer ? .id || null,
                    externalId: orderNumber,
                    orderNumber: orderNumber,
                    items: cart.items,
                    total: cart.subtotal,
                    status: 'PENDING',
                    metadata: {
                        source: source,
                        paymentMethod: paymentMethod,
                        customerInfo: customerInfo,
                        cartId: cartId,
                        convertedAt: new Date().toISOString()
                    }
                }
            });

            // Mark cart as completed
            await prisma.cart.update({
                where: { id: cartId },
                data: {
                    status: 'COMPLETED',
                    metadata: {
                        ...cart.metadata,
                        completedAt: new Date().toISOString(),
                        orderId: order.id
                    }
                }
            });

            console.log('✅ Order created successfully:', order.id);

            return res.status(201).json({
                success: true,
                data: {
                    order: {
                        id: order.id,
                        orderNumber: order.orderNumber,
                        total: order.total,
                        status: order.status,
                        items: order.items,
                        customer: customer,
                        store: cart.store
                    }
                },
                message: 'Order created successfully from cart'
            });

        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('❌ Cart-to-Order conversion error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}