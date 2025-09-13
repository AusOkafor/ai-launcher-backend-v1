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
        } else if (pathSegments[0] === 'chat') {
            return handleChat(req, res, pathSegments);
        } else if (pathSegments[0] === 'cart') {
            return handleCart(req, res, pathSegments);
        } else if (pathSegments[0] === 'checkout') {
            return handleCheckout(req, res, pathSegments);
        } else if (pathSegments[0] === 'checkout-simulator') {
            return handleCheckoutSimulator(req, res, pathSegments);
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
        const { source, status, storeId } = req.query;

        // Build where clause
        const where = {};
        if (source === 'whatsapp') {
            // For WhatsApp orders, filter by metadata source field
            where.metadata = {
                path: ['source'],
                equals: 'whatsapp_simulator'
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
                customerId: customer && customer.id || null,
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

// Handle chat endpoints
async function handleChat(req, res, pathSegments) {
    if (req.method === 'POST') {
        const { message, workspaceId } = req.body;

        if (!message || !workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Message and workspaceId are required'
            });
        }

        console.log('🤖 Processing message:', message);

        try {
            // Check if OpenRouter is available
            let intent = 'other';
            try {
                const { detectIntent } = await
                import ('../src/utils/whatsapp/openRouterClient.js');
                intent = await detectIntent(message);
                console.log('🎯 Detected intent:', intent);
            } catch (error) {
                console.log('⚠️ OpenRouter not available, using fallback');
                // Simple rule-based intent detection
                const lowerMessage = message.toLowerCase();
                if (lowerMessage.includes('buy') || lowerMessage.includes('want') || lowerMessage.includes('have') || lowerMessage.includes('search')) {
                    intent = 'product_search';
                } else if (lowerMessage.includes('order') || lowerMessage.includes('status')) {
                    intent = 'order_status';
                } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
                    intent = 'recommendation';
                } else {
                    intent = 'general_question';
                }
            }

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
        } catch (error) {
            console.error('❌ Chat processing error:', error);
            return res.status(200).json({
                success: false,
                data: {
                    intent: 'fallback_needed',
                    response: null
                }
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle cart endpoints
async function handleCart(req, res, pathSegments) {
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
}

// Helper functions for chat processing
async function handleProductSearch(message, workspaceId) {
    try {
        // Extract product details using OpenRouter
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

// Handle checkout endpoints
async function handleCheckout(req, res, pathSegments) {
    if (req.method === 'POST') {
        const { items, customerInfo, storeId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Items array is required'
            });
        }

        console.log('🛒 Creating Shopify checkout for items:', items.length);

        // Get store information
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: {
                shopifyConnection: true
            }
        });

        if (!store || !store.shopifyConnection) {
            return res.status(400).json({
                success: false,
                error: 'Store or Shopify connection not found'
            });
        }

        // Create mock checkout URL for simulator
        // This bypasses the need for real Shopify app installation
        const checkoutId = `checkout_${Date.now()}`;
        // Generate a mock checkout URL that will redirect to our simulator
        const checkoutUrl = `https://ai-launcher-backend-v1.vercel.app/api/whatsapp?path=checkout-simulator/page&checkout_id=${checkoutId}&store=${store.domain}`;

        // Store checkout in database for tracking
        const checkout = await prisma.cart.create({
            data: {
                storeId: store.id,
                customerId: null, // Will be updated when customer completes checkout
                status: 'ACTIVE',
                items: items,
                subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                metadata: {
                    checkoutUrl,
                    checkoutId,
                    source: 'whatsapp_simulator',
                    customerInfo
                }
            }
        });

        console.log('✅ Checkout created:', checkout.id);

        return res.status(200).json({
            success: true,
            data: {
                checkoutUrl,
                checkoutId,
                total: checkout.subtotal,
                items: items.length
            }
        });
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
}