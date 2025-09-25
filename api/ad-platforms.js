import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import API services
import MetaAPIService from '../services/meta-api.js';
import GoogleAdsAPIService from '../services/google-ads-api.js';
import TikTokAPIService from '../services/tiktok-api.js';
import PinterestAPIService from '../services/pinterest-api.js';

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

        console.log('Ad-platforms API called with path:', path, 'segments:', pathSegments, 'Method:', req.method);

        // Mock/Test endpoints for development
        if (pathSegments[0] === 'mock') {
            return handleMockEndpoints(req, res, pathSegments);
        }

        // Handle disconnect endpoints FIRST (e.g., meta/disconnect)
        if (pathSegments.length === 2 && pathSegments[1] === 'disconnect') {
            return handleDisconnectPlatform(req, res, pathSegments[0]);
        }

        // Route based on path segments
        if (pathSegments[0] === 'meta') {
            return handleMetaIntegration(req, res, pathSegments);
        }

        if (pathSegments[0] === 'google') {
            return handleGoogleIntegration(req, res, pathSegments);
        }

        if (pathSegments[0] === 'tiktok') {
            return handleTikTokIntegration(req, res, pathSegments);
        }

        if (pathSegments[0] === 'pinterest') {
            return handlePinterestIntegration(req, res, pathSegments);
        }

        if (pathSegments[0] === 'publish') {
            return handleAdPublishing(req, res, pathSegments);
        }

        if (pathSegments[0] === 'performance') {
            return handlePerformanceData(req, res, pathSegments);
        }

        if (pathSegments[0] === 'accounts') {
            return handleAdAccounts(req, res, pathSegments);
        }

        // Default test endpoint
        return res.status(200).json({
            success: true,
            data: {
                message: 'Ad-platforms API is working',
                availableEndpoints: [
                    '/api/ad-platforms?path=mock/connect/meta',
                    '/api/ad-platforms?path=mock/connect/google',
                    '/api/ad-platforms?path=mock/connect/tiktok',
                    '/api/ad-platforms?path=mock/connect/pinterest',
                    '/api/ad-platforms?path=mock/publish/creative/{id}',
                    '/api/ad-platforms?path=mock/performance/creative/{id}',
                    '/api/ad-platforms?path=mock/accounts',
                    '/api/ad-platforms?path=meta/connect',
                    '/api/ad-platforms?path=google/connect',
                    '/api/ad-platforms?path=tiktok/connect',
                    '/api/ad-platforms?path=pinterest/connect',
                    '/api/ad-platforms?path=publish/creative/{id}',
                    '/api/ad-platforms?path=performance/creative/{id}',
                    '/api/ad-platforms?path=accounts'
                ]
            }
        });

    } catch (error) {
        console.error('Ad-platforms API error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                details: error.message
            }
        });
    }
}

// Meta (Facebook/Instagram) Integration
async function handleMetaIntegration(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=meta/connect
        if (pathSegments[1] === 'connect') {
            return handleMetaConnect(req, res);
        }

        // POST /api/ad-platforms?path=meta/publish
        if (pathSegments[1] === 'publish') {
            return handleMetaPublish(req, res);
        }

        // POST /api/ad-platforms?path=meta/campaign
        if (pathSegments[1] === 'campaign') {
            return handleMetaCampaign(req, res);
        }
    }

    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=meta/accounts
        if (pathSegments[1] === 'accounts') {
            return handleMetaAccounts(req, res);
        }

        // GET /api/ad-platforms?path=meta/performance/{adId}
        if (pathSegments[1] === 'performance' && pathSegments[2]) {
            return handleMetaPerformance(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Google Ads Integration
async function handleGoogleIntegration(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=google/connect
        if (pathSegments[1] === 'connect') {
            return handleGoogleConnect(req, res);
        }

        // POST /api/ad-platforms?path=google/publish
        if (pathSegments[1] === 'publish') {
            return handleGooglePublish(req, res);
        }

        // POST /api/ad-platforms?path=google/campaign
        if (pathSegments[1] === 'campaign') {
            return handleGoogleCampaign(req, res);
        }
    }

    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=google/accounts
        if (pathSegments[1] === 'accounts') {
            return handleGoogleAccounts(req, res);
        }

        // GET /api/ad-platforms?path=google/performance/{adId}
        if (pathSegments[1] === 'performance' && pathSegments[2]) {
            return handleGooglePerformance(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// TikTok Integration
async function handleTikTokIntegration(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=tiktok/connect
        if (pathSegments[1] === 'connect') {
            return handleTikTokConnect(req, res);
        }

        // POST /api/ad-platforms?path=tiktok/publish
        if (pathSegments[1] === 'publish') {
            return handleTikTokPublish(req, res);
        }
    }

    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=tiktok/accounts
        if (pathSegments[1] === 'accounts') {
            return handleTikTokAccounts(req, res);
        }

        // GET /api/ad-platforms?path=tiktok/performance/{adId}
        if (pathSegments[1] === 'performance' && pathSegments[2]) {
            return handleTikTokPerformance(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Pinterest Integration
async function handlePinterestIntegration(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=pinterest/connect
        if (pathSegments[1] === 'connect') {
            return handlePinterestConnect(req, res);
        }

        // POST /api/ad-platforms?path=pinterest/publish
        if (pathSegments[1] === 'publish') {
            return handlePinterestPublish(req, res);
        }
    }

    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=pinterest/accounts
        if (pathSegments[1] === 'accounts') {
            return handlePinterestAccounts(req, res);
        }

        // GET /api/ad-platforms?path=pinterest/performance/{adId}
        if (pathSegments[1] === 'performance' && pathSegments[2]) {
            return handlePinterestPerformance(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Unified Ad Publishing
async function handleAdPublishing(req, res, pathSegments) {
    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=publish/creative/{id}
        if (pathSegments[1] === 'creative' && pathSegments[2]) {
            return handlePublishCreative(req, res, pathSegments[2]);
        }

        // POST /api/ad-platforms?path=publish/launch/{id}
        if (pathSegments[1] === 'launch' && pathSegments[2]) {
            return handlePublishLaunch(req, res, pathSegments[2]);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Performance Data Aggregation
async function handlePerformanceData(req, res, pathSegments) {
    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=performance/creative/{id}
        if (pathSegments[1] === 'creative' && pathSegments[2]) {
            return handleGetCreativePerformance(req, res, pathSegments[2]);
        }

        // GET /api/ad-platforms?path=performance/launch/{id}
        if (pathSegments[1] === 'launch' && pathSegments[2]) {
            return handleGetLaunchPerformance(req, res, pathSegments[2]);
        }

        // GET /api/ad-platforms?path=performance/dashboard
        if (pathSegments[1] === 'dashboard') {
            return handleGetDashboardPerformance(req, res);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Ad Accounts Management
async function handleAdAccounts(req, res, pathSegments) {
    if (req.method === 'GET') {
        // GET /api/ad-platforms?path=accounts
        if (pathSegments.length === 1) {
            return handleGetAllAccounts(req, res);
        }
    }

    if (req.method === 'POST') {
        // POST /api/ad-platforms?path=accounts/connect
        if (pathSegments[1] === 'connect') {
            return handleConnectAccount(req, res);
        }
    }

    return res.status(405).json({
        success: false,
        error: { message: 'Method not allowed' }
    });
}

// Meta Integration Handlers
async function handleMetaConnect(req, res) {
    try {
        console.log('Meta connect request received');
        const { appId, appSecret, accessToken, sandboxAdAccountId } = req.body;
        console.log('Request body:', { appId, hasAppSecret: !!appSecret, hasAccessToken: !!accessToken, sandboxAdAccountId });

        // Validate required fields
        if (!accessToken || !appId || !appSecret || !sandboxAdAccountId) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json({
                success: false,
                error: { message: 'App ID, App Secret, access token, and sandbox ad account ID are required' }
            });
        }

        console.log('Testing Meta connection...');
        // Test the connection by fetching app info
        const accountInfo = await testMetaConnection(accessToken, appId);
        console.log('Meta connection test result:', accountInfo);

        if (!accountInfo.success) {
            console.log('Meta connection test failed:', accountInfo.error);
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to connect to Meta account', details: accountInfo.error }
            });
        }

        // Test sandbox ad account access (optional for now)
        const sandboxInfo = await testMetaSandboxAccount(accessToken, sandboxAdAccountId);

        // If sandbox test fails, log the error but don't fail the connection
        if (!sandboxInfo.success) {
            console.warn('Sandbox account test failed:', sandboxInfo.error);
            // Continue with connection but mark sandbox as unavailable
        }

        // Store the connection in database
        console.log('Storing connection in database...');
        const localPrisma = new PrismaClient();

        try {
            const connection = await localPrisma.adPlatformConnection.upsert({
                where: {
                    platform_accountId: {
                        platform: 'meta',
                        accountId: appId
                    }
                },
                update: {
                    accessToken: accessToken,
                    appSecret: appSecret,
                    accountInfo: {
                        ...accountInfo.data,
                        sandboxAdAccountId: sandboxAdAccountId,
                        sandboxInfo: sandboxInfo.success ? sandboxInfo.data : null,
                        sandboxAvailable: sandboxInfo.success
                    },
                    isActive: true,
                    lastConnected: new Date()
                },
                create: {
                    platform: 'meta',
                    accountId: appId,
                    accessToken: accessToken,
                    appSecret: appSecret,
                    accountInfo: {
                        ...accountInfo.data,
                        sandboxAdAccountId: sandboxAdAccountId,
                        sandboxInfo: sandboxInfo.success ? sandboxInfo.data : null,
                        sandboxAvailable: sandboxInfo.success
                    },
                    isActive: true,
                    lastConnected: new Date(),
                    workspaceId: 'test-workspace-id' // TODO: Get from auth
                }
            });

            console.log('Connection stored successfully:', connection.id);
            await localPrisma.$disconnect();
        } catch (dbError) {
            console.error('Database error:', dbError);
            await localPrisma.$disconnect();
            throw dbError;
        }

        return res.status(200).json({
            success: true,
            data: {
                message: 'Meta account connected successfully',
                connection: {
                    id: connection.id,
                    platform: connection.platform,
                    accountId: connection.accountId,
                    accountName: accountInfo.data.name
                }
            }
        });

    } catch (error) {
        console.error('Error connecting Meta account:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to connect Meta account',
                details: error.message,
                type: error.name
            }
        });
    }
}

async function handleMetaPublish(req, res) {
    try {
        const { creativeId, campaignSettings } = req.body;

        // Get the creative from database
        const localPrisma = new PrismaClient();
        const creative = await localPrisma.adCreative.findUnique({
            where: { id: creativeId },
            include: { launch: { include: { product: true } } }
        });

        if (!creative) {
            return res.status(404).json({
                success: false,
                error: { message: 'Creative not found' }
            });
        }

        // Get Meta connection
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            return res.status(400).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        // Publish to Meta
        const publishResult = await publishToMeta(creative, connection, campaignSettings);

        if (!publishResult.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to publish to Meta', details: publishResult.error }
            });
        }

        // Update creative with published ad ID
        await localPrisma.adCreative.update({
            where: { id: creativeId },
            data: {
                publishedAds: {
                    meta: {
                        adId: publishResult.data.adId,
                        campaignId: publishResult.data.campaignId,
                        status: 'ACTIVE',
                        publishedAt: new Date()
                    }
                }
            }
        });

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: 'Creative published to Meta successfully',
                adId: publishResult.data.adId,
                campaignId: publishResult.data.campaignId
            }
        });

    } catch (error) {
        console.error('Error publishing to Meta:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to publish to Meta' }
        });
    }
}

async function handleMetaAccounts(req, res) {
    try {
        const localPrisma = new PrismaClient();
        const connections = await localPrisma.adPlatformConnection.findMany({
            where: { platform: 'meta', isActive: true }
        });

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                accounts: connections.map(conn => ({
                    id: conn.id,
                    accountId: conn.accountId,
                    accountName: (conn.accountInfo && conn.accountInfo.name) || 'Unknown',
                    isActive: conn.isActive,
                    lastConnected: conn.lastConnected
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching Meta accounts:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch Meta accounts' }
        });
    }
}

async function handleMetaPerformance(req, res, adId) {
    try {
        // Get Meta connection
        const localPrisma = new PrismaClient();
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            return res.status(400).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        // Fetch performance data from Meta
        const performanceData = await fetchMetaPerformance(connection, adId);

        if (!performanceData.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to fetch Meta performance data', details: performanceData.error }
            });
        }

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                adId: adId,
                platform: 'meta',
                performance: performanceData.data
            }
        });

    } catch (error) {
        console.error('Error fetching Meta performance:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch Meta performance data' }
        });
    }
}

// Google Ads Integration Handlers
async function handleGoogleConnect(req, res) {
    try {
        const { refreshToken, customerId } = req.body;

        // Validate required fields
        if (!refreshToken || !customerId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Refresh token and customer ID are required' }
            });
        }

        // Test the connection
        const accountInfo = await testGoogleConnection(refreshToken, customerId);

        if (!accountInfo.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to connect to Google Ads account', details: accountInfo.error }
            });
        }

        // Store the connection
        const localPrisma = new PrismaClient();
        const connection = await localPrisma.adPlatformConnection.upsert({
            where: {
                platform_accountId: {
                    platform: 'google',
                    accountId: customerId
                }
            },
            update: {
                accessToken: refreshToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date()
            },
            create: {
                platform: 'google',
                accountId: customerId,
                accessToken: refreshToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date(),
                workspaceId: 'test-workspace-id'
            }
        });

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: 'Google Ads account connected successfully',
                connection: {
                    id: connection.id,
                    platform: connection.platform,
                    accountId: connection.accountId,
                    accountName: accountInfo.data.name
                }
            }
        });

    } catch (error) {
        console.error('Error connecting Google Ads account:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to connect Google Ads account' }
        });
    }
}

// TikTok Integration Handlers
async function handleTikTokConnect(req, res) {
    try {
        const { accessToken, advertiserId } = req.body;

        if (!accessToken || !advertiserId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Access token and advertiser ID are required' }
            });
        }

        // Test connection and store
        const accountInfo = await testTikTokConnection(accessToken, advertiserId);

        if (!accountInfo.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to connect to TikTok account', details: accountInfo.error }
            });
        }

        const localPrisma = new PrismaClient();
        const connection = await localPrisma.adPlatformConnection.upsert({
            where: {
                platform_accountId: {
                    platform: 'tiktok',
                    accountId: advertiserId
                }
            },
            update: {
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date()
            },
            create: {
                platform: 'tiktok',
                accountId: advertiserId,
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date(),
                workspaceId: 'test-workspace-id'
            }
        });

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: 'TikTok account connected successfully',
                connection: {
                    id: connection.id,
                    platform: connection.platform,
                    accountId: connection.accountId,
                    accountName: accountInfo.data.name
                }
            }
        });

    } catch (error) {
        console.error('Error connecting TikTok account:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to connect TikTok account' }
        });
    }
}

// Pinterest Integration Handlers
async function handlePinterestConnect(req, res) {
    try {
        const { accessToken, advertiserId } = req.body;

        if (!accessToken || !advertiserId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Access token and advertiser ID are required' }
            });
        }

        // Test connection and store
        const accountInfo = await testPinterestConnection(accessToken, advertiserId);

        if (!accountInfo.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to connect to Pinterest account', details: accountInfo.error }
            });
        }

        const localPrisma = new PrismaClient();
        const connection = await localPrisma.adPlatformConnection.upsert({
            where: {
                platform_accountId: {
                    platform: 'pinterest',
                    accountId: advertiserId
                }
            },
            update: {
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date()
            },
            create: {
                platform: 'pinterest',
                accountId: advertiserId,
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date(),
                workspaceId: 'test-workspace-id'
            }
        });

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: 'Pinterest account connected successfully',
                connection: {
                    id: connection.id,
                    platform: connection.platform,
                    accountId: connection.accountId,
                    accountName: accountInfo.data.name
                }
            }
        });

    } catch (error) {
        console.error('Error connecting Pinterest account:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to connect Pinterest account' }
        });
    }
}

// Unified Publishing Handlers
async function handlePublishCreative(req, res, creativeId) {
    try {
        const { platforms, campaignSettings } = req.body;

        const localPrisma = new PrismaClient();
        const creative = await localPrisma.adCreative.findUnique({
            where: { id: creativeId },
            include: { launch: { include: { product: true } } }
        });

        if (!creative) {
            return res.status(404).json({
                success: false,
                error: { message: 'Creative not found' }
            });
        }

        const publishResults = {};
        const errors = [];

        // Publish to each requested platform
        for (const platform of platforms) {
            try {
                let result;
                switch (platform) {
                    case 'meta':
                        result = await publishToMeta(creative, null, campaignSettings);
                        break;
                    case 'google':
                        result = await publishToGoogle(creative, null, campaignSettings);
                        break;
                    case 'tiktok':
                        result = await publishToTikTok(creative, null, campaignSettings);
                        break;
                    case 'pinterest':
                        result = await publishToPinterest(creative, null, campaignSettings);
                        break;
                    default:
                        throw new Error(`Unsupported platform: ${platform}`);
                }

                if (result.success) {
                    publishResults[platform] = result.data;
                } else {
                    errors.push({ platform, error: result.error });
                }
            } catch (error) {
                errors.push({ platform, error: error.message });
            }
        }

        // Update creative with published ad IDs
        if (Object.keys(publishResults).length > 0) {
            await localPrisma.adCreative.update({
                where: { id: creativeId },
                data: {
                    publishedAds: publishResults
                }
            });
        }

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: `Creative published to ${Object.keys(publishResults).length} platform(s)`,
                results: publishResults,
                errors: errors
            }
        });

    } catch (error) {
        console.error('Error publishing creative:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to publish creative' }
        });
    }
}

// Performance Data Handlers
async function handleGetCreativePerformance(req, res, creativeId) {
    try {
        const localPrisma = new PrismaClient();
        const creative = await localPrisma.adCreative.findUnique({
            where: { id: creativeId }
        });

        if (!creative) {
            return res.status(404).json({
                success: false,
                error: { message: 'Creative not found' }
            });
        }

        const performanceData = {};

        // Fetch performance from each platform where the creative is published
        if (creative.publishedAds) {
            for (const [platform, adData] of Object.entries(creative.publishedAds)) {
                try {
                    let platformPerformance;
                    switch (platform) {
                        case 'meta':
                            platformPerformance = await fetchMetaPerformance(null, adData.adId);
                            break;
                        case 'google':
                            platformPerformance = await fetchGooglePerformance(null, adData.adId);
                            break;
                        case 'tiktok':
                            platformPerformance = await fetchTikTokPerformance(null, adData.adId);
                            break;
                        case 'pinterest':
                            platformPerformance = await fetchPinterestPerformance(null, adData.adId);
                            break;
                    }

                    if (platformPerformance && platformPerformance.success) {
                        performanceData[platform] = platformPerformance.data;
                    }
                } catch (error) {
                    console.error(`Error fetching ${platform} performance:`, error);
                }
            }
        }

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                creativeId: creativeId,
                performance: performanceData
            }
        });

    } catch (error) {
        console.error('Error fetching creative performance:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch creative performance' }
        });
    }
}

// Ad Accounts Management
async function handleGetAllAccounts(req, res) {
    try {
        console.log('Fetching all accounts...');
        const localPrisma = new PrismaClient();

        console.log('Prisma client created, querying database...');
        const connections = await localPrisma.adPlatformConnection.findMany({
            where: { isActive: true }
        });

        console.log(`Found ${connections.length} connections`);
        await localPrisma.$disconnect();

        const accounts = connections.map(conn => ({
            id: conn.id,
            platform: conn.platform,
            accountId: conn.accountId,
            accountInfo: conn.accountInfo,
            isActive: conn.isActive,
            lastConnected: conn.lastConnected
        }));

        console.log('Returning accounts:', accounts.length);
        return res.status(200).json({
            success: true,
            data: {
                accounts: accounts
            }
        });

    } catch (error) {
        console.error('Error fetching all accounts:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch accounts',
                details: error.message,
                type: error.name
            }
        });
    }
}

// Platform-specific API functions
async function testMetaConnection(accessToken, appId) {
    try {
        // Test connection by fetching app info instead of ad account
        const response = await fetch(`https://graph.facebook.com/v18.0/${appId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: (error.error && error.error.message) || 'Failed to connect to Meta app'
            };
        }

        const data = await response.json();
        return {
            success: true,
            data: {
                id: data.id,
                name: data.name || 'Meta App',
                status: 'active',
                type: 'app'
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function testMetaSandboxAccount(accessToken, sandboxAdAccountId) {
    try {
        // Test sandbox ad account access
        const response = await fetch(`https://graph.facebook.com/v18.0/${sandboxAdAccountId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: (error.error && error.error.message) || 'Failed to access sandbox ad account'
            };
        }

        const data = await response.json();
        return {
            success: true,
            data: {
                id: data.id,
                name: data.name || 'Sandbox Ad Account',
                status: data.account_status || 'active',
                currency: data.currency || 'USD',
                timezone: data.timezone_name || 'UTC'
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function publishToMeta(creative, connection, campaignSettings) {
    try {
        const metaService = new MetaAPIService(connection.accessToken);
        return await metaService.publishCampaign(connection.accountId, creative, campaignSettings);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchMetaPerformance(connection, adId) {
    try {
        const metaService = new MetaAPIService(connection.accessToken);
        return await metaService.getAdPerformance(adId);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function testGoogleConnection(refreshToken, customerId) {
    try {
        const googleService = new GoogleAdsAPIService(refreshToken, customerId);
        return await googleService.testConnection();
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function publishToGoogle(creative, connection, campaignSettings) {
    try {
        const googleService = new GoogleAdsAPIService(connection.accessToken, connection.accountId);
        return await googleService.publishCampaign(creative, campaignSettings);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchGooglePerformance(connection, adId) {
    try {
        const googleService = new GoogleAdsAPIService(connection.accessToken, connection.accountId);
        return await googleService.getAdPerformance(adId);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function testTikTokConnection(accessToken, advertiserId) {
    try {
        const tiktokService = new TikTokAPIService(accessToken, advertiserId);
        return await tiktokService.testConnection();
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function publishToTikTok(creative, connection, campaignSettings) {
    try {
        const tiktokService = new TikTokAPIService(connection.accessToken, connection.accountId);
        return await tiktokService.publishCampaign(creative, campaignSettings);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchTikTokPerformance(connection, adId) {
    try {
        const tiktokService = new TikTokAPIService(connection.accessToken, connection.accountId);
        return await tiktokService.getAdPerformance(adId);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function testPinterestConnection(accessToken, advertiserId) {
    try {
        const pinterestService = new PinterestAPIService(accessToken, advertiserId);
        return await pinterestService.testConnection();
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function publishToPinterest(creative, connection, campaignSettings) {
    try {
        const pinterestService = new PinterestAPIService(connection.accessToken, connection.accountId);
        return await pinterestService.publishCampaign(creative, campaignSettings);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchPinterestPerformance(connection, adId) {
    try {
        const pinterestService = new PinterestAPIService(connection.accessToken, connection.accountId);
        return await pinterestService.getAdPerformance(adId);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Mock endpoints for development testing
async function handleMockEndpoints(req, res, pathSegments) {
    if (pathSegments[1] === 'connect') {
        return handleMockConnect(req, res, pathSegments[2]);
    }

    if (pathSegments[1] === 'publish') {
        return handleMockPublish(req, res, pathSegments);
    }

    if (pathSegments[1] === 'performance') {
        return handleMockPerformance(req, res, pathSegments);
    }

    if (pathSegments[1] === 'accounts') {
        return handleMockAccounts(req, res);
    }

    return res.status(404).json({ success: false, error: { message: 'Mock endpoint not found' } });
}

// Mock connection endpoints
async function handleMockConnect(req, res, platform) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const mockConnections = {
        meta: {
            id: 'mock_meta_conn_123',
            platform: 'meta',
            accountId: 'act_123456789',
            accountName: 'Mock Meta Business Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        },
        google: {
            id: 'mock_google_conn_456',
            platform: 'google',
            accountId: '1234567890',
            accountName: 'Mock Google Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        },
        tiktok: {
            id: 'mock_tiktok_conn_789',
            platform: 'tiktok',
            accountId: '1234567890',
            accountName: 'Mock TikTok Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        },
        pinterest: {
            id: 'mock_pinterest_conn_012',
            platform: 'pinterest',
            accountId: '1234567890',
            accountName: 'Mock Pinterest Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        }
    };

    if (!platform || !mockConnections[platform]) {
        return res.status(400).json({
            success: false,
            error: { message: 'Invalid platform. Use: meta, google, tiktok, pinterest' }
        });
    }

    // Simulate successful connection
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    return res.status(200).json({
        success: true,
        data: {
            message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account connected successfully (MOCK)`,
            connection: mockConnections[platform]
        }
    });
}

// Mock publishing endpoints
async function handleMockPublish(req, res, pathSegments) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const { platforms, campaignSettings } = req.body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
            success: false,
            error: { message: 'Platforms array is required' }
        });
    }

    // Simulate publishing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockResults = {};
    const errors = [];

    platforms.forEach(platform => {
        if (['meta', 'google', 'tiktok', 'pinterest'].includes(platform)) {
            mockResults[platform] = {
                campaignId: `mock_${platform}_campaign_${Date.now()}`,
                adId: `mock_${platform}_ad_${Date.now()}`,
                status: 'active',
                budget: campaignSettings && campaignSettings.dailyBudget || 50
            };
        } else {
            errors.push(`Unsupported platform: ${platform}`);
        }
    });

    return res.status(200).json({
        success: true,
        data: {
            message: `Creative published to ${Object.keys(mockResults).length} platform(s) (MOCK)`,
            results: mockResults,
            errors: errors
        }
    });
}

// Mock performance endpoints
async function handleMockPerformance(req, res, pathSegments) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const { platform } = req.query;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockPerformance = {
        meta: {
            impressions: Math.floor(Math.random() * 20000) + 5000,
            clicks: Math.floor(Math.random() * 500) + 100,
            spend: Math.random() * 200 + 50,
            ctr: Math.random() * 0.05 + 0.01,
            conversions: Math.floor(Math.random() * 50) + 10,
            cpm: Math.random() * 10 + 2,
            cpc: Math.random() * 2 + 0.5
        },
        google: {
            impressions: Math.floor(Math.random() * 15000) + 3000,
            clicks: Math.floor(Math.random() * 400) + 80,
            spend: Math.random() * 150 + 40,
            ctr: Math.random() * 0.04 + 0.01,
            conversions: Math.floor(Math.random() * 40) + 8,
            cpm: Math.random() * 8 + 1.5,
            cpc: Math.random() * 1.5 + 0.3
        },
        tiktok: {
            impressions: Math.floor(Math.random() * 25000) + 8000,
            clicks: Math.floor(Math.random() * 600) + 150,
            spend: Math.random() * 180 + 60,
            ctr: Math.random() * 0.06 + 0.02,
            conversions: Math.floor(Math.random() * 60) + 15,
            cpm: Math.random() * 12 + 3,
            cpc: Math.random() * 2.5 + 0.8
        },
        pinterest: {
            impressions: Math.floor(Math.random() * 12000) + 2000,
            clicks: Math.floor(Math.random() * 300) + 60,
            spend: Math.random() * 120 + 30,
            ctr: Math.random() * 0.03 + 0.01,
            conversions: Math.floor(Math.random() * 30) + 5,
            cpm: Math.random() * 6 + 1,
            cpc: Math.random() * 1.2 + 0.4
        }
    };

    if (platform && mockPerformance[platform]) {
        return res.status(200).json({
            success: true,
            data: {
                platform: platform,
                performance: mockPerformance[platform],
                period: 'last_7_days',
                generatedAt: new Date().toISOString()
            }
        });
    }

    // Return all platforms performance
    return res.status(200).json({
        success: true,
        data: {
            performance: mockPerformance,
            period: 'last_7_days',
            generatedAt: new Date().toISOString()
        }
    });
}

// Mock accounts endpoint
async function handleMockAccounts(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const mockAccounts = {
        meta: [{
            id: 'mock_meta_conn_123',
            accountId: 'act_123456789',
            accountName: 'Mock Meta Business Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        }],
        google: [{
            id: 'mock_google_conn_456',
            accountId: '1234567890',
            accountName: 'Mock Google Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        }],
        tiktok: [{
            id: 'mock_tiktok_conn_789',
            accountId: '1234567890',
            accountName: 'Mock TikTok Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        }],
        pinterest: [{
            id: 'mock_pinterest_conn_012',
            accountId: '1234567890',
            accountName: 'Mock Pinterest Ads Account',
            isActive: true,
            lastConnected: new Date().toISOString()
        }]
    };

    return res.status(200).json({
        success: true,
        data: {
            accounts: mockAccounts,
            totalConnections: Object.values(mockAccounts).flat().length
        }
    });
}

// Handle platform disconnect
async function handleDisconnectPlatform(req, res, platform) {
    console.log(`Disconnect ${platform} endpoint called`);

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        });
    }

    try {
        const { accountId } = req.body;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Account ID is required' }
            });
        }

        console.log(`Disconnecting ${platform} account:`, accountId);

        // In a real implementation, you would:
        // 1. Revoke the access token with the platform
        // 2. Delete the connection from database
        // 3. Clean up any associated data

        // For now, just return success
        return res.status(200).json({
            success: true,
            data: {
                message: `${platform} account disconnected successfully`,
                platform: platform,
                accountId: accountId
            }
        });

    } catch (error) {
        console.error(`Error disconnecting ${platform}:`, error);
        return res.status(500).json({
            success: false,
            error: {
                message: `Failed to disconnect ${platform} account`,
                details: error.message
            }
        });
    }
}