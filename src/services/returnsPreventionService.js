import { prisma } from '../db.js'
import { aiService } from './ai.js'
import { twilioService } from './twilio.js'
import { sendGridService } from './sendgrid.js'

class ReturnsPreventionService {
    constructor() {
        this.aiService = aiService
        this.twilioService = twilioService
        this.sendGridService = sendGridService
        this.riskFactors = {
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        }
    }

    /**
     * Assess return risk for an order
     */
    async assessReturnRisk(order, customer, products) {
        try {
            const riskScore = await this.calculateRiskScore(order, customer, products)
            const riskLevel = this.determineRiskLevel(riskScore)
            const riskFactors = await this.identifyRiskFactors(order, customer, products)
            const preventionStrategies = await this.generatePreventionStrategies(riskLevel, riskFactors)

            return {
                success: true,
                orderId: order.id,
                riskScore,
                riskLevel,
                riskFactors,
                preventionStrategies,
                assessmentDate: new Date().toISOString()
            }
        } catch (error) {
            console.error('Error assessing return risk:', error)
            throw error
        }
    }

    /**
     * Calculate risk score based on multiple factors
     */
    async calculateRiskScore(order, customer, products) {
        let score = 0
        const maxScore = 100

        // Customer history factors (30 points)
        const customerHistory = await this.getCustomerHistory(customer.id, order.storeId)
        score += this.calculateCustomerHistoryScore(customerHistory)

        // Product factors (25 points)
        score += this.calculateProductRiskScore(products)

        // Order factors (25 points)
        score += this.calculateOrderRiskScore(order)

        // Seasonal/timing factors (20 points)
        score += this.calculateSeasonalRiskScore(order)

        return Math.min(score, maxScore)
    }

    /**
     * Get customer purchase and return history
     */
    async getCustomerHistory(customerId, storeId) {
        try {
            const orders = await prisma.order.findMany({
                where: {
                    customerId,
                    storeId,
                    status: { in: ['CONFIRMED', 'RETURNED', 'REFUNDED']
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            const totalOrders = orders.length
            const returnedOrders = orders.filter(o => o.status === 'RETURNED' || o.status === 'REFUNDED').length
            const returnRate = totalOrders > 0 ? returnedOrders / totalOrders : 0

            return {
                totalOrders,
                returnedOrders,
                returnRate,
                averageOrderValue: orders.reduce((sum, o) => sum + parseFloat(o.total), 0) / totalOrders || 0,
                lastOrderDate: orders[0] ? orders[0].createdAt : null,
                orderFrequency: this.calculateOrderFrequency(orders)
            }
        } catch (error) {
            console.error('Error getting customer history:', error)
            return {
                totalOrders: 0,
                returnedOrders: 0,
                returnRate: 0,
                averageOrderValue: 0,
                lastOrderDate: null,
                orderFrequency: 'new'
            }
        }
    }

    /**
     * Calculate customer history risk score
     */
    calculateCustomerHistoryScore(history) {
        let score = 0

        // Return rate impact (0-15 points)
        if (history.returnRate > 0.3) score += 15
        else if (history.returnRate > 0.2) score += 10
        else if (history.returnRate > 0.1) score += 5

        // Order frequency impact (0-10 points)
        if (history.orderFrequency === 'new') score += 8
        else if (history.orderFrequency === 'infrequent') score += 5
        else if (history.orderFrequency === 'regular') score += 2

        // Average order value impact (0-5 points)
        if (history.averageOrderValue > 200) score += 5
        else if (history.averageOrderValue > 100) score += 3
        else if (history.averageOrderValue > 50) score += 1

        return score
    }

    /**
     * Calculate product risk score
     */
    calculateProductRiskScore(products) {
        let score = 0

        for (const product of products) {
            // Product category risk (0-10 points)
            const categoryRisk = this.getCategoryRisk(product.category)
            score += categoryRisk

            // Product price risk (0-8 points)
            const price = parseFloat(product.price)
            if (price > 200) score += 8
            else if (price > 100) score += 5
            else if (price > 50) score += 3

            // Product type risk (0-7 points)
            const typeRisk = this.getProductTypeRisk(product.title, product.description)
            score += typeRisk
        }

        return Math.min(score, 25) // Cap at 25 points
    }

    /**
     * Calculate order risk score
     */
    calculateOrderRiskScore(order) {
        let score = 0

        // Order value risk (0-10 points)
        const orderValue = parseFloat(order.total)
        if (orderValue > 300) score += 10
        else if (orderValue > 200) score += 7
        else if (orderValue > 100) score += 5
        else if (orderValue > 50) score += 3

        // Order size risk (0-8 points)
        const itemCount = order.items ? order.items.length : 1
        if (itemCount > 5) score += 8
        else if (itemCount > 3) score += 5
        else if (itemCount > 1) score += 3

        // Shipping method risk (0-7 points)
        if (order.shippingMethod === 'express') score += 7
        else if (order.shippingMethod === 'standard') score += 3

        return Math.min(score, 25) // Cap at 25 points
    }

    /**
     * Calculate seasonal risk score
     */
    calculateSeasonalRiskScore(order) {
        let score = 0
        const orderDate = new Date(order.createdAt)
        const month = orderDate.getMonth()

        // Holiday season risk (0-10 points)
        if (month === 11 || month === 0) score += 10 // December/January
        else if (month === 10) score += 7 // November (Black Friday)
        else if (month === 5) score += 5 // June (graduation season)

        // Weekend orders (0-5 points)
        const dayOfWeek = orderDate.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) score += 5

        // Time of day risk (0-5 points)
        const hour = orderDate.getHours()
        if (hour >= 22 || hour <= 6) score += 5 // Late night orders

        return Math.min(score, 20) // Cap at 20 points
    }

    /**
     * Get category-specific risk scores
     */
    getCategoryRisk(category) {
        const categoryRisks = {
            'Clothing': 8,
            'Shoes': 7,
            'Electronics': 6,
            'Home & Garden': 5,
            'Beauty': 4,
            'Sports': 6,
            'Books': 2,
            'Food': 3,
            'default': 5
        }

        return categoryRisks[category] || categoryRisks.default
    }

    /**
     * Get product type risk based on title/description
     */
    getProductTypeRisk(title, description) {
        const text = `${title} ${description}`.toLowerCase()
        let risk = 0

        // Size-dependent items
        if (text.includes('size') || text.includes('fit') || text.includes('measurement')) {
            risk += 4
        }

        // Color-dependent items
        if (text.includes('color') || text.includes('colour') || text.includes('shade')) {
            risk += 3
        }

        // Fragile items
        if (text.includes('fragile') || text.includes('delicate') || text.includes('breakable')) {
            risk += 3
        }

        // High-value items
        if (text.includes('premium') || text.includes('luxury') || text.includes('designer')) {
            risk += 2
        }

        return Math.min(risk, 7) // Cap at 7 points
    }

    /**
     * Calculate order frequency
     */
    calculateOrderFrequency(orders) {
        if (orders.length === 0) return 'new'
        if (orders.length === 1) return 'new'

        const firstOrder = orders[orders.length - 1].createdAt
        const lastOrder = orders[0].createdAt
        const daysBetween = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24)
        const averageDays = daysBetween / (orders.length - 1)

        if (averageDays <= 30) return 'frequent'
        if (averageDays <= 90) return 'regular'
        return 'infrequent'
    }

    /**
     * Determine risk level based on score
     */
    determineRiskLevel(score) {
        if (score >= 70) return this.riskFactors.HIGH
        if (score >= 40) return this.riskFactors.MEDIUM
        return this.riskFactors.LOW
    }

    /**
     * Identify specific risk factors
     */
    async identifyRiskFactors(order, customer, products) {
        const factors = []

        // Customer factors
        const history = await this.getCustomerHistory(customer.id, order.storeId)
        if (history.returnRate > 0.2) {
            factors.push({
                type: 'customer',
                factor: 'high_return_rate',
                description: `Customer has ${(history.returnRate * 100).toFixed(1)}% return rate`,
                impact: 'high'
            })
        }

        if (history.orderFrequency === 'new') {
            factors.push({
                type: 'customer',
                factor: 'new_customer',
                description: 'First-time customer',
                impact: 'medium'
            })
        }

        // Product factors
        for (const product of products) {
            const categoryRisk = this.getCategoryRisk(product.category)
            if (categoryRisk >= 7) {
                factors.push({
                    type: 'product',
                    factor: 'high_risk_category',
                    description: `${product.category} has high return risk`,
                    impact: 'high'
                })
            }

            const price = parseFloat(product.price)
            if (price > 200) {
                factors.push({
                    type: 'product',
                    factor: 'high_value_item',
                    description: `High-value item ($${price})`,
                    impact: 'medium'
                })
            }
        }

        // Order factors
        const orderValue = parseFloat(order.total)
        if (orderValue > 300) {
            factors.push({
                type: 'order',
                factor: 'large_order',
                description: `Large order value ($${orderValue})`,
                impact: 'medium'
            })
        }

        return factors
    }

    /**
     * Generate prevention strategies based on risk level and factors
     */
    async generatePreventionStrategies(riskLevel, riskFactors) {
            try {
                const prompt = `Generate return prevention strategies for an e-commerce order with ${riskLevel} risk level.

Risk Factors:
${riskFactors.map(f => `- ${f.description} (${f.impact} impact)`).join('\n')}

Generate specific prevention strategies including:
1. Proactive communication messages
2. Product education content
3. Customer support recommendations
4. Follow-up timing suggestions

Format as JSON:
{
  "communication": {
    "immediate": "message to send right after order",
    "shipping": "message to send when shipped",
    "delivery": "message to send when delivered",
    "followup": "message to send 2-3 days after delivery"
  },
  "education": {
    "sizing_guide": "sizing information if applicable",
    "care_instructions": "care and maintenance tips",
    "usage_tips": "how to get the most from the product"
  },
  "support": {
    "proactive_contact": "when to proactively reach out",
    "support_resources": "what support to offer",
    "exchange_options": "exchange vs return guidance"
  },
  "timing": {
    "immediate_contact": "hours after order",
    "shipping_contact": "hours after shipping",
    "delivery_contact": "hours after delivery",
    "followup_contact": "days after delivery"
  }
}`

            const response = await this.aiService.generateText(prompt, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                provider: 'togetherai',
                maxTokens: 800,
                temperature: 0.7
            })

            try {
                return JSON.parse(response.text)
            } catch (parseError) {
                // Fallback strategies
                return this.getFallbackStrategies(riskLevel)
            }
        } catch (error) {
            console.error('Error generating prevention strategies:', error)
            return this.getFallbackStrategies(riskLevel)
        }
    }

    /**
     * Fallback prevention strategies
     */
    getFallbackStrategies(riskLevel) {
        const strategies = {
            low: {
                communication: {
                    immediate: "Thank you for your order! We're excited to get your items to you.",
                    shipping: "Your order is on its way! Track your delivery here.",
                    delivery: "Your order has been delivered! We hope you love it.",
                    followup: "How are you enjoying your purchase? We'd love to hear from you!"
                },
                education: {
                    sizing_guide: "",
                    care_instructions: "Follow the care instructions included with your product.",
                    usage_tips: "Take time to read the product instructions for best results."
                },
                support: {
                    proactive_contact: "Only if customer reaches out",
                    support_resources: "Standard customer service",
                    exchange_options: "Standard return policy"
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 24,
                    delivery_contact: 2,
                    followup_contact: 3
                }
            },
            medium: {
                communication: {
                    immediate: "Thank you for your order! We want to ensure you're completely satisfied.",
                    shipping: "Your order is shipping! We've included helpful information to ensure you love your purchase.",
                    delivery: "Your order has arrived! We're here to help if you need anything.",
                    followup: "We want to make sure you're happy with your purchase. How is everything working out?"
                },
                education: {
                    sizing_guide: "Check our sizing guide to ensure the perfect fit.",
                    care_instructions: "Proper care will help your product last longer.",
                    usage_tips: "Take a moment to review the product features for the best experience."
                },
                support: {
                    proactive_contact: "Within 24 hours of delivery",
                    support_resources: "Enhanced customer service with sizing help",
                    exchange_options: "Easy exchange process for better fit"
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 12,
                    delivery_contact: 1,
                    followup_contact: 2
                }
            },
            high: {
                communication: {
                    immediate: "Thank you for your order! We're committed to ensuring your complete satisfaction.",
                    shipping: "Your order is on its way! We've included detailed information to help you get the most from your purchase.",
                    delivery: "Your order has been delivered! We're here to help with any questions or concerns.",
                    followup: "We want to ensure you're completely satisfied. Please let us know if you need any assistance!"
                },
                education: {
                    sizing_guide: "We've included a detailed sizing guide. Please measure carefully for the best fit.",
                    care_instructions: "Proper care is essential for this product. Please review the care instructions.",
                    usage_tips: "This product works best when used as directed. Please read the instructions carefully."
                },
                support: {
                    proactive_contact: "Within 2 hours of delivery",
                    support_resources: "Priority customer service with personal assistance",
                    exchange_options: "Immediate exchange options available"
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 6,
                    delivery_contact: 1,
                    followup_contact: 1
                }
            }
        }

        return strategies[riskLevel] || strategies.medium
    }

    /**
     * Execute prevention strategies for an order
     */
    async executePreventionStrategies(orderId, strategies, customer) {
        try {
            const results = {
                orderId,
                strategiesExecuted: [],
                success: true,
                errors: []
            }

            // Immediate communication
            if (strategies.communication.immediate) {
                try {
                    await this.sendImmediateMessage(customer, strategies.communication.immediate)
                    results.strategiesExecuted.push('immediate_communication')
                } catch (error) {
                    results.errors.push(`Immediate communication failed: ${error.message}`)
                }
            }

            // Schedule follow-up communications
            await this.scheduleFollowUpCommunications(orderId, strategies, customer)

            // Log prevention attempt
            await this.logPreventionAttempt(orderId, strategies, results)

            return results
        } catch (error) {
            console.error('Error executing prevention strategies:', error)
            throw error
        }
    }

    /**
     * Send immediate message to customer
     */
    async sendImmediateMessage(customer, message) {
        const results = {
            email: false,
            sms: false,
            whatsapp: false
        }

        // Send email
        if (customer.email) {
            try {
                await this.sendGridService.sendEmail(
                    customer.email,
                    'Thank you for your order!',
                    message,
                    `<p>${message}</p>`
                )
                results.email = true
            } catch (error) {
                console.error('Email send failed:', error)
            }
        }

        // Send SMS/WhatsApp
        if (customer.phone) {
            try {
                await this.twilioService.sendMessage(customer.phone, message, 'whatsapp')
                results.whatsapp = true
            } catch (error) {
                try {
                    await this.twilioService.sendMessage(customer.phone, message, 'sms')
                    results.sms = true
                } catch (smsError) {
                    console.error('SMS send failed:', smsError)
                }
            }
        }

        return results
    }

    /**
     * Schedule follow-up communications
     */
    async scheduleFollowUpCommunications(orderId, strategies, customer) {
        // This would integrate with a job queue system like BullMQ
        // For now, we'll log the scheduled communications
        const scheduledCommunications = [
            {
                type: 'shipping',
                timing: strategies.timing.shipping_contact,
                message: strategies.communication.shipping
            },
            {
                type: 'delivery',
                timing: strategies.timing.delivery_contact,
                message: strategies.communication.delivery
            },
            {
                type: 'followup',
                timing: strategies.timing.followup_contact * 24, // Convert days to hours
                message: strategies.communication.followup
            }
        ]

        console.log(`Scheduled ${scheduledCommunications.length} follow-up communications for order ${orderId}`)
        return scheduledCommunications
    }

    /**
     * Log prevention attempt
     */
    async logPreventionAttempt(orderId, strategies, results) {
        try {
            await prisma.event.create({
                data: {
                    workspaceId: 'returns-prevention',
                    type: 'returns_prevention_attempt',
                    payload: {
                        orderId,
                        strategies,
                        results,
                        timestamp: new Date().toISOString()
                    }
                }
            })
        } catch (error) {
            console.error('Error logging prevention attempt:', error)
        }
    }

    /**
     * Get returns prevention analytics
     */
    async getPreventionAnalytics(storeId, days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

            const events = await prisma.event.findMany({
                where: {
                    type: {
                        startsWith: 'returns_prevention'
                    },
                    ts: {
                        gte: startDate
                    }
                }
            })

            const analytics = {
                totalAssessments: 0,
                highRiskOrders: 0,
                mediumRiskOrders: 0,
                lowRiskOrders: 0,
                preventionAttempts: 0,
                successfulPreventions: 0,
                averageRiskScore: 0,
                topRiskFactors: [],
                preventionEffectiveness: 0
            }

            let totalRiskScore = 0
            const riskFactorCounts = {}

            for (const event of events) {
                const payload = event.payload || {}

                if (event.type === 'returns_prevention_attempt') {
                    analytics.preventionAttempts++
                    if (payload.results && payload.results.success) {
                        analytics.successfulPreventions++
                    }
                } else if (event.type === 'returns_risk_assessment') {
                    analytics.totalAssessments++
                    totalRiskScore += payload.riskScore || 0

                    if (payload.riskLevel === 'high') analytics.highRiskOrders++
                    else if (payload.riskLevel === 'medium') analytics.mediumRiskOrders++
                    else if (payload.riskLevel === 'low') analytics.lowRiskOrders++

                    // Count risk factors
                    if (payload.riskFactors) {
                        for (const factor of payload.riskFactors) {
                            const key = factor.factor
                            riskFactorCounts[key] = (riskFactorCounts[key] || 0) + 1
                        }
                    }
                }
            }

            // Calculate averages and top factors
            if (analytics.totalAssessments > 0) {
                analytics.averageRiskScore = totalRiskScore / analytics.totalAssessments
            }

            if (analytics.preventionAttempts > 0) {
                analytics.preventionEffectiveness = analytics.successfulPreventions / analytics.preventionAttempts
            }

            analytics.topRiskFactors = Object.entries(riskFactorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([factor, count]) => ({ factor, count }))

            return analytics
        } catch (error) {
            console.error('Error getting prevention analytics:', error)
            throw error
        }
    }
}

export const returnsPreventionService = new ReturnsPreventionService()