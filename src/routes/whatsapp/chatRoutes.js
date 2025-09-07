import express from 'express'
import { handleChatMessage } from '../../controllers/whatsapp/chatController.js'

const router = express.Router()

// Public chat endpoint (for widgets)
router.post('/converse', handleChatMessage)

// Authenticated chat endpoint (for dashboard testing)
router.post('/:id/converse', handleChatMessage)

export default router