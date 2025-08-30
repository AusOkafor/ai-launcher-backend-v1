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
            return res.status(200).json({
                success: true,
                status: 'healthy',
                database: 'mock',
                timestamp: new Date().toISOString(),
                message: 'API is running with mock data'
            })
        }

        // Handle products endpoint
        if (pathname === '/api/products' && req.method === 'GET') {
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
                },
                {
                    id: 'mock-3',
                    title: 'Premium Headphones',
                    description: 'High-quality wireless headphones',
                    category: 'Audio',
                    brand: 'AudioTech',
                    price: 199.99,
                    images: ['https://via.placeholder.com/300x300?text=Headphones'],
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
                note: 'Using mock data'
            })
        }

        // Handle launches endpoint
        if (pathname === '/api/launches') {
            if (req.method === 'GET') {
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
                    },
                    {
                        id: 'mock-launch-3',
                        workspaceId: 'test-workspace-id',
                        productId: 'mock-3',
                        name: 'Premium Headphones Launch',
                        status: 'SCHEDULED',
                        inputs: {
                            productId: 'mock-3',
                            brandTone: 'Premium',
                            targetAudience: 'Music Enthusiasts',
                            launchWindow: 'Holiday Season',
                            budget: 5000,
                            platforms: ['meta', 'tiktok', 'google']
                        },
                        outputs: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ]

                return res.status(200).json({
                    success: true,
                    data: { launches: mockLaunches },
                    timestamp: new Date().toISOString(),
                    note: 'Using mock data'
                })
            }

            if (req.method === 'POST') {
                const { productId, brandTone, targetAudience, launchWindow, budget, platforms, additionalNotes } = req.body

                const newLaunch = {
                    id: `mock-launch-${Date.now()}`,
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
                    },
                    outputs: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }

                return res.status(201).json({
                    success: true,
                    data: { launch: newLaunch },
                    timestamp: new Date().toISOString(),
                    note: 'Mock launch created'
                })
            }
        }

        // Handle Shopify connections endpoint
        if (pathname === '/api/shopify/connections' && req.method === 'GET') {
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
                },
                {
                    id: 'mock-connection-2',
                    shop: 'fashion-boutique.myshopify.com',
                    shopName: 'Fashion Boutique',
                    email: 'hello@fashionboutique.com',
                    country: 'CA',
                    currency: 'CAD',
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]

            return res.json({
                success: true,
                data: { connections: mockConnections },
                timestamp: new Date().toISOString(),
                note: 'Using mock data'
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
                details: 'Something went wrong'
            }
        })
    }
}