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

    // Health check endpoint
    if (pathname === '/api/health' && req.method === 'GET') {
        return res.status(200).json({
            success: true,
            status: 'healthy',
            message: 'API is working'
        })
    }

    // Handle products endpoint
    if (pathname === '/api/products' && req.method === 'GET') {
        const products = [{
                id: '1',
                title: 'Sample Product 1',
                description: 'A sample product',
                price: 29.99,
                category: 'Electronics',
                brand: 'Sample Brand',
                images: ['https://via.placeholder.com/300x300?text=Product+1'],
                store: { name: 'Sample Store', platform: 'SHOPIFY' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Sample Product 2',
                description: 'Another sample product',
                price: 49.99,
                category: 'Clothing',
                brand: 'Fashion Brand',
                images: ['https://via.placeholder.com/300x300?text=Product+2'],
                store: { name: 'Sample Store', platform: 'SHOPIFY' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]

        return res.status(200).json({
            success: true,
            data: { products }
        })
    }

    // Handle launches endpoint
    if (pathname === '/api/launches') {
        if (req.method === 'GET') {
            const launches = [{
                    id: '1',
                    workspaceId: 'test-workspace',
                    productId: '1',
                    name: 'Sample Launch 1',
                    status: 'DRAFT',
                    inputs: {
                        productId: '1',
                        brandTone: 'Professional',
                        targetAudience: 'General',
                        budget: 1000,
                        platforms: ['meta', 'tiktok']
                    },
                    outputs: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: '2',
                    workspaceId: 'test-workspace',
                    productId: '2',
                    name: 'Sample Launch 2',
                    status: 'COMPLETED',
                    inputs: {
                        productId: '2',
                        brandTone: 'Casual',
                        targetAudience: 'Young Adults',
                        budget: 2000,
                        platforms: ['meta', 'google']
                    },
                    outputs: {
                        title: 'AI-Generated Launch',
                        content: {
                            headline: 'Amazing Product!',
                            postCopy: 'Check out this incredible product!',
                            hashtags: ['#amazing', '#product'],
                            callToAction: 'Shop Now!'
                        }
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]

            return res.status(200).json({
                success: true,
                data: { launches }
            })
        }

        if (req.method === 'POST') {
            const { productId, brandTone, targetAudience, budget, platforms } = req.body

            const newLaunch = {
                id: `launch-${Date.now()}`,
                workspaceId: 'test-workspace',
                productId,
                name: `Launch for ${productId}`,
                status: 'DRAFT',
                inputs: { productId, brandTone, targetAudience, budget, platforms },
                outputs: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            return res.status(201).json({
                success: true,
                data: { launch: newLaunch }
            })
        }
    }

    // Handle Shopify connections endpoint
    if (pathname === '/api/shopify/connections' && req.method === 'GET') {
        const connections = [{
            id: '1',
            shop: 'sample-store.myshopify.com',
            shopName: 'Sample Store',
            email: 'admin@samplestore.com',
            country: 'US',
            currency: 'USD',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }]

        return res.status(200).json({
            success: true,
            data: { connections }
        })
    }

    // Default response for unmatched routes
    return res.status(404).json({
        success: false,
        error: { message: 'Route not found' }
    })
}