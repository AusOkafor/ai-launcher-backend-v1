import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create a fresh Prisma client for each request
function createFreshPrismaClient() {
    return new PrismaClient({
        log: ['error']
    })
}

// Helper function to set CORS headers
function setCorsHeaders(req, res) {
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
}

export default async function handler(req, res) {
    // Set CORS headers for serverless catch-all (fallback)
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

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const { pathname, searchParams } = url;
    const path = searchParams.get('path');
    let prismaClient = null

    // --- Dashboard endpoints ---
    if (path === 'dashboard' && req.method === 'GET') {
        setCorsHeaders(req, res);
        return await handleDashboard(req, res, createFreshPrismaClient());
    }
    if (path === 'agent-status' && req.method === 'GET') {
        setCorsHeaders(req, res);
        return await handleAgentStatus(req, res, createFreshPrismaClient());
    }

    try {

        // Handle generate endpoint specifically
        if (pathname.match(/^\/api\/launches\/[^\/]+\/generate$/) && req.method === 'POST') {
            try {
                const launchId = pathname.split('/')[3]
                prismaClient = createFreshPrismaClient()

                // Get the launch
                const launch = await prismaClient.launch.findFirst({
                    where: { id: launchId },
                    include: {
                        product: true
                    }
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

                // Import AI service
                const { aiService } = await
                import ('../src/services/ai.js')
                await aiService.initialize()

                // Import AI launch service
                const { aiLaunchService } = await
                import ('../src/services/aiLaunchService.js')

                // Generate AI content
                const aiResponse = await aiService.generateText(`
Generate engaging social media content for this product:

Product: ${launch.product.title}
Price: $${launch.product.price}
Category: ${launch.product.category}
Brand: ${launch.product.brand}
Description: ${launch.product.description}

Generate:
1. A catchy headline (max 60 characters)
2. Engaging post copy (max 280 characters)
3. 5 relevant hashtags
4. Call-to-action suggestion

Target audience: ${launch.inputs.targetAudience}
Tone: ${launch.inputs.brandTone}
Platform: Instagram

Make it compelling and conversion-focused.
                `, {
                    model: 'mistralai/Mistral-7B-Instruct-v0.1',
                    maxTokens: 500,
                    temperature: 0.7,
                    provider: 'togetherai'
                })

                // Extract content from AI response
                const extractedContent = {
                    headline: aiLaunchService._extractHeadline(aiResponse.text),
                    postCopy: aiLaunchService._extractPostCopy(aiResponse.text),
                    hashtags: aiLaunchService._extractHashtags(aiResponse.text),
                    callToAction: aiLaunchService._extractCallToAction(aiResponse.text),
                    fullResponse: aiResponse.text
                }

                // Update launch with generated content
                const updatedLaunch = await prismaClient.launch.update({
                    where: { id: launchId },
                    data: {
                        status: 'COMPLETED',
                        outputs: {
                            title: `AI-Generated Social Media Launch for ${launch.product.title}`,
                            description: `Social media content for ${launch.product.title}`,
                            content: extractedContent,
                            aiModel: 'mistralai/Mistral-7B-Instruct-v0.1'
                        }
                    },
                    include: {
                        product: true,
                        adCreatives: true
                    }
                })

                return res.status(200).json({
                    success: true,
                    data: {
                        message: 'AI content generated successfully',
                        launchId: launchId,
                        data: {
                            launch: updatedLaunch
                        }
                    }
                })

            } catch (error) {
                console.error('Error generating launch content:', error)
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to generate launch content' }
                })
            }
        }

        // Default response for unmatched routes
        return res.status(404).json({
            success: false,
            error: { message: 'Route not found' }
        })

    } catch (error) {
        console.error('API error:', error)
        return res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                details: error.message
            }
        })
    } finally {
        // Clean up database connection
        if (prismaClient) {
            await prismaClient.$disconnect()
        }
    }
}

// Handle dashboard endpoints
async function handleDashboard(req, res, prisma) {
    try {
        const { start, end } = getDateRange(7);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        // Fetch all dashboard data in parallel
        const [
            // Core metrics
            totalOrders,
            totalRevenue,
            totalProducts,
            totalCustomers,
            todayOrders,
            yesterdayOrders,
            todayRevenue,
            yesterdayRevenue,
            totalChats,
            yesterdayChats,
            activeUsersToday,
            activeUsersYesterday,

            // Recent data
            recentOrders,
            recentLaunches,
            topProducts,

            // Chart data
            dailyOrdersData,
            aiInteractionsData,
            productClicksData,

            // WhatsApp specific data
            whatsappOrders,
            whatsappConversations,
            chatbotAccuracy
        ] = await Promise.all([
            // Core metrics
            prisma.order.count(),
            prisma.order.aggregate({
                _sum: { total: true },
                where: { status: 'CONFIRMED' }
            }),
            prisma.product.count(),
            prisma.order.findMany({
                distinct: ['customer'],
                select: { customer: true }
            }),

            // Today's metrics
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }),
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: yesterdayStart,
                        lte: yesterdayEnd
                    }
                }
            }),
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    },
                    status: 'CONFIRMED'
                }
            }),
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: {
                        gte: yesterdayStart,
                        lte: yesterdayEnd
                    },
                    status: 'CONFIRMED'
                }
            }),

            // AI conversations
            prisma.chatLog.count(),
            prisma.chatLog.count({
                where: {
                    createdAt: {
                        gte: yesterdayStart,
                        lte: yesterdayEnd
                    }
                }
            }),

            // Active users
            prisma.chatLog.findMany({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                },
                distinct: ['sessionId'],
                select: { sessionId: true }
            }),
            prisma.chatLog.findMany({
                where: {
                    createdAt: {
                        gte: yesterdayStart,
                        lte: yesterdayEnd
                    }
                },
                distinct: ['sessionId'],
                select: { sessionId: true }
            }),

            // Recent data
            prisma.order.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    customer: true
                }
            }),
            prisma.launch.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            }),

            // Top products - simplified for now since OrderItem might not exist
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, title: true }
            }),

            // Daily orders chart data - with fallback
            (async() => {
                try {
                    return await prisma.$queryRaw `
                        SELECT 
                            DATE("createdAt") as date,
                            COUNT(*)::integer as count,
                            COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN total ELSE 0 END), 0)::float as revenue
                        FROM "Order"
                        WHERE "createdAt" >= ${start}
                        GROUP BY DATE("createdAt")
                        ORDER BY DATE("createdAt") ASC
                    `;
                } catch (error) {
                    console.error('Error fetching daily orders:', error);
                    return [];
                }
            })(),

            // AI interactions data - with fallback
            (async() => {
                try {
                    return await prisma.$queryRaw `
                        SELECT
                            DATE("createdAt") as date,
                            COUNT(*)::integer as total_interactions,
                            COUNT(DISTINCT "sessionId")::integer as unique_sessions
                        FROM "ChatLog"
                        WHERE "createdAt" >= ${start}
                        GROUP BY DATE("createdAt")
                        ORDER BY DATE("createdAt") ASC
                    `;
                } catch (error) {
                    console.error('Error fetching AI interactions:', error);
                    return [];
                }
            })(),

            // Product clicks data - simplified
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, title: true }
            }),

            // WhatsApp specific data
            prisma.order.count({
                where: {
                    metadata: {
                        path: ['source'],
                        equals: 'whatsapp_simulator'
                    },
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }),
            prisma.chatLog.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }),

            // Calculate chatbot accuracy - with fallback
            (async() => {
                try {
                    return await calculateBotAccuracy(prisma);
                } catch (error) {
                    console.error('Error calculating bot accuracy:', error);
                    return { overallAccuracy: '0.0%' };
                }
            })()
        ]);

        // Calculate percentage changes
        const ordersChange = calculatePercentageChange(todayOrders, yesterdayOrders);
        const revenueChange = calculatePercentageChange(
            todayRevenue._sum.total || 0,
            yesterdayRevenue._sum.total || 0
        );
        const aiConversationsChange = calculatePercentageChange(totalChats, yesterdayChats);
        const activeUsersChange = calculatePercentageChange(activeUsersToday.length, activeUsersYesterday.length);

        // Format chart data
        const salesData = dailyOrdersData.map((item, index) => ({
            name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`,
            sales: Number(item.revenue) || 0,
            recovered: Number(item.count) * 50 || 0 // Estimated recovery amount
        }));

        // Format agent performance data
        const agentPerformance = [
            { name: 'Product Launch', performance: recentLaunches.length > 0 ? 85 : 0 },
            { name: 'Ad Creative', performance: totalProducts > 0 ? 78 : 0 },
            { name: 'Returns Prevention', performance: totalOrders > 0 ? 88 : 0 }
        ];

        // Format risk distribution (static for now, can be made dynamic later)
        const riskDistribution = [
            { name: 'Low Risk', value: 65, color: '#10b981' },
            { name: 'Medium Risk', value: 25, color: '#f59e0b' },
            { name: 'High Risk', value: 10, color: '#ef4444' }
        ];

        // Format top products
        const formattedTopProducts = topProducts.map((product) => ({
            id: product.id,
            name: product.title,
            sales: 0 // Simplified for now
        }));

        // Response data
        const dashboardData = {
            success: true,
            data: {
                metrics: {
                    totalOrders: todayRevenue._sum.total || 0,
                    cartRecoveryRate: activeUsersToday.length,
                    adCreativePerformance: totalProducts > 0 ? 2.8 : 0,
                    returnPrevention: totalOrders > 0 ? 91.5 : 0
                },
                changes: {
                    orders: ordersChange,
                    revenue: revenueChange,
                    aiConversations: aiConversationsChange,
                    activeUsers: activeUsersChange
                },
                salesData,
                agentPerformance,
                riskDistribution,
                recentOrders: recentOrders.map(order => ({
                    id: order.id,
                    customer: order.customer && order.customer.firstName || 'Unknown',
                    amount: order.total,
                    status: order.status,
                    date: order.createdAt,
                    items: [] // Simplified for now
                })),
                recentLaunches: recentLaunches.map(launch => ({
                    id: launch.id,
                    name: launch.name,
                    status: launch.status,
                    createdAt: launch.createdAt,
                    targetDate: launch.targetDate
                })),
                topProducts: formattedTopProducts,
                whatsapp: {
                    orders: whatsappOrders,
                    conversations: whatsappConversations,
                    accuracy: chatbotAccuracy.overallAccuracy ? parseFloat(chatbotAccuracy.overallAccuracy) : 0,
                    chatbots: 6 // Static for now
                },
                summary: {
                    totalProducts,
                    totalCustomers: totalCustomers.length,
                    connectedStores: 1, // Can be made dynamic later
                    totalRevenue: totalRevenue._sum.total || 0
                }
            }
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
}

// Handle agent status endpoints
async function handleAgentStatus(req, res, prisma) {
    try {
        // Get agent status based on recent activity and data
        const [
            recentLaunches,
            recentProducts,
            recentOrders,
            recentChats,
            whatsappActivity
        ] = await Promise.all([
            // Check if there are recent launches (last 24 hours)
            prisma.launch.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                select: { status: true, createdAt: true }
            }),

            // Check if there are recent products
            prisma.product.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                },
                select: { id: true, createdAt: true }
            }),

            // Check if there are recent orders
            prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                select: { status: true, createdAt: true }
            }),

            // Check recent AI chat activity
            prisma.chatLog.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                select: { sessionId: true, createdAt: true }
            }),

            // Check WhatsApp activity
            prisma.order.findMany({
                where: {
                    metadata: {
                        path: ['source'],
                        equals: 'whatsapp_simulator'
                    },
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                select: { status: true, createdAt: true }
            })
        ]);

        // Determine agent status based on activity
        const getAgentStatus = (hasRecentActivity, hasOngoingProcess) => {
            if (hasOngoingProcess) return 'processing';
            if (hasRecentActivity) return 'active';
            return 'idle';
        };

        // Product Launch AI Status
        const productLaunchStatus = getAgentStatus(
            recentLaunches.length > 0,
            recentLaunches.some(launch => launch.status === 'GENERATING' || launch.status === 'COMPLETED')
        );

        // Ad Creative AI Status  
        const adCreativeStatus = getAgentStatus(
            recentProducts.length > 0,
            false // Can be enhanced with actual creative generation status
        );

        // Returns Prevention AI Status
        const returnsPreventionStatus = getAgentStatus(
            recentOrders.length > 0,
            recentOrders.some(order => order.status === 'PENDING' || order.status === 'PROCESSING')
        );

        // Cart Recovery AI Status (based on chat activity)
        const cartRecoveryStatus = getAgentStatus(
            recentChats.length > 0,
            false
        );

        // WhatsApp AI Status
        const whatsappStatus = getAgentStatus(
            whatsappActivity.length > 0,
            whatsappActivity.some(order => order.status === 'PENDING' || order.status === 'PROCESSING')
        );

        const agentStatus = {
            success: true,
            data: {
                agents: [{
                        id: 'product-launch',
                        name: 'Product Launch AI',
                        status: productLaunchStatus,
                        lastActivity: recentLaunches.length > 0 ? recentLaunches[0].createdAt : null,
                        activityCount: recentLaunches.length
                    },
                    {
                        id: 'ad-creative',
                        name: 'Ad Creative AI',
                        status: adCreativeStatus,
                        lastActivity: recentProducts.length > 0 ? recentProducts[0].createdAt : null,
                        activityCount: recentProducts.length
                    },
                    {
                        id: 'returns-prevention',
                        name: 'Returns Prevention AI',
                        status: returnsPreventionStatus,
                        lastActivity: recentOrders.length > 0 ? recentOrders[0].createdAt : null,
                        activityCount: recentOrders.length
                    },
                    {
                        id: 'cart-recovery',
                        name: 'Cart Recovery AI',
                        status: cartRecoveryStatus,
                        lastActivity: recentChats.length > 0 ? recentChats[0].createdAt : null,
                        activityCount: recentChats.length
                    },
                    {
                        id: 'whatsapp',
                        name: 'WhatsApp AI',
                        status: whatsappStatus,
                        lastActivity: whatsappActivity.length > 0 ? whatsappActivity[0].createdAt : null,
                        activityCount: whatsappActivity.length
                    }
                ],
                summary: {
                    totalAgents: 5,
                    activeAgents: [
                        productLaunchStatus,
                        adCreativeStatus,
                        returnsPreventionStatus,
                        cartRecoveryStatus,
                        whatsappStatus
                    ].filter(status => status === 'active' || status === 'processing').length,
                    systemHealth: 'healthy'
                }
            }
        };

        res.status(200).json(agentStatus);

    } catch (error) {
        console.error('Agent status API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent status',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
}

// Helper function to calculate percentage change
function calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

// Helper function to get date range
function getDateRange(days = 7) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
}

// Calculate bot accuracy - simplified version
async function calculateBotAccuracy(prisma) {
    try {
        // Get all chatbots
        const chatbots = await prisma.chatbot.findMany({
            where: { status: 'ACTIVE' }
        });

        if (chatbots.length === 0) {
            return { overallAccuracy: '0.0%' };
        }

        // Calculate average accuracy
        const totalAccuracy = chatbots.reduce((sum, bot) => sum + (bot.accuracy || 0), 0);
        const averageAccuracy = totalAccuracy / chatbots.length;

        return { overallAccuracy: `${averageAccuracy.toFixed(1)}%` };
    } catch (error) {
        console.error('Error calculating bot accuracy:', error);
        return { overallAccuracy: '0.0%' };
    }
}