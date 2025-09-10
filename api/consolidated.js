import { PrismaClient } from '@prisma/client'
import { Client } from 'pg'

// WhatsApp controllers - inline implementation for Vercel compatibility
// Note: Importing from relative paths causes issues in Vercel serverless functions

// WhatsApp Chatbot controller functions
async function handleWhatsAppChatbots(req, res, method, query) {
    try {
        // Get an existing workspace ID - use the first available workspace
        let workspaceId = query.workspaceId;

        if (!workspaceId) {
            // Find the first existing workspace
            const workspace = await prisma.workspace.findFirst({
                select: { id: true }
            });

            if (!workspace) {
                return res.status(400).json({
                    success: false,
                    error: 'No workspace found. Please provide a workspaceId or create a workspace first.'
                });
            }

            workspaceId = workspace.id;
        }

        switch (method) {
            case 'GET':
                if (query.stats) {
                    // Get chatbot statistics
                    const stats = await prisma.chatbot.groupBy({
                        by: ['type'],
                        where: { workspaceId },
                        _count: { id: true }
                    });
                    return res.json({ success: true, data: stats });
                }

                if (query.id) {
                    // Get specific chatbot
                    const chatbot = await prisma.chatbot.findFirst({
                        where: { id: query.id, workspaceId },
                        include: {
                            prompts: true,
                            flows: true,
                            _count: { select: { conversations: true } }
                        }
                    });

                    if (!chatbot) {
                        return res.status(404).json({ success: false, error: 'Chatbot not found' });
                    }

                    return res.json({ success: true, data: chatbot });
                }

                // Get all chatbots
                const chatbots = await prisma.chatbot.findMany({
                    where: { workspaceId },
                    include: {
                        prompts: true,
                        flows: true,
                        _count: { select: { conversations: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                return res.json({ success: true, data: chatbots });

            case 'POST':
                const { name, type = 'PROMPT' } = req.body;

                if (!name) {
                    return res.status(400).json({ success: false, error: 'Name is required' });
                }

                if (!['PROMPT', 'FLOW'].includes(type)) {
                    return res.status(400).json({ success: false, error: 'Type must be PROMPT or FLOW' });
                }

                const newChatbot = await prisma.chatbot.create({
                    data: {
                        name,
                        type,
                        workspaceId,
                        isActive: true
                    }
                });

                return res.json({ success: true, data: newChatbot });

            case 'PUT':
                const { id, ...updateData } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, error: 'ID is required' });
                }

                const updatedChatbot = await prisma.chatbot.update({
                    where: { id, workspaceId },
                    data: updateData
                });

                return res.json({ success: true, data: updatedChatbot });

            case 'DELETE':
                if (!query.id) {
                    return res.status(400).json({ success: false, error: 'ID is required' });
                }

                await prisma.chatbot.delete({
                    where: { id: query.id, workspaceId }
                });

                return res.json({ success: true, message: 'Chatbot deleted successfully' });

            case 'PATCH':
                if (query.toggle && query.id) {
                    const chatbot = await prisma.chatbot.findFirst({
                        where: { id: query.id, workspaceId }
                    });

                    if (!chatbot) {
                        return res.status(404).json({ success: false, error: 'Chatbot not found' });
                    }

                    const toggledChatbot = await prisma.chatbot.update({
                        where: { id: query.id },
                        data: { isActive: !chatbot.isActive }
                    });

                    return res.json({ success: true, data: toggledChatbot });
                }
                break;

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Chatbot controller error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function handleWhatsAppChat(req, res) {
    try {
        const { message, userId, chatbotId } = req.body;
        let workspaceId = req.query.workspaceId;

        if (!workspaceId) {
            const workspace = await prisma.workspace.findFirst({
                select: { id: true }
            });

            if (!workspace) {
                return res.status(400).json({
                    success: false,
                    error: 'No workspace found. Please provide a workspaceId.'
                });
            }

            workspaceId = workspace.id;
        }

        if (!message || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Message and userId are required'
            });
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                sessionId: userId,
                workspaceId,
                status: 'ACTIVE'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    sessionId: userId,
                    workspaceId,
                    chatbotId: chatbotId || null,
                    status: 'ACTIVE'
                }
            });
        }

        // Save user message
        await prisma.conversationMessage.create({
            data: {
                conversationId: conversation.id,
                workspaceId: workspaceId,
                content: message,
                fromBot: false,
                timestamp: new Date()
            }
        });

        // Generate simple bot response
        const botResponse = `I received your message: "${message}". This is a basic response - full AI chat implementation can be added here.`;

        // Save bot response
        await prisma.conversationMessage.create({
            data: {
                conversationId: conversation.id,
                workspaceId: workspaceId,
                content: botResponse,
                fromBot: true,
                timestamp: new Date()
            }
        });

        return res.json({
            success: true,
            data: {
                conversationId: conversation.id,
                response: botResponse,
                type: 'text'
            }
        });

    } catch (error) {
        console.error('Chat controller error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function handleWhatsAppConversations(req, res, method, query) {
    try {
        let workspaceId = query.workspaceId;

        if (!workspaceId) {
            const workspace = await prisma.workspace.findFirst({
                select: { id: true }
            });

            if (!workspace) {
                return res.status(400).json({
                    success: false,
                    error: 'No workspace found. Please provide a workspaceId.'
                });
            }

            workspaceId = workspace.id;
        }

        switch (method) {
            case 'GET':
                if (query.export) {
                    // Export conversations
                    const conversations = await prisma.conversation.findMany({
                        where: { workspaceId },
                        include: {
                            messages: {
                                orderBy: { timestamp: 'asc' }
                            },
                            chatbot: {
                                select: { name: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    });

                    // Simple CSV-like export data
                    const exportData = conversations.map(conv => ({
                        id: conv.id,
                        sessionId: conv.sessionId,
                        chatbotName: conv.chatbot && conv.chatbot.name || 'Unknown',
                        status: conv.status,
                        messageCount: conv.messages.length,
                        createdAt: conv.createdAt,
                        lastMessageAt: conv.messages[conv.messages.length - 1] && conv.messages[conv.messages.length - 1].timestamp
                    }));

                    return res.json({
                        success: true,
                        data: exportData,
                        format: 'json',
                        count: exportData.length
                    });
                }

                if (query.id) {
                    // Get specific conversation
                    const conversation = await prisma.conversation.findFirst({
                        where: { id: query.id, workspaceId },
                        include: {
                            messages: {
                                orderBy: { timestamp: 'asc' }
                            },
                            chatbot: {
                                select: { id: true, name: true }
                            }
                        }
                    });

                    if (!conversation) {
                        return res.status(404).json({ success: false, error: 'Conversation not found' });
                    }

                    return res.json({ success: true, data: conversation });
                }

                // Get all conversations with pagination
                const { status, search } = query;
                const limit = parseInt(query.limit) || 20;
                const offset = parseInt(query.offset) || 0;

                const where = {
                    workspaceId,
                    ...(status && { status }),
                    ...(search && {
                        OR: [
                            { sessionId: { contains: search, mode: 'insensitive' } },
                            { messages: { some: { content: { contains: search, mode: 'insensitive' } } } }
                        ]
                    })
                };

                const [conversations, total] = await Promise.all([
                    prisma.conversation.findMany({
                        where,
                        include: {
                            chatbot: {
                                select: { id: true, name: true }
                            },
                            messages: {
                                orderBy: { timestamp: 'desc' },
                                take: 1
                            },
                            _count: {
                                select: { messages: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        skip: offset,
                        take: limit
                    }),
                    prisma.conversation.count({ where })
                ]);

                return res.json({
                    success: true,
                    data: conversations,
                    pagination: {
                        total,
                        limit,
                        offset,
                        hasMore: offset + limit < total
                    }
                });

            case 'PATCH':
                if (query.status && query.id) {
                    const { status } = req.body;

                    if (!['ACTIVE', 'CLOSED', 'ARCHIVED'].includes(status)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid status. Must be ACTIVE, CLOSED, or ARCHIVED'
                        });
                    }

                    const updatedConversation = await prisma.conversation.update({
                        where: { id: query.id, workspaceId },
                        data: { status }
                    });

                    return res.json({ success: true, data: updatedConversation });
                }
                break;

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Conversation controller error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

let prisma

function createFreshPrismaClient() {
    return new PrismaClient()
}

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

// CORS helper
function setCorsHeaders(res, origin) {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
}

// Shopify OAuth handlers
async function handleShopifyAuthorize(req, res) {
    const { shop } = req.query

    if (!shop) {
        return res.status(400).json({ error: 'Shop parameter is required' })
    }

    // Clean and validate shop domain format
    let cleanShop = shop.trim();
    console.log(`DEBUG: Original shop parameter: "${shop}"`);
    console.log(`DEBUG: After trim: "${cleanShop}"`);

    // Remove duplicate .myshopify.com if present
    if (cleanShop.includes('.myshopify.com.myshopify.com')) {
        console.log(`DEBUG: Found duplicate .myshopify.com, cleaning...`);
        cleanShop = cleanShop.replace('.myshopify.com.myshopify.com', '.myshopify.com');
        console.log(`DEBUG: After duplicate removal: "${cleanShop}"`);
    }

    // Don't automatically add .myshopify.com - use exactly what user provided
    console.log(`DEBUG: Final domain before validation: "${cleanShop}"`);

    // Validate the cleaned domain - must be a valid Shopify domain
    if (!cleanShop.includes('.myshopify.com')) {
        console.log(`DEBUG: Domain validation failed - no .myshopify.com found`);
        return res.status(400).json({
            success: false,
            error: 'Invalid shop domain. Please enter your complete Shopify store URL (e.g., your-store.myshopify.com)'
        });
    }

    const defaultScopes = 'read_products,write_products,read_orders,write_orders,read_customers,write_customers'
    const scopes = process.env.SHOPIFY_SCOPES || defaultScopes
    const redirectUri = `https://ai-launcher-backend-v1.vercel.app/api/consolidated?path=shopify/oauth/callback`
    const clientId = process.env.SHOPIFY_CLIENT_ID

    const authUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=nonce`

    console.log(`DEBUG: Final auth URL: ${authUrl}`);
    res.redirect(authUrl)
}

async function handleShopifyCallback(req, res) {
    const { code, shop, state } = req.query

    if (!code || !shop) {
        return res.status(400).json({ error: 'Missing required parameters' })
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code
            })
        })

        const tokenData = await tokenResponse.json()

        if (!tokenData.access_token) {
            throw new Error('Failed to get access token')
        }

        // Store connection in database
        await prisma.shopifyConnection.create({
            data: {
                shop,
                accessToken: tokenData.access_token,
                scope: tokenData.scope,
                workspaceId: 'default-workspace'
            }
        })

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?connected=true`)
    } catch (error) {
        console.error('OAuth callback error:', error)
        res.status(500).json({ error: 'Authentication failed' })
    }
}

// Shopify webhook handler
async function handleOrderWebhook(req, res) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        const shopifyOrder = req.body

        if (!shopifyOrder || !shopifyOrder.id) {
            return res.status(400).send('Invalid webhook payload')
        }

        await client.connect()

        // Find store
        const storeResult = await client.query(
            'SELECT id, domain FROM stores WHERE platform = $1 LIMIT 1', ['SHOPIFY']
        )

        if (storeResult.rows.length === 0) {
            return res.status(200).send('OK - No store found')
        }

        const store = storeResult.rows[0]

        // Create/update customer
        let customerId = null
        if (shopifyOrder.customer && shopifyOrder.customer.email) {
            const customerResult = await client.query(
                `INSERT INTO customers (id, "storeId", email, "firstName", "lastName", phone, traits, "createdAt", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
                 ON CONFLICT ("storeId", email) 
                 DO UPDATE SET 
                     "firstName" = EXCLUDED."firstName",
                     "lastName" = EXCLUDED."lastName",
                     phone = EXCLUDED.phone,
                     traits = EXCLUDED.traits,
                     "updatedAt" = NOW()
                 RETURNING id`, [
                    store.id,
                    shopifyOrder.customer.email,
                    shopifyOrder.customer.first_name,
                    shopifyOrder.customer.last_name,
                    shopifyOrder.customer.phone,
                    JSON.stringify(shopifyOrder.customer)
                ]
            )
            customerId = customerResult.rows[0].id
        }

        // Create/update order
        await client.query(
            `INSERT INTO orders (id, "storeId", "customerId", "externalId", "orderNumber", items, total, status, metadata, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT ("storeId", "externalId") 
             DO UPDATE SET 
                 total = EXCLUDED.total,
                 status = EXCLUDED.status,
                 items = EXCLUDED.items,
                 metadata = EXCLUDED.metadata,
                 "updatedAt" = NOW()`, [
                store.id,
                customerId,
                shopifyOrder.id.toString(),
                shopifyOrder.order_number.toString(),
                JSON.stringify(shopifyOrder.line_items),
                parseFloat(shopifyOrder.total_price),
                shopifyOrder.financial_status === 'paid' ? 'CONFIRMED' : 'PENDING',
                JSON.stringify({
                    shopifyOrderId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    subtotal: shopifyOrder.subtotal_price,
                    currency: shopifyOrder.currency,
                    fullOrder: shopifyOrder
                })
            ]
        )

        res.status(200).send('OK - Order saved')
    } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).send('Error')
    } finally {
        await client.end()
    }
}

export default async function handler(req, res) {
    try {
        console.log('=== API Handler Start ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Query:', req.query);
        console.log('Headers:', req.headers);

        const origin = req.headers.origin || '*'
        setCorsHeaders(res, origin)

        if (req.method === 'OPTIONS') {
            console.log('OPTIONS request - returning 200');
            return res.status(200).end()
        }

        const { path } = req.query
        const pathSegments = path ? path.split('/') : []

        console.log('Parsed path segments:', pathSegments);

        // Health check endpoint
        if (!pathSegments[0] || pathSegments[0] === 'health') {
            console.log('Health check endpoint hit');
            return res.status(200).json({
                success: true,
                message: 'API is running',
                timestamp: new Date().toISOString()
            });
        }
        // Route based on path segments
        console.log('Routing to:', pathSegments[0]);

        switch (pathSegments[0]) {
            case 'workspace':
                console.log('Workspace endpoint hit');
                try {
                    if (req.method === 'POST') {
                        console.log('Creating workspace...');
                        const { name = 'Default Workspace' } = req.body || {};

                        // Create a system user first if needed
                        let systemUser = await prisma.user.findFirst({
                            where: { email: 'system@example.com' }
                        });

                        if (!systemUser) {
                            systemUser = await prisma.user.create({
                                data: {
                                    email: 'system@example.com',
                                    passwordHash: 'system',
                                    firstName: 'System',
                                    lastName: 'User',
                                    role: 'ADMIN'
                                }
                            });
                        }

                        const workspace = await prisma.workspace.create({
                            data: {
                                name: name,
                                slug: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                                ownerId: systemUser.id,
                                plan: 'STARTER',
                                status: 'ACTIVE'
                            }
                        });

                        console.log('Workspace created:', workspace.id);
                        return res.status(200).json({
                            success: true,
                            data: workspace,
                            message: 'Workspace created successfully'
                        });
                    }

                    if (req.method === 'GET') {
                        console.log('Getting workspaces...');
                        const workspaces = await prisma.workspace.findMany({
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                plan: true,
                                status: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' }
                        });

                        return res.status(200).json({
                            success: true,
                            data: workspaces,
                            count: workspaces.length
                        });
                    }
                } catch (error) {
                    console.error('Workspace endpoint error:', error);
                    return res.status(500).json({
                        success: false,
                        error: `Workspace error: ${error.message}`
                    });
                }
                break
            case 'products':
                console.log('Products endpoint hit');
                try {
                    if (req.method === 'GET') {
                        console.log('Getting products...');
                        const products = await prisma.product.findMany({
                            include: {
                                store: {
                                    select: {
                                        name: true,
                                        platform: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        });
                        console.log('Products found:', products.length);
                        return res.status(200).json({
                            success: true,
                            data: { products },
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Products endpoint error:', error);
                    return res.status(500).json({
                        success: false,
                        error: `Products error: ${error.message}`
                    });
                }
                break

            case 'launches':
                if (req.method === 'GET') {
                    const launches = await prisma.launch.findMany({
                        orderBy: { createdAt: 'desc' }
                    })
                    return res.status(200).json({
                        success: true,
                        data: { launches },
                        timestamp: new Date().toISOString()
                    })
                }

                // Handle generate endpoint
                if (pathSegments[2] === 'generate' && req.method === 'POST') {
                    const launchId = pathSegments[1]
                    const prismaClient = createFreshPrismaClient()

                    const launch = await prismaClient.launch.findFirst({
                        where: { id: launchId },
                        include: { product: true }
                    })

                    if (!launch) {
                        return res.status(404).json({
                            success: false,
                            error: { message: 'Launch not found' }
                        })
                    }

                    // Update status to GENERATING
                    await prismaClient.launch.update({
                        where: { id: launchId },
                        data: { status: 'GENERATING' }
                    })

                    return res.status(200).json({
                        success: true,
                        message: 'Generation started',
                        data: { launch }
                    })
                }
                break

            case 'shopify':
                if (pathSegments[1] === 'connections') {
                    if (req.method === 'GET') {
                        const workspaceId = req.query.workspaceId || 'test-workspace-id'
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
                        })
                        return res.json({ success: true, connections })
                    }
                    if (req.method === 'DELETE') {
                        const { id } = req.query
                        await prisma.shopifyConnection.delete({ where: { id } })
                        return res.json({ success: true, message: 'Connection disconnected' })
                    }
                }
                if (pathSegments[1] === 'oauth') {
                    if (pathSegments[2] === 'authorize') {
                        return handleShopifyAuthorize(req, res)
                    }
                    if (pathSegments[2] === 'callback') {
                        return handleShopifyCallback(req, res)
                    }
                }
                if (pathSegments[1] === 'webhooks' && pathSegments[2] === 'orders' && pathSegments[3] === 'create') {
                    return handleOrderWebhook(req, res)
                }
                break

            case 'whatsapp':
                console.log('WhatsApp endpoint hit, subpath:', pathSegments[1]);
                try {
                    // WhatsApp routes
                    if (pathSegments[1] === 'chatbots') {
                        console.log('Calling handleWhatsAppChatbots');
                        return await handleWhatsAppChatbots(req, res, req.method, req.query);
                    } else if (pathSegments[1] === 'chat') {
                        if (req.method === 'POST') {
                            console.log('Calling handleWhatsAppChat');
                            return await handleWhatsAppChat(req, res);
                        }
                    } else if (pathSegments[1] === 'conversations') {
                        console.log('Calling handleWhatsAppConversations');
                        return await handleWhatsAppConversations(req, res, req.method, req.query);
                    }

                    console.log('No matching WhatsApp subpath found');
                    return res.status(404).json({
                        success: false,
                        error: 'WhatsApp endpoint not found'
                    });
                } catch (error) {
                    console.error('WhatsApp endpoint error:', error);
                    return res.status(500).json({
                        success: false,
                        error: `WhatsApp error: ${error.message}`
                    });
                }
                break

            default:
                console.log('Unknown endpoint:', pathSegments[0]);
                return res.status(404).json({
                    success: false,
                    error: 'Endpoint not found',
                    path: pathSegments
                });
        }

        console.log('No route matched');
        return res.status(404).json({
            success: false,
            error: 'No route matched',
            path: pathSegments
        });

    } catch (error) {
        console.error('=== API Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request details:', {
            method: req.method,
            url: req.url,
            query: req.query,
            body: req.body
        });

        return res.status(500).json({
            success: false,
            error: `Internal server error: ${error.message}`,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}