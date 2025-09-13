import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { checkout_id, store } = req.query;

            if (!checkout_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Checkout ID is required'
                });
            }

            console.log('🛒 Loading checkout simulator for:', checkout_id);

            // Find the checkout in database
            const checkout = await prisma.cart.findFirst({
                where: {
                    metadata: {
                        path: ['checkoutId'],
                        equals: checkout_id
                    }
                },
                include: {
                    store: true
                }
            });

            if (!checkout) {
                return res.status(404).json({
                    success: false,
                    error: 'Checkout not found'
                });
            }

            // Return checkout data for the simulator page
            return res.status(200).json({
                success: true,
                data: {
                    checkoutId: checkout_id,
                    store: store || checkout.store ? .domain || 'launcherstoretest.myshopify.com',
                    items: checkout.items,
                    subtotal: checkout.subtotal,
                    customerInfo: checkout.metadata ? .customerInfo || {},
                    source: checkout.metadata ? .source || 'whatsapp_simulator'
                }
            });
        }

        if (req.method === 'POST') {
            const { checkout_id, payment_method, customer_details } = req.body;

            if (!checkout_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Checkout ID is required'
                });
            }

            console.log('💳 Processing mock payment for checkout:', checkout_id);

            // Find the checkout
            const checkout = await prisma.cart.findFirst({
                where: {
                    metadata: {
                        path: ['checkoutId'],
                        equals: checkout_id
                    }
                },
                include: {
                    store: true
                }
            });

            if (!checkout) {
                return res.status(404).json({
                    success: false,
                    error: 'Checkout not found'
                });
            }

            // Simulate payment processing
            const paymentSuccess = Math.random() > 0.1; // 90% success rate

            if (paymentSuccess) {
                // Create a mock order
                const orderNumber = `#SIM${Date.now().toString().slice(-6)}`;

                const order = await prisma.order.create({
                    data: {
                        storeId: checkout.storeId,
                        customerId: null,
                        externalId: orderNumber,
                        orderNumber: orderNumber,
                        status: 'CONFIRMED',
                        total: checkout.subtotal,
                        currency: 'USD',
                        items: checkout.items,
                        shippingAddress: customer_details ? .shipping_address || 'Simulated Address',
                        billingAddress: customer_details ? .billing_address || 'Simulated Address',
                        paymentMethod: payment_method || 'Credit Card',
                        metadata: {
                            source: 'checkout_simulator',
                            checkoutId: checkout_id,
                            paymentMethod: payment_method,
                            customerDetails: customer_details,
                            simulated: true
                        }
                    }
                });

                // Mark checkout as completed
                await prisma.cart.update({
                    where: { id: checkout.id },
                    data: { status: 'COMPLETED' }
                });

                console.log('✅ Mock order created:', order.id);

                return res.status(200).json({
                    success: true,
                    data: {
                        orderId: order.id,
                        orderNumber: orderNumber,
                        total: checkout.subtotal,
                        status: 'confirmed',
                        message: 'Payment successful! Order confirmed.',
                        redirectUrl: `https://ai-launcher-backend-v1.vercel.app/api/checkout-simulator/success?order=${orderNumber}`
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Payment failed. Please try again.',
                    data: {
                        status: 'failed',
                        message: 'Payment was declined. Please check your payment details and try again.'
                    }
                });
            }
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Checkout Simulator Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}