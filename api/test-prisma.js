import { prisma } from './lib/prisma.js'

export default async function handler(req, res) {
    try {
        console.log('Testing Prisma connection...')
        
        // Check if DATABASE_URL is available
        if (!process.env.DATABASE_URL) {
            return res.status(200).json({
                success: false,
                message: 'DATABASE_URL not configured',
                env: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            })
        }

        // Try a simple Prisma query
        const storeCount = await prisma.store.count()
        
        return res.status(200).json({
            success: true,
            message: 'Prisma connection successful',
            storeCount: storeCount,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Prisma test error:', error)
        return res.status(500).json({
            success: false,
            error: error.message,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        })
    }
}
