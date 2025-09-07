import {
    getChatbots,
    createChatbot,
    getChatbot,
    updateChatbot,
    deleteChatbot,
    toggleActive,
    getChatbotStats
} from '../src/controllers/whatsapp/chatbotController.js'

import { handleChatMessage } from '../src/controllers/whatsapp/chatController.js'

import {
    getConversations,
    getConversation,
    updateStatus,
    exportConversations
} from '../src/controllers/whatsapp/conversationController.js'

// WhatsApp Marketplace API - Updated for Vercel deployment
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    try {
        const { path } = req.query
        const pathSegments = path ? path.split('/') : []

        // Route based on path segments
        if (pathSegments[0] === 'chatbots') {
            // Chatbot management routes
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
            }
        } else if (pathSegments[0] === 'chat') {
            // Chat routes
            if (req.method === 'POST') {
                if (pathSegments[1] && pathSegments[1] !== 'converse') {
                    // /chat/{chatbotId}/converse
                    req.params = { id: pathSegments[1] }
                }
                return await handleChatMessage(req, res)
            }
        } else if (pathSegments[0] === 'conversations') {
            // Conversation routes
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
            }
        }

        return res.status(404).json({ error: 'Endpoint not found' })
    } catch (error) {
        console.error('WhatsApp API Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}