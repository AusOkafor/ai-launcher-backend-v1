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
        if (pathSegments[0] === 'dashboard') {
            return handleDashboard(req, res, pathSegments);
        }

        if (pathSegments[0] === 'agent-status') {
            return handleAgentStatus(req, res, pathSegments);
        }

        if (pathSegments[0] === 'test-prisma') {
            try {
                const testPrisma = new PrismaClient();
                const testCount = await testPrisma.order.count();
                return res.status(200).json({
                    success: true,
                    data: {
                        prismaDefined: typeof prisma !== 'undefined',
                        prismaType: typeof prisma,
                        nodeEnv: process.env.NODE_ENV,
                        hasGlobalPrisma: typeof global.prisma !== 'undefined',
                        prismaObject: !!prisma,
                        testPrismaCreated: typeof testPrisma !== 'undefined',
                        testCount: testCount
                    }
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create test Prisma client',
                    details: error.message
                });
            }
        }

        // Handle generate endpoint specifically
        if (req.url.match(/^\/api\/launches\/[^\/]+\/generate$/) && req.method === 'POST') {
            return handleGenerateLaunch(req, res);
        }

        return res.status(404).json({
            success: false,
            error: 'Endpoint not found'
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Handle dashboard endpoints
async function handleDashboard(req, res, pathSegments) {
    if (req.method === 'GET') {
        try {
            console.log('🔍 Dashboard: Starting data fetch...');

            // Create Prisma client inside function to avoid scope issues
            const localPrisma = new PrismaClient();
            console.log('🔍 Dashboard: Prisma client created:', typeof localPrisma);

            // Get basic metrics
            const [
                totalOrders,
                totalProducts,
                totalCustomers,
                totalRevenue,
                recentOrders,
                whatsappOrders,
                whatsappConversations
            ] = await Promise.all([
                localPrisma.order.count(),
                localPrisma.product.count(),
                localPrisma.customer.count(),
                localPrisma.order.aggregate({
                    _sum: { total: true },
                    where: { status: 'CONFIRMED' }
                }),
                localPrisma.order.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: {
                        customer: true
                    }
                }),
                localPrisma.order.count({
                    where: {
                        metadata: {
                            path: ['source'],
                            equals: 'whatsapp_simulator'
                        }
                    }
                }),
                localPrisma.chatLog.count()
            ]);

            console.log('✅ Dashboard: Data fetched successfully');

            // Calculate changes (simplified for now)
            const changes = {
                orders: 12,
                revenue: 8,
                aiConversations: 15,
                activeUsers: 5
            };

            // Format response data
            const dashboardData = {
                success: true,
                data: {
                    metrics: {
                        totalOrders: totalRevenue._sum.total || 0,
                        cartRecoveryRate: 85,
                        adCreativePerformance: 78,
                        returnPrevention: 92
                    },
                    changes,
                    salesData: [
                        { name: 'Mon', sales: 1200, recovered: 800 },
                        { name: 'Tue', sales: 1900, recovered: 1200 },
                        { name: 'Wed', sales: 3000, recovered: 1800 },
                        { name: 'Thu', sales: 2800, recovered: 1600 },
                        { name: 'Fri', sales: 1890, recovered: 1100 },
                        { name: 'Sat', sales: 2390, recovered: 1400 },
                        { name: 'Sun', sales: 3490, recovered: 2000 }
                    ],
                    agentPerformance: [
                        { name: 'Product Launch', performance: 85 },
                        { name: 'Ad Creative', performance: 78 },
                        { name: 'Returns Prevention', performance: 88 }
                    ],
                    riskDistribution: [
                        { name: 'Low Risk', value: 65, color: '#10b981' },
                        { name: 'Medium Risk', value: 25, color: '#f59e0b' },
                        { name: 'High Risk', value: 10, color: '#ef4444' }
                    ],
                    recentOrders: recentOrders.map(order => ({
                        id: order.id,
                        customer: order.customer && order.customer.firstName || 'Unknown',
                        amount: order.total,
                        status: order.status,
                        date: order.createdAt,
                        items: []
                    })),
                    recentLaunches: [],
                    topProducts: [],
                    whatsapp: {
                        orders: whatsappOrders,
                        conversations: whatsappConversations,
                        accuracy: 94.2,
                        chatbots: 1
                    },
                    summary: {
                        totalProducts,
                        totalCustomers,
                        connectedStores: 1,
                        totalRevenue: totalRevenue._sum.total || 0
                    }
                },
                timestamp: new Date().toISOString()
            };

            return res.status(200).json(dashboardData);

        } catch (error) {
            console.error('Dashboard API error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard data',
                details: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle agent status endpoints
async function handleAgentStatus(req, res, pathSegments) {
    if (req.method === 'GET') {
        try {
            console.log('🔍 Agent Status: Starting data fetch...');

            // Create Prisma client inside function to avoid scope issues
            const localPrisma = new PrismaClient();
            console.log('🔍 Agent Status: Prisma client created:', typeof localPrisma);

            // Get recent activity data
            const [
                recentLaunches,
                recentProducts,
                recentOrders,
                recentChats
            ] = await Promise.all([
                localPrisma.launch.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { status: true, createdAt: true }
                }),
                localPrisma.product.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { id: true, createdAt: true }
                }),
                localPrisma.order.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { status: true, createdAt: true }
                }),
                localPrisma.chatLog.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { sessionId: true, createdAt: true }
                })
            ]);

            console.log('✅ Agent Status: Data fetched successfully');

            // Determine agent status based on activity
            const getAgentStatus = (hasRecentActivity, hasOngoingProcess) => {
                if (hasOngoingProcess) return 'processing';
                if (hasRecentActivity) return 'active';
                return 'idle';
            };

            const agentStatus = {
                success: true,
                data: {
                    agents: [{
                            id: 'product-launch',
                            name: 'Product Launch AI',
                            status: getAgentStatus(
                                recentLaunches.length > 0,
                                recentLaunches.some(launch => launch.status === 'GENERATING')
                            ),
                            lastActivity: recentLaunches.length > 0 ? recentLaunches[0].createdAt : null,
                            activityCount: recentLaunches.length
                        },
                        {
                            id: 'ad-creative',
                            name: 'Ad Creative AI',
                            status: getAgentStatus(
                                recentProducts.length > 0,
                                false
                            ),
                            lastActivity: recentProducts.length > 0 ? recentProducts[0].createdAt : null,
                            activityCount: recentProducts.length
                        },
                        {
                            id: 'returns-prevention',
                            name: 'Returns Prevention AI',
                            status: getAgentStatus(
                                recentOrders.length > 0,
                                recentOrders.some(order => order.status === 'PENDING')
                            ),
                            lastActivity: recentOrders.length > 0 ? recentOrders[0].createdAt : null,
                            activityCount: recentOrders.length
                        },
                        {
                            id: 'cart-recovery',
                            name: 'Cart Recovery AI',
                            status: getAgentStatus(
                                recentChats.length > 0,
                                false
                            ),
                            lastActivity: recentChats.length > 0 ? recentChats[0].createdAt : null,
                            activityCount: recentChats.length
                        },
                        {
                            id: 'whatsapp',
                            name: 'WhatsApp AI',
                            status: 'active',
                            lastActivity: new Date(),
                            activityCount: recentChats.length
                        }
                    ],
                    summary: {
                        totalAgents: 5,
                        activeAgents: 4,
                        systemHealth: 'healthy'
                    }
                },
                timestamp: new Date().toISOString()
            };

            return res.status(200).json(agentStatus);

        } catch (error) {
            console.error('Agent status API error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch agent status',
                details: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle generate launch endpoint
async function handleGenerateLaunch(req, res) {
    try {
        const launchId = req.url.split('/')[3];

        // Create Prisma client inside function to avoid scope issues
        const localPrisma = new PrismaClient();

        // Get the launch
        const launch = await localPrisma.launch.findFirst({
            where: { id: launchId },
            include: {
                product: true
            }
        });

        if (!launch) {
            return res.status(404).json({
                success: false,
                error: { message: 'Launch not found' }
            });
        }

        // Update status to GENERATING
        await localPrisma.launch.update({
            where: { id: launchId },
            data: { status: 'GENERATING' }
        });

        // Import AI service
        const { aiService } = await
        import ('../src/services/ai.js');
        await aiService.initialize();

        // Import AI launch service
        const { aiLaunchService } = await
        import ('../src/services/aiLaunchService.js');

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
        });

        // Extract content from AI response
        const extractedContent = {
            headline: aiLaunchService._extractHeadline(aiResponse.text),
            postCopy: aiLaunchService._extractPostCopy(aiResponse.text),
            hashtags: aiLaunchService._extractHashtags(aiResponse.text),
            callToAction: aiLaunchService._extractCallToAction(aiResponse.text),
            fullResponse: aiResponse.text
        };

        // Update launch with generated content
        const updatedLaunch = await localPrisma.launch.update({
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
        });

        return res.status(200).json({
            success: true,
            data: {
                message: 'AI content generated successfully',
                launchId: launchId,
                data: {
                    launch: updatedLaunch
                }
            }
        });

    } catch (error) {
        console.error('Error generating launch content:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to generate launch content' }
        });
    }
}