import express from 'express'
import { adCreativeService } from '../services/adCreativeService.js'
import { prisma } from '../db.js'

const router = express.Router()

/**
 * @route GET /api/ad-creatives/test
 * @desc Test endpoint for ad creatives
 */
router.get('/test', async(req, res) => {
    res.json({
        success: true,
        message: 'Ad Creative Auto-Optimizer API is working!',
        endpoints: {
            'POST /generate': 'Generate AI ad creative',
            'POST /ab-test': 'Create A/B test',
            'POST /:id/track': 'Track performance metrics',
            'POST /optimize': 'Optimize creatives',
            'GET /analytics': 'Get performance analytics',
            'GET /platforms': 'Get supported platforms',
            'GET /:id': 'Get creative details',
            'PUT /:id': 'Update creative',
            'DELETE /:id': 'Delete creative',
            'GET /': 'List all creatives'
        }
    })
})

/**
 * @route POST /api/ad-creatives/generate
 * @desc Generate AI-powered ad creative for a product
 */
router.post('/generate', async(req, res) => {
    try {
        const { product, platform = 'meta', options = {} } = req.body

        if (!product) {
            return res.status(400).json({ error: 'Product data is required' })
        }

        const result = await adCreativeService.generateAdCreative(product, platform, options)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error generating ad creative:', error)
        res.status(500).json({ error: 'Failed to generate ad creative' })
    }
})

/**
 * @route POST /api/ad-creatives/ab-test
 * @desc Create A/B test for ad creatives
 */
router.post('/ab-test', async(req, res) => {
    try {
        const { creatives, options = {} } = req.body

        if (!creatives || !Array.isArray(creatives) || creatives.length < 2) {
            return res.status(400).json({ error: 'At least 2 creatives are required for A/B testing' })
        }

        const result = await adCreativeService.createABTest(creatives, options)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error creating A/B test:', error)
        res.status(500).json({ error: 'Failed to create A/B test' })
    }
})

/**
 * @route POST /api/ad-creatives/:creativeId/track
 * @desc Track ad performance metrics
 */
router.post('/:creativeId/track', async(req, res) => {
    try {
        const { creativeId } = req.params
        const metrics = req.body

        if (!metrics) {
            return res.status(400).json({ error: 'Performance metrics are required' })
        }

        const result = await adCreativeService.trackPerformance(creativeId, metrics)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error tracking performance:', error)
        res.status(500).json({ error: 'Failed to track performance' })
    }
})

/**
 * @route POST /api/ad-creatives/optimize
 * @desc Optimize creatives based on performance data
 */
router.post('/optimize', async(req, res) => {
    try {
        const { storeId, platform = 'meta' } = req.body

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const result = await adCreativeService.optimizeCreatives(storeId, platform)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error optimizing creatives:', error)
        res.status(500).json({ error: 'Failed to optimize creatives' })
    }
})

/**
 * @route GET /api/ad-creatives/analytics
 * @desc Get creative performance analytics
 */
router.get('/analytics', async(req, res) => {
    try {
        const { storeId, platform = 'meta', days = 30 } = req.query

        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' })
        }

        const analytics = await adCreativeService.getCreativeAnalytics(storeId, platform, parseInt(days))

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
 * @route GET /api/ad-creatives/platforms
 * @desc Get supported advertising platforms
 */
router.get('/platforms', async(req, res) => {
    try {
        const platforms = {
            meta: {
                name: 'Meta (Facebook & Instagram)',
                features: ['Image ads', 'Video ads', 'Carousel ads', 'Stories ads'],
                guidelines: {
                    headline: '125 characters max',
                    description: '2-3 sentences',
                    cta: 'Call-to-action button'
                }
            },
            tiktok: {
                name: 'TikTok Ads',
                features: ['In-feed ads', 'TopView ads', 'Branded hashtag challenges'],
                guidelines: {
                    headline: '150 characters max',
                    description: 'Engaging, trend-focused copy',
                    cta: 'Action-oriented CTA'
                }
            },
            google: {
                name: 'Google Ads',
                features: ['Search ads', 'Display ads', 'Shopping ads', 'Video ads'],
                guidelines: {
                    headline: '30 characters max',
                    description: '90 characters max',
                    cta: 'Call-to-action text'
                }
            },
            pinterest: {
                name: 'Pinterest Ads',
                features: ['Promoted pins', 'Shopping ads', 'Video ads'],
                guidelines: {
                    headline: '100 characters max',
                    description: '500 characters max',
                    cta: 'Action text'
                }
            }
        }

        res.json({
            success: true,
            data: platforms
        })
    } catch (error) {
        console.error('Error getting platforms:', error)
        res.status(500).json({ error: 'Failed to get platforms' })
    }
})

/**
 * @route GET /api/ad-creatives/:creativeId
 * @desc Get specific ad creative details
 */
router.get('/:creativeId', async(req, res) => {
    try {
        const { creativeId } = req.params

        const creative = await prisma.adCreative.findUnique({
            where: { id: creativeId },
            include: {
                launch: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!creative) {
            return res.status(404).json({ error: 'Ad creative not found' })
        }

        res.json({
            success: true,
            data: creative
        })
    } catch (error) {
        console.error('Error getting creative:', error)
        res.status(500).json({ error: 'Failed to get creative' })
    }
})

/**
 * @route PUT /api/ad-creatives/:creativeId
 * @desc Update ad creative
 */
router.put('/:creativeId', async(req, res) => {
    try {
        const { creativeId } = req.params
        const updates = req.body

        const creative = await prisma.adCreative.update({
            where: { id: creativeId },
            data: {
                inputs: updates.inputs || {},
                outputs: updates.outputs || {},
                status: updates.status || 'DRAFT',
                updatedAt: new Date()
            }
        })

        res.json({
            success: true,
            data: creative
        })
    } catch (error) {
        console.error('Error updating creative:', error)
        res.status(500).json({ error: 'Failed to update creative' })
    }
})

/**
 * @route DELETE /api/ad-creatives/:creativeId
 * @desc Delete ad creative
 */
router.delete('/:creativeId', async(req, res) => {
    try {
        const { creativeId } = req.params

        await prisma.adCreative.delete({
            where: { id: creativeId }
        })

        res.json({
            success: true,
            message: 'Ad creative deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting creative:', error)
        res.status(500).json({ error: 'Failed to delete creative' })
    }
})

/**
 * @route POST /api/ad-creatives/launch/:launchId/generate
 * @desc Generate ad creatives for all platforms based on launch
 */
router.post('/launch/:launchId/generate', async(req, res) => {
    try {
        const { launchId } = req.params

        const result = await adCreativeService.generateLaunchCreatives(launchId)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error generating launch creatives:', error)
        res.status(500).json({
            error: 'Failed to generate launch creatives',
            message: error.message
        })
    }
})

/**
 * @route POST /api/ad-creatives/launch/:launchId/track-performance
 * @desc Track unified performance across launch and all creatives
 */
router.post('/launch/:launchId/track-performance', async(req, res) => {
    try {
        const { launchId } = req.params
        const metrics = req.body

        const result = await adCreativeService.trackLaunchPerformance(launchId, metrics)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error tracking launch performance:', error)
        res.status(500).json({
            error: 'Failed to track launch performance',
            message: error.message
        })
    }
})

/**
 * @route POST /api/ad-creatives/launch/:launchId/optimize
 * @desc Optimize creatives for a specific launch based on performance
 */
router.post('/launch/:launchId/optimize', async(req, res) => {
    try {
        const { launchId } = req.params

        const result = await adCreativeService.optimizeLaunchCreatives(launchId)

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error optimizing launch creatives:', error)
        res.status(500).json({
            error: 'Failed to optimize launch creatives',
            message: error.message
        })
    }
})

/**
 * @route GET /api/ad-creatives/launch/:launchId
 * @desc Get all ad creatives for a specific launch
 */
router.get('/launch/:launchId', async(req, res) => {
    try {
        const { launchId } = req.params

        const creatives = await prisma.adCreative.findMany({
            where: { launchId },
            include: {
                launch: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        res.json({
            success: true,
            data: {
                launchId,
                creatives,
                total: creatives.length
            }
        })
    } catch (error) {
        console.error('Error getting launch creatives:', error)
        res.status(500).json({
            error: 'Failed to get launch creatives',
            message: error.message
        })
    }
})

/**
 * @route POST /api/ad-creatives/launch/:launchId/export
 * @desc Export creatives in multiple formats for a launch
 */
router.post('/launch/:launchId/export', async(req, res) => {
    try {
        const { launchId } = req.params
        const { platforms, formats, sizes, includeVariations } = req.body

        const result = await adCreativeService.exportLaunchCreatives(launchId, {
            platforms: platforms || ['meta', 'tiktok', 'google', 'pinterest'],
            formats: formats || ['image', 'video', 'carousel'],
            sizes: sizes || ['square', 'landscape', 'portrait'],
            includeVariations: includeVariations || false
        })

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error exporting launch creatives:', error)
        res.status(500).json({
            error: 'Failed to export launch creatives',
            message: error.message
        })
    }
})

/**
 * @route GET /api/ad-creatives
 * @desc Get all ad creatives for a store
 */
router.get('/', async(req, res) => {
    try {
        const { storeId, platform, status, limit = 20, offset = 0 } = req.query

        const where = {}
        if (storeId) where.launch = { workspace: { stores: { some: { id: storeId } } } }
        if (platform) where.platform = platform
        if (status) where.status = status

        const creatives = await prisma.adCreative.findMany({
            where,
            include: {
                launch: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        const total = await prisma.adCreative.count({ where })

        res.json({
            success: true,
            data: {
                creatives,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + parseInt(limit)
                }
            }
        })
    } catch (error) {
        console.error('Error getting creatives:', error)
        res.status(500).json({ error: 'Failed to get creatives' })
    }
})

export default router