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

    try {
        if (req.method === 'GET') {
            // Return mock data to test if the issue is with Prisma
            const mockProducts = [{
                    id: "test-product-1",
                    title: "Test Product 1",
                    price: "29.99",
                    description: "This is a test product",
                    category: "Test",
                    images: ["https://via.placeholder.com/150"],
                    store: {
                        name: "Test Store",
                        platform: "SHOPIFY"
                    }
                },
                {
                    id: "test-product-2",
                    title: "Test Product 2",
                    price: "49.99",
                    description: "Another test product",
                    category: "Test",
                    images: ["https://via.placeholder.com/150"],
                    store: {
                        name: "Test Store",
                        platform: "SHOPIFY"
                    }
                }
            ]

            return res.status(200).json({
                success: true,
                data: { products: mockProducts },
                timestamp: new Date().toISOString()
            })
        }

        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        })
    } catch (error) {
        console.error('Error in simple products API:', error)
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch products' }
        })
    }
}