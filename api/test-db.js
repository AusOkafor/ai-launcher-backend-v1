import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
        console.log('Testing database connection...')

        // Test basic connection
        await prisma.$connect()
        console.log('Database connected successfully')

        // Test Launch table
        const launchCount = await prisma.launch.count()
        console.log(`Launch table has ${launchCount} records`)

        // Test Product table
        const productCount = await prisma.product.count()
        console.log(`Product table has ${productCount} records`)

        return res.status(200).json({
            success: true,
            data: {
                message: 'Database connection successful',
                launchCount,
                productCount
            },
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('Database test error:', error)
        return res.status(500).json({
            success: false,
            error: {
                message: 'Database test failed',
                details: error.message
            }
        })
    }
}