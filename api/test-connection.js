export default async function handler(req, res) {
    try {
        console.log('Testing database connection...')
        
        // Check environment variables
        const hasDatabaseUrl = !!process.env.DATABASE_URL
        const nodeEnv = process.env.NODE_ENV
        
        console.log('DATABASE_URL exists:', hasDatabaseUrl)
        console.log('NODE_ENV:', nodeEnv)
        
        // Log the first part of the connection string for debugging
        if (process.env.DATABASE_URL) {
            const dbUrl = process.env.DATABASE_URL
            console.log('Connection string starts with:', dbUrl.substring(0, 50) + '...')
            console.log('Connection string contains pooler:', dbUrl.includes('pooler'))
        }
        
        if (!hasDatabaseUrl) {
            return res.status(200).json({
                success: false,
                message: 'DATABASE_URL not configured',
                env: nodeEnv,
                timestamp: new Date().toISOString()
            })
        }

        // Test basic connection without Prisma
        const { Client } = await import('pg')
        
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        })

        await client.connect()
        const result = await client.query('SELECT NOW() as current_time')
        await client.end()

        return res.status(200).json({
            success: true,
            message: 'Database connection successful',
            currentTime: result.rows[0].current_time,
            env: nodeEnv,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Connection test error:', error)
        return res.status(500).json({
            success: false,
            error: error.message,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        })
    }
}