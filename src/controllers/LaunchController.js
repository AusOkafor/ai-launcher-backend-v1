import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class LaunchController {
    constructor() {
        // TODO: Initialize LaunchService when implemented
    }

    /**
     * Create a new launch
     */
    createLaunch = async(req, res) => {
        try {
            // For testing without auth, use a default workspace ID
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            const inputs = {
                productId: req.body.productId,
                productUrl: req.body.productUrl,
                brandTone: req.body.brandTone,
                targetAudience: req.body.targetAudience,
                launchWindow: req.body.launchWindow,
                budget: parseFloat(req.body.budget),
                platforms: req.body.platforms || ['meta', 'tiktok'],
                additionalNotes: req.body.additionalNotes,
            };

            // Create launch in database
            const launch = await prisma.launch.create({
                data: {
                    workspaceId,
                    productId: inputs.productId,
                    name: `Launch for ${inputs.productId || 'Product'}`,
                    status: 'DRAFT',
                    inputs: inputs,
                    outputs: null, // Will be populated when AI content is generated
                }
            });

            logger.info(`Launch created: ${launch.id}`, { workspaceId, userId: req.user && req.user.id });

            return ApiResponse.success(res, {
                launchId: launch.id,
                message: 'Launch created successfully',
            }, 201);
        } catch (error) {
            logger.error('Error creating launch:', error);
            return ApiResponse.error(res, 'Failed to create launch', 500);
        }
    };

    /**
     * Get all launches for workspace
     */
    getLaunches = async(req, res) => {
        try {
            // For testing without auth, use a default workspace ID
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const skip = (page - 1) * limit;

            const where = { workspaceId };
            if (status) {
                where.status = status;
            }

            const [launches, total] = await Promise.all([
                prisma.launch.findMany({
                    where,
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                images: true,
                            },
                        },
                        adCreatives: {
                            select: {
                                id: true,
                                platform: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.launch.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);

            return ApiResponse.success(res, {
                launches,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            });
        } catch (error) {
            logger.error('Error fetching launches:', error);
            return ApiResponse.error(res, 'Failed to fetch launches', 500);
        }
    };

    /**
     * Get launch by ID
     */
    getLaunch = async(req, res) => {
        try {
            const { id } = req.params;
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            const launch = await prisma.launch.findFirst({
                where: { id, workspaceId },
                include: {
                    product: true,
                    adCreatives: true,
                },
            });

            if (!launch) {
                return ApiResponse.error(res, 'Launch not found', 404);
            }

            return ApiResponse.success(res, { launch });
        } catch (error) {
            logger.error('Error fetching launch:', error);
            return ApiResponse.error(res, 'Failed to fetch launch', 500);
        }
    };

    /**
     * Generate launch assets
     */
    generateLaunch = async(req, res) => {
        try {
            const { id } = req.params;
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            // Get the launch from database
            const launch = await prisma.launch.findFirst({
                where: { id, workspaceId },
                include: {
                    product: true
                }
            });

            if (!launch) {
                return ApiResponse.error(res, 'Launch not found', 404);
            }

            logger.info(`Generating AI content for launch: ${id}`);

            // Import and initialize AI service
            const { aiService } = await
            import ('../services/ai.js');
            await aiService.initialize();

            // Import AI launch service
            const { aiLaunchService } = await
            import ('../services/aiLaunchService.js');

            // Generate AI content directly without creating a new launch
            const aiResponse = await aiService.generateText(`
Generate engaging social media content for this product:

Product: ${launch.product.title}
Price: $${launch.product.price}
Category: ${launch.product.category}
Brand: ${launch.product.brand}
Description: ${launch.product.description}

Generate:
1. A catchy headline (max 60 characters)
2. Engaging post copy (max 280 characters)
3. 5 relevant hashtags
4. Call-to-action suggestion

Target audience: ${launch.inputs.targetAudience}
Tone: ${launch.inputs.brandTone}
Platform: Instagram

Make it compelling and conversion-focused.
            `, {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                maxTokens: 500,
                temperature: 0.7,
                provider: 'togetherai'
            });

            // Extract content from AI response
            const extractedContent = {
                headline: aiLaunchService._extractHeadline(aiResponse.text),
                postCopy: aiLaunchService._extractPostCopy(aiResponse.text),
                hashtags: aiLaunchService._extractHashtags(aiResponse.text),
                callToAction: aiLaunchService._extractCallToAction(aiResponse.text),
                fullResponse: aiResponse.text
            };

            // Update the original launch with AI-generated content
            const updatedLaunch = await prisma.launch.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    outputs: {
                        title: `AI-Generated Social Media Launch for ${launch.product.title}`,
                        description: `Social media content for ${launch.product.title}`,
                        content: extractedContent,
                        aiModel: 'mistralai/Mistral-7B-Instruct-v0.1'
                    }
                },
                include: {
                    product: true,
                    adCreatives: true
                }
            });

            logger.info(`AI content generated and stored for launch: ${id}`);

            return ApiResponse.success(res, {
                message: 'AI content generated successfully',
                launchId: id,
                data: {
                    launch: updatedLaunch
                }
            });
        } catch (error) {
            logger.error('Error generating launch:', error);
            return ApiResponse.error(res, 'Failed to generate launch', 500);
        }
    };

    /**
     * Export launch to platform
     */
    exportLaunch = async(req, res) => {
        try {
            const { id, target } = req.params;

            // TODO: Implement actual export logic
            logger.info(`Exporting launch ${id} to ${target}`);

            return ApiResponse.success(res, {
                message: `Launch exported to ${target}`,
                launchId: id,
                target,
            });
        } catch (error) {
            logger.error('Error exporting launch:', error);
            return ApiResponse.error(res, 'Failed to export launch', 500);
        }
    };

    /**
     * Get launch metrics
     */
    getLaunchMetrics = async(req, res) => {
        try {
            const { id } = req.params;

            // TODO: Implement actual metrics logic
            logger.info(`Fetching metrics for launch: ${id}`);

            return ApiResponse.success(res, {
                launchId: id,
                metrics: {
                    views: 0,
                    clicks: 0,
                    conversions: 0,
                },
            });
        } catch (error) {
            logger.error('Error fetching launch metrics:', error);
            return ApiResponse.error(res, 'Failed to fetch launch metrics', 500);
        }
    };

    /**
     * Update launch
     */
    updateLaunch = async(req, res) => {
        try {
            const { id } = req.params;
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            // TODO: Implement actual update logic
            logger.info(`Updating launch ${id}`);

            return ApiResponse.success(res, {
                message: 'Launch updated successfully',
                launchId: id,
            });
        } catch (error) {
            logger.error('Error updating launch:', error);
            return ApiResponse.error(res, 'Failed to update launch', 500);
        }
    };

    /**
     * Delete launch
     */
    deleteLaunch = async(req, res) => {
        try {
            const { id } = req.params;
            const workspaceId = req.user && req.user.workspaceId || 'test-workspace-id';

            // TODO: Implement actual deletion logic
            logger.info(`Deleting launch ${id}`);

            return ApiResponse.success(res, {
                message: 'Launch deleted successfully',
                launchId: id,
            });
        } catch (error) {
            logger.error('Error deleting launch:', error);
            return ApiResponse.error(res, 'Failed to delete launch', 500);
        }
    };
}