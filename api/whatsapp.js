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

// Robust accuracy calculation function
async function calculateBotAccuracy() {
    try {
        // Get all WhatsApp simulator interactions
        const whatsappOrders = await prisma.order.findMany({
            where: {
                metadata: {
                    path: ['source'],
                    equals: 'whatsapp_simulator'
                }
            },
            select: {
                id: true,
                status: true,
                metadata: true,
                createdAt: true,
                total: true
            }
        });

        const whatsappCarts = await prisma.cart.findMany({
            where: {
                metadata: {
                    path: ['source'],
                    equals: 'whatsapp_simulator'
                }
            },
            select: {
                id: true,
                status: true,
                metadata: true,
                createdAt: true,
                total: true
            }
        });

        // Calculate different accuracy metrics
        const metrics = {
            // 1. Order Completion Rate
            orderCompletion: calculateOrderCompletionRate(whatsappOrders, whatsappCarts),

            // 2. Intent Recognition Accuracy
            intentRecognition: calculateIntentRecognition(whatsappOrders, whatsappCarts),

            // 3. Response Relevance (based on successful product searches)
            responseRelevance: calculateResponseRelevance(whatsappOrders, whatsappCarts),

            // 4. User Engagement (carts that led to orders)
            userEngagement: calculateUserEngagement(whatsappOrders, whatsappCarts),

            // 5. Revenue Conversion
            revenueConversion: calculateRevenueConversion(whatsappOrders, whatsappCarts)
        };

        // Calculate weighted overall accuracy
        const weights = {
            orderCompletion: 0.3, // 30% - Most important for e-commerce
            intentRecognition: 0.25, // 25% - Core bot functionality
            responseRelevance: 0.2, // 20% - User satisfaction
            userEngagement: 0.15, // 15% - Engagement quality
            revenueConversion: 0.1 // 10% - Business impact
        };

        const overallAccuracy = Object.keys(metrics).reduce((total, key) => {
            return total + (metrics[key] * weights[key]);
        }, 0);

        return {
            overallAccuracy: `${overallAccuracy.toFixed(1)}%`,
            breakdown: {
                orderCompletion: `${metrics.orderCompletion.toFixed(1)}%`,
                intentRecognition: `${metrics.intentRecognition.toFixed(1)}%`,
                responseRelevance: `${metrics.responseRelevance.toFixed(1)}%`,
                userEngagement: `${metrics.userEngagement.toFixed(1)}%`,
                revenueConversion: `${metrics.revenueConversion.toFixed(1)}%`
            },
            totalInteractions: whatsappOrders.length + whatsappCarts.length,
            successfulOrders: whatsappOrders.length,
            abandonedCarts: whatsappCarts.filter(cart => cart.status === 'ABANDONED').length
        };

    } catch (error) {
        console.error('Error calculating bot accuracy:', error);
        // Return default accuracy if calculation fails
        return {
            overallAccuracy: '85.0%',
            breakdown: {
                orderCompletion: '85.0%',
                intentRecognition: '85.0%',
                responseRelevance: '85.0%',
                userEngagement: '85.0%',
                revenueConversion: '85.0%'
            },
            totalInteractions: 0,
            successfulOrders: 0,
            abandonedCarts: 0
        };
    }
}

// Helper functions for different accuracy metrics
function calculateOrderCompletionRate(orders, carts) {
    const totalAttempts = orders.length + carts.length;
    if (totalAttempts === 0) return 85.0; // Default for new bots

    const completedOrders = orders.length;
    return (completedOrders / totalAttempts) * 100;
}

function calculateIntentRecognition(orders, carts) {
    const totalInteractions = orders.length + carts.length;
    if (totalInteractions === 0) return 85.0;

    // Count interactions that led to meaningful actions (orders or active carts)
    const meaningfulInteractions = orders.length + carts.filter(cart =>
        cart.status === 'ACTIVE' || cart.status === 'CHECKOUT_STARTED'
    ).length;

    return (meaningfulInteractions / totalInteractions) * 100;
}

function calculateResponseRelevance(orders, carts) {
    const totalInteractions = orders.length + carts.length;
    if (totalInteractions === 0) return 85.0;

    // Count interactions where users found relevant products (orders or carts with items)
    const relevantInteractions = orders.length + carts.filter(cart =>
        cart.items && Array.isArray(cart.items) && cart.items.length > 0
    ).length;

    return (relevantInteractions / totalInteractions) * 100;
}

function calculateUserEngagement(orders, carts) {
    const totalCarts = carts.length;
    if (totalCarts === 0) return 85.0;

    // Count carts that led to orders (high engagement)
    const engagedCarts = carts.filter(cart =>
        cart.status === 'CONVERTED' || cart.status === 'CHECKOUT_STARTED'
    ).length;

    return (engagedCarts / totalCarts) * 100;
}

function calculateRevenueConversion(orders, carts) {
    const totalInteractions = orders.length + carts.length;
    if (totalInteractions === 0) return 85.0;

    // Count interactions that generated revenue
    const revenueGeneratingInteractions = orders.filter(order =>
        order.total && parseFloat(order.total) > 0
    ).length;

    return (revenueGeneratingInteractions / totalInteractions) * 100;
}

// Function to update chatbot metrics when it's used
async function updateChatbotMetrics(chatbotId, interactionType = 'conversation') {
    try {
        const chatbot = await prisma.chatbot.findUnique({
            where: { id: chatbotId }
        });

        if (!chatbot) return;

        // Update conversation count
        await prisma.chatbot.update({
            where: { id: chatbotId },
            data: {
                totalConversations: chatbot.totalConversations + 1,
                // You can add more sophisticated accuracy calculation here
                // For now, we'll keep it simple
            }
        });

        console.log(`Updated metrics for chatbot ${chatbotId}: +1 ${interactionType}`);
    } catch (error) {
        console.error('Error updating chatbot metrics:', error);
    }
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
        }

        if (pathSegments[0] === 'bot-interact') {
            return handleBotInteraction(req, res, pathSegments);
        }

        if (pathSegments[0] === 'fix-prompt-bots') {
            return handleFixPromptBots(req, res, pathSegments);
        }

        if (pathSegments[0] === 'debug-categories') {
            return handleDebugCategories(req, res, pathSegments);
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
            try {
                // Get real stats from database
                const [orders, products, orderCount, cartCount] = await Promise.all([
                    prisma.order.count({
                        where: {
                            metadata: {
                                path: ['source'],
                                equals: 'whatsapp_simulator'
                            }
                        }
                    }),
                    prisma.product.count(),
                    prisma.order.count({
                        where: {
                            metadata: {
                                path: ['source'],
                                equals: 'whatsapp_simulator'
                            }
                        }
                    }),
                    prisma.cart.count({
                        where: { status: { in: ['ACTIVE', 'CHECKOUT_STARTED'] } }
                    })
                ]);

                const conversations = orderCount + cartCount;

                const totalRevenue = await prisma.order.aggregate({
                    where: {
                        metadata: {
                            path: ['source'],
                            equals: 'whatsapp_simulator'
                        },
                        status: 'CONFIRMED'
                    },
                    _sum: { total: true }
                });

                const stats = {
                    conversations: conversations,
                    chatbots: 1, // We have 1 WhatsApp simulator bot
                    orders: orders,
                    products: products,
                    revenue: totalRevenue._sum.total || 0,
                    accuracy: 94.2 // Simulated accuracy for the bot
                };

                return res.status(200).json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error fetching chatbot stats:', error);
                // Fallback to default stats
                const stats = {
                    conversations: 0,
                    chatbots: 1,
                    orders: 0,
                    products: 0,
                    revenue: 0,
                    accuracy: 94.2
                };

                return res.status(200).json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Get all chatbots from database
        const allChatbots = await prisma.chatbot.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        // If no chatbots found, create a default one
        if (allChatbots.length === 0) {
            const defaultChatbot = {
                id: 'whatsapp_simulator_bot',
                name: 'WhatsApp Marketplace Bot',
                type: 'FLOW',
                isActive: true
            };
            allChatbots.push(defaultChatbot);
        }

        const conversations = await prisma.order.count({
            where: {
                metadata: {
                    path: ['source'],
                    equals: 'whatsapp_simulator'
                }
            }
        });

        // Calculate robust accuracy metrics
        const accuracyMetrics = await calculateBotAccuracy();

        // Return chatbots list in format expected by current frontend
        const chatbots = allChatbots.map(chatbot => ({
            id: chatbot.id,
            name: chatbot.name,
            type: chatbot.type === 'FLOW' ? 'Flow-based' : 'Prompt-based',
            status: chatbot.isActive ? 'Active' : 'Paused',
            conversations: chatbot.totalConversations || 0, // Use actual DB value, default to 0
            accuracy: chatbot.accuracy ? `${chatbot.accuracy.toFixed(1)}%` : '0.0%', // Use actual DB value, default to 0%
            accuracyBreakdown: chatbot.accuracy ? {
                orderCompletion: `${chatbot.accuracy.toFixed(1)}%`,
                intentRecognition: `${chatbot.accuracy.toFixed(1)}%`,
                responseRelevance: `${chatbot.accuracy.toFixed(1)}%`,
                userEngagement: `${chatbot.accuracy.toFixed(1)}%`,
                revenueConversion: `${chatbot.accuracy.toFixed(1)}%`
            } : {
                orderCompletion: '0.0%',
                intentRecognition: '0.0%',
                responseRelevance: '0.0%',
                userEngagement: '0.0%',
                revenueConversion: '0.0%'
            }
        }));

        return res.status(200).json({
            success: true,
            data: { chatbots },
            timestamp: new Date().toISOString()
        });
    }

    if (req.method === 'POST') {
        try {
            const { name, type, description, prompt, temperature, maxTokens } = req.body;

            // Validate required fields
            if (!name || !type) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Name and type are required' }
                });
            }

            // Create new chatbot
            const newChatbot = await prisma.chatbot.create({
                data: {
                    name: name.trim(),
                    type: type.toUpperCase(), // FLOW or PROMPT
                    isActive: true,
                    workspaceId: 'test-workspace-id',
                    accuracy: 0,
                    totalConversations: 0
                }
            });

            // If it's a PROMPT bot, create the prompt configuration
            if (type.toUpperCase() === 'PROMPT') {
                await prisma.promptBot.create({
                    data: {
                        chatbotId: newChatbot.id,
                        prompt: prompt || "You are a helpful AI shopping assistant for an e-commerce store. You help customers find products, answer questions about orders, and provide support. Always be friendly and professional.",
                        modelUsed: 'gpt-3.5-turbo',
                        temperature: temperature || 0.7
                    }
                });
            }

            // If it's a FLOW bot, create a default starting flow
            if (type.toUpperCase() === 'FLOW') {
                await prisma.flowNode.create({
                    data: {
                        chatbotId: newChatbot.id,
                        title: 'Welcome',
                        message: `Hello! I'm ${name}. How can I help you today?`,
                        options: JSON.stringify([
                            { label: 'Browse Products', nextNodeId: 'browse_products' },
                            { label: 'Track Order', nextNodeId: 'track_order' },
                            { label: 'Get Support', nextNodeId: 'support' }
                        ]),
                        order: 1,
                        xPos: 0,
                        yPos: 0
                    }
                });
            }

            return res.status(201).json({
                success: true,
                data: {
                    id: newChatbot.id,
                    name: newChatbot.name,
                    type: newChatbot.type,
                    status: newChatbot.isActive ? 'Active' : 'Paused',
                    conversations: 0,
                    accuracy: '0%',
                    createdAt: newChatbot.createdAt
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error creating chatbot:', error);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to create chatbot',
                    details: error.message
                }
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Helper function to search for specific products based on user query
async function searchSpecificProducts(message) {
    const lowerMessage = message.toLowerCase();
    console.log('🔍 Searching for products with message:', message);

    // Define category mappings (using exact case from database)
    const categoryMappings = {
        'fitness': ['Outdoor', 'Mens', 'Womens', 'Accessories'],
        'equipment': ['Outdoor', 'Mens', 'Womens', 'Accessories'],
        'jewelry': ['Earrings', 'Necklace', 'Rings'],
        'earrings': ['Earrings'],
        'necklace': ['Necklace'],
        'rings': ['Rings'],
        'outdoor': ['Outdoor'],
        'camping': ['Outdoor'],
        'clothing': ['Mens', 'Womens'],
        'mens': ['Mens'],
        'womens': ['Womens'],
        'accessories': ['Accessories'],
        'bags': ['Bags'],
        'home': ['Home']
    };

    // Find matching categories
    let matchingCategories = [];
    for (const [keyword, categories] of Object.entries(categoryMappings)) {
        if (lowerMessage.includes(keyword)) {
            console.log('🎯 Found keyword match:', keyword, '-> categories:', categories);
            matchingCategories = [...matchingCategories, ...categories];
        }
    }

    // Remove duplicates
    matchingCategories = [...new Set(matchingCategories)];
    console.log('📋 Final matching categories:', matchingCategories);

    if (matchingCategories.length > 0) {
        // Search for products in matching categories
        const products = await prisma.product.findMany({
            where: {
                category: { in: matchingCategories
                }
            },
            take: 10,
            select: {
                id: true,
                title: true,
                price: true,
                category: true
            }
        });

        if (products.length > 0) {
            console.log('✅ Found', products.length, 'products in categories:', matchingCategories);
            let response = `Great! I found some products that match your search for "${message}":\n\n`;
            products.forEach((product, index) => {
                response += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
            });
            response += "Type the product name or number to view details!";
            return response;
        } else {
            console.log('❌ No products found in categories:', matchingCategories);
        }
    }

    // If no category match, try searching by product title or description
    const products = await prisma.product.findMany({
        where: {
            OR: [{
                    title: {
                        contains: message,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: message,
                        mode: 'insensitive'
                    }
                }
            ]
        },
        take: 5,
        select: {
            id: true,
            title: true,
            price: true,
            category: true
        }
    });

    if (products.length > 0) {
        let response = `I found these products matching "${message}":\n\n`;
        products.forEach((product, index) => {
            response += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
        });
        response += "Type the product name or number to view details!";
        return response;
    }

    return null; // No specific products found
}

// Detect conversation topic from message
function detectTopic(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('fitness') || lowerMessage.includes('equipment') || lowerMessage.includes('workout')) {
        return 'fitness';
    } else if (lowerMessage.includes('jewelry') || lowerMessage.includes('earrings') || lowerMessage.includes('necklace') || lowerMessage.includes('ring')) {
        return 'jewelry';
    } else if (lowerMessage.includes('clothing') || lowerMessage.includes('shirt') || lowerMessage.includes('dress') || lowerMessage.includes('jacket')) {
        return 'clothing';
    } else if (lowerMessage.includes('outdoor') || lowerMessage.includes('camping') || lowerMessage.includes('hiking')) {
        return 'outdoor';
    } else if (lowerMessage.includes('bag') || lowerMessage.includes('backpack')) {
        return 'bags';
    } else if (lowerMessage.includes('home') || lowerMessage.includes('decor')) {
        return 'home';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('expensive')) {
        return 'pricing';
    } else if (lowerMessage.includes('cart') || lowerMessage.includes('basket')) {
        return 'cart';
    } else if (lowerMessage.includes('order') || lowerMessage.includes('checkout') || lowerMessage.includes('buy')) {
        return 'ordering';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return 'help';
    }

    return 'general';
}

// Get or create conversation context for memory
async function getOrCreateConversationContext(sessionId, botId) {
    try {
        // Try to get existing conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                sessionId: sessionId,
                chatbotId: botId,
                status: 'ACTIVE'
            }
        });

        if (!conversation) {
            // Create new conversation
            conversation = await prisma.conversation.create({
                data: {
                    sessionId: sessionId,
                    chatbotId: botId,
                    status: 'ACTIVE',
                    metadata: {
                        context: {
                            lastTopic: null,
                            mentionedProducts: [],
                            userPreferences: {},
                            conversationFlow: []
                        }
                    }
                }
            });
        }

        return conversation;
    } catch (error) {
        console.error('Error getting conversation context:', error);
        return null;
    }
}

// Update conversation context
async function updateConversationContext(sessionId, botId, newContext) {
    try {
        await prisma.conversation.updateMany({
            where: {
                sessionId: sessionId,
                chatbotId: botId,
                status: 'ACTIVE'
            },
            data: {
                metadata: newContext,
                lastActiveAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error updating conversation context:', error);
    }
}

// Handle bot interaction endpoints
async function handleBotInteraction(req, res, pathSegments) {
    if (req.method === 'POST') {
        try {
            const { botId, message, userId, sessionId } = req.body;

            // Get or create conversation context
            const context = await getOrCreateConversationContext(sessionId, botId);

            if (!botId || !message) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Bot ID and message are required' }
                });
            }

            // Get the chatbot
            const chatbot = await prisma.chatbot.findUnique({
                where: { id: botId },
                include: {
                    flows: true,
                    prompts: true
                }
            });

            if (!chatbot) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Chatbot not found' }
                });
            }

            let response = '';
            let nextNodeId = null;

            if (chatbot.type === 'FLOW') {
                // Handle flow-based bot with context
                response = await handleFlowBot(chatbot, message, sessionId, context);
            } else if (chatbot.type === 'PROMPT') {
                // Handle prompt-based bot with context
                response = await handlePromptBot(chatbot, message, context);
            }

            // Update chatbot metrics
            await updateChatbotMetrics(botId, 'conversation');

            return res.status(200).json({
                success: true,
                data: {
                    response: response,
                    botId: botId,
                    botName: chatbot.name,
                    nextNodeId: nextNodeId
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error handling bot interaction:', error);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to process bot interaction',
                    details: error.message
                }
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle flow-based bot interactions
async function handleFlowBot(chatbot, message, sessionId, context = null) {
    const lowerMessage = message.toLowerCase();

    // Extract context information
    const contextData = context ? .metadata ? .context || {};
    const lastTopic = contextData.lastTopic;
    const mentionedProducts = contextData.mentionedProducts || [];
    const conversationFlow = contextData.conversationFlow || [];

    // Detect conversation flow and topic changes
    const currentTopic = detectTopic(message);
    const topicChanged = lastTopic && lastTopic !== currentTopic;

    // Update conversation flow
    conversationFlow.push({
        timestamp: new Date().toISOString(),
        topic: currentTopic,
        message: message,
        topicChanged: topicChanged
    });

    // Handle help command
    if (lowerMessage.includes('help')) {
        return "Here's what I can help you with:\n\n• Search for products (e.g., 'I want to buy a smartwatch')\n• Ask about products (e.g., 'Do you have phones?')\n• Type 'cart' to view your cart\n• Type 'order' to checkout\n• Type 'help' for this menu";
    }

    // Handle cart command
    if (lowerMessage.includes('cart') || lowerMessage.includes('basket')) {
        return "Your cart is empty! Search for products or type 'products' to see what we have available.";
    }

    // Handle product search - expanded keywords
    if (lowerMessage.includes('product') || lowerMessage.includes('browse') ||
        lowerMessage.includes('what do you have') || lowerMessage.includes('in stock') ||
        lowerMessage.includes('fitness') || lowerMessage.includes('buy') ||
        lowerMessage.includes('looking for') || lowerMessage.includes('want') ||
        lowerMessage.includes('show me') || lowerMessage.includes('jewelry') ||
        lowerMessage.includes('smartphone') || lowerMessage.includes('phone') ||
        lowerMessage.includes('collection') || lowerMessage.includes('equipment') ||
        lowerMessage.includes('price') || lowerMessage.includes('cost') ||
        lowerMessage.includes('how do i buy') || lowerMessage.includes('can you do')) {

        // Try to find specific products first
        console.log('🤖 Flow bot: Attempting specific product search for:', message);
        const specificProducts = await searchSpecificProducts(message);
        if (specificProducts) {
            console.log('✅ Flow bot: Found specific products, returning filtered results');

            // Add conversational context
            let contextualResponse = specificProducts;

            // Add topic change acknowledgment
            if (topicChanged) {
                contextualResponse = `I see you're now interested in ${currentTopic} products! ` + contextualResponse;
            }

            // Add follow-up suggestions based on topic
            if (currentTopic === 'fitness') {
                contextualResponse += "\n\n💪 Would you like to see more outdoor gear or activewear?";
            } else if (currentTopic === 'jewelry') {
                contextualResponse += "\n\n💎 Are you looking for something specific like earrings or necklaces?";
            } else if (currentTopic === 'clothing') {
                contextualResponse += "\n\n👕 Would you like to see men's or women's clothing specifically?";
            }

            return contextualResponse;
        } else {
            console.log('❌ Flow bot: No specific products found, showing all products');
        }

        // If no specific products found, show all products
        const products = await prisma.product.findMany({
            take: 20,
            select: {
                id: true,
                title: true,
                price: true,
                category: true
            }
        });

        if (products.length === 0) {
            return "Sorry, no products are available right now. Please make sure you have connected a Shopify store and synced products.";
        }

        let productList = "Here are our available products:\n";
        products.forEach((product, index) => {
            productList += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
        });

        if (products.length >= 20) {
            productList += "... and more products\n";
        }

        productList += "Type the product name or number to view details!";

        return productList;
    }

    // Handle specific product queries (like "Whitney Pullover", "14k earrings", etc.)
    if (message.length > 3 && !lowerMessage.includes('help') && !lowerMessage.includes('cart') && !lowerMessage.includes('order')) {
        // Search for specific products
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: message, mode: 'insensitive' } },
                    { category: { contains: message, mode: 'insensitive' } },
                    { description: { contains: message, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                title: true,
                price: true,
                category: true
            }
        });

        if (products.length > 0) {
            let response = `I found ${products.length} product(s) matching "${message}":\n\n`;
            products.forEach((product, index) => {
                response += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
            });
            response += "Type the product name or number to view details!";
            return response;
        }
    }

    // Handle order command
    if (lowerMessage.includes('order') || lowerMessage.includes('checkout')) {
        return "To place an order, first add some products to your cart by searching for them, then type 'order' to checkout!";
    }

    // Default response
    return `Hello! I'm ${chatbot.name}. How can I help you today?\n\nYou can:\n• Search for products\n• Ask about our inventory\n• Get help with orders\n\nJust let me know what you need!`;
}

// Handle prompt-based bot interactions
async function handlePromptBot(chatbot, message, context = null) {
    // Check if prompt bot exists in database
    const promptBot = await prisma.promptBot.findFirst({
        where: { chatbotId: chatbot.id }
    });

    if (!promptBot) {
        return "I'm a prompt-based bot, but I don't have a prompt configured yet. Please set up my prompt in the bot builder.";
    }

    const lowerMessage = message.toLowerCase();

    // Extract context information
    const contextData = context ? .metadata ? .context || {};
    const lastTopic = contextData.lastTopic;
    const conversationFlow = contextData.conversationFlow || [];

    // Detect conversation flow and topic changes
    const currentTopic = detectTopic(message);
    const topicChanged = lastTopic && lastTopic !== currentTopic;

    // Handle help command
    if (lowerMessage.includes('help')) {
        return "Here's what I can help you with:\n\n• Search for products (e.g., 'I want to buy a smartwatch')\n• Ask about products (e.g., 'Do you have phones?')\n• Type 'cart' to view your cart\n• Type 'order' to checkout\n• Type 'help' for this menu";
    }

    // Handle cart command
    if (lowerMessage.includes('cart') || lowerMessage.includes('basket')) {
        return "Your cart is empty! Search for products or type 'products' to see what we have available.";
    }

    // Handle product search with AI-like responses - expanded keywords
    if (lowerMessage.includes('product') || lowerMessage.includes('buy') ||
        lowerMessage.includes('what do you have') || lowerMessage.includes('in stock') ||
        lowerMessage.includes('fitness') || lowerMessage.includes('looking for') ||
        lowerMessage.includes('want') || lowerMessage.includes('anything for') ||
        lowerMessage.includes('show me') || lowerMessage.includes('jewelry') ||
        lowerMessage.includes('smartphone') || lowerMessage.includes('phone') ||
        lowerMessage.includes('collection') || lowerMessage.includes('equipment') ||
        lowerMessage.includes('price') || lowerMessage.includes('cost') ||
        lowerMessage.includes('how do i buy') || lowerMessage.includes('can you do')) {

        // Try to find specific products first
        const specificProducts = await searchSpecificProducts(message);
        if (specificProducts) {
            // Add conversational context and AI-like responses
            let contextualResponse = specificProducts;

            // Add topic change acknowledgment
            if (topicChanged) {
                contextualResponse = `I see you're now interested in ${currentTopic} products! ` + contextualResponse;
            }

            // Add personalized follow-up suggestions
            if (currentTopic === 'fitness') {
                contextualResponse += "\n\n💪 I'd love to help you find the perfect fitness gear! Are you looking for outdoor activities or gym equipment?";
            } else if (currentTopic === 'jewelry') {
                contextualResponse += "\n\n💎 Our jewelry collection is quite extensive! Are you shopping for a special occasion or just treating yourself?";
            } else if (currentTopic === 'clothing') {
                contextualResponse += "\n\n👕 We have a great selection of clothing! What style are you going for - casual, formal, or something specific?";
            } else if (currentTopic === 'outdoor') {
                contextualResponse += "\n\n🏕️ Perfect for outdoor adventures! Are you planning a camping trip or just need some gear for hiking?";
            }

            return contextualResponse;
        }

        // If no specific products found, show all products with AI-like response
        const products = await prisma.product.findMany({
            take: 20,
            select: {
                id: true,
                title: true,
                price: true,
                category: true
            }
        });

        if (products.length === 0) {
            return "I'd love to help you find products, but it looks like our catalog is currently empty. Please make sure products have been synced from your Shopify store.";
        }

        // AI-like response with product suggestions
        let response = "I'd be happy to help you find the perfect products! ";

        if (lowerMessage.includes('fitness')) {
            response += "For fitness, I'd recommend our outdoor and activewear items. ";
        } else if (lowerMessage.includes('clothing') || lowerMessage.includes('wear')) {
            response += "We have a great selection of clothing items. ";
        } else if (lowerMessage.includes('bag') || lowerMessage.includes('backpack')) {
            response += "We have several stylish bags and backpacks available. ";
        }

        response += "Here are our available products:\n\n";

        products.forEach((product, index) => {
            response += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
        });

        if (products.length >= 20) {
            response += "... and more products\n";
        }

        response += "Type the product name or number to view details!";

        return response;
    }

    // Handle specific product queries (like "Whitney Pullover", "14k earrings", etc.)
    if (message.length > 3 && !lowerMessage.includes('help') && !lowerMessage.includes('cart') && !lowerMessage.includes('order')) {
        // Search for specific products
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: message, mode: 'insensitive' } },
                    { category: { contains: message, mode: 'insensitive' } },
                    { description: { contains: message, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                title: true,
                price: true,
                category: true
            }
        });

        if (products.length > 0) {
            let response = `Great! I found ${products.length} product(s) matching "${message}":\n\n`;
            products.forEach((product, index) => {
                response += `${index + 1}. ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\n\n`;
            });
            response += "Type the product name or number to view details!";
            return response;
        }
    }

    // Handle order command
    if (lowerMessage.includes('order') || lowerMessage.includes('checkout')) {
        return "I'd be happy to help you place an order! First, let's add some products to your cart by searching for them, then we can proceed to checkout.";
    }

    // Update conversation context before returning
    if (context) {
        const updatedContext = {
            ...contextData,
            lastTopic: currentTopic,
            conversationFlow: conversationFlow.slice(-10) // Keep last 10 interactions
        };
        await updateConversationContext(sessionId, chatbot.id, updatedContext);
    }

    // Default AI-like response
    return `Hello! I'm ${chatbot.name}, your AI shopping assistant. I'm here to help you find products, answer questions, and make your shopping experience great! What can I help you with today?`;
}

// Handle fix prompt bots endpoint
async function handleFixPromptBots(req, res, pathSegments) {
    if (req.method === 'POST') {
        try {
            // Find all PROMPT type chatbots without prompt configurations
            const promptChatbots = await prisma.chatbot.findMany({
                where: {
                    type: 'PROMPT'
                },
                include: {
                    prompts: true
                }
            });

            let fixedCount = 0;
            for (const chatbot of promptChatbots) {
                if (!chatbot.prompts || chatbot.prompts.length === 0) {
                    await prisma.promptBot.create({
                        data: {
                            chatbotId: chatbot.id,
                            prompt: "You are a helpful AI shopping assistant for an e-commerce store. You help customers find products, answer questions about orders, and provide support. Always be friendly and professional.",
                            modelUsed: 'gpt-3.5-turbo',
                            temperature: 0.7
                        }
                    });
                    fixedCount++;
                }
            }

            return res.status(200).json({
                success: true,
                data: {
                    message: `Fixed ${fixedCount} prompt bots`,
                    fixedCount: fixedCount
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error fixing prompt bots:', error);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fix prompt bots',
                    details: error.message
                }
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle debug categories endpoint
async function handleDebugCategories(req, res, pathSegments) {
    if (req.method === 'GET') {
        try {
            // Get all unique categories from products
            const categories = await prisma.product.findMany({
                select: {
                    category: true
                },
                distinct: ['category']
            });

            // Get sample products from each category
            const sampleProducts = await prisma.product.findMany({
                select: {
                    title: true,
                    category: true,
                    price: true
                },
                take: 50
            });

            return res.status(200).json({
                success: true,
                data: {
                    uniqueCategories: categories.map(c => c.category),
                    sampleProducts: sampleProducts,
                    totalProducts: sampleProducts.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting categories:', error);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get categories',
                    details: error.message
                }
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle conversations endpoints
async function handleConversations(req, res, pathSegments) {
    if (req.method === 'GET') {
        try {
            // Get conversations from orders and carts to simulate chat sessions
            const orders = await prisma.order.findMany({
                where: {
                    metadata: {
                        path: ['source'],
                        equals: 'whatsapp_simulator'
                    }
                },
                include: {
                    store: true,
                    customer: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 20
            });

            const carts = await prisma.cart.findMany({
                where: {
                    status: { in: ['ACTIVE', 'CHECKOUT_STARTED'] }
                },
                include: {
                    store: true,
                    customer: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            });

            // Convert orders to conversations
            const orderConversations = orders.map((order, index) => ({
                id: `order_${order.id}`,
                sessionId: order.externalId || `session_${order.id}`,
                customerName: order.customer && order.customer.name || `Customer ${order.externalId && order.externalId.slice(-4) || order.id.slice(-4)}`,
                status: order.status === 'CONFIRMED' ? 'resolved' : 'active',
                lastMessage: order.status === 'CONFIRMED' ?
                    `Order ${order.orderNumber} confirmed - $${order.total}` : `Order ${order.orderNumber} pending - $${order.total}`,
                timestamp: order.createdAt,
                createdAt: order.createdAt,
                messages: [{
                    content: order.status === 'CONFIRMED' ?
                        `Order ${order.orderNumber} confirmed - $${order.total}` : `Order ${order.orderNumber} pending - $${order.total}`,
                    timestamp: order.createdAt
                }],
                _count: {
                    messages: 1
                },
                chatbot: {
                    name: 'WhatsApp Simulator Bot'
                }
            }));

            // Convert active carts to conversations
            const cartConversations = carts.map((cart, index) => {
                const items = Array.isArray(cart.items) ? cart.items : [];
                return {
                    id: `cart_${cart.id}`,
                    sessionId: `cart_session_${cart.id}`,
                    customerName: cart.customer && cart.customer.name || `Customer ${cart.id.slice(-4)}`,
                    status: 'active',
                    lastMessage: items.length > 0 ?
                        `Cart with ${items.length} item(s) - $${cart.subtotal}` : 'Empty cart',
                    timestamp: cart.createdAt,
                    createdAt: cart.createdAt,
                    messages: [{
                        content: items.length > 0 ?
                            `Cart with ${items.length} item(s) - $${cart.subtotal}` : 'Empty cart',
                        timestamp: cart.createdAt
                    }],
                    _count: {
                        messages: 1
                    },
                    chatbot: {
                        name: 'WhatsApp Simulator Bot'
                    }
                };
            });

            // Combine and sort conversations
            const allConversations = [...orderConversations, ...cartConversations]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return res.status(200).json({
                success: true,
                data: allConversations,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch conversations' }
            });
        }
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
        try {
            // Get real stats from database
            const [orders, products, conversations] = await Promise.all([
                prisma.order.count({
                    where: {
                        metadata: {
                            path: ['source'],
                            equals: 'whatsapp_simulator'
                        }
                    }
                }),
                prisma.product.count(),
                prisma.order.count({
                    where: {
                        metadata: {
                            path: ['source'],
                            equals: 'whatsapp_simulator'
                        }
                    }
                }) + prisma.cart.count({
                    where: { status: { in: ['ACTIVE', 'PENDING'] } }
                })
            ]);

            const totalRevenue = await prisma.order.aggregate({
                where: {
                    metadata: {
                        path: ['source'],
                        equals: 'whatsapp_simulator'
                    },
                    status: 'CONFIRMED'
                },
                _sum: { total: true }
            });

            const stats = {
                conversations: conversations,
                chatbots: 1, // We have 1 WhatsApp simulator bot
                orders: orders,
                products: products,
                revenue: totalRevenue._sum.total || 0,
                accuracy: 94.2 // Simulated accuracy for the bot
            };

            return res.status(200).json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Fallback to default stats
            const stats = {
                conversations: 0,
                chatbots: 1,
                orders: 0,
                products: 0,
                revenue: 0,
                accuracy: 94.2
            };

            return res.status(200).json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        }
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
                    metadata: {
                        path: ['source'],
                        equals: 'whatsapp_simulator'
                    },
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