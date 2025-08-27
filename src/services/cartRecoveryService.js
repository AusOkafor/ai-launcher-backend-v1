import { prisma } from '../db.js'
import { aiService } from './ai.js'
import { twilioService } from './twilio.js'
import { sendGridService } from './sendgrid.js'

class CartRecoveryService {
    constructor() {
        this.aiService = aiService
        this.twilioService = twilioService
        this.sendGridService = sendGridService
    }

    /**
     * Detect abandoned carts from recent orders
     * A cart is considered abandoned if:
     * - Order was created but not completed within 24 hours
     * - Customer has email/phone for contact
     */
    async detectAbandonedCarts(storeId, hoursThreshold = 24) {
        try {
            const cutoffTime = new Date(Date.now() - (hoursThreshold * 60 * 60 * 1000))

            // Find orders that might indicate abandoned carts
            const potentialAbandonedOrders = await prisma.order.findMany({
                where: {
                    storeId: storeId,
                    status: 'PENDING',
                    createdAt: {
                        lt: cutoffTime
                    }
                },
                include: {
                    customer: true,
                    store: true
                }
            })

            const abandonedCarts = []

            for (const order of potentialAbandonedOrders) {
                // Check if this customer has a recent successful order
                const hasRecentSuccessfulOrder = await prisma.order.findFirst({
                    where: {
                        storeId: storeId,
                        customerId: order.customerId,
                        status: 'CONFIRMED',
                        createdAt: {
                            gt: cutoffTime
                        }
                    }
                })

                // If no recent successful order, consider it abandoned
                if (!hasRecentSuccessfulOrder) {
                    abandonedCarts.push({
                        orderId: order.id,
                        customerId: order.customerId,
                        customer: order.customer,
                        store: order.store,
                        items: order.items,
                        total: order.total,
                        abandonedAt: order.createdAt,
                        recoveryAttempts: 0
                    })
                }
            }

            return abandonedCarts
        } catch (error) {
            console.error('Error detecting abandoned carts:', error)
            throw error
        }
    }

    /**
     * Generate AI-powered recovery message
     */
    async generateRecoveryMessage(cart, attemptNumber = 1) {
        try {
            const items = Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items)
            const itemNames = items.map(item => item.title || item.name).join(', ')

            const prompt = `Generate a compelling cart recovery message for an e-commerce store. 

Customer Details:
- Name: ${cart.customer?.firstName || 'Valued Customer'}
- Items in cart: ${itemNames}
- Cart total: $${cart.total}
- Store: ${cart.store?.name || 'our store'}

Recovery Attempt: ${attemptNumber}

Requirements:
- Keep it under 160 characters for SMS
- Be friendly but not pushy
- Include a sense of urgency
- Offer value (discount, free shipping, etc.)
- Include a clear call-to-action
- Make it personal and relevant

Generate 3 different versions with different approaches:
1. Urgency-based
2. Value-based (discount/offer)
3. Social proof-based

Format as JSON:
{
  "urgency": "message text",
  "value": "message text", 
  "social": "message text"
}`

            const response = await this.aiService.generateText(prompt, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                provider: 'togetherai',
                maxTokens: 500,
                temperature: 0.8
            })

            // Parse the response
            try {
                const messages = JSON.parse(response)
                return messages
            } catch (parseError) {
                // Fallback if AI response isn't valid JSON
                return {
                    urgency: `Hi ${cart.customer?.firstName || 'there'}! Your cart with ${itemNames} is waiting. Complete your order now and save 10%!`,
                    value: `Don't miss out! Get 15% off your ${itemNames} order when you complete your purchase today.`,
                    social: `Join thousands of happy customers! Complete your ${itemNames} order and see why everyone loves our products.`
                }
            }
        } catch (error) {
            console.error('Error generating recovery message:', error)
            throw error
        }
    }

    /**
     * Send recovery message via multiple channels
     */
    async sendRecoveryMessage(cart, messageType = 'urgency', channel = 'all') {
        try {
            const messages = await this.generateRecoveryMessage(cart)
            const message = messages[messageType] || messages.urgency

            const results = {
                success: false,
                channels: {},
                errors: []
            }

            // Send via WhatsApp if customer has phone
            if ((channel === 'all' || channel === 'whatsapp') && cart.customer && cart.customer.phone) {
                try {
                    const whatsappResult = await this.twilioService.sendWhatsApp(
                        cart.customer.phone,
                        message
                    )
                    results.channels.whatsapp = {
                        success: true,
                        messageId: whatsappResult.sid
                    }
                } catch (error) {
                    results.channels.whatsapp = {
                        success: false,
                        error: error.message
                    }
                    results.errors.push(`WhatsApp: ${error.message}`)
                }
            }

            // Send via SMS if customer has phone
            if ((channel === 'all' || channel === 'sms') && cart.customer && cart.customer.phone) {
                try {
                    const smsResult = await this.twilioService.sendSMS(
                        cart.customer.phone,
                        message
                    )
                    results.channels.sms = {
                        success: true,
                        messageId: smsResult.sid
                    }
                } catch (error) {
                    results.channels.sms = {
                        success: false,
                        error: error.message
                    }
                    results.errors.push(`SMS: ${error.message}`)
                }
            }

            // Send via Email if customer has email
            if ((channel === 'all' || channel === 'email') && cart.customer && cart.customer.email) {
                try {
                    const emailResult = await this.sendGridService.sendRecoveryEmail(
                        cart.customer.email,
                        cart.customer.firstName || 'Valued Customer',
                        message,
                        cart
                    )
                    results.channels.email = {
                        success: true,
                        messageId: emailResult.messageId
                    }
                } catch (error) {
                    results.channels.email = {
                        success: false,
                        error: error.message
                    }
                    results.errors.push(`Email: ${error.message}`)
                }
            }

            // Track the recovery attempt
            await this.trackRecoveryAttempt(cart.orderId, {
                messageType,
                channel,
                message,
                results
            })

            // Check if any channel succeeded
            results.success = Object.values(results.channels).some(ch => ch.success)

            return results
        } catch (error) {
            console.error('Error sending recovery message:', error)
            throw error
        }
    }

    /**
     * Track recovery attempts and results
     */
    async trackRecoveryAttempt(orderId, attemptData) {
        try {
            await prisma.event.create({
                data: {
                    workspaceId: 'recovery-tracking', // You'll need to get the actual workspace ID
                    type: 'cart_recovery_attempt',
                    payload: {
                        orderId,
                        timestamp: new Date().toISOString(),
                        ...attemptData
                    }
                }
            })
        } catch (error) {
            console.error('Error tracking recovery attempt:', error)
        }
    }

    /**
     * Get recovery statistics for a store
     */
    async getRecoveryStats(storeId, days = 30) {
        try {
            const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

            const stats = await prisma.event.groupBy({
                by: ['type'],
                where: {
                    type: {
                        startsWith: 'cart_recovery'
                    },
                    ts: {
                        gte: startDate
                    }
                },
                _count: {
                    id: true
                }
            })

            return {
                totalAttempts: stats.find(s => s.type === 'cart_recovery_attempt') ? stats.find(s => s.type === 'cart_recovery_attempt')._count.id : 0,
                successfulDeliveries: stats.find(s => s.type === 'cart_recovery_success') ? stats.find(s => s.type === 'cart_recovery_success')._count.id : 0,
                conversions: stats.find(s => s.type === 'cart_recovery_conversion') ? stats.find(s => s.type === 'cart_recovery_conversion')._count.id : 0,
                period: `${days} days`
            }
        } catch (error) {
            console.error('Error getting recovery stats:', error)
            throw error
        }
    }

    /**
     * Run automated recovery campaign
     */
    async runRecoveryCampaign(storeId, options = {}) {
        try {
            const {
                hoursThreshold = 24,
                    maxAttempts = 3,
                    channels = ['whatsapp', 'email'],
                    messageTypes = ['urgency', 'value', 'social']
            } = options

            console.log(`Starting recovery campaign for store: ${storeId}`)

            // Detect abandoned carts
            const abandonedCarts = await this.detectAbandonedCarts(storeId, hoursThreshold)
            console.log(`Found ${abandonedCarts.length} abandoned carts`)

            const results = {
                totalCarts: abandonedCarts.length,
                messagesSent: 0,
                successfulDeliveries: 0,
                errors: []
            }

            for (const cart of abandonedCarts) {
                try {
                    // Determine which message type to use based on attempt number
                    const attemptNumber = cart.recoveryAttempts + 1
                    const messageType = messageTypes[(attemptNumber - 1) % messageTypes.length]

                    // Send recovery message
                    const sendResult = await this.sendRecoveryMessage(
                        cart,
                        messageType,
                        channels.join(',')
                    )

                    results.messagesSent++
                        if (sendResult.success) {
                            results.successfulDeliveries++
                        }
                    if (sendResult.errors.length > 0) {
                        results.errors.push(...sendResult.errors)
                    }

                    // Update recovery attempts count
                    cart.recoveryAttempts = attemptNumber

                } catch (error) {
                    results.errors.push(`Cart ${cart.orderId}: ${error.message}`)
                }
            }

            console.log(`Recovery campaign completed:`, results)
            return results

        } catch (error) {
            console.error('Error running recovery campaign:', error)
            throw error
        }
    }
}

export const cartRecoveryService = new CartRecoveryService()