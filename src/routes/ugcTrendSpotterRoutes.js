import express from 'express';
import { ugcTrendSpotterService } from '../services/ugcTrendSpotterService.js';

const router = express.Router();

// Test endpoint
router.get('/test', async (req, res) => {
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
        'GET /categories - Get trend categories'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze social media trends
router.post('/analyze-trends', async (req, res) => {
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
router.post('/generate-content', async (req, res) => {
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
router.post('/identify-viral-products', async (req, res) => {
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
router.post('/find-influencers', async (req, res) => {
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
router.get('/analytics', async (req, res) => {
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
router.get('/platforms', async (req, res) => {
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
router.get('/categories', async (req, res) => {
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
router.get('/trending-hashtags', async (req, res) => {
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
router.get('/content-formats', async (req, res) => {
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
router.get('/influencer-recommendations', async (req, res) => {
  try {
    const { platform, category, followerRange, budget } = req.query;

    const influencers = [
      {
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
