import express from 'express'
import { getChatbots, getChatbotStats, createChatbot, getChatbot, updateChatbot, deleteChatbot, savePromptConfig, getFlowNodes, saveFlowNode } from '../../controllers/whatsapp/chatbotController.js'

const router = express.Router()

// Chatbot CRUD operations
router.get('/', getChatbots)
router.post('/', createChatbot)
router.get('/stats', getChatbotStats)
router.get('/:id', getChatbot)
router.put('/:id', updateChatbot)
router.delete('/:id', deleteChatbot)

// Prompt configuration
router.post('/:id/prompts', savePromptConfig)

// Flow nodes
router.get('/:id/flows', getFlowNodes)
router.post('/:id/flows', saveFlowNode)

export default router