import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default async function handler(req, res) {
    // Set CORS headers
    const allowedOrigins = [
        'http://localhost:8080',
        'http://localhost:3001',
        'http://localhost:3000',
        'https://ai-launcher-frontend.vercel.app',
        'https://stratosphere-ecom-ai.vercel.app'
    ]

    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

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
                // Test database connection
                await prisma.$queryRaw `SELECT 1`
                return res.status(200).json({
                    success: true,
                    status: 'healthy',
                    database: 'connected',
                    timestamp: new Date().toISOString()
                })
            } catch (dbError) {
                return res.status(503).json({
                    success: false,
                    status: 'unhealthy',
                    database: 'disconnected',
                    error: dbError.message,
                    timestamp: new Date().toISOString()
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
                    data: { products },
                    timestamp: new Date().toISOString()
                })
            } catch (dbError) {
                // Fallback to mock data if database fails
                console.warn('Database error, returning mock data:', dbError.message)

                const mockProducts = [{
                        id: 'mock-1',
                        title: 'Sample Product 1',
                        description: 'A sample product for testing',
                        category: 'Electronics',
                        brand: 'Sample Brand',
                        price: 29.99,
                        images: ['https://via.placeholder.com/300x300?text=Product+1'],
                        store: {
                            name: 'Sample Store',
                            platform: 'SHOPIFY'
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 'mock-2',
                        title: 'Sample Product 2',
                        description: 'Another sample product',
                        category: 'Clothing',
                        brand: 'Fashion Brand',
                        price: 49.99,
                        images: ['https://via.placeholder.com/300x300?text=Product+2'],
                        store: {
                            name: 'Sample Store',
                            platform: 'SHOPIFY'
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ]

                return res.status(200).json({
                    success: true,
                    data: { products: mockProducts },
                    timestamp: new Date().toISOString(),
                    note: 'Using mock data due to database connection issue'
                })
            }
        }

        // Handle launches endpoint
        if (pathname === '/api/launches') {
            if (req.method === 'GET') {
                try {
                    const launches = await prisma.launch.findMany({
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })

                    return res.status(200).json({
                        success: true,
                        data: { launches },
                        timestamp: new Date().toISOString()
                    })
                } catch (dbError) {
                    // Fallback to mock data if database fails
                    console.warn('Database error, returning mock launches:', dbError.message)

                    const mockLaunches = [{
                            id: 'mock-launch-1',
                            workspaceId: 'test-workspace-id',
                            productId: 'mock-1',
                            name: 'Sample Launch 1',
                            status: 'DRAFT',
                            inputs: {
                                productId: 'mock-1',
                                brandTone: 'Professional',
                                targetAudience: 'General',
                                launchWindow: 'Immediate',
                                budget: 1000,
                                platforms: ['meta', 'tiktok']
                            },
                            outputs: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: 'mock-launch-2',
                            workspaceId: 'test-workspace-id',
                            productId: 'mock-2',
                            name: 'Sample Launch 2',
                            status: 'COMPLETED',
                            inputs: {
                                productId: 'mock-2',
                                brandTone: 'Casual',
                                targetAudience: 'Young Adults',
                                launchWindow: 'Seasonal',
                                budget: 2000,
                                platforms: ['meta', 'google']
                            },
                            outputs: {
                                title: 'AI-Generated Social Media Launch',
                                description: 'Social media content for Sample Product 2',
                                content: {
                                    headline: 'Amazing Product Alert!',
                                    postCopy: 'Check out this incredible product that will change your life!',
                                    hashtags: ['#amazing', '#product', '#lifestyle'],
                                    callToAction: 'Shop Now!'
                                }
                            },
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]

                    return res.status(200).json({
                        success: true,
                        data: { launches: mockLaunches },
                        timestamp: new Date().toISOString(),
                        note: 'Using mock data due to database connection issue'
                    })
                }
            }

            if (req.method === 'POST') {
                const { productId, brandTone, targetAudience, launchWindow, budget, platforms, additionalNotes } = req.body

                const launch = await prisma.launch.create({
                    data: {
                        workspaceId: 'test-workspace-id',
                        productId,
                        name: `Launch for ${productId}`,
                        status: 'DRAFT',
                        inputs: {
                            productId,
                            brandTone,
                            targetAudience,
                            launchWindow,
                            budget,
                            platforms,
                            additionalNotes
                        }
                    }
                })

                return res.status(201).json({
                    success: true,
                    data: { launch },
                    timestamp: new Date().toISOString()
                })
            }
        }

        // Handle Shopify connections endpoint
        if (pathname === '/api/shopify/connections' && req.method === 'GET') {
            try {
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

                return res.json({
                    success: true,
                    data: { connections },
                    timestamp: new Date().toISOString()
                })
            } catch (dbError) {
                // Fallback to mock data if database fails
                console.warn('Database error, returning mock connections:', dbError.message)

                const mockConnections = [{
                    id: 'mock-connection-1',
                    shop: 'sample-store.myshopify.com',
                    shopName: 'Sample Store',
                    email: 'admin@samplestore.com',
                    country: 'US',
                    currency: 'USD',
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }]

                return res.json({
                    success: true,
                    data: { connections: mockConnections },
                    timestamp: new Date().toISOString(),
                    note: 'Using mock data due to database connection issue'
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

        // Check if it's a database connection error
        if (error.code === 'P1001' || error.message.includes('connect')) {
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Database connection failed',
                    details: 'Please check your DATABASE_URL environment variable and ensure the database is running',
                    code: error.code
                }
            })
        }

        // Check if it's a Prisma validation error
        if (error.name === 'PrismaClientValidationError') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid data provided',
                    details: error.message
                }
            })
        }

        return res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            }
        })
    }
}