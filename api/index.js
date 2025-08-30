// Simplified API with mock data to ensure it works - V2
// We'll add database back once the routing is confirmed working

const mockLaunches = [
    {
        id: 'cmexz1vba0001d3c7isdei3z2',
        name: 'Test Launch',
        status: 'DRAFT',
        product: {
            id: 'prod1',
            title: 'Test Product',
            images: ['https://via.placeholder.com/150']
        },
        inputs: {
            brandTone: 'Professional',
            targetAudience: 'Business',
            budget: 1000,
            platforms: ['meta', 'tiktok']
        },
        metrics: {
            revenue: 0,
            spent: 0,
            conversion: 0
        },
        createdAt: new Date().toISOString()
    }
]

const mockProducts = [
    {
        id: 'prod1',
        title: 'Test Product',
        images: ['https://via.placeholder.com/150'],
        store: {
            name: 'Test Store',
            platform: 'shopify'
        }
    }
]

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
            return res.status(200).json({
                success: true,
                status: 'healthy',
                database: 'mock',
                message: 'API is working with mock data'
            })
        }

        // Handle products endpoint
        if (pathname === '/api/products' && req.method === 'GET') {
            return res.status(200).json({
                success: true,
                data: { products: mockProducts }
            })
        }

        // Handle launches endpoint
        if (pathname === '/api/launches') {
            if (req.method === 'GET') {
                return res.status(200).json({
                    success: true,
                    data: { launches: mockLaunches }
                })
            }

            if (req.method === 'POST') {
                const { productId, brandTone, targetAudience, budget, platforms, additionalNotes } = req.body
                
                const newLaunch = {
                    id: `launch_${Date.now()}`,
                    name: `Launch for ${productId || 'Product'}`,
                    status: 'DRAFT',
                    product: mockProducts[0],
                    inputs: {
                        productId,
                        brandTone,
                        targetAudience,
                        budget,
                        platforms,
                        additionalNotes
                    },
                    metrics: {
                        revenue: 0,
                        spent: 0,
                        conversion: 0
                    },
                    createdAt: new Date().toISOString()
                }
                
                mockLaunches.unshift(newLaunch)

                return res.status(201).json({
                    success: true,
                    data: { launch: newLaunch }
                })
            }
        }

        // Handle launch generation endpoint
        if (pathname.startsWith('/api/launches/') && pathname.includes('/generate')) {
            if (req.method === 'POST') {
                const launchId = pathname.split('/')[3] // Extract launch ID from /api/launches/{id}/generate

                // Find the launch in mock data
                const launchIndex = mockLaunches.findIndex(l => l.id === launchId)
                
                if (launchIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        error: { message: 'Launch not found' }
                    })
                }

                const launch = mockLaunches[launchIndex]

                // Update status to GENERATING
                launch.status = 'GENERATING'

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
                launch.status = 'COMPLETED'
                launch.outputs = generatedContent

                return res.status(200).json({
                    success: true,
                    data: {
                        launch: launch,
                        message: 'Launch content generated successfully'
                    }
                })
            }
        }

        // Handle Shopify connections endpoint
        if (pathname === '/api/shopify/connections' && req.method === 'GET') {
            const mockConnections = [
                {
                    id: 'conn1',
                    shop: 'test-shop.myshopify.com',
                    shopName: 'Test Shop',
                    email: 'test@example.com',
                    country: 'US',
                    currency: 'USD',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]

            return res.status(200).json({
                success: true,
                data: { connections: mockConnections }
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