import { handleChatMessage } from '../../../src/controllers/whatsapp/chatController.js'

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        return await handleChatMessage(req, res)
    } catch (error) {
        console.error('WhatsApp Chat API Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}