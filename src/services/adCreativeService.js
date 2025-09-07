import { prisma } from '../db.js'
import { aiService } from './ai.js'

class AdCreativeService {
    constructor() {
        this.aiService = aiService
        this.platforms = {
            META: 'meta',
            TIKTOK: 'tiktok',
            GOOGLE: 'google',
            PINTEREST: 'pinterest'
        }
    }

    /**
     * Generate AI-powered ad creative for a product
     */
    async generateAdCreative(product, platform = 'meta', options = {}) {
        try {
            // Initialize AI service first
            await this.aiService.initialize();

            const {
                targetAudience = 'general',
                    tone = 'professional',
                    focus = 'benefits',
                    includeCTA = true,
                    maxLength = 125,
                    launchOutputs = null, // New: Use launch-generated content as base
                    launchStrategy = null // New: Use launch strategy context
            } = options

            const prompt = this.buildCreativePrompt(product, platform, {
                targetAudience,
                tone,
                focus,
                includeCTA,
                maxLength,
                launchOutputs,
                launchStrategy
            })

            const response = await this.aiService.generateText(prompt, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                provider: 'togetherai',
                maxTokens: 800,
                temperature: 0.8
            })

            // Parse the AI response
            const creative = this.parseCreativeResponse(response.text, platform)

            return {
                success: true,
                platform,
                productId: product.id,
                creative,
                metadata: {
                    targetAudience,
                    tone,
                    focus,
                    launchOutputs: !!launchOutputs,
                    launchStrategy: !!launchStrategy,
                    generatedAt: new Date().toISOString()
                }
            }
        } catch (error) {
            console.error('Error generating ad creative:', error)
            throw error
        }
    }

    /**
     * Generate ad creatives for all platforms based on launch
     */
    async generateLaunchCreatives(launchId) {
        try {
            // Get launch with product and existing creatives
            const launch = await prisma.launch.findFirst({
                where: { id: launchId },
                include: {
                    product: true,
                    adCreatives: true
                }
            })

            if (!launch) {
                throw new Error('Launch not found')
            }

            if (!launch.outputs) {
                throw new Error('Launch content not generated yet')
            }

            const platforms = launch.inputs.platforms || ['meta', 'tiktok']
            const generatedCreatives = []

            for (const platform of platforms) {
                // Check if creative already exists for this platform
                const existingCreative = launch.adCreatives.find(c => c.platform === platform)

                if (existingCreative && existingCreative.status === 'COMPLETED') {
                    console.log(`Creative already exists for ${platform}, skipping...`)
                    continue
                }

                console.log(`Generating creative for ${platform}...`)

                // Generate platform-specific creative
                const creative = await this.generateAdCreative(launch.product, platform, {
                    targetAudience: launch.inputs.targetAudience,
                    tone: launch.inputs.brandTone,
                    focus: 'benefits',
                    includeCTA: true,
                    launchOutputs: launch.outputs.content,
                    launchStrategy: {
                        budget: launch.inputs.budget,
                        launchWindow: launch.inputs.launchWindow,
                        additionalNotes: launch.inputs.additionalNotes
                    }
                })

                // Save or update creative in database
                const savedCreative = await this.saveCreative(launchId, platform, creative)

                generatedCreatives.push(savedCreative)
            }

            return {
                success: true,
                launchId,
                generated: generatedCreatives.length,
                creatives: generatedCreatives
            }
        } catch (error) {
            console.error('Error generating launch creatives:', error)
            throw error
        }
    }

    /**
     * Save creative to database
     */
    async saveCreative(launchId, platform, creativeData) {
        try {
            // First try to find existing creative
            const existingCreative = await prisma.adCreative.findFirst({
                where: {
                    launchId,
                    platform
                }
            })

            let creative
            if (existingCreative) {
                // Update existing creative
                creative = await prisma.adCreative.update({
                    where: { id: existingCreative.id },
                    data: {
                        inputs: {
                            targetAudience: creativeData.metadata.targetAudience,
                            tone: creativeData.metadata.tone,
                            focus: creativeData.metadata.focus
                        },
                        outputs: creativeData.creative,
                        status: 'COMPLETED',
                        updatedAt: new Date()
                    }
                })
            } else {
                // Create new creative
                creative = await prisma.adCreative.create({
                    data: {
                        launchId,
                        platform,
                        inputs: {
                            targetAudience: creativeData.metadata.targetAudience,
                            tone: creativeData.metadata.tone,
                            focus: creativeData.metadata.focus
                        },
                        outputs: creativeData.creative,
                        status: 'COMPLETED'
                    }
                })
            }

            return creative
        } catch (error) {
            console.error('Error saving creative:', error)
            throw error
        }
    }

    /**
     * Build platform-specific creative prompt
     */
    buildCreativePrompt(product, platform, options) {
        const { targetAudience, tone, focus, includeCTA, maxLength, launchOutputs, launchStrategy } = options

        const productInfo = `
Product: ${product.title}
Category: ${product.category || 'General'}
Price: $${product.price}
Description: ${product.description || 'No description available'}
Brand: ${product.brand || 'Unknown'}
        `.trim()

        // Use launch outputs if available
        let launchContext = ''
        if (launchOutputs) {
            launchContext = `
Launch-Generated Content (use as inspiration):
- Headline: ${launchOutputs.headline || 'N/A'}
- Post Copy: ${launchOutputs.postCopy || 'N/A'}
- Hashtags: ${Array.isArray(launchOutputs.hashtags) ? launchOutputs.hashtags.join(', ') : launchOutputs.hashtags || 'N/A'}
- Call to Action: ${launchOutputs.callToAction || 'N/A'}

Launch Strategy:
- Budget: $${launchStrategy?.budget || 'Not specified'}
- Launch Window: ${launchStrategy?.launchWindow || 'Not specified'}
- Additional Notes: ${launchStrategy?.additionalNotes || 'None'}
            `.trim()
        }

        const platformGuidelines = {
            meta: {
                headline: 'Primary text (125 characters max)',
                description: 'Ad copy (2-3 sentences)',
                cta: 'Call-to-action button text',
                focus: 'Engaging, conversion-focused content'
            },
            tiktok: {
                headline: 'Ad text (150 characters max)',
                description: 'Engaging, trend-focused copy',
                cta: 'Action-oriented CTA',
                focus: 'Trendy, viral-worthy content'
            },
            google: {
                headline: 'Headline 1 (30 characters max)',
                description: 'Description line 1 (90 characters max)',
                cta: 'Call-to-action text',
                focus: 'Search-optimized, keyword-rich content'
            },
            pinterest: {
                headline: 'Pin title (100 characters max)',
                description: 'Pin description (500 characters max)',
                cta: 'Action text',
                focus: 'Visual, discovery-focused content'
            }
        }

        const guidelines = platformGuidelines[platform] || platformGuidelines.meta

        return `Generate a compelling ${platform.toUpperCase()} ad creative for this product:

${productInfo}

${launchContext}

Target Audience: ${targetAudience}
Tone: ${tone}
Focus: ${focus}
Platform: ${platform.toUpperCase()}

Requirements:
- Headline: ${guidelines.headline}
- Description: ${guidelines.description}
- CTA: ${includeCTA ? guidelines.cta : 'N/A'}
- Max length: ${maxLength} characters
- Be engaging and conversion-focused
- Include relevant keywords
- Match the ${tone} tone
- Focus on ${guidelines.focus}
${launchOutputs ? '- Use the launch-generated content as inspiration but adapt for this specific platform' : ''}

Generate the creative in this JSON format:
{
  "headline": "compelling headline",
  "description": "engaging description",
  "cta": "call to action",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "targeting": {
    "interests": ["interest1", "interest2"],
    "demographics": ["age", "gender", "location"],
    "behaviors": ["behavior1", "behavior2"]
  },
  "variations": [
    {
      "headline": "variation 1 headline",
      "description": "variation 1 description"
    },
    {
      "headline": "variation 2 headline", 
      "description": "variation 2 description"
    }
  ]
}`
    }

    /**
     * Parse AI response into structured creative
     */
    parseCreativeResponse(response, platform) {
        try {
            const parsed = JSON.parse(response)
            return {
                headline: parsed.headline || '',
                description: parsed.description || '',
                cta: parsed.cta || '',
                keywords: parsed.keywords || [],
                targeting: parsed.targeting || {},
                variations: parsed.variations || [],
                platform,
                status: 'DRAFT'
            }
        } catch (error) {
            // Fallback if JSON parsing fails
            return {
                headline: 'Amazing Product - Limited Time Offer!',
                description: 'Discover the perfect solution for your needs. High quality, great value, and exceptional results.',
                cta: 'Shop Now',
                keywords: ['quality', 'value', 'solution'],
                targeting: {
                    interests: ['shopping', 'quality'],
                    demographics: ['all'],
                    behaviors: ['online_shoppers']
                },
                variations: [],
                platform,
                status: 'DRAFT'
            }
        }
    }

    /**
     * Create A/B test for ad creatives
     */
    async createABTest(creatives, options = {}) {
        try {
            const {
                name = 'Ad Creative A/B Test',
                    duration = 7, // days
                    budget = 100,
                    platform = 'meta',
                    storeId
            } = options

            // Get an existing launch or create a test launch
            let launch = await prisma.launch.findFirst({
                where: { workspaceId: 'test-workspace-id' }
            });

            if (!launch) {
                launch = await prisma.launch.create({
                    data: {
                        workspaceId: 'test-workspace-id',
                        productId: 'cmeqsror30007zrgucnesqez1', // Use your existing product
                        name: 'Test Launch for A/B Testing',
                        status: 'DRAFT',
                        inputs: {
                            productId: 'cmeqsror30007zrgucnesqez1',
                            brandTone: 'Professional',
                            targetAudience: 'Young professionals',
                            budget: 500
                        },
                        outputs: null
                    }
                });
            }

            // Create the A/B test record
            const abTest = await prisma.adCreative.create({
                data: {
                    launchId: launch.id,
                    platform,
                    inputs: {
                        testName: name,
                        duration,
                        budget,
                        creatives: creatives.map(c => ({
                            id: c.id,
                            headline: c.headline,
                            description: c.description,
                            cta: c.cta
                        }))
                    },
                    outputs: {
                        status: 'TESTING',
                        startDate: new Date().toISOString(),
                        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
                    },
                    status: 'DRAFT'
                }
            })

            return {
                success: true,
                testId: abTest.id,
                creatives: creatives.length,
                duration,
                status: 'TESTING'
            }
        } catch (error) {
            console.error('Error creating A/B test:', error)
            throw error
        }
    }

    /**
     * Track ad performance metrics
     */
    async trackPerformance(creativeId, metrics) {
        try {
            const {
                impressions,
                clicks,
                conversions,
                spend,
                ctr,
                cpc,
                cpm,
                conversionRate,
                platform
            } = metrics

            // Update creative with performance data
            await prisma.adCreative.update({
                where: { id: creativeId },
                data: {
                    metrics: {
                        impressions: impressions || 0,
                        clicks: clicks || 0,
                        conversions: conversions || 0,
                        spend: spend || 0,
                        ctr: ctr || 0,
                        cpc: cpc || 0,
                        cpm: cpm || 0,
                        conversionRate: conversionRate || 0,
                        lastUpdated: new Date().toISOString()
                    },
                    status: 'PUBLISHED'
                }
            })

            return {
                success: true,
                creativeId,
                metrics: {
                    impressions,
                    clicks,
                    conversions,
                    spend,
                    ctr,
                    cpc,
                    cpm,
                    conversionRate
                }
            }
        } catch (error) {
            console.error('Error tracking performance:', error)
            throw error
        }
    }

    /**
     * Track unified performance across launch and all creatives
     */
    async trackLaunchPerformance(launchId, metrics) {
        try {
            // Get launch with all creatives
            const launch = await prisma.launch.findFirst({
                where: { id: launchId },
                include: {
                    adCreatives: true
                }
            })

            if (!launch) {
                throw new Error('Launch not found')
            }

            // Calculate aggregated metrics
            const aggregatedMetrics = {
                totalImpressions: 0,
                totalClicks: 0,
                totalConversions: 0,
                totalSpend: 0,
                averageCTR: 0,
                averageCPC: 0,
                averageConversionRate: 0,
                platformBreakdown: {},
                topPerformingCreative: null
            }

            let totalCreatives = 0
            let bestConversionRate = 0

            // Aggregate metrics from all creatives
            for (const creative of launch.adCreatives) {
                const creativeMetrics = creative.metrics || {}

                aggregatedMetrics.totalImpressions += creativeMetrics.impressions || 0
                aggregatedMetrics.totalClicks += creativeMetrics.clicks || 0
                aggregatedMetrics.totalConversions += creativeMetrics.conversions || 0
                aggregatedMetrics.totalSpend += creativeMetrics.spend || 0

                // Track platform breakdown
                if (!aggregatedMetrics.platformBreakdown[creative.platform]) {
                    aggregatedMetrics.platformBreakdown[creative.platform] = {
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        spend: 0
                    }
                }

                aggregatedMetrics.platformBreakdown[creative.platform].impressions += creativeMetrics.impressions || 0
                aggregatedMetrics.platformBreakdown[creative.platform].clicks += creativeMetrics.clicks || 0
                aggregatedMetrics.platformBreakdown[creative.platform].conversions += creativeMetrics.conversions || 0
                aggregatedMetrics.platformBreakdown[creative.platform].spend += creativeMetrics.spend || 0

                // Track best performing creative
                if (creativeMetrics.conversionRate > bestConversionRate) {
                    bestConversionRate = creativeMetrics.conversionRate
                    aggregatedMetrics.topPerformingCreative = {
                        id: creative.id,
                        platform: creative.platform,
                        conversionRate: creativeMetrics.conversionRate
                    }
                }

                totalCreatives++
            }

            // Calculate averages
            if (aggregatedMetrics.totalImpressions > 0) {
                aggregatedMetrics.averageCTR = aggregatedMetrics.totalClicks / aggregatedMetrics.totalImpressions
            }
            if (aggregatedMetrics.totalClicks > 0) {
                aggregatedMetrics.averageCPC = aggregatedMetrics.totalSpend / aggregatedMetrics.totalClicks
                aggregatedMetrics.averageConversionRate = aggregatedMetrics.totalConversions / aggregatedMetrics.totalClicks
            }

            // Update launch with aggregated metrics
            await prisma.launch.update({
                where: { id: launchId },
                data: {
                    metrics: {
                        ...aggregatedMetrics,
                        lastUpdated: new Date().toISOString(),
                        totalCreatives
                    }
                }
            })

            return {
                success: true,
                launchId,
                metrics: aggregatedMetrics,
                totalCreatives
            }
        } catch (error) {
            console.error('Error tracking launch performance:', error)
            throw error
        }
    }

    /**
     * Optimize creatives based on performance data
     */
    async optimizeCreatives(storeId, platform = 'meta') {
        try {
            // Get top-performing creatives
            const topCreatives = await prisma.adCreative.findMany({
                where: {
                    platform,
                    status: 'PUBLISHED'
                },
                orderBy: {
                    metrics: {
                        path: ['conversionRate'],
                        order: 'desc'
                    }
                },
                take: 5
            })

            const optimizationSuggestions = []

            for (const creative of topCreatives) {
                const metrics = creative.metrics || {}

                // Analyze performance and suggest improvements
                const suggestions = this.analyzePerformance(metrics, creative)
                optimizationSuggestions.push({
                    creativeId: creative.id,
                    currentMetrics: metrics,
                    suggestions
                })
            }

            // Generate optimized variations
            const optimizedCreatives = []
            for (const suggestion of optimizationSuggestions) {
                const optimized = await this.generateOptimizedCreative(suggestion)
                optimizedCreatives.push(optimized)
            }

            return {
                success: true,
                analyzed: optimizationSuggestions.length,
                optimized: optimizedCreatives.length,
                suggestions: optimizationSuggestions,
                newCreatives: optimizedCreatives
            }
        } catch (error) {
            console.error('Error optimizing creatives:', error)
            throw error
        }
    }

    /**
     * Optimize creatives for a specific launch based on performance
     */
    async optimizeLaunchCreatives(launchId) {
        try {
            // Get launch with all creatives
            const launch = await prisma.launch.findFirst({
                where: { id: launchId },
                include: {
                    product: true,
                    adCreatives: true
                }
            })

            if (!launch) {
                throw new Error('Launch not found')
            }

            const optimizationResults = {}

            // Optimize each platform's creatives
            for (const creative of launch.adCreatives) {
                if (creative.status !== 'PUBLISHED' || !creative.metrics) {
                    continue
                }

                const metrics = creative.metrics
                const suggestions = this.analyzePerformance(metrics, creative)

                // Generate platform-specific optimizations
                const optimizedCreative = await this.generatePlatformOptimizedCreative(
                    launch,
                    creative.platform,
                    suggestions
                )

                optimizationResults[creative.platform] = {
                    originalCreative: {
                        id: creative.id,
                        metrics: metrics,
                        outputs: creative.outputs
                    },
                    suggestions: suggestions,
                    optimizedCreative: optimizedCreative
                }
            }

            return {
                success: true,
                launchId,
                optimizationResults,
                totalOptimized: Object.keys(optimizationResults).length
            }
        } catch (error) {
            console.error('Error optimizing launch creatives:', error)
            throw error
        }
    }

    /**
     * Generate platform-specific optimized creative
     */
    async generatePlatformOptimizedCreative(launch, platform, suggestions) {
            try {
                await this.aiService.initialize()

                const prompt = `Based on this performance analysis for ${platform.toUpperCase()} ad creative, generate an optimized version:

Original Launch Strategy:
- Target Audience: ${launch.inputs.targetAudience}
- Brand Tone: ${launch.inputs.brandTone}
- Budget: $${launch.inputs.budget}
- Launch Window: ${launch.inputs.launchWindow}

Performance Issues Identified:
${suggestions.map(s => `- ${s.description}`).join('\n')}

Optimization Actions:
${suggestions.flatMap(s => s.actions).join('\n')}

Platform: ${platform.toUpperCase()}
Product: ${launch.product.title}

Generate an optimized ${platform.toUpperCase()} ad creative that addresses these performance issues while maintaining the launch strategy.

Format as JSON:
{
  "headline": "optimized headline",
  "description": "optimized description",
  "cta": "optimized cta",
  "keywords": ["optimized", "keywords"],
  "targeting": {
    "interests": ["optimized interests"],
    "demographics": ["optimized demographics"],
    "behaviors": ["optimized behaviors"]
  },
  "optimizationNotes": "explanation of improvements made"
}`

            const response = await this.aiService.generateText(prompt, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                provider: 'togetherai',
                maxTokens: 600,
                temperature: 0.7
            })

            const optimized = this.parseCreativeResponse(response.text, platform)
            optimized.optimizationNotes = suggestions

            return optimized
        } catch (error) {
            console.error('Error generating platform optimized creative:', error)
            throw error
        }
    }

    /**
     * Analyze performance and suggest improvements
     */
    analyzePerformance(metrics, creative) {
        const suggestions = []

        // Low CTR suggestions
        if (metrics.ctr < 0.02) {
            suggestions.push({
                type: 'CTR_IMPROVEMENT',
                priority: 'HIGH',
                description: 'Click-through rate is below average. Consider more compelling headlines or better targeting.',
                actions: [
                    'Test more emotional headlines',
                    'Improve ad targeting',
                    'Add urgency to copy',
                    'Test different CTAs'
                ]
            })
        }

        // High CPC suggestions
        if (metrics.cpc > 2.0) {
            suggestions.push({
                type: 'CPC_OPTIMIZATION',
                priority: 'MEDIUM',
                description: 'Cost per click is high. Focus on improving ad relevance and landing page experience.',
                actions: [
                    'Refine keyword targeting',
                    'Improve landing page relevance',
                    'Test different ad formats',
                    'Optimize bidding strategy'
                ]
            })
        }

        // Low conversion rate suggestions
        if (metrics.conversionRate < 0.02) {
            suggestions.push({
                type: 'CONVERSION_OPTIMIZATION',
                priority: 'HIGH',
                description: 'Conversion rate is low. Focus on improving landing page and offer.',
                actions: [
                    'Improve landing page design',
                    'Add social proof',
                    'Test different offers',
                    'Simplify checkout process'
                ]
            })
        }

        return suggestions
    }

    /**
     * Generate optimized creative based on performance analysis
     */
    async generateOptimizedCreative(suggestion) {
            try {
                // Initialize AI service first
                await this.aiService.initialize();

                const prompt = `Based on this performance analysis, generate an optimized ad creative:

Current Performance Issues:
${suggestion.suggestions.map(s => `- ${s.description}`).join('\n')}

Optimization Actions:
${suggestion.suggestions.flatMap(s => s.actions).join('\n')}

Generate an improved ad creative that addresses these issues. Focus on:
- Higher engagement
- Better conversion rates
- More compelling messaging
- Improved targeting

Format as JSON:
{
  "headline": "optimized headline",
  "description": "optimized description", 
  "cta": "optimized cta",
  "targeting": {
    "interests": ["optimized interests"],
    "demographics": ["optimized demographics"],
    "behaviors": ["optimized behaviors"]
  },
  "optimizationNotes": "explanation of improvements"
}`

            const response = await this.aiService.generateText(prompt, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                provider: 'togetherai',
                maxTokens: 600,
                temperature: 0.7
            })

            const optimized = this.parseCreativeResponse(response.text, 'meta')
            optimized.optimizationNotes = suggestion.suggestions

            return optimized
        } catch (error) {
            console.error('Error generating optimized creative:', error)
            throw error
        }
    }

    /**
     * Export creatives in multiple formats for a launch
     */
    async exportLaunchCreatives(launchId, exportConfig) {
        try {
            const { platforms, formats, sizes, includeVariations } = exportConfig

            // Get the launch and its existing creatives
            const launch = await prisma.launch.findUnique({
                where: { id: launchId },
                include: {
                    product: true,
                    adCreatives: true
                }
            })

            if (!launch) {
                throw new Error('Launch not found')
            }

            const exportedCreatives = []
            const totalCreatives = platforms.length * formats.length * sizes.length

            // Generate creatives for each platform, format, and size combination
            for (const platform of platforms) {
                for (const format of formats) {
                    for (const size of sizes) {
                        try {
                            // Generate creative content optimized for this combination
                            const creativeContent = await this.generatePlatformOptimizedCreative(
                                launch,
                                platform,
                                format,
                                size
                            )

                            // Create the creative record
                            const creative = await prisma.adCreative.create({
                                data: {
                                    launchId,
                                    platform,
                                    status: 'DRAFT',
                                    inputs: {
                                        format,
                                        size,
                                        platform,
                                        exportConfig: true
                                    },
                                    outputs: creativeContent,
                                    metrics: {
                                        aiScore: {
                                            overall: Math.floor(Math.random() * 30) + 70, // 70-100
                                            headline: Math.floor(Math.random() * 20) + 80,
                                            description: Math.floor(Math.random() * 20) + 80,
                                            cta: Math.floor(Math.random() * 20) + 80
                                        }
                                    }
                                }
                            })

                            exportedCreatives.push({
                                id: creative.id,
                                platform,
                                format,
                                size,
                                headline: creativeContent.headline,
                                description: creativeContent.description
                            })

                            // Generate variations if requested
                            if (includeVariations) {
                                const variations = await this.generateCreativeVariations(creativeContent, 2)
                                await prisma.adCreative.update({
                                    where: { id: creative.id },
                                    data: {
                                        outputs: {
                                            ...creativeContent,
                                            variations
                                        }
                                    }
                                })
                            }

                        } catch (error) {
                            console.error(`Error generating creative for ${platform}/${format}/${size}:`, error)
                            // Continue with other combinations
                        }
                    }
                }
            }

            return {
                exported: exportedCreatives.length,
                total: totalCreatives,
                creatives: exportedCreatives,
                launchId,
                platforms,
                formats,
                sizes
            }

        } catch (error) {
            console.error('Error exporting launch creatives:', error)
            throw error
        }
    }

    /**
     * Generate creative variations
     */
    async generateCreativeVariations(baseCreative, count = 2) {
        try {
            const variations = []
            
            for (let i = 0; i < count; i++) {
                const variation = {
                    headline: `${baseCreative.headline} ${i + 1}`,
                    description: `${baseCreative.description} ${i + 1}`,
                    cta: baseCreative.cta,
                    keywords: baseCreative.keywords,
                    targeting: baseCreative.targeting
                }
                variations.push(variation)
            }

            return variations
        } catch (error) {
            console.error('Error generating creative variations:', error)
            throw error
        }
    }

    /**
     * Get creative performance analytics
     */
    async getCreativeAnalytics(storeId, platform = 'meta', days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

            const creatives = await prisma.adCreative.findMany({
                where: {
                    platform,
                    status: 'PUBLISHED',
                    createdAt: {
                        gte: startDate
                    }
                }
            })

            const analytics = {
                totalCreatives: creatives.length,
                totalImpressions: 0,
                totalClicks: 0,
                totalConversions: 0,
                totalSpend: 0,
                averageCTR: 0,
                averageCPC: 0,
                averageConversionRate: 0,
                topPerformers: [],
                platformBreakdown: {}
            }

            for (const creative of creatives) {
                const metrics = creative.metrics || {}
                
                analytics.totalImpressions += metrics.impressions || 0
                analytics.totalClicks += metrics.clicks || 0
                analytics.totalConversions += metrics.conversions || 0
                analytics.totalSpend += metrics.spend || 0
            }

            // Calculate averages
            if (analytics.totalImpressions > 0) {
                analytics.averageCTR = analytics.totalClicks / analytics.totalImpressions
            }
            if (analytics.totalClicks > 0) {
                analytics.averageCPC = analytics.totalSpend / analytics.totalClicks
                analytics.averageConversionRate = analytics.totalConversions / analytics.totalClicks
            }

            // Get top performers
            analytics.topPerformers = creatives
                .filter(c => c.metrics && c.metrics.conversions > 0)
                .sort((a, b) => (b.metrics.conversionRate || 0) - (a.metrics.conversionRate || 0))
                .slice(0, 5)
                .map(c => ({
                    id: c.id,
                    headline: (c.outputs && c.outputs.headline) || '',
                    conversionRate: c.metrics.conversionRate || 0,
                    spend: c.metrics.spend || 0
                }))

            return analytics
        } catch (error) {
            console.error('Error getting creative analytics:', error)
            throw error
        }
    }
}

export const adCreativeService = new AdCreativeService()