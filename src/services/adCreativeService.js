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
                    maxLength = 125
            } = options

            const prompt = this.buildCreativePrompt(product, platform, {
                targetAudience,
                tone,
                focus,
                includeCTA,
                maxLength
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
                    generatedAt: new Date().toISOString()
                }
            }
        } catch (error) {
            console.error('Error generating ad creative:', error)
            throw error
        }
    }

    /**
     * Build platform-specific creative prompt
     */
    buildCreativePrompt(product, platform, options) {
        const { targetAudience, tone, focus, includeCTA, maxLength } = options

        const productInfo = `
Product: ${product.title}
Category: ${product.category || 'General'}
Price: $${product.price}
Description: ${product.description || 'No description available'}
Brand: ${product.brand || 'Unknown'}
        `.trim()

        const platformGuidelines = {
            meta: {
                headline: 'Primary text (125 characters max)',
                description: 'Ad copy (2-3 sentences)',
                cta: 'Call-to-action button text'
            },
            tiktok: {
                headline: 'Ad text (150 characters max)',
                description: 'Engaging, trend-focused copy',
                cta: 'Action-oriented CTA'
            },
            google: {
                headline: 'Headline 1 (30 characters max)',
                description: 'Description line 1 (90 characters max)',
                cta: 'Call-to-action text'
            },
            pinterest: {
                headline: 'Pin title (100 characters max)',
                description: 'Pin description (500 characters max)',
                cta: 'Action text'
            }
        }

        const guidelines = platformGuidelines[platform] || platformGuidelines.meta

        return `Generate a compelling ${platform.toUpperCase()} ad creative for this product:

${productInfo}

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
- Focus on ${focus}

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
                    headline: c.outputs?.headline || '',
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