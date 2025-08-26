import { prisma } from '../../../lib/prisma.js'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Get storeId from query parameters
    const { storeId } = req.query

    try {
        console.log(`Fetching abandoned carts for store: ${storeId}`)

        // Check if DATABASE_URL is available
        if (!process.env.DATABASE_URL) {
            console.log('DATABASE_URL not found, returning mock data')
            const mockCarts = [{
                id: 'cart-1',
                storeId: storeId,
                status: 'ABANDONED',
                customer: { name: 'John Doe', email: 'john@example.com' },
                items: [{ name: 'Test Product', quantity: 1 }],
                subtotal: 99.99
            }]

            return res.status(200).json({
                success: true,
                count: mockCarts.length,
                carts: mockCarts,
                message: 'Using mock data - DATABASE_URL not configured'
            })
        }

        // Try to use Prisma
        console.log('Fetching carts from database...')

        const carts = await prisma.cart.findMany({
            where: {
                storeId: storeId,
                status: 'ABANDONED'
            },
            include: {
                customer: true,
                store: true
            }
        })

        console.log(`Found ${carts.length} abandoned carts`)

        res.status(200).json({
            success: true,
            count: carts.length,
            carts: carts
        })

    } catch (error) {
        console.error('Error fetching abandoned carts:', error)

        // If Prisma fails, return mock data
        const mockCarts = [{
            id: 'cart-1',
            storeId: storeId,
            status: 'ABANDONED',
            customer: { name: 'John Doe', email: 'john@example.com' },
            items: [{ name: 'Test Product', quantity: 1 }],
            subtotal: 99.99
        }]

        res.status(200).json({
            success: true,
            count: mockCarts.length,
            carts: mockCarts,
            message: 'Using mock data due to database error',
            error: error.message
        })
    }
}