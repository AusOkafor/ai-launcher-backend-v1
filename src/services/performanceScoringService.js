import { prisma } from '../db.js';
import { aiService } from './ai.js';

class PerformanceScoringService {
    // Score a creative using AI
    async scoreCreative(creativeId) {
        try {
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                return {
                    success: false,
                    error: { message: 'Creative not found' }
                };
            }

            // Generate AI score
            const score = await this.generateAIScore(creative);

            // Save score to database
            await prisma.adCreative.update({
                where: { id: creativeId },
                data: {
                    metrics: {
                        ...creative.metrics,
                        aiScore: score
                    }
                }
            });

            return {
                success: true,
                data: { score },
                message: 'Creative scored successfully'
            };
        } catch (error) {
            console.error('Error scoring creative:', error);
            return {
                success: false,
                error: { message: 'Failed to score creative' }
            };
        }
    }

    // Generate AI score for creative
    async generateAIScore(creative) {
        try {
            const prompt = this.buildScoringPrompt(creative);

            const response = await aiService.generateContent(prompt);

            // Parse AI response to extract scores
            const scores = this.parseAIScoreResponse(response);

            return {
                overall: scores.overall,
                engagement: scores.engagement,
                conversion: scores.conversion,
                brandAlignment: scores.brandAlignment,
                creativity: scores.creativity,
                clarity: scores.clarity,
                analysis: scores.analysis,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error generating AI score:', error);
            // Return fallback scores if AI fails
            return this.generateFallbackScore();
        }
    }

    // Build scoring prompt for AI
    buildScoringPrompt(creative) {
        const product = creative.launch.product;
        const outputs = creative.outputs || {};
        const inputs = creative.inputs || {};

        return `
You are an expert marketing creative analyst. Analyze the following ad creative and provide a comprehensive performance score from 0-100 for each category.

Product: ${(product && product.title) ? product.title : 'Unknown'}
Platform: ${creative.platform}
Creative Content:
- Headline: ${outputs.headline || 'N/A'}
- Description: ${outputs.description || 'N/A'}
- Call to Action: ${outputs.cta || 'N/A'}
- Keywords: ${(outputs.keywords && outputs.keywords.join) ? outputs.keywords.join(', ') : 'N/A'}

Creative Inputs:
- Tone: ${inputs.tone || 'N/A'}
- Focus: ${inputs.focus || 'N/A'}
- Target Audience: ${inputs.targetAudience || 'N/A'}

Please analyze this creative and provide scores for:

1. Engagement Potential (0-100): Likelihood to capture attention and drive interaction
2. Conversion Potential (0-100): Ability to drive desired actions (clicks, purchases)
3. Brand Alignment (0-100): Consistency with brand voice and values
4. Creativity (0-100): Originality and innovative approach
5. Clarity (0-100): Clear messaging and easy understanding

Also provide:
- Overall Score (0-100): Weighted average of all scores
- Strengths: List 3-4 key strengths
- Improvements: List 3-4 areas for improvement
- Recommendations: List 3-4 actionable recommendations

Respond in JSON format:
{
  "overall": 85,
  "engagement": 90,
  "conversion": 80,
  "brandAlignment": 85,
  "creativity": 75,
  "clarity": 90,
  "analysis": {
    "strengths": ["Clear call-to-action", "Strong emotional appeal"],
    "improvements": ["Add social proof", "Test different headlines"],
    "recommendations": ["Include customer testimonials", "Add urgency elements"]
  }
}
`;
    }

    // Parse AI response to extract scores
    parseAIScoreResponse(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback parsing if JSON extraction fails
            return this.parseFallbackResponse(response);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return this.generateFallbackScore();
        }
    }

    // Parse fallback response if JSON parsing fails
    parseFallbackResponse(response) {
        const scores = {
            overall: 75,
            engagement: 80,
            conversion: 70,
            brandAlignment: 75,
            creativity: 70,
            clarity: 80,
            analysis: {
                strengths: ['Good structure', 'Clear messaging'],
                improvements: ['Could be more engaging', 'Add more details'],
                recommendations: ['Test different variations', 'Optimize for platform']
            }
        };

        // Try to extract numbers from response
        const numbers = response.match(/\d+/g);
        if (numbers && numbers.length >= 6) {
            scores.overall = parseInt(numbers[0]) || 75;
            scores.engagement = parseInt(numbers[1]) || 80;
            scores.conversion = parseInt(numbers[2]) || 70;
            scores.brandAlignment = parseInt(numbers[3]) || 75;
            scores.creativity = parseInt(numbers[4]) || 70;
            scores.clarity = parseInt(numbers[5]) || 80;
        }

        return scores;
    }

    // Generate fallback score if AI fails
    generateFallbackScore() {
        return {
            overall: 75,
            engagement: 80,
            conversion: 70,
            brandAlignment: 75,
            creativity: 70,
            clarity: 80,
            analysis: {
                strengths: ['Standard creative structure', 'Clear messaging'],
                improvements: ['Could be more engaging', 'Add more details'],
                recommendations: ['Test different variations', 'Optimize for platform']
            }
        };
    }

    // Get performance prediction
    async getPerformancePrediction(creativeId) {
        try {
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    performance: true
                }
            });

            if (!creative) {
                return {
                    success: false,
                    error: { message: 'Creative not found' }
                };
            }

            // Calculate historical performance
            const historicalPerformance = this.calculateHistoricalPerformance(creative.performance);

            // Generate prediction based on historical data and AI score
            const prediction = await this.generatePerformancePrediction(creative, historicalPerformance);

            return {
                success: true,
                data: { prediction },
                message: 'Performance prediction generated'
            };
        } catch (error) {
            console.error('Error generating performance prediction:', error);
            return {
                success: false,
                error: { message: 'Failed to generate performance prediction' }
            };
        }
    }

    // Calculate historical performance
    calculateHistoricalPerformance(performanceData) {
        if (!performanceData || performanceData.length === 0) {
            return {
                avgCTR: 0.025, // 2.5% default
                avgConversionRate: 0.012, // 1.2% default
                avgCPC: 1.50,
                avgROAS: 2.5
            };
        }

        const totalImpressions = performanceData.reduce((sum, p) => sum + p.impressions, 0);
        const totalClicks = performanceData.reduce((sum, p) => sum + p.clicks, 0);
        const totalConversions = performanceData.reduce((sum, p) => sum + p.conversions, 0);
        const totalSpend = performanceData.reduce((sum, p) => sum + parseFloat(p.spend), 0);

        return {
            avgCTR: totalImpressions > 0 ? totalClicks / totalImpressions : 0.025,
            avgConversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0.012,
            avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 1.50,
            avgROAS: totalSpend > 0 ? (totalConversions * 50) / totalSpend : 2.5 // Assuming $50 AOV
        };
    }

    // Generate performance prediction
    async generatePerformancePrediction(creative, historicalPerformance) {
        const aiScore = (creative.metrics && creative.metrics.aiScore) ? creative.metrics.aiScore : null;

        if (!aiScore) {
            return {
                expectedCTR: historicalPerformance.avgCTR * 100,
                expectedConversionRate: historicalPerformance.avgConversionRate * 100,
                confidence: 'Low (no AI score available)'
            };
        }

        // Adjust predictions based on AI score
        const scoreMultiplier = aiScore.overall / 100;
        const engagementMultiplier = aiScore.engagement / 100;
        const conversionMultiplier = aiScore.conversion / 100;

        const expectedCTR = historicalPerformance.avgCTR * engagementMultiplier * 100;
        const expectedConversionRate = historicalPerformance.avgConversionRate * conversionMultiplier * 100;

        let confidence = 'Low';
        if (aiScore.overall >= 90) confidence = 'Very High';
        else if (aiScore.overall >= 80) confidence = 'High';
        else if (aiScore.overall >= 70) confidence = 'Medium';

        return {
            expectedCTR: Math.round(expectedCTR * 100) / 100,
            expectedConversionRate: Math.round(expectedConversionRate * 100) / 100,
            confidence,
            factors: {
                aiScore: aiScore.overall,
                historicalPerformance: historicalPerformance.avgCTR * 100,
                engagementPotential: aiScore.engagement,
                conversionPotential: aiScore.conversion
            }
        };
    }

    // Get creative insights
    async getCreativeInsights(creativeId) {
        try {
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    performance: true,
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                return {
                    success: false,
                    error: { message: 'Creative not found' }
                };
            }

            const insights = {
                creativeId: creative.id,
                platform: creative.platform,
                status: creative.status,
                aiScore: (creative.metrics && creative.metrics.aiScore) ? creative.metrics.aiScore : null,
                performance: this.calculateHistoricalPerformance(creative.performance),
                recommendations: await this.generateRecommendations(creative)
            };

            return {
                success: true,
                data: { insights },
                message: 'Creative insights generated'
            };
        } catch (error) {
            console.error('Error generating creative insights:', error);
            return {
                success: false,
                error: { message: 'Failed to generate creative insights' }
            };
        }
    }

    // Generate recommendations
    async generateRecommendations(creative) {
        const aiScore = (creative.metrics && creative.metrics.aiScore) ? creative.metrics.aiScore : null;

        if (!aiScore) {
            return [
                'Run A/B tests to optimize performance',
                'Test different headlines and CTAs',
                'Consider platform-specific optimizations'
            ];
        }

        const recommendations = [];

        if (aiScore.engagement < 80) {
            recommendations.push('Add more engaging visual elements');
            recommendations.push('Test different headline variations');
        }

        if (aiScore.conversion < 80) {
            recommendations.push('Strengthen call-to-action');
            recommendations.push('Add social proof elements');
        }

        if (aiScore.clarity < 80) {
            recommendations.push('Simplify messaging');
            recommendations.push('Improve visual hierarchy');
        }

        if (aiScore.creativity < 80) {
            recommendations.push('Try more innovative approaches');
            recommendations.push('Test different creative styles');
        }

        return recommendations.slice(0, 4); // Return top 4 recommendations
    }

    // Batch score multiple creatives
    async batchScoreCreatives(creativeIds) {
        try {
            const results = [];

            for (const creativeId of creativeIds) {
                const result = await this.scoreCreative(creativeId);
                results.push({
                    creativeId,
                    success: result.success,
                    score: (result.data && result.data.score) ? result.data.score : null
                });
            }

            return {
                success: true,
                data: { results },
                message: 'Batch scoring completed'
            };
        } catch (error) {
            console.error('Error in batch scoring:', error);
            return {
                success: false,
                error: { message: 'Failed to complete batch scoring' }
            };
        }
    }
}

export const performanceScoringService = new PerformanceScoringService();