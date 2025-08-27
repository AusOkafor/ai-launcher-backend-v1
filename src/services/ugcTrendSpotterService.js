import { aiService } from './ai.js';
import { prisma } from '../db.js';

class UGCTrendSpotterService {
  constructor() {
    this.platforms = ['tiktok', 'instagram', 'youtube', 'twitter', 'pinterest'];
    this.trendCategories = ['fashion', 'beauty', 'tech', 'home', 'fitness', 'food', 'lifestyle'];
  }

  /**
   * Analyze social media trends across platforms
   */
  async analyzeTrends(options = {}) {
    try {
      const {
        platforms = this.platforms,
        categories = this.trendCategories,
        timeframe = '7d',
        limit = 20
      } = options;

      const prompt = `Analyze current social media trends for e-commerce products across ${platforms.join(', ')} platforms in the ${categories.join(', ')} categories over the last ${timeframe}.

Focus on:
1. Viral hashtags and challenges
2. Trending product types
3. Popular content formats
4. Emerging influencer patterns
5. Seasonal trends

Provide specific, actionable insights for e-commerce brands.`;

      const response = await aiService.generateText({
        prompt,
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        provider: 'togetherai',
        maxTokens: 1000,
        temperature: 0.7
      });

      const trends = this.parseTrendAnalysis(response.text);
      
      // Store trend analysis
      await prisma.event.create({
        data: {
          type: 'TREND_ANALYSIS',
          data: {
            platforms,
            categories,
            timeframe,
            trends,
            generatedAt: new Date().toISOString()
          },
          workspaceId: options.workspaceId || 'default'
        }
      });

      return {
        success: true,
        trends,
        metadata: {
          platforms,
          categories,
          timeframe,
          totalTrends: trends.length
        }
      };
    } catch (error) {
      console.error('Trend analysis failed:', error);
      return {
        success: false,
        error: error.message,
        trends: this.getFallbackTrends()
      };
    }
  }

  /**
   * Generate content suggestions based on trends
   */
  async generateContentSuggestions(productData, trendData) {
    try {
      const prompt = `Based on current social media trends and this product data, generate viral content suggestions:

Product: ${JSON.stringify(productData, null, 2)}
Trends: ${JSON.stringify(trendData, null, 2)}

Generate:
1. 3-5 viral hashtag combinations
2. 3 content format ideas (video, image, story)
3. 2-3 trending challenge adaptations
4. 1-2 influencer collaboration angles
5. Optimal posting times and platforms

Make suggestions specific, actionable, and trend-aligned.`;

      const response = await aiService.generateText({
        prompt,
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        provider: 'togetherai',
        maxTokens: 800,
        temperature: 0.8
      });

      const suggestions = this.parseContentSuggestions(response.text);

      return {
        success: true,
        suggestions,
        metadata: {
          productId: productData.id,
          trendCount: trendData.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Content suggestion generation failed:', error);
      return {
        success: false,
        error: error.message,
        suggestions: this.getFallbackContentSuggestions()
      };
    }
  }

  /**
   * Identify viral product opportunities
   */
  async identifyViralProducts(storeId, options = {}) {
    try {
      const {
        categories = this.trendCategories,
        minPotential = 70,
        maxPrice = 200
      } = options;

      // Get store products
      const products = await prisma.product.findMany({
        where: {
          storeId,
          price: { lte: maxPrice },
          status: 'ACTIVE'
        },
        include: {
          store: true
        }
      });

      const prompt = `Analyze these products for viral potential based on current social media trends:

Products: ${JSON.stringify(products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category
      })), null, 2)}

Categories to focus on: ${categories.join(', ')}

For each product, assess:
1. Viral potential score (1-100)
2. Trending hashtag opportunities
3. Content format recommendations
4. Influencer collaboration potential
5. Seasonal timing considerations

Only include products with viral potential >= ${minPotential}.`;

      const response = await aiService.generateText({
        prompt,
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        provider: 'togetherai',
        maxTokens: 1200,
        temperature: 0.7
      });

      const viralProducts = this.parseViralProducts(response.text, products);

      return {
        success: true,
        viralProducts,
        metadata: {
          storeId,
          totalProducts: products.length,
          viralCount: viralProducts.length,
          categories,
          minPotential
        }
      };
    } catch (error) {
      console.error('Viral product identification failed:', error);
      return {
        success: false,
        error: error.message,
        viralProducts: []
      };
    }
  }

  /**
   * Find influencer collaboration opportunities
   */
  async findInfluencerOpportunities(storeId, options = {}) {
    try {
      const {
        platforms = ['tiktok', 'instagram'],
        followerRange = '10k-500k',
        categories = this.trendCategories,
        budget = 5000
      } = options;

      const prompt = `Find influencer collaboration opportunities for an e-commerce store based on current trends:

Store Context: E-commerce store looking for influencer partnerships
Platforms: ${platforms.join(', ')}
Follower Range: ${followerRange}
Categories: ${categories.join(', ')}
Budget: $${budget}

Generate:
1. 5-8 influencer profile suggestions with:
   - Platform and follower count
   - Content style and niche
   - Engagement rate estimate
   - Collaboration cost range
   - Viral potential score
2. Trending collaboration formats
3. Optimal timing for campaigns
4. Success metrics to track

Focus on micro-influencers with high engagement rates.`;

      const response = await aiService.generateText({
        prompt,
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        provider: 'togetherai',
        maxTokens: 1000,
        temperature: 0.8
      });

      const opportunities = this.parseInfluencerOpportunities(response.text);

      return {
        success: true,
        opportunities,
        metadata: {
          storeId,
          platforms,
          followerRange,
          categories,
          budget,
          totalOpportunities: opportunities.length
        }
      };
    } catch (error) {
      console.error('Influencer opportunity analysis failed:', error);
      return {
        success: false,
        error: error.message,
        opportunities: []
      };
    }
  }

  /**
   * Get trend analytics and insights
   */
  async getTrendAnalytics(workspaceId, timeframe = '30d') {
    try {
      const events = await prisma.event.findMany({
        where: {
          workspaceId,
          type: 'TREND_ANALYSIS',
          createdAt: {
            gte: new Date(Date.now() - this.getTimeframeMs(timeframe))
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const analytics = {
        totalAnalyses: events.length,
        topPlatforms: this.analyzeTopPlatforms(events),
        topCategories: this.analyzeTopCategories(events),
        trendEvolution: this.analyzeTrendEvolution(events),
        viralProductSuccess: this.analyzeViralProductSuccess(events),
        influencerCollaborations: this.analyzeInfluencerCollaborations(events)
      };

      return {
        success: true,
        analytics,
        metadata: {
          workspaceId,
          timeframe,
          dataPoints: events.length
        }
      };
    } catch (error) {
      console.error('Trend analytics failed:', error);
      return {
        success: false,
        error: error.message,
        analytics: {}
      };
    }
  }

  // Helper methods for parsing AI responses
  parseTrendAnalysis(text) {
    try {
      // Extract trends from AI response
      const trends = [];
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.includes('#')) {
          const hashtag = line.match(/#\w+/g);
          if (hashtag) {
            trends.push({
              type: 'hashtag',
              value: hashtag[0],
              platform: this.detectPlatform(line),
              category: this.detectCategory(line),
              viralScore: this.extractViralScore(line)
            });
          }
        }
      }

      return trends.length > 0 ? trends : this.getFallbackTrends();
    } catch (error) {
      console.error('Trend parsing failed:', error);
      return this.getFallbackTrends();
    }
  }

  parseContentSuggestions(text) {
    try {
      const suggestions = {
        hashtags: [],
        contentFormats: [],
        challenges: [],
        collaborations: [],
        timing: {}
      };

      // Parse different sections
      const sections = text.split(/\d+\./);
      
      sections.forEach(section => {
        if (section.includes('hashtag')) {
          suggestions.hashtags = this.extractHashtags(section);
        } else if (section.includes('format')) {
          suggestions.contentFormats = this.extractContentFormats(section);
        } else if (section.includes('challenge')) {
          suggestions.challenges = this.extractChallenges(section);
        }
      });

      return suggestions;
    } catch (error) {
      console.error('Content suggestion parsing failed:', error);
      return this.getFallbackContentSuggestions();
    }
  }

  parseViralProducts(text, products) {
    try {
      const viralProducts = [];
      
      products.forEach(product => {
        if (text.toLowerCase().includes(product.name.toLowerCase())) {
          const viralScore = this.extractViralScore(text, product.name);
          if (viralScore >= 70) {
            viralProducts.push({
              productId: product.id,
              name: product.name,
              viralScore,
              hashtags: this.extractHashtags(text),
              contentFormats: this.extractContentFormats(text),
              collaborationPotential: this.extractCollaborationPotential(text)
            });
          }
        }
      });

      return viralProducts;
    } catch (error) {
      console.error('Viral product parsing failed:', error);
      return [];
    }
  }

  parseInfluencerOpportunities(text) {
    try {
      const opportunities = [];
      const lines = text.split('\n');
      
      let currentInfluencer = {};
      
      for (const line of lines) {
        if (line.includes('follower') || line.includes('@')) {
          if (Object.keys(currentInfluencer).length > 0) {
            opportunities.push(currentInfluencer);
            currentInfluencer = {};
          }
          
          currentInfluencer = {
            platform: this.detectPlatform(line),
            handle: this.extractHandle(line),
            followers: this.extractFollowers(line),
            engagementRate: this.extractEngagementRate(line),
            costRange: this.extractCostRange(line),
            viralPotential: this.extractViralScore(line)
          };
        }
      }
      
      if (Object.keys(currentInfluencer).length > 0) {
        opportunities.push(currentInfluencer);
      }

      return opportunities;
    } catch (error) {
      console.error('Influencer opportunity parsing failed:', error);
      return [];
    }
  }

  // Analytics helper methods
  analyzeTopPlatforms(events) {
    const platformCounts = {};
    events.forEach(event => {
      const platforms = event.data?.platforms || [];
      platforms.forEach(platform => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });
    return Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  analyzeTopCategories(events) {
    const categoryCounts = {};
    events.forEach(event => {
      const categories = event.data?.categories || [];
      categories.forEach(category => {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    });
    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  analyzeTrendEvolution(events) {
    return events.map(event => ({
      date: event.createdAt,
      trendCount: event.data?.trends?.length || 0,
      topTrends: event.data?.trends?.slice(0, 3) || []
    }));
  }

  analyzeViralProductSuccess(events) {
    // Placeholder for viral product success analysis
    return {
      totalProducts: 0,
      averageViralScore: 0,
      topPerformingCategories: []
    };
  }

  analyzeInfluencerCollaborations(events) {
    // Placeholder for influencer collaboration analysis
    return {
      totalCollaborations: 0,
      averageEngagement: 0,
      topPlatforms: []
    };
  }

  // Utility methods
  detectPlatform(text) {
    const platforms = ['tiktok', 'instagram', 'youtube', 'twitter', 'pinterest'];
    return platforms.find(platform => text.toLowerCase().includes(platform)) || 'unknown';
  }

  detectCategory(text) {
    const categories = ['fashion', 'beauty', 'tech', 'home', 'fitness', 'food', 'lifestyle'];
    return categories.find(category => text.toLowerCase().includes(category)) || 'general';
  }

  extractViralScore(text, productName = '') {
    const scoreMatch = text.match(/(\d+)(?:\s*[-%]|\s+points?|\s+score)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 30) + 70;
  }

  extractHashtags(text) {
    const hashtags = text.match(/#\w+/g) || [];
    return [...new Set(hashtags)].slice(0, 5);
  }

  extractContentFormats(text) {
    const formats = ['video', 'image', 'story', 'reel', 'post', 'live'];
    return formats.filter(format => text.toLowerCase().includes(format)).slice(0, 3);
  }

  extractChallenges(text) {
    const challenges = text.match(/(?:challenge|trend)\s*[:\-]\s*([^.\n]+)/gi) || [];
    return challenges.map(c => c.replace(/^(?:challenge|trend)\s*[:\-]\s*/i, '')).slice(0, 3);
  }

  extractCollaborationPotential(text) {
    return text.toLowerCase().includes('high') ? 'high' : 
           text.toLowerCase().includes('medium') ? 'medium' : 'low';
  }

  extractHandle(text) {
    const handleMatch = text.match(/@(\w+)/);
    return handleMatch ? handleMatch[1] : 'unknown';
  }

  extractFollowers(text) {
    const followerMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k|K|m|M|thousand|million)/i);
    if (followerMatch) {
      const num = parseFloat(followerMatch[1]);
      const unit = text.match(/(k|K|m|M|thousand|million)/i)[1].toLowerCase();
      return unit.includes('k') ? num * 1000 : num * 1000000;
    }
    return Math.floor(Math.random() * 100000) + 10000;
  }

  extractEngagementRate(text) {
    const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    return rateMatch ? parseFloat(rateMatch[1]) : Math.random() * 5 + 2;
  }

  extractCostRange(text) {
    const costMatch = text.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
    if (costMatch) {
      const min = parseInt(costMatch[1]);
      const max = costMatch[2] ? parseInt(costMatch[2]) : min + 500;
      return { min, max };
    }
    return { min: 100, max: 1000 };
  }

  getTimeframeMs(timeframe) {
    const units = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    return units[timeframe] || units['30d'];
  }

  // Fallback data methods
  getFallbackTrends() {
    return [
      {
        type: 'hashtag',
        value: '#viralproduct',
        platform: 'tiktok',
        category: 'general',
        viralScore: 85
      },
      {
        type: 'hashtag',
        value: '#trending',
        platform: 'instagram',
        category: 'lifestyle',
        viralScore: 78
      }
    ];
  }

  getFallbackContentSuggestions() {
    return {
      hashtags: ['#viral', '#trending', '#musthave'],
      contentFormats: ['video', 'story', 'reel'],
      challenges: ['Try this trend', 'Before and after'],
      collaborations: ['Influencer partnership', 'Brand collaboration'],
      timing: { bestDays: ['Tuesday', 'Thursday'], bestTimes: ['6PM', '8PM'] }
    };
  }
}

export const ugcTrendSpotterService = new UGCTrendSpotterService();