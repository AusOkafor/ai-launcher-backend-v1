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
        const { accessToken, adAccountId } = req.body;

        // Validate required fields
        if (!accessToken || !adAccountId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Access token and ad account ID are required' }
            });
        }

        // Test the connection by fetching account info
        const accountInfo = await testMetaConnection(accessToken, adAccountId);

        if (!accountInfo.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to connect to Meta account', details: accountInfo.error }
            });
        }

        // Store the connection in database
        const localPrisma = new PrismaClient();
        const connection = await localPrisma.adPlatformConnection.upsert({
            where: {
                platform_accountId: {
                    platform: 'meta',
                    accountId: adAccountId
                }
            },
            update: {
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date()
            },
            create: {
                platform: 'meta',
                accountId: adAccountId,
                accessToken: accessToken,
                accountInfo: accountInfo.data,
                isActive: true,
                lastConnected: new Date(),
                workspaceId: 'test-workspace-id' // TODO: Get from auth
            }
        });

        await localPrisma.$disconnect();

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
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to connect Meta account' }
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
        const localPrisma = new PrismaClient();
        const connections = await localPrisma.adPlatformConnection.findMany({
            where: { isActive: true }
        });

        await localPrisma.$disconnect();

        const accountsByPlatform = connections.reduce((acc, conn) => {
            if (!acc[conn.platform]) {
                acc[conn.platform] = [];
            }
            acc[conn.platform].push({
                id: conn.id,
                accountId: conn.accountId,
                accountName: (conn.accountInfo && conn.accountInfo.name) || 'Unknown',
                isActive: conn.isActive,
                lastConnected: conn.lastConnected
            });
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            data: {
                accounts: accountsByPlatform
            }
        });

    } catch (error) {
        console.error('Error fetching all accounts:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch accounts' }
        });
    }
}

// Platform-specific API functions
async function testMetaConnection(accessToken, adAccountId) {
    try {
        const metaService = new MetaAPIService(accessToken);
        return await metaService.testConnection(adAccountId);
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