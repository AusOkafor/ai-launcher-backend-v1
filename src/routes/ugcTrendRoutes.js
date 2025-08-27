import express from 'express';
import { ugcTrendSpotterService } from '../services/ugcTrendSpotterService.js';
import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Test endpoint
router.get('/test', async(req, res) => {
    try {
        res.json({
            success: true,
            message: 'UGC Trend Spotter API is working!',
            endpoints: [
                'GET /test - Test endpoint',
                'POST /analyze-trends - Analyze social media trends',
                'POST /generate-content - Generate content suggestions',
                'POST /identify-viral-products - Identify viral product opportunities',
                'POST /find-influencers - Find influencer collaboration opportunities',
                'GET /analytics - Get trend analytics',
                'GET /platforms - Get supported platforms',
                'GET /categories - Get trend categories',
                'GET /trending-hashtags - Get trending hashtags',
                'GET /content-formats - Get content format recommendations',
                'GET /influencer-recommendations - Get influencer recommendations'
            ]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ingest UGC from social platforms
router.post('/ingest/:platform', async(req, res) => {
    try {
        const { platform } = req.params;
        const { hashtags = [], keywords = [], limit = 100 } = req.body;

        const ugcData = await ugcTrendSpotterService.ingestUGC(platform, {
            hashtags,
            keywords,
            limit
        });

        res.json({
            success: true,
            data: {
                platform,
                ingestedItems: ugcData.length,
                hashtags,
                keywords
            }
        });
    } catch (error) {
        logger.error(`Error ingesting UGC from ${req.params.platform}:`, error);
        res.status(500).json({
            success: false,
            error: `Failed to ingest UGC from ${req.params.platform}`
        });
    }
});

// Detect trending topics
router.get('/trends', async(req, res) => {
    try {
        const { days = 7, platform } = req.query;

        const trendingTopics = await ugcTrendSpotterService.detectTrendingTopics(parseInt(days), platform);

        res.json({
            success: true,
            data: {
                trendingTopics,
                totalTrends: trendingTopics.length,
                dateRange: `${days} days`,
                platform: platform || 'all'
            }
        });
    } catch (error) {
        logger.error('Error detecting trending topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to detect trending topics'
        });
    }
});

// Generate content hook suggestions
router.post('/content-hooks/:productId', async(req, res) => {
    try {
        const { productId } = req.params;
        const { platform = 'instagram' } = req.body;

        const contentHooks = await ugcTrendSpotterService.generateContentHookSuggestions(productId, platform);

        res.json({
            success: true,
            data: contentHooks
        });
    } catch (error) {
        logger.error('Error generating content hook suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate content hook suggestions'
        });
    }
});

// Search similar content using embeddings
router.post('/search-similar', async(req, res) => {
    try {
        const { query, platform, limit = 10 } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        const similarContent = await ugcTrendSpotterService.searchSimilarContent(query, platform, limit);

        res.json({
            success: true,
            data: {
                similarContent,
                totalResults: similarContent.length,
                query,
                platform: platform || 'all'
            }
        });
    } catch (error) {
        logger.error('Error searching similar content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search similar content'
        });
    }
});

// Get UGC insights and analytics
router.get('/insights', async(req, res) => {
    try {
        const { days = 30, platform } = req.query;

        const insights = await ugcTrendSpotterService.getUGCInsights(parseInt(days), platform);

        res.json({
            success: true,
            data: {
                insights,
                dateRange: `${days} days`,
                platform: platform || 'all'
            }
        });
    } catch (error) {
        logger.error('Error getting UGC insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get UGC insights'
        });
    }
});

// Get UGC content by platform
router.get('/content/:platform', async(req, res) => {
    try {
        const { platform } = req.params;
        const { days = 30, limit = 50 } = req.query;

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const ugcContent = await prisma.ugcContent.findMany({
            where: {
                platform,
                publishedAt: {
                    gte: startDate
                }
            },
            orderBy: {
                engagementScore: 'desc'
            },
            take: parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                ugcContent,
                totalContent: ugcContent.length,
                platform,
                dateRange: `${days} days`
            }
        });
    } catch (error) {
        logger.error('Error getting UGC content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get UGC content'
        });
    }
});

// Get content hooks for a product
router.get('/content-hooks/:productId', async(req, res) => {
    try {
        const { productId } = req.params;
        const { platform } = req.query;

        const whereClause = { productId };
        if (platform) {
            whereClause.platform = platform;
        }

        const contentHooks = await prisma.contentHook.findMany({
            where: whereClause,
            orderBy: {
                generatedAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: {
                contentHooks,
                totalHooks: contentHooks.length,
                productId,
                platform: platform || 'all'
            }
        });
    } catch (error) {
        logger.error('Error getting content hooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get content hooks'
        });
    }
});

// Get trending hashtags (static data for now)
router.get('/trending-hashtags', async(req, res) => {
    try {
        const { platform, category, limit = 10 } = req.query;

        // Simulate trending hashtags based on platform and category
        const hashtags = [
            { hashtag: '#viralproduct', platform: 'tiktok', category: 'general', viralScore: 95 },
            { hashtag: '#trending', platform: 'instagram', category: 'lifestyle', viralScore: 88 },
            { hashtag: '#musthave', platform: 'tiktok', category: 'fashion', viralScore: 82 },
            { hashtag: '#newproduct', platform: 'instagram', category: 'beauty', viralScore: 79 },
            { hashtag: '#amazonfinds', platform: 'tiktok', category: 'home', viralScore: 85 },
            { hashtag: '#techreview', platform: 'youtube', category: 'tech', viralScore: 77 },
            { hashtag: '#fitnessmotivation', platform: 'instagram', category: 'fitness', viralScore: 83 },
            { hashtag: '#foodtiktok', platform: 'tiktok', category: 'food', viralScore: 91 }
        ];

        let filteredHashtags = hashtags;

        if (platform) {
            filteredHashtags = filteredHashtags.filter(h => h.platform === platform);
        }

        if (category) {
            filteredHashtags = filteredHashtags.filter(h => h.category === category);
        }

        filteredHashtags = filteredHashtags
            .sort((a, b) => b.viralScore - a.viralScore)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            hashtags: filteredHashtags,
            metadata: {
                platform,
                category,
                limit: parseInt(limit),
                total: filteredHashtags.length
            }
        });
    } catch (error) {
        console.error('Trending hashtags error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get platform comparison
router.get('/platform-comparison', async(req, res) => {
    try {
        const { days = 30 } = req.query;

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const platformStats = await prisma.ugcContent.groupBy({
            by: ['platform'],
            where: {
                publishedAt: {
                    gte: startDate
                }
            },
            _count: {
                id: true
            },
            _avg: {
                engagementScore: true,
                likes: true,
                comments: true,
                shares: true
            }
        });

        const comparison = platformStats.map(stat => ({
            platform: stat.platform,
            totalContent: stat._count.id,
            averageEngagement: stat._avg.engagementScore,
            averageLikes: stat._avg.likes,
            averageComments: stat._avg.comments,
            averageShares: stat._avg.shares
        }));

        res.json({
            success: true,
            data: {
                platformComparison: comparison,
                dateRange: `${days} days`
            }
        });
    } catch (error) {
        logger.error('Error getting platform comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get platform comparison'
        });
    }
});

// Bulk UGC ingestion
router.post('/bulk-ingest', async(req, res) => {
    try {
        const { platforms = ['instagram', 'tiktok', 'twitter'] } = req.body;

        const results = [];
        const errors = [];

        for (const platform of platforms) {
            try {
                const ugcData = await ugcTrendSpotterService.ingestUGC(platform, {
                    limit: 50
                });
                results.push({
                    platform,
                    ingestedItems: ugcData.length,
                    success: true
                });
            } catch (error) {
                errors.push({
                    platform,
                    error: error.message,
                    success: false
                });
            }
        }

        res.json({
            success: true,
            data: {
                results,
                errors,
                totalPlatforms: platforms.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        logger.error('Error in bulk UGC ingestion:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk UGC ingestion'
        });
    }
});

// Analyze social media trends
router.post('/analyze-trends', async(req, res) => {
    try {
        const { platforms, categories, timeframe, limit, workspaceId } = req.body;

        const result = await ugcTrendSpotterService.analyzeTrends({
            platforms,
            categories,
            timeframe,
            limit,
            workspaceId
        });

        res.json(result);
    } catch (error) {
        console.error('Trend analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate content suggestions
router.post('/generate-content', async(req, res) => {
    try {
        const { productData, trendData, workspaceId } = req.body;

        if (!productData) {
            return res.status(400).json({ success: false, error: 'Product data is required' });
        }

        const result = await ugcTrendSpotterService.generateContentSuggestions(productData, trendData || []);

        res.json(result);
    } catch (error) {
        console.error('Content generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Identify viral product opportunities
router.post('/identify-viral-products', async(req, res) => {
    try {
        const { storeId, categories, minPotential, maxPrice } = req.body;

        if (!storeId) {
            return res.status(400).json({ success: false, error: 'Store ID is required' });
        }

        const result = await ugcTrendSpotterService.identifyViralProducts(storeId, {
            categories,
            minPotential,
            maxPrice
        });

        res.json(result);
    } catch (error) {
        console.error('Viral product identification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Find influencer collaboration opportunities
router.post('/find-influencers', async(req, res) => {
    try {
        const { storeId, platforms, followerRange, categories, budget } = req.body;

        if (!storeId) {
            return res.status(400).json({ success: false, error: 'Store ID is required' });
        }

        const result = await ugcTrendSpotterService.findInfluencerOpportunities(storeId, {
            platforms,
            followerRange,
            categories,
            budget
        });

        res.json(result);
    } catch (error) {
        console.error('Influencer opportunity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trend analytics
router.get('/analytics', async(req, res) => {
    try {
        const { workspaceId, timeframe } = req.query;

        const result = await ugcTrendSpotterService.getTrendAnalytics(workspaceId, timeframe);

        res.json(result);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get supported platforms
router.get('/platforms', async(req, res) => {
    try {
        res.json({
            success: true,
            platforms: ugcTrendSpotterService.platforms,
            metadata: {
                total: ugcTrendSpotterService.platforms.length,
                description: 'Supported social media platforms for trend analysis'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trend categories
router.get('/categories', async(req, res) => {
    try {
        res.json({
            success: true,
            categories: ugcTrendSpotterService.trendCategories,
            metadata: {
                total: ugcTrendSpotterService.trendCategories.length,
                description: 'Supported trend categories for analysis'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trending hashtags
router.get('/trending-hashtags', async(req, res) => {
    try {
        const { platform, category, limit = 10 } = req.query;

        // Simulate trending hashtags based on platform and category
        const hashtags = [
            { hashtag: '#viralproduct', platform: 'tiktok', category: 'general', viralScore: 95 },
            { hashtag: '#trending', platform: 'instagram', category: 'lifestyle', viralScore: 88 },
            { hashtag: '#musthave', platform: 'tiktok', category: 'fashion', viralScore: 82 },
            { hashtag: '#newproduct', platform: 'instagram', category: 'beauty', viralScore: 79 },
            { hashtag: '#amazonfinds', platform: 'tiktok', category: 'home', viralScore: 85 },
            { hashtag: '#techreview', platform: 'youtube', category: 'tech', viralScore: 77 },
            { hashtag: '#fitnessmotivation', platform: 'instagram', category: 'fitness', viralScore: 83 },
            { hashtag: '#foodtiktok', platform: 'tiktok', category: 'food', viralScore: 91 }
        ];

        let filteredHashtags = hashtags;

        if (platform) {
            filteredHashtags = filteredHashtags.filter(h => h.platform === platform);
        }

        if (category) {
            filteredHashtags = filteredHashtags.filter(h => h.category === category);
        }

        filteredHashtags = filteredHashtags
            .sort((a, b) => b.viralScore - a.viralScore)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            hashtags: filteredHashtags,
            metadata: {
                platform,
                category,
                limit: parseInt(limit),
                total: filteredHashtags.length
            }
        });
    } catch (error) {
        console.error('Trending hashtags error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get content format recommendations
router.get('/content-formats', async(req, res) => {
    try {
        const { platform, productType } = req.query;

        const formats = {
            tiktok: [
                { format: 'Short Video', duration: '15-60s', engagement: 'High', description: 'Quick, engaging content' },
                { format: 'Duet/Stitch', duration: '30-90s', engagement: 'Very High', description: 'Collaborative content' },
                { format: 'Live Stream', duration: '15-60min', engagement: 'Medium', description: 'Real-time interaction' }
            ],
            instagram: [
                { format: 'Reel', duration: '15-90s', engagement: 'High', description: 'Vertical video content' },
                { format: 'Story', duration: '15s', engagement: 'Medium', description: 'Temporary content' },
                { format: 'Post', duration: 'N/A', engagement: 'Medium', description: 'Permanent feed content' },
                { format: 'Carousel', duration: 'N/A', engagement: 'High', description: 'Multiple image post' }
            ],
            youtube: [
                { format: 'Short', duration: '60s', engagement: 'High', description: 'Vertical short-form video' },
                { format: 'Review', duration: '5-15min', engagement: 'Very High', description: 'Detailed product review' },
                { format: 'Unboxing', duration: '3-10min', engagement: 'High', description: 'Product unboxing experience' }
            ]
        };

        const platformFormats = formats[platform] || Object.values(formats).flat();

        res.json({
            success: true,
            formats: platformFormats,
            metadata: {
                platform,
                productType,
                total: platformFormats.length
            }
        });
    } catch (error) {
        console.error('Content formats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get influencer recommendations
router.get('/influencer-recommendations', async(req, res) => {
    try {
        const { platform, category, followerRange, budget } = req.query;

        const influencers = [{
                id: 1,
                name: 'TechReviewer',
                platform: 'youtube',
                handle: '@techreviewer',
                followers: 250000,
                engagementRate: 4.2,
                category: 'tech',
                costRange: { min: 2000, max: 5000 },
                viralPotential: 85,
                contentStyle: 'Product reviews and tutorials'
            },
            {
                id: 2,
                name: 'FashionInfluencer',
                platform: 'instagram',
                handle: '@fashioninfluencer',
                followers: 150000,
                engagementRate: 6.8,
                category: 'fashion',
                costRange: { min: 1500, max: 3000 },
                viralPotential: 92,
                contentStyle: 'OOTD and style inspiration'
            },
            {
                id: 3,
                name: 'BeautyGuru',
                platform: 'tiktok',
                handle: '@beautyguru',
                followers: 80000,
                engagementRate: 8.5,
                category: 'beauty',
                costRange: { min: 800, max: 2000 },
                viralPotential: 88,
                contentStyle: 'Makeup tutorials and reviews'
            },
            {
                id: 4,
                name: 'HomeDecor',
                platform: 'instagram',
                handle: '@homedecor',
                followers: 120000,
                engagementRate: 5.2,
                category: 'home',
                costRange: { min: 1200, max: 2500 },
                viralPotential: 79,
                contentStyle: 'Interior design and home organization'
            }
        ];

        let filteredInfluencers = influencers;

        if (platform) {
            filteredInfluencers = filteredInfluencers.filter(i => i.platform === platform);
        }

        if (category) {
            filteredInfluencers = filteredInfluencers.filter(i => i.category === category);
        }

        if (budget) {
            const maxBudget = parseInt(budget);
            filteredInfluencers = filteredInfluencers.filter(i => i.costRange.max <= maxBudget);
        }

        filteredInfluencers = filteredInfluencers
            .sort((a, b) => b.viralPotential - a.viralPotential);

        res.json({
            success: true,
            influencers: filteredInfluencers,
            metadata: {
                platform,
                category,
                followerRange,
                budget,
                total: filteredInfluencers.length
            }
        });
    } catch (error) {
        console.error('Influencer recommendations error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;