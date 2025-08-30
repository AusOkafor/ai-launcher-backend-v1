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
        return res.status(200).json({
            success: true,
            message: 'Simple test endpoint working',
            timestamp: new Date().toISOString(),
            method: req.method
        })
    } catch (error) {
        console.error('Test error:', error)
        return res.status(500).json({
            success: false,
            error: { message: 'Test failed' }
        })
    }
}