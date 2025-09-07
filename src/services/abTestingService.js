import { prisma } from '../db.js';

class ABTestingService {
    // Create A/B test
    async createABTest(launchId, testData) {
        try {
            const abTest = await prisma.aBTest.create({
                data: {
                    launchId,
                    testType: testData.testType,
                    variationCount: testData.variations,
                    duration: testData.duration,
                    trafficSplit: testData.trafficSplit,
                    successMetric: testData.successMetric,
                    status: 'DRAFT'
                }
            });

            return {
                success: true,
                data: { abTest },
                message: 'A/B test created successfully'
            };
        } catch (error) {
            console.error('Error creating A/B test:', error);
            return {
                success: false,
                error: { message: 'Failed to create A/B test' }
            };
        }
    }

    // Get A/B test by ID
    async getABTestById(testId) {
        try {
            const abTest = await prisma.aBTest.findUnique({
                where: { id: testId },
                include: {
                    creativeVariations: true,
                    adCreatives: true
                }
            });

            if (!abTest) {
                return {
                    success: false,
                    error: { message: 'A/B test not found' }
                };
            }

            return {
                success: true,
                data: { abTest },
                message: 'A/B test retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting A/B test:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve A/B test' }
            };
        }
    }

    // Get A/B tests for a launch
    async getABTestsByLaunch(launchId) {
        try {
            const abTests = await prisma.aBTest.findMany({
                where: { launchId },
                include: {
                    creativeVariations: true,
                    adCreatives: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: { abTests },
                message: 'A/B tests retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting A/B tests:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve A/B tests' }
            };
        }
    }

    // Start A/B test
    async startABTest(testId) {
        try {
            const abTest = await prisma.aBTest.update({
                where: { id: testId },
                data: {
                    status: 'RUNNING',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + (abTest.duration * 24 * 60 * 60 * 1000))
                }
            });

            return {
                success: true,
                data: { abTest },
                message: 'A/B test started successfully'
            };
        } catch (error) {
            console.error('Error starting A/B test:', error);
            return {
                success: false,
                error: { message: 'Failed to start A/B test' }
            };
        }
    }

    // Stop A/B test
    async stopABTest(testId) {
        try {
            const abTest = await prisma.aBTest.update({
                where: { id: testId },
                data: {
                    status: 'COMPLETED',
                    endDate: new Date()
                }
            });

            // Analyze results and determine winner
            await this.analyzeABTestResults(testId);

            return {
                success: true,
                data: { abTest },
                message: 'A/B test stopped successfully'
            };
        } catch (error) {
            console.error('Error stopping A/B test:', error);
            return {
                success: false,
                error: { message: 'Failed to stop A/B test' }
            };
        }
    }

    // Create creative variations for A/B test
    async createVariations(testId, variations) {
        try {
            const createdVariations = [];

            for (let i = 0; i < variations.length; i++) {
                const variation = await prisma.creativeVariation.create({
                    data: {
                        abTestId: testId,
                        variationNumber: i + 1,
                        headline: variations[i].headline,
                        description: variations[i].description,
                        cta: variations[i].cta,
                        imageStyle: variations[i].imageStyle,
                        colorScheme: variations[i].colorScheme
                    }
                });
                createdVariations.push(variation);
            }

            return {
                success: true,
                data: { variations: createdVariations },
                message: 'Variations created successfully'
            };
        } catch (error) {
            console.error('Error creating variations:', error);
            return {
                success: false,
                error: { message: 'Failed to create variations' }
            };
        }
    }

    // Analyze A/B test results
    async analyzeABTestResults(testId) {
        try {
            const abTest = await prisma.aBTest.findUnique({
                where: { id: testId },
                include: {
                    creativeVariations: {
                        include: {
                            adCreatives: {
                                include: {
                                    performance: true
                                }
                            }
                        }
                    }
                }
            });

            if (!abTest) {
                throw new Error('A/B test not found');
            }

            // Calculate performance for each variation
            const variationResults = [];

            for (const variation of abTest.creativeVariations) {
                let totalImpressions = 0;
                let totalClicks = 0;
                let totalConversions = 0;
                let totalSpend = 0;

                for (const creative of variation.adCreatives) {
                    for (const performance of creative.performance) {
                        totalImpressions += performance.impressions;
                        totalClicks += performance.clicks;
                        totalConversions += performance.conversions;
                        totalSpend += parseFloat(performance.spend);
                    }
                }

                const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
                const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
                const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0; // Assuming $50 average order value

                variationResults.push({
                    variationId: variation.id,
                    variationNumber: variation.variationNumber,
                    impressions: totalImpressions,
                    clicks: totalClicks,
                    conversions: totalConversions,
                    spend: totalSpend,
                    ctr,
                    conversionRate,
                    roas
                });
            }

            // Determine winner based on success metric
            let winner = null;
            let bestScore = 0;

            for (const result of variationResults) {
                let score = 0;

                switch (abTest.successMetric) {
                    case 'ctr':
                        score = result.ctr;
                        break;
                    case 'conversion':
                        score = result.conversionRate;
                        break;
                    case 'engagement':
                        score = result.ctr * 0.7 + result.conversionRate * 0.3;
                        break;
                    case 'roas':
                        score = result.roas;
                        break;
                    default:
                        score = result.ctr;
                }

                if (score > bestScore) {
                    bestScore = score;
                    winner = result;
                }
            }

            // Mark winner
            if (winner) {
                await prisma.creativeVariation.update({
                    where: { id: winner.variationId },
                    data: { isWinner: true }
                });
            }

            // Update test results
            const results = {
                variations: variationResults,
                winner: winner,
                analysis: {
                    totalImpressions: variationResults.reduce((sum, r) => sum + r.impressions, 0),
                    totalClicks: variationResults.reduce((sum, r) => sum + r.clicks, 0),
                    totalConversions: variationResults.reduce((sum, r) => sum + r.conversions, 0),
                    totalSpend: variationResults.reduce((sum, r) => sum + r.spend, 0),
                    averageCTR: variationResults.reduce((sum, r) => sum + r.ctr, 0) / variationResults.length,
                    averageConversionRate: variationResults.reduce((sum, r) => sum + r.conversionRate, 0) / variationResults.length
                }
            };

            await prisma.aBTest.update({
                where: { id: testId },
                data: { results }
            });

            return {
                success: true,
                data: { results },
                message: 'A/B test results analyzed successfully'
            };
        } catch (error) {
            console.error('Error analyzing A/B test results:', error);
            return {
                success: false,
                error: { message: 'Failed to analyze A/B test results' }
            };
        }
    }

    // Get A/B test statistics
    async getABTestStats(testId) {
        try {
            const abTest = await prisma.aBTest.findUnique({
                where: { id: testId },
                include: {
                    creativeVariations: {
                        include: {
                            adCreatives: {
                                include: {
                                    performance: true
                                }
                            }
                        }
                    }
                }
            });

            if (!abTest) {
                return {
                    success: false,
                    error: { message: 'A/B test not found' }
                };
            }

            const stats = {
                testId: abTest.id,
                status: abTest.status,
                testType: abTest.testType,
                variations: abTest.creativeVariations.length,
                duration: abTest.duration,
                startDate: abTest.startDate,
                endDate: abTest.endDate,
                results: abTest.results
            };

            return {
                success: true,
                data: { stats },
                message: 'A/B test statistics retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting A/B test stats:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve A/B test statistics' }
            };
        }
    }

    // Get all A/B tests
    async getAllABTests() {
        try {
            const abTests = await prisma.aBTest.findMany({
                include: {
                    launch: {
                        select: {
                            id: true,
                            name: true,
                            product: {
                                select: {
                                    title: true
                                }
                            }
                        }
                    },
                    creativeVariations: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: { abTests },
                message: 'A/B tests retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting A/B tests:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve A/B tests' }
            };
        }
    }

    // Delete A/B test
    async deleteABTest(testId) {
        try {
            await prisma.aBTest.delete({
                where: { id: testId }
            });

            return {
                success: true,
                message: 'A/B test deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting A/B test:', error);
            return {
                success: false,
                error: { message: 'Failed to delete A/B test' }
            };
        }
    }
}

export const abTestingService = new ABTestingService();