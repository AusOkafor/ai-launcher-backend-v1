import { prisma } from '../../../src/db.js'
import { logger } from '../../../src/utils/logger.js'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { storeId } = req.query

        logger.info(`Fetching abandoned carts for store: ${storeId}`)

        const carts = await prisma.cart.findMany({
            where: {
                storeId: storeId,
                status: 'ABANDONED'
            },
            include: {
                customer: true,
                items: true
            }
        })

        logger.info(`Found ${carts.length} abandoned carts`)

        res.status(200).json({
            success: true,
            count: carts.length,
            carts: carts
        })

    } catch (error) {
        logger.error('Error fetching abandoned carts:', error)
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}