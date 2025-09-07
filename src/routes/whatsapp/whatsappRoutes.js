// routes/whatsapp/whatsappRoutes.js
import express from 'express'
import chatbotRoutes from './chatbotRoutes.js'
import chatRoutes from './chatRoutes.js'
import conversationRoutes from './conversationRoutes.js'

const router = express.Router()

// Mount all WhatsApp Marketplace routes
router.use('/chatbots', chatbotRoutes)
router.use('/chat', chatRoutes)
router.use('/conversations', conversationRoutes)

export default router