import { PrismaClient } from '@prisma/client'

let prisma

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

export default async function handler(req, res) {
    // Set CORS headers
    const origin = req.headers.origin || '*'
    const allowed = [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ]
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    try {
        // Handle launch generation endpoint
        if (req.url.match(/\/generate$/) && req.method === 'POST') {
            const launchId = req.url.split('/')[3]; // Extract launch ID from URL

            console.log('Generating launch content for:', launchId);

            // Get the launch
            const launch = await prisma.launch.findFirst({
                where: { id: launchId },
                include: { product: true }
            });

            if (!launch) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Launch not found' }
                });
            }

            // Update status to GENERATING
            await prisma.launch.update({
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
            const updatedLaunch = await prisma.launch.update({
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
                        const adCreative = await prisma.adCreative.create({
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
        }

        if (req.method === 'GET') {
            console.log('Fetching launches...')

            const launches = await prisma.launch.findMany({
                include: {
                    product: true,
                    adCreatives: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            console.log(`Found ${launches.length} launches`)

            return res.status(200).json({
                success: true,
                data: { launches },
                timestamp: new Date().toISOString()
            })
        }

        if (req.method === 'POST') {
            const { productId, brandTone, targetAudience, launchWindow, budget, platforms, additionalNotes } = req.body

            const launch = await prisma.launch.create({
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
            })

            return res.status(201).json({
                success: true,
                data: { launch },
                timestamp: new Date().toISOString()
            })
        }

        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        })
    } catch (error) {
        console.error('Error with launches:', error)
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to process launches request',
                details: error.message
            }
        })
    }
}