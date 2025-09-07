import express from 'express'
import { getConversations, getConversation, addMessage, updateStatus, exportConversations } from '../../controllers/whatsapp/conversationController.js'

const router = express.Router()

// Conversation management
router.get('/', getConversations)
router.get('/export', exportConversations)
router.get('/:id', getConversation)
router.post('/:id/messages', addMessage)
router.patch('/:id/status', updateStatus)

export default router