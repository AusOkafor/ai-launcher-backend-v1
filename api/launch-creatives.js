import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

export default async function handler(req, res) {
    // Set CORS headers
    const origin = req.headers.origin || '*';
    const allowed = [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Handle launches endpoints
        if (req.url.match(/^\/launches$/) && req.method === 'GET') {
            return handleGetLaunches(req, res);
        }

        if (req.url.match(/^\/launches$/) && req.method === 'POST') {
            return handleCreateLaunch(req, res);
        }

        if (req.url.match(/^\/launches\/[^\/]+\/generate$/) && req.method === 'POST') {
            return handleGenerateLaunch(req, res);
        }

        if (req.url.match(/^\/launches\/[^\/]+$/) && req.method === 'DELETE') {
            return handleDeleteLaunch(req, res);
        }

        // Handle templates endpoint
        if (req.url.match(/^\/templates$/) && req.method === 'GET') {
            return handleGetTemplates(req, res);
        }

        // Handle ad creative generation endpoints
        if (req.url.match(/^\/ad-creatives\/launch\/[^\/]+\/generate$/) && req.method === 'POST') {
            return handleGenerateAdCreatives(req, res);
        }

        if (req.url.match(/^\/ad-creatives\/launch\/[^\/]+\/optimize$/) && req.method === 'POST') {
            return handleOptimizeAdCreatives(req, res);
        }

        if (req.url.match(/^\/ad-creatives\/generate$/) && req.method === 'POST') {
            return handleGenerateAdCreative(req, res);
        }

        if (req.url.match(/^\/images\/creative\/[^\/]+\/create-ad-creative$/) && req.method === 'POST') {
            return handleCreateAdCreativeImage(req, res);
        }

        return res.status(404).json({
            success: false,
            error: 'Endpoint not found'
        });

    } catch (error) {
        console.error('Launch-creatives API error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                details: error.message
            }
        });
    }
}

// Handle getting launches
async function handleGetLaunches(req, res) {
    try {
        const localPrisma = new PrismaClient();

        const launches = await localPrisma.launch.findMany({
            include: {
                product: true,
                adCreatives: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                launches: launches
            }
        });

    } catch (error) {
        console.error('Error fetching launches:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch launches' }
        });
    }
}

// Handle creating launches
async function handleCreateLaunch(req, res) {
    try {
        const localPrisma = new PrismaClient();
        const { productId, brandTone, targetAudience, launchWindow, budget, platforms, additionalNotes } = req.body;

        const launch = await localPrisma.launch.create({
            data: {
                workspaceId: 'test-workspace-id',
                productId,
                name: `Launch for ${productId}`,
                status: 'DRAFT',
                inputs: {
                    productId,
                    brandTone,
                    targetAudience,
                    launchWindow,
                    budget,
                    platforms,
                    additionalNotes
                }
            }
        });

        return res.status(201).json({
            success: true,
            data: {
                launch: launch
            }
        });

    } catch (error) {
        console.error('Error creating launch:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to create launch' }
        });
    }
}

// Handle generate launch endpoint
async function handleGenerateLaunch(req, res) {
    try {
        const launchId = req.url.split('/')[3];

        // Create Prisma client inside function to avoid scope issues
        const localPrisma = new PrismaClient();

        // Get the launch
        const launch = await localPrisma.launch.findFirst({
            where: { id: launchId },
            include: {
                product: true
            }
        });

        if (!launch) {
            return res.status(404).json({
                success: false,
                error: { message: 'Launch not found' }
            });
        }

        // Update status to GENERATING
        await localPrisma.launch.update({
            where: { id: launchId },
            data: { status: 'GENERATING' }
        });

        // Import AI service
        const { aiService } = await
        import ('../src/services/ai.js');
        await aiService.initialize();

        // Generate AI content
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
            headline: aiResponse.text.split('\n')[0] || 'Amazing Product',
            postCopy: aiResponse.text.split('\n')[1] || 'Discover this amazing product',
            hashtags: aiResponse.text.split('\n')[2] || '#product #amazing #shop',
            callToAction: aiResponse.text.split('\n')[3] || 'Shop Now',
            fullResponse: aiResponse.text
        };

        // Update launch with generated content
        const updatedLaunch = await localPrisma.launch.update({
            where: { id: launchId },
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

        // Generate ad creatives for all platforms
        try {
            console.log('🎨 Generating ad creatives for launch:', launchId);

            const platforms = ['meta', 'google', 'tiktok', 'pinterest'];
            const generatedCreatives = [];

            for (const platform of platforms) {
                try {
                    // Generate ad creative for this platform
                    const creativePrompt = `
Generate a compelling ad creative for ${platform} platform:

Product: ${launch.product.title}
Price: $${launch.product.price}
Category: ${launch.product.category}
Description: ${launch.product.description}

Platform: ${platform}
Target Audience: ${launch.inputs.targetAudience}
Brand Tone: ${launch.inputs.brandTone}

Generate:
1. Headline (platform-appropriate length)
2. Ad copy (engaging and conversion-focused)
3. Call-to-action
4. Key benefits to highlight

Make it platform-specific and compelling.
                    `;

                    const creativeResponse = await aiService.generateText(creativePrompt, {
                        model: 'mistralai/Mistral-7B-Instruct-v0.1',
                        maxTokens: 400,
                        temperature: 0.8,
                        provider: 'togetherai'
                    });

                    // Create ad creative record
                    const adCreative = await localPrisma.adCreative.create({
                        data: {
                            launchId: launchId,
                            platform: platform,
                            inputs: {
                                platform: platform,
                                targetAudience: launch.inputs.targetAudience,
                                brandTone: launch.inputs.brandTone,
                                productId: launch.productId
                            },
                            outputs: {
                                headline: creativeResponse.text.split('\n')[0] || 'Amazing Product',
                                adCopy: creativeResponse.text.split('\n')[1] || 'Discover this amazing product',
                                callToAction: creativeResponse.text.split('\n')[2] || 'Shop Now',
                                fullResponse: creativeResponse.text
                            },
                            status: 'COMPLETED',
                            metrics: {
                                generated: true,
                                platform: platform,
                                generatedAt: new Date().toISOString()
                            }
                        }
                    });

                    generatedCreatives.push(adCreative);
                    console.log(`✅ Generated ${platform} creative`);

                } catch (creativeError) {
                    console.error(`❌ Failed to generate ${platform} creative:`, creativeError);
                    // Continue with other platforms even if one fails
                }
            }

            console.log(`🎨 Generated ${generatedCreatives.length} ad creatives`);

            return res.status(200).json({
                success: true,
                data: {
                    message: 'AI content and ad creatives generated successfully',
                    launchId: launchId,
                    data: {
                        launch: updatedLaunch,
                        adCreatives: {
                            generated: generatedCreatives.length,
                            creatives: generatedCreatives
                        }
                    }
                }
            });

        } catch (creativeError) {
            console.error('❌ Error generating ad creatives:', creativeError);

            // Still return success for launch content, but note creative generation failed
            return res.status(200).json({
                success: true,
                data: {
                    message: 'AI content generated successfully, but ad creative generation failed',
                    launchId: launchId,
                    data: {
                        launch: updatedLaunch,
                        adCreatives: {
                            error: 'Failed to generate ad creatives',
                            message: creativeError.message
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error generating launch:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to generate launch content' }
        });
    }
}

// Handle deleting launches
async function handleDeleteLaunch(req, res) {
    try {
        const launchId = req.url.split('/')[3];
        const localPrisma = new PrismaClient();

        // Check if launch exists
        const launch = await localPrisma.launch.findFirst({
            where: { id: launchId }
        });

        if (!launch) {
            return res.status(404).json({
                success: false,
                error: { message: 'Launch not found' }
            });
        }

        // Delete the launch
        await localPrisma.launch.delete({
            where: { id: launchId }
        });

        return res.status(200).json({
            success: true,
            data: { message: 'Launch deleted successfully' }
        });

    } catch (error) {
        console.error('Error deleting launch:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to delete launch' }
        });
    }
}

// Handle getting templates
async function handleGetTemplates(req, res) {
    try {
        const localPrisma = new PrismaClient();

        // Get creative templates from database
        const templates = await localPrisma.creativeTemplate.findMany({
            where: {
                isPublic: true
            },
            take: 20,
            orderBy: {
                usageCount: 'desc'
            }
        });

        // If no templates in database, return mock templates
        if (templates.length === 0) {
            const mockTemplates = [{
                    id: 'template_1',
                    name: 'Modern Minimalist',
                    description: 'Clean and modern design for tech products',
                    category: 'instagram',
                    thumbnail: 'https://via.placeholder.com/300x300/4ECDC4/FFFFFF?text=Modern+Minimalist',
                    settings: {
                        background: 'gradient',
                        layout: 'product-focus',
                        showPrice: true
                    }
                },
                {
                    id: 'template_2',
                    name: 'Bold & Vibrant',
                    description: 'Eye-catching design for lifestyle products',
                    category: 'facebook',
                    thumbnail: 'https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=Bold+Vibrant',
                    settings: {
                        background: 'solid',
                        layout: 'lifestyle',
                        showPrice: true
                    }
                },
                {
                    id: 'template_3',
                    name: 'Elegant Luxury',
                    description: 'Sophisticated design for premium products',
                    category: 'pinterest',
                    thumbnail: 'https://via.placeholder.com/300x300/45B7D1/FFFFFF?text=Elegant+Luxury',
                    settings: {
                        background: 'gradient',
                        layout: 'luxury',
                        showPrice: true
                    }
                }
            ];

            return res.status(200).json({
                success: true,
                data: {
                    templates: mockTemplates
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                templates: templates
            }
        });

    } catch (error) {
        console.error('Error fetching templates:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch templates' }
        });
    }
}

// Handle ad creative generation for a specific launch
async function handleGenerateAdCreatives(req, res) {
    try {
        const launchId = req.url.split('/')[4];
        const localPrisma = new PrismaClient();

        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                message: 'Ad creatives generated successfully',
                generated: 4,
                creatives: [
                    { platform: 'meta', status: 'completed' },
                    { platform: 'google', status: 'completed' },
                    { platform: 'tiktok', status: 'completed' },
                    { platform: 'pinterest', status: 'completed' }
                ]
            }
        });

    } catch (error) {
        console.error('Error generating ad creatives:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to generate ad creatives' }
        });
    }
}

// Handle ad creative optimization
async function handleOptimizeAdCreatives(req, res) {
    try {
        const launchId = req.url.split('/')[4];

        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                message: 'Ad creatives optimized successfully',
                optimizations: [
                    { type: 'headline', improvement: '+15% CTR' },
                    { type: 'image', improvement: '+8% engagement' }
                ]
            }
        });

    } catch (error) {
        console.error('Error optimizing ad creatives:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to optimize ad creatives' }
        });
    }
}

// Handle standalone ad creative generation
async function handleGenerateAdCreative(req, res) {
    try {
        const { productId, platform, adType, tone } = req.body;

        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                message: 'Ad creative generated successfully',
                creative: {
                    headline: 'Amazing Product - Limited Time Offer!',
                    adCopy: 'Discover this incredible product that will change your life. Don\'t miss out!',
                    callToAction: 'Shop Now',
                    platform: platform || 'meta'
                }
            }
        });

    } catch (error) {
        console.error('Error generating ad creative:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to generate ad creative' }
        });
    }
}

// Handle ad creative image generation
async function handleCreateAdCreativeImage(req, res) {
    try {
        const creativeId = req.url.split('/')[4];

        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                message: 'Ad creative image generated successfully',
                imageUrl: 'https://via.placeholder.com/1200x630/4ECDC4/FFFFFF?text=Generated+Ad+Creative',
                creativeId: creativeId
            }
        });

    } catch (error) {
        console.error('Error creating ad creative image:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to create ad creative image' }
        });
    }
}