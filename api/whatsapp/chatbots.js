import { getChatbots, createChatbot, getChatbot, updateChatbot, deleteChatbot, toggleActive, getChatbotStats } from '../../src/controllers/whatsapp/chatbotController.js'

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    try {
        switch (req.method) {
            case 'GET':
                if (req.query.stats) {
                    return await getChatbotStats(req, res)
                } else if (req.query.id) {
                    return await getChatbot(req, res)
                } else {
                    return await getChatbots(req, res)
                }
            case 'POST':
                return await createChatbot(req, res)
            case 'PUT':
                return await updateChatbot(req, res)
            case 'DELETE':
                return await deleteChatbot(req, res)
            case 'PATCH':
                if (req.query.toggle) {
                    return await toggleActive(req, res)
                }
                break
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('WhatsApp Chatbots API Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}