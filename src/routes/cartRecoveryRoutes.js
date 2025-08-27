import express from 'express'
import { cartRecoveryService } from '../services/cartRecoveryService.js'
import { prisma } from '../db.js';

const router = express.Router()

/**
 * @route GET /api/cart-recovery/abandoned
 * @desc Get abandoned carts for a store
 */
router.get('/abandoned', async (req, res) => {
    try {
        const { storeId, hours = 24 } = req.query

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const abandonedCarts = await cartRecoveryService.detectAbandonedCarts(storeId, parseInt(hours))
        
        res.json({
            success: true,
            data: {
                abandonedCarts,
                count: abandonedCarts.length,
                hoursThreshold: parseInt(hours)
            }
        })
    } catch (error) {
        console.error('Error getting abandoned carts:', error)
        res.status(500).json({ error: 'Failed to get abandoned carts' })
    }
})

/**
 * @route POST /api/cart-recovery/generate-message
 * @desc Generate AI recovery message for a cart
 */
router.post('/generate-message', async (req, res) => {
    try {
        const { cart, attemptNumber = 1 } = req.body

        if (!cart) {
            return res.status(400).json({ error: 'Cart data is required' })
        }

        const messages = await cartRecoveryService.generateRecoveryMessage(cart, attemptNumber)
        
        res.json({
            success: true,
            data: {
                messages,
                cartId: cart.orderId,
                attemptNumber
            }
        })
    } catch (error) {
        console.error('Error generating recovery message:', error)
        res.status(500).json({ error: 'Failed to generate recovery message' })
    }
})

/**
 * @route POST /api/cart-recovery/send-message
 * @desc Send recovery message to customer
 */
router.post('/send-message', async (req, res) => {
    try {
        const { cart, messageType = 'urgency', channel = 'all' } = req.body

        if (!cart) {
            return res.status(400).json({ error: 'Cart data is required' })
        }

        const result = await cartRecoveryService.sendRecoveryMessage(cart, messageType, channel)
        
        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error sending recovery message:', error)
        res.status(500).json({ error: 'Failed to send recovery message' })
    }
})

/**
 * @route POST /api/cart-recovery/campaign
 * @desc Run automated recovery campaign
 */
router.post('/campaign', async (req, res) => {
    try {
        const { 
            storeId, 
            hoursThreshold = 24, 
            maxAttempts = 3, 
            channels = ['whatsapp', 'email'],
            messageTypes = ['urgency', 'value', 'social']
        } = req.body

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const result = await cartRecoveryService.runRecoveryCampaign(storeId, {
            hoursThreshold,
            maxAttempts,
            channels,
            messageTypes
        })
        
        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error running recovery campaign:', error)
        res.status(500).json({ error: 'Failed to run recovery campaign' })
    }
})

/**
 * @route GET /api/cart-recovery/stats
 * @desc Get recovery statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { storeId, days = 30 } = req.query

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const stats = await cartRecoveryService.getRecoveryStats(storeId, parseInt(days))
        
        res.json({
            success: true,
            data: stats
        })
    } catch (error) {
        console.error('Error getting recovery stats:', error)
        res.status(500).json({ error: 'Failed to get recovery stats' })
    }
})

/**
 * @route POST /api/cart-recovery/carts/:cartId/mark-recovered
 * @desc Mark cart as recovered
 */
router.post('/carts/:cartId/mark-recovered', async (req, res) => {
    try {
        const { cartId } = req.params
        const { orderId } = req.body

        // Update cart status to recovered
        await prisma.cart.update({
            where: { id: cartId },
            data: { 
                status: 'CONVERTED',
                updatedAt: new Date()
            }
        })

        // Create recovery event
        await prisma.event.create({
            data: {
                workspaceId: 'recovery-tracking', // You'll need to get the actual workspace ID
                type: 'cart_recovery_conversion',
                payload: {
                    cartId,
                    orderId,
                    timestamp: new Date().toISOString()
                }
            }
        })

        res.json({
            success: true,
            message: 'Cart marked as recovered'
        })
    } catch (error) {
        console.error('Error marking cart as recovered:', error)
        res.status(500).json({ error: 'Failed to mark cart as recovered' })
    }
})

/**
 * @route GET /api/cart-recovery/test
 * @desc Test endpoint for cart recovery
 */
router.get('/test', async (req, res) => {
    res.json({
        success: true,
        message: 'Cart Recovery API is working!',
        endpoints: {
            'GET /abandoned': 'Get abandoned carts',
            'POST /generate-message': 'Generate AI recovery message',
            'POST /send-message': 'Send recovery message',
            'POST /campaign': 'Run automated campaign',
            'GET /stats': 'Get recovery statistics',
            'POST /carts/:id/mark-recovered': 'Mark cart as recovered'
        }
    })
})

export default router