import app from '../src/server.js'

export default function handler(req, res) {
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

    // Delegate to Express app
    return app(req, res)
}