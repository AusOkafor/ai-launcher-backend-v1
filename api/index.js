import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma ? ? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080')
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
        // Handle products endpoint
        if (pathname === '/api/products' && req.method === 'GET') {
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
        }

        // Handle launches endpoint
        if (pathname === '/api/launches') {
            if (req.method === 'GET') {
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
                connections
            })
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
    }
}