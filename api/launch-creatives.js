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
        const { path } = req.query;
        const pathSegments = path ? path.split('/') : [];

        console.log('Launch-creatives API called with path:', path, 'segments:', pathSegments, 'Method:', req.method);

        // Route based on path segments
        if (pathSegments[0] === 'launches') {
            return handleLaunches(req, res, pathSegments);
        }

        if (pathSegments[0] === 'templates') {
            return handleTemplates(req, res, pathSegments);
        }

        if (pathSegments[0] === 'ad-creatives') {
            return handleAdCreatives(req, res, pathSegments);
        }

        if (pathSegments[0] === 'images') {
            return handleImages(req, res, pathSegments);
        }
        if (pathSegments[0] === 'performance') {
            return handlePerformance(req, res, pathSegments);
        }
        if (pathSegments[0] === 'analytics') {
            return handleAnalytics(req, res, pathSegments);
        }

        // Default test endpoint
        return res.status(200).json({
            success: true,
            data: {
                message: 'Launch-creatives API is working',
                availableEndpoints: [
                    '/api/launch-creatives?path=launches',
                    '/api/launch-creatives?path=templates',
                    '/api/launch-creatives?path=ad-creatives/generate',
                    '/api/launch-creatives?path=images/creative/{id}/create-ad-creative'
                ]
            }
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

// Handle launches endpoints
async function handleLaunches(req, res, pathSegments) {
    if (req.method === 'GET') {
        // GET /api/launch-creatives?path=launches
        return handleGetLaunches(req, res);
    }

    if (req.method === 'POST') {
        // POST /api/launch-creatives?path=launches
        if (pathSegments.length === 1) {
            return handleCreateLaunch(req, res);
        }

        // POST /api/launch-creatives?path=launches/{id}/generate
        if (pathSegments.length === 3 && pathSegments[2] === 'generate') {
            return handleGenerateLaunch(req, res, pathSegments[1]);
        }
    }

    if (req.method === 'DELETE') {
        // DELETE /api/launch-creatives?path=launches/{id}
        if (pathSegments.length === 2) {
            return handleDeleteLaunch(req, res, pathSegments[1]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle templates endpoints
async function handleTemplates(req, res, pathSegments) {
    if (req.method === 'GET') {
        // GET /api/launch-creatives?path=templates
        return handleGetTemplates(req, res);
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle ad creatives endpoints
async function handleAdCreatives(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/launch-creatives?path=ad-creatives/generate
        if (pathSegments.length === 2 && pathSegments[1] === 'generate') {
            return handleGenerateAdCreative(req, res);
        }

        // POST /api/launch-creatives?path=ad-creatives/launch/{id}/generate
        if (pathSegments.length === 4 && pathSegments[1] === 'launch' && pathSegments[3] === 'generate') {
            return handleGenerateAdCreatives(req, res, pathSegments[2]);
        }

        // POST /api/launch-creatives?path=ad-creatives/launch/{id}/optimize
        if (pathSegments.length === 4 && pathSegments[1] === 'launch' && pathSegments[3] === 'optimize') {
            return handleOptimizeAdCreatives(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle images endpoints
async function handleImages(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/launch-creatives?path=images/creative/{id}/create-ad-creative
        if (pathSegments.length === 4 && pathSegments[1] === 'creative' && pathSegments[3] === 'create-ad-creative') {
            return handleCreateAdCreativeImage(req, res, pathSegments[2]);
        }

        // POST /api/launch-creatives?path=images/creative/{id}/generate-variations
        if (pathSegments.length === 4 && pathSegments[1] === 'creative' && pathSegments[3] === 'generate-variations') {
            return handleGenerateVariations(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
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
async function handleGenerateLaunch(req, res, launchId) {
    try {

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

        // For now, use mock content instead of AI service to test functionality
        console.log('Generating mock content for testing...');

        const extractedContent = {
            headline: `Amazing ${launch.product.title}`,
            postCopy: `Discover the incredible ${launch.product.title}! Perfect for ${launch.inputs.targetAudience || 'everyone'}. Get yours today!`,
            hashtags: `#${launch.product.category.toLowerCase()} #${launch.product.brand?.toLowerCase() || 'product'} #amazing #shop #deals`,
            callToAction: 'Shop Now',
            fullResponse: `Mock content generated for ${launch.product.title}`
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
                    // Create mock ad creative for this platform
                    const mockCreative = {
                        headline: `${launch.product.title} - ${platform.toUpperCase()} Special!`,
                        adCopy: `Get the amazing ${launch.product.title} now! Perfect for ${launch.inputs.targetAudience || 'everyone'}. Limited time offer!`,
                        callToAction: 'Shop Now',
                        fullResponse: `Mock ${platform} creative for ${launch.product.title}`
                    };

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
                            outputs: mockCreative,
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
async function handleDeleteLaunch(req, res, launchId) {
    try {
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
async function handleGenerateAdCreatives(req, res, launchId) {
    try {
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
async function handleOptimizeAdCreatives(req, res, launchId) {
    try {

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
async function handleCreateAdCreativeImage(req, res, creativeId) {
    try {

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

// Handle generate variations
async function handleGenerateVariations(req, res, creativeId) {
    try {
        const { variations } = req.body;

        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                message: 'Image variations generated successfully',
                images: [{
                        id: 'var_1',
                        imageUrl: 'https://via.placeholder.com/1200x630/FF6B6B/FFFFFF?text=Variation+1',
                        style: 'vibrant'
                    },
                    {
                        id: 'var_2',
                        imageUrl: 'https://via.placeholder.com/1200x630/4ECDC4/FFFFFF?text=Variation+2',
                        style: 'minimal'
                    },
                    {
                        id: 'var_3',
                        imageUrl: 'https://via.placeholder.com/1200x630/45B7D1/FFFFFF?text=Variation+3',
                        style: 'elegant'
                    }
                ],
                creativeId: creativeId
            }
        });

    } catch (error) {
        console.error('Error generating variations:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to generate variations' }
        });
    }
}

// Handle performance endpoints
async function handlePerformance(req, res, pathSegments) {
    if (req.method === 'GET' || req.method === 'POST') {
        // GET/POST /api/launch-creatives?path=performance/score/{id}
        if (pathSegments.length === 3 && pathSegments[1] === 'score') {
            return handlePerformanceScore(req, res, pathSegments[2]);
        }

        // GET/POST /api/launch-creatives?path=performance/prediction/{id}
        if (pathSegments.length === 3 && pathSegments[1] === 'prediction') {
            return handlePerformancePrediction(req, res, pathSegments[2]);
        }

        // GET/POST /api/launch-creatives?path=performance/insights/{id}
        if (pathSegments.length === 3 && pathSegments[1] === 'insights') {
            return handlePerformanceInsights(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle performance score
async function handlePerformanceScore(req, res, creativeId) {
    try {
        // Mock response for now
        const overallScore = Math.floor(Math.random() * 40) + 60; // Random score between 60-100
        const engagement = Math.floor(Math.random() * 30) + 70;
        const conversion = Math.floor(Math.random() * 25) + 75;
        const brandAlignment = Math.floor(Math.random() * 20) + 80;
        const creativity = Math.floor(Math.random() * 25) + 75;
        const clarity = Math.floor(Math.random() * 15) + 85;

        return res.status(200).json({
            success: true,
            data: {
                score: {
                    overall: overallScore,
                    engagement: engagement,
                    conversion: conversion,
                    brandAlignment: brandAlignment,
                    creativity: creativity,
                    clarity: clarity
                },
                metrics: {
                    engagement: engagement,
                    conversion: conversion,
                    reach: Math.floor(Math.random() * 35) + 65
                },
                creativeId: creativeId
            }
        });

    } catch (error) {
        console.error('Error getting performance score:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to get performance score' }
        });
    }
}

// Handle performance prediction
async function handlePerformancePrediction(req, res, creativeId) {
    try {
        // Mock response for now
        const ctrValue = Math.random() * 2 + 1; // 1-3%
        const cpmValue = Math.random() * 5 + 2; // $2-7
        const conversionRate = Math.random() * 2 + 0.5; // 0.5-2.5%

        return res.status(200).json({
            success: true,
            data: {
                prediction: {
                    ctr: ctrValue,
                    ctrFormatted: ctrValue.toFixed(2) + '%',
                    cpm: cpmValue,
                    cpmFormatted: '$' + cpmValue.toFixed(2),
                    conversionRate: conversionRate,
                    conversionRateFormatted: conversionRate.toFixed(2) + '%',
                    estimatedReach: Math.floor(Math.random() * 50000) + 10000
                },
                creativeId: creativeId
            }
        });

    } catch (error) {
        console.error('Error getting performance prediction:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to get performance prediction' }
        });
    }
}

// Handle performance insights
async function handlePerformanceInsights(req, res, creativeId) {
    try {
        // Mock response for now
        return res.status(200).json({
            success: true,
            data: {
                insights: [
                    'High engagement potential with current color scheme',
                    'Consider A/B testing different headlines',
                    'Strong call-to-action placement',
                    'Optimize for mobile viewing'
                ],
                recommendations: [
                    'Try a more vibrant background color',
                    'Test shorter, punchier copy',
                    'Add social proof elements'
                ],
                creativeId: creativeId
            }
        });

    } catch (error) {
        console.error('Error getting performance insights:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to get performance insights' }
        });
    }
}

// Handle analytics endpoints
async function handleAnalytics(req, res, pathSegments) {
    if (req.method === 'GET') {
        // GET /api/launch-creatives?path=analytics
        if (pathSegments.length === 1) {
            return handleGetAnalytics(req, res);
        }

        // GET /api/launch-creatives?path=analytics/launch/{id}
        if (pathSegments.length === 3 && pathSegments[1] === 'launch') {
            return handleGetLaunchAnalytics(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Handle get analytics
async function handleGetAnalytics(req, res) {
    try {
        const localPrisma = new PrismaClient();

        // Get all launches with their creatives
        const launches = await localPrisma.launch.findMany({
            include: {
                product: true,
                adCreatives: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate real analytics
        const totalLaunches = launches.length;
        const totalCreatives = launches.reduce((sum, launch) => sum + ((launch.adCreatives && launch.adCreatives.length) || 0), 0);

        // Calculate total impressions and clicks from creatives
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalConversions = 0;

        launches.forEach(launch => {
            if (launch.adCreatives) {
                launch.adCreatives.forEach(creative => {
                    totalImpressions += creative.impressions || 0;
                    totalClicks += creative.clicks || 0;
                    totalConversions += creative.conversions || 0;
                });
            }
        });

        // Generate trends data based on actual launches (last 7 days)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const launchesByDay = [];
        const creativesByDay = [];
        const impressionsByDay = [];
        const clicksByDay = [];

        for (let i = 6; i >= 0; i--) {
            const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const dayLaunches = launches.filter(launch =>
                launch.createdAt >= dayStart && launch.createdAt < dayEnd
            );

            const dayCreatives = dayLaunches.reduce((sum, launch) =>
                sum + ((launch.adCreatives && launch.adCreatives.length) || 0), 0
            );

            const dayImpressions = dayLaunches.reduce((sum, launch) =>
                sum + ((launch.adCreatives && launch.adCreatives.reduce((cSum, creative) =>
                    cSum + (creative.impressions || 0), 0)) || 0), 0
            );

            const dayClicks = dayLaunches.reduce((sum, launch) =>
                sum + ((launch.adCreatives && launch.adCreatives.reduce((cSum, creative) =>
                    cSum + (creative.clicks || 0), 0)) || 0), 0
            );

            launchesByDay.push(dayLaunches.length);
            creativesByDay.push(dayCreatives);
            impressionsByDay.push(dayImpressions);
            clicksByDay.push(dayClicks);
        }

        // Get top performing launches (based on total impressions)
        const topPerforming = launches
            .map(launch => {
                const totalLaunchImpressions = (launch.adCreatives && launch.adCreatives.reduce((sum, creative) =>
                    sum + (creative.impressions || 0), 0)) || 0;
                return {
                    id: launch.id,
                    name: launch.name || (launch.product && launch.product.title) || 'Unnamed Launch',
                    score: Math.min(100, Math.max(60, Math.floor(totalLaunchImpressions / 1000) + 60))
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                totalLaunches,
                totalCreatives,
                totalImpressions,
                totalClicks,
                totalConversions,
                trends: {
                    launches: launchesByDay,
                    creatives: creativesByDay,
                    impressions: impressionsByDay,
                    clicks: clicksByDay
                },
                topPerforming
            }
        });

    } catch (error) {
        console.error('Error getting analytics:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to get analytics' }
        });
    }
}

// Handle get launch analytics
async function handleGetLaunchAnalytics(req, res, launchId) {
    try {
        const localPrisma = new PrismaClient();

        // Get the specific launch with its creatives
        const launch = await localPrisma.launch.findUnique({
            where: { id: launchId },
            include: {
                product: true,
                adCreatives: true
            }
        });

        if (!launch) {
            await localPrisma.$disconnect();
            return res.status(404).json({
                success: false,
                error: { message: 'Launch not found' }
            });
        }

        // Calculate real metrics from creatives
        const totalImpressions = (launch.adCreatives && launch.adCreatives.reduce((sum, creative) =>
            sum + (creative.impressions || 0), 0)) || 0;
        const totalClicks = (launch.adCreatives && launch.adCreatives.reduce((sum, creative) =>
            sum + (creative.clicks || 0), 0)) || 0;
        const totalConversions = (launch.adCreatives && launch.adCreatives.reduce((sum, creative) =>
            sum + (creative.conversions || 0), 0)) || 0;

        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0.00';

        // Generate daily trends for the last 5 days
        const now = new Date();
        const dailyTrends = [];

        for (let i = 4; i >= 0; i--) {
            const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            // For now, we'll use proportional distribution of total metrics
            // In a real app, you'd have daily tracking data
            const dayImpressions = Math.floor(totalImpressions / 5) + Math.floor(Math.random() * 200) - 100;
            const dayClicks = Math.floor(totalClicks / 5) + Math.floor(Math.random() * 20) - 10;
            const dayConversions = Math.floor(totalConversions / 5) + Math.floor(Math.random() * 5) - 2;

            dailyTrends.push({
                date: dayStart.toISOString().split('T')[0],
                impressions: Math.max(0, dayImpressions),
                clicks: Math.max(0, dayClicks),
                conversions: Math.max(0, dayConversions)
            });
        }

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                launchId: launchId,
                launchName: launch.name || (launch.product && launch.product.title) || 'Unnamed Launch',
                metrics: {
                    impressions: totalImpressions,
                    clicks: totalClicks,
                    conversions: totalConversions,
                    ctr: ctr + '%',
                    conversionRate: conversionRate + '%'
                },
                trends: {
                    daily: dailyTrends
                },
                audience: {
                    demographics: {
                        age18_24: 25,
                        age25_34: 35,
                        age35_44: 25,
                        age45_54: 15
                    },
                    interests: ['Technology', 'Fashion', 'Lifestyle', 'Shopping']
                }
            }
        });

    } catch (error) {
        console.error('Error getting launch analytics:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to get launch analytics' }
        });
    }
}