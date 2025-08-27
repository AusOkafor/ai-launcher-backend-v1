import express from 'express'
import { returnsPreventionService } from '../services/returnsPreventionService.js'
import { prisma } from '../db.js'

const router = express.Router()

/**
 * @route POST /api/returns-prevention/assess
 * @desc Assess return risk for an order
 */
router.post('/assess', async(req, res) => {
    try {
        const { order, customer, products } = req.body

        if (!order || !customer || !products) {
            return res.status(400).json({
                error: 'Order, customer, and products data are required'
            })
        }

        const assessment = await returnsPreventionService.assessReturnRisk(order, customer, products)

        res.json({
            success: true,
            data: assessment
        })
    } catch (error) {
        console.error('Error assessing return risk:', error)
        res.status(500).json({ error: 'Failed to assess return risk' })
    }
})

/**
 * @route POST /api/returns-prevention/execute
 * @desc Execute prevention strategies for an order
 */
router.post('/execute', async(req, res) => {
    try {
        const { orderId, strategies, customer } = req.body

        if (!orderId || !strategies || !customer) {
            return res.status(400).json({
                error: 'Order ID, strategies, and customer data are required'
            })
        }

        const results = await returnsPreventionService.executePreventionStrategies(
            orderId,
            strategies,
            customer
        )

        res.json({
            success: true,
            data: results
        })
    } catch (error) {
        console.error('Error executing prevention strategies:', error)
        res.status(500).json({ error: 'Failed to execute prevention strategies' })
    }
})

/**
 * @route POST /api/returns-prevention/process-order
 * @desc Process a new order for return prevention
 */
router.post('/process-order', async(req, res) => {
    try {
        const { orderId, storeId } = req.body

        if (!orderId || !storeId) {
            return res.status(400).json({
                error: 'Order ID and store ID are required'
            })
        }

        // Get order details
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!order) {
            return res.status(404).json({ error: 'Order not found' })
        }

        // Assess return risk
        const assessment = await returnsPreventionService.assessReturnRisk(
            order,
            order.customer,
            order.items.map(item => item.product)
        )

        // Execute prevention strategies if risk is medium or high
        let preventionResults = null
        if (assessment.riskLevel === 'high' || assessment.riskLevel === 'medium') {
            preventionResults = await returnsPreventionService.executePreventionStrategies(
                orderId,
                assessment.preventionStrategies,
                order.customer
            )
        }

        res.json({
            success: true,
            data: {
                assessment,
                preventionExecuted: preventionResults !== null,
                preventionResults
            }
        })
    } catch (error) {
        console.error('Error processing order for return prevention:', error)
        res.status(500).json({ error: 'Failed to process order' })
    }
})

/**
 * @route GET /api/returns-prevention/analytics
 * @desc Get returns prevention analytics
 */
router.get('/analytics', async(req, res) => {
    try {
        const { storeId, days = 30 } = req.query

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const analytics = await returnsPreventionService.getPreventionAnalytics(storeId, parseInt(days))

        res.json({
            success: true,
            data: analytics
        })
    } catch (error) {
        console.error('Error getting analytics:', error)
        res.status(500).json({ error: 'Failed to get analytics' })
    }
})

/**
 * @route GET /api/returns-prevention/risk-factors
 * @desc Get common risk factors and their descriptions
 */
router.get('/risk-factors', async(req, res) => {
    try {
        const riskFactors = {
            customer: {
                high_return_rate: {
                    name: 'High Return Rate',
                    description: 'Customer has returned more than 20% of previous orders',
                    impact: 'high',
                    prevention: 'Enhanced communication and support'
                },
                new_customer: {
                    name: 'New Customer',
                    description: 'First-time customer with no purchase history',
                    impact: 'medium',
                    prevention: 'Welcome communication and product education'
                },
                infrequent_buyer: {
                    name: 'Infrequent Buyer',
                    description: 'Customer who rarely makes purchases',
                    impact: 'medium',
                    prevention: 'Re-engagement and product education'
                }
            },
            product: {
                high_risk_category: {
                    name: 'High-Risk Category',
                    description: 'Product category with historically high return rates',
                    impact: 'high',
                    prevention: 'Detailed sizing guides and product education'
                },
                high_value_item: {
                    name: 'High-Value Item',
                    description: 'Expensive product over $200',
                    impact: 'medium',
                    prevention: 'Enhanced support and detailed product information'
                },
                size_dependent: {
                    name: 'Size-Dependent Product',
                    description: 'Product where fit is critical (clothing, shoes)',
                    impact: 'high',
                    prevention: 'Sizing guides and fit recommendations'
                },
                color_dependent: {
                    name: 'Color-Dependent Product',
                    description: 'Product where color accuracy is important',
                    impact: 'medium',
                    prevention: 'Color-accurate images and descriptions'
                }
            },
            order: {
                large_order: {
                    name: 'Large Order',
                    description: 'Order value over $300',
                    impact: 'medium',
                    prevention: 'Enhanced communication and support'
                },
                multiple_items: {
                    name: 'Multiple Items',
                    description: 'Order with 5+ different items',
                    impact: 'medium',
                    prevention: 'Order confirmation and item-by-item support'
                },
                express_shipping: {
                    name: 'Express Shipping',
                    description: 'Order with expedited shipping',
                    impact: 'medium',
                    prevention: 'Enhanced tracking and delivery communication'
                }
            },
            seasonal: {
                holiday_season: {
                    name: 'Holiday Season',
                    description: 'Order placed during peak holiday periods',
                    impact: 'high',
                    prevention: 'Extended return windows and enhanced support'
                },
                late_night_order: {
                    name: 'Late Night Order',
                    description: 'Order placed between 10 PM and 6 AM',
                    impact: 'medium',
                    prevention: 'Order confirmation and follow-up communication'
                }
            }
        }

        res.json({
            success: true,
            data: riskFactors
        })
    } catch (error) {
        console.error('Error getting risk factors:', error)
        res.status(500).json({ error: 'Failed to get risk factors' })
    }
})

/**
 * @route GET /api/returns-prevention/prevention-strategies
 * @desc Get prevention strategy templates
 */
router.get('/prevention-strategies', async(req, res) => {
    try {
        const strategies = {
            low_risk: {
                name: 'Low Risk Prevention',
                description: 'Standard communication for low-risk orders',
                communication: {
                    immediate: 'Thank you for your order! We\'re excited to get your items to you.',
                    shipping: 'Your order is on its way! Track your delivery here.',
                    delivery: 'Your order has been delivered! We hope you love it.',
                    followup: 'How are you enjoying your purchase? We\'d love to hear from you!'
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 24,
                    delivery_contact: 2,
                    followup_contact: 3
                }
            },
            medium_risk: {
                name: 'Medium Risk Prevention',
                description: 'Enhanced communication for medium-risk orders',
                communication: {
                    immediate: 'Thank you for your order! We want to ensure you\'re completely satisfied.',
                    shipping: 'Your order is shipping! We\'ve included helpful information to ensure you love your purchase.',
                    delivery: 'Your order has arrived! We\'re here to help if you need anything.',
                    followup: 'We want to make sure you\'re happy with your purchase. How is everything working out?'
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 12,
                    delivery_contact: 1,
                    followup_contact: 2
                }
            },
            high_risk: {
                name: 'High Risk Prevention',
                description: 'Intensive communication for high-risk orders',
                communication: {
                    immediate: 'Thank you for your order! We\'re committed to ensuring your complete satisfaction.',
                    shipping: 'Your order is on its way! We\'ve included detailed information to help you get the most from your purchase.',
                    delivery: 'Your order has been delivered! We\'re here to help with any questions or concerns.',
                    followup: 'We want to ensure you\'re completely satisfied. Please let us know if you need any assistance!'
                },
                timing: {
                    immediate_contact: 1,
                    shipping_contact: 6,
                    delivery_contact: 1,
                    followup_contact: 1
                }
            }
        }

        res.json({
            success: true,
            data: strategies
        })
    } catch (error) {
        console.error('Error getting prevention strategies:', error)
        res.status(500).json({ error: 'Failed to get prevention strategies' })
    }
})

/**
 * @route GET /api/returns-prevention/orders/:orderId
 * @desc Get return prevention data for a specific order
 */
router.get('/orders/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params

        const events = await prisma.event.findMany({
            where: {
                type: {
                    startsWith: 'returns_prevention'
                },
                payload: {
                    path: ['orderId'],
                    equals: orderId
                }
            },
            orderBy: {
                ts: 'desc'
            }
        })

        const preventionData = {
            orderId,
            assessments: [],
            preventionAttempts: [],
            lastAssessment: null,
            lastPrevention: null
        }

        for (const event of events) {
            const payload = event.payload || {}

            if (event.type === 'returns_risk_assessment') {
                preventionData.assessments.push({
                    timestamp: event.ts,
                    riskScore: payload.riskScore,
                    riskLevel: payload.riskLevel,
                    riskFactors: payload.riskFactors || []
                })
                if (!preventionData.lastAssessment) {
                    preventionData.lastAssessment = {
                        timestamp: event.ts,
                        riskScore: payload.riskScore,
                        riskLevel: payload.riskLevel,
                        riskFactors: payload.riskFactors || []
                    }
                }
            } else if (event.type === 'returns_prevention_attempt') {
                preventionData.preventionAttempts.push({
                    timestamp: event.ts,
                    strategies: payload.strategies,
                    results: payload.results
                })
                if (!preventionData.lastPrevention) {
                    preventionData.lastPrevention = {
                        timestamp: event.ts,
                        strategies: payload.strategies,
                        results: payload.results
                    }
                }
            }
        }

        res.json({
            success: true,
            data: preventionData
        })
    } catch (error) {
        console.error('Error getting order prevention data:', error)
        res.status(500).json({ error: 'Failed to get order prevention data' })
    }
})

/**
 * @route GET /api/returns-prevention/test
 * @desc Test endpoint for returns prevention
 */
router.get('/test', async(req, res) => {
    res.json({
        success: true,
        message: 'Returns Prevention Agent API is working!',
        endpoints: {
            'POST /assess': 'Assess return risk for an order',
            'POST /execute': 'Execute prevention strategies',
            'POST /process-order': 'Process new order for prevention',
            'GET /analytics': 'Get prevention analytics',
            'GET /risk-factors': 'Get common risk factors',
            'GET /prevention-strategies': 'Get strategy templates',
            'GET /orders/:id': 'Get order prevention data'
        },
        features: {
            'AI Risk Assessment': 'Analyzes orders for return risk',
            'Proactive Communication': 'Sends personalized prevention messages',
            'Strategy Execution': 'Implements prevention strategies automatically',
            'Analytics & Reporting': 'Tracks prevention effectiveness',
            'Multi-Channel Support': 'Email, SMS, and WhatsApp communication'
        }
    })
})

export default router