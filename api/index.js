import { PrismaClient } from '@prisma/client'

// Simple Prisma client for serverless - avoid connection pooling issues
const prisma = new PrismaClient({
    log: ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
})

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`)

    try {
        // Health check endpoint
        if (pathname === '/api/health' && req.method === 'GET') {
            try {
                await prisma.$queryRaw `SELECT 1`
                return res.status(200).json({
                    success: true,
                    status: 'healthy',
                    database: 'connected',
                    message: 'API is working with real database'
                })
            } catch (dbError) {
                return res.status(503).json({
                    success: false,
                    status: 'unhealthy',
                    database: 'disconnected',
                    error: dbError.message
                })
            }
        }

        // Handle products endpoint
        if (pathname === '/api/products' && req.method === 'GET') {
            try {
                const products = await prisma.product.findMany({
                    include: {
                        store: {
                            select: {
                                name: true,
                                platform: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })

                return res.status(200).json({
                    success: true,
                    data: { products }
                })
            } catch (error) {
                console.error('Error fetching products:', error)
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch products' }
                })
            }
        }

        // Handle launches endpoint
        if (pathname === '/api/launches') {
            if (req.method === 'GET') {
                try {
                    const launches = await prisma.launch.findMany({
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    title: true,
                                    images: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })

                    return res.status(200).json({
                        success: true,
                        data: { launches }
                    })
                } catch (error) {
                    console.error('Error fetching launches:', error)
                    return res.status(500).json({
                        success: false,
                        error: { message: 'Failed to fetch launches' }
                    })
                }
            }

            if (req.method === 'POST') {
                try {
                    const { productId, brandTone, targetAudience, budget, platforms, additionalNotes } = req.body

                    // Get or create a default workspace
                    let workspace = await prisma.workspace.findFirst({
                        where: { slug: 'default-workspace' }
                    })

                    if (!workspace) {
                        workspace = await prisma.workspace.create({
                            data: {
                                name: 'Default Workspace',
                                slug: 'default-workspace',
                                ownerId: 'default-user'
                            }
                        })
                    }

                    const newLaunch = await prisma.launch.create({
                        data: {
                            workspaceId: workspace.id,
                            productId: productId || null,
                            name: `Launch for ${productId || 'Product'}`,
                            status: 'DRAFT',
                            inputs: {
                                productId,
                                brandTone,
                                targetAudience,
                                budget,
                                platforms,
                                additionalNotes
                            }
                        },
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    title: true,
                                    images: true
                                }
                            }
                        }
                    })

                    return res.status(201).json({
                        success: true,
                        data: { launch: newLaunch }
                    })
                } catch (error) {
                    console.error('Error creating launch:', error)
                    return res.status(500).json({
                        success: false,
                        error: { message: 'Failed to create launch' }
                    })
                }
            }
        }

        // Handle launch generation endpoint
        if (pathname.startsWith('/api/launches/') && pathname.includes('/generate')) {
            if (req.method === 'POST') {
                try {
                    const launchId = pathname.split('/')[3] // Extract launch ID from /api/launches/{id}/generate

                    // Get the launch
                    const launch = await prisma.launch.findUnique({
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
                    await prisma.launch.update({
                        where: { id: launchId },
                        data: { status: 'GENERATING' }
                    })

                    // Generate AI content (simulated for now)
                    const generatedContent = {
                        title: `AI-Generated Launch for ${launch.product?.title || 'Product'}`,
                        description: `Social media content for ${launch.product?.title || 'Product'}`,
                        content: {
                            headline: `${launch.inputs.brandTone} ${launch.inputs.targetAudience} Alert!`,
                            postCopy: `Check out this amazing ${launch.inputs.brandTone.toLowerCase()} product perfect for ${launch.inputs.targetAudience.toLowerCase()}!`,
                            hashtags: ['#amazing', '#product', '#launch', `#${launch.inputs.brandTone.toLowerCase()}`],
                            callToAction: 'Shop Now!',
                            platforms: launch.inputs.platforms || ['meta', 'tiktok']
                        },
                        aiModel: 'simulated-ai-model',
                        generatedAt: new Date().toISOString()
                    }

                    // Update launch with generated content and COMPLETED status
                    const updatedLaunch = await prisma.launch.update({
                        where: { id: launchId },
                        data: {
                            status: 'COMPLETED',
                            outputs: generatedContent
                        },
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    title: true,
                                    images: true
                                }
                            }
                        }
                    })

                    return res.status(200).json({
                        success: true,
                        data: {
                            launch: updatedLaunch,
                            message: 'Launch content generated successfully'
                        }
                    })

                } catch (error) {
                    console.error('Error generating launch content:', error)

                    // If error occurs, update status to FAILED
                    if (launchId) {
                        try {
                            await prisma.launch.update({
                                where: { id: launchId },
                                data: { status: 'FAILED' }
                            })
                        } catch (updateError) {
                            console.error('Error updating launch status to FAILED:', updateError)
                        }
                    }

                    return res.status(500).json({
                        success: false,
                        error: { message: 'Failed to generate launch content' }
                    })
                }
            }
        }

        // Handle Shopify connections endpoint
        if (pathname === '/api/shopify/connections' && req.method === 'GET') {
            try {
                const workspaceId = req.query.workspaceId || 'default-workspace'

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

                return res.status(200).json({
                    success: true,
                    data: { connections }
                })
            } catch (error) {
                console.error('Error fetching Shopify connections:', error)
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch Shopify connections' }
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
        await prisma.$disconnect()
    }
}