import { getConversations, getConversation, updateStatus, exportConversations } from '../../src/controllers/whatsapp/conversationController.js'

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
                if (req.query.export) {
                    return await exportConversations(req, res)
                } else if (req.query.id) {
                    return await getConversation(req, res)
                } else {
                    return await getConversations(req, res)
                }
            case 'PATCH':
                if (req.query.status) {
                    return await updateStatus(req, res)
                }
                break
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('WhatsApp Conversations API Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}