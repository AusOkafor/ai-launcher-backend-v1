import { PrismaClient } from '@prisma/client'

let prisma

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

export default async function handler(req, res) {
    // Set CORS headers
    const origin = req.headers.origin || '*'
    const allowed = [
        'http://localhost:8080',
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
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    try {
        if (req.method === 'GET') {
            const products = await prisma.product.findMany({
                include: {
                    store: {
                        select: {
                            name: true,
                            platform: true
                        }
                    },
                    variants: true
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

        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        })
    } catch (error) {
        console.error('Error fetching products:', error)
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch products' }
        })
    }
}