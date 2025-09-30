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
    // Enhanced CORS headers - set for all requests
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ];

    // Set CORS headers for all responses - MUST be set before any response
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Vary', 'Origin');

    // Ensure headers are sent immediately
    res.setHeader('Cache-Control', 'no-cache');

    // Force CORS headers to be sent
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-JSON');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('CORS preflight request handled for origin:', origin);
        res.status(200).end();
        return;
    }

    // Log all requests for debugging
    console.log(`API request: ${req.method} ${req.url} from origin: ${origin}`);

    // Simple test endpoint for CORS debugging
    if (req.url === '/api/ad-platforms' && !req.query.path) {
        return res.status(200).json({
            success: true,
            data: {
                message: 'CORS test successful',
                origin: origin,
                timestamp: new Date().toISOString()
            }
        });
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

        if (pathSegments[0] === 'test') {
            return handleTestEndpoints(req, res, pathSegments);
        }

        if (pathSegments[0] === 'refresh-token') {
            return handleMetaTokenRefresh(req, res);
        }

        if (pathSegments[0] === 'diagnose-token') {
            return handleMetaTokenDiagnosis(req, res);
        }

        if (pathSegments[0] === 'refresh-meta-token') {
            return handleRefreshMetaToken(req, res);
        }

        if (pathSegments[0] === 'update-meta-token') {
            return handleUpdateMetaToken(req, res);
        }

        if (pathSegments[0] === 'test-meta-accounts') {
            return handleTestMetaAccounts(req, res);
        }

        if (pathSegments[0] === 'fix-meta-account-id') {
            return handleFixMetaAccountId(req, res);
        }

        if (pathSegments[0] === 'test-token-conversion') {
            return handleTestTokenConversion(req, res);
        }

        if (pathSegments[0] === 'real-performance') {
            return handleRealPerformanceData(req, res, pathSegments);
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
                        accountId: sandboxAdAccountId // Use the actual ad account ID, not app ID
                    }
                },
                update: {
                    accessToken: accessToken,
                    appSecret: appSecret,
                    accountInfo: {
                        ...accountInfo.data,
                        appId: appId, // Store app ID in accountInfo instead
                        sandboxAdAccountId: sandboxAdAccountId,
                        sandboxInfo: sandboxInfo.success ? sandboxInfo.data : null,
                        sandboxAvailable: sandboxInfo.success
                    },
                    isActive: true,
                    lastConnected: new Date()
                },
                create: {
                    platform: 'meta',
                    accountId: sandboxAdAccountId, // Use the actual ad account ID, not app ID
                    accessToken: accessToken,
                    appSecret: appSecret,
                    accountInfo: {
                        ...accountInfo.data,
                        appId: appId, // Store app ID in accountInfo instead
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
        console.log('Publishing creative:', { creativeId, platforms, campaignSettings }); // Debug log

        const localPrisma = new PrismaClient();
        const creative = await localPrisma.adCreative.findUnique({
            where: { id: creativeId },
            include: { launch: { include: { product: true } } }
        });

        if (!creative) {
            console.log('Creative not found:', creativeId); // Debug log
            return res.status(404).json({
                success: false,
                error: { message: 'Creative not found' }
            });
        }

        console.log('Creative found:', { id: creative.id, title: creative.title }); // Debug log
        const publishResults = {};
        const errors = [];

        // Publish to each requested platform
        for (const platform of platforms) {
            try {
                console.log(`Processing platform: ${platform}`); // Debug log
                // Get platform connection
                const connection = await localPrisma.adPlatformConnection.findFirst({
                    where: { platform: platform, isActive: true }
                });

                console.log(`Connection for ${platform}:`, connection ? 'Found' : 'Not found'); // Debug log
                if (!connection) {
                    console.log(`No active ${platform} connection found`); // Debug log
                    errors.push({ platform, error: `No active ${platform} connection found` });
                    continue;
                }

                let result;
                switch (platform) {
                    case 'meta':
                        result = await publishToMeta(creative, connection, campaignSettings);
                        break;
                    case 'google':
                        result = await publishToGoogle(creative, connection, campaignSettings);
                        break;
                    case 'tiktok':
                        result = await publishToTikTok(creative, connection, campaignSettings);
                        break;
                    case 'pinterest':
                        result = await publishToPinterest(creative, connection, campaignSettings);
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

// Update Meta Token Handler
async function handleUpdateMetaToken(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        });
    }

    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                error: { message: 'Access token is required' }
            });
        }

        console.log('Updating Meta token:', accessToken.substring(0, 20) + '...');

        const localPrisma = new PrismaClient();

        // Find the Meta connection
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            await localPrisma.$disconnect();
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        // Update the token
        await localPrisma.adPlatformConnection.update({
            where: { id: connection.id },
            data: {
                accessToken: accessToken,
                lastConnected: new Date()
            }
        });

        await localPrisma.$disconnect();

        return res.json({
            success: true,
            data: {
                message: 'Meta token updated successfully',
                tokenLength: accessToken.length,
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error updating Meta token:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to update Meta token' }
        });
    }
}

// Test Meta Accounts Handler
async function handleTestMetaAccounts(req, res) {
    try {
        const localPrisma = new PrismaClient();

        // Find the Meta connection
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            await localPrisma.$disconnect();
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Testing Meta accounts for connection:', connection.id);
        console.log('Current stored account ID:', connection.accountId);

        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );

        // Test the stored account ID
        console.log('Testing stored account ID:', connection.accountId);
        const testResponse = await fetch(`https://graph.facebook.com/v18.0/${connection.accountId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const testResult = {
            storedAccountId: connection.accountId,
            testResponse: {
                status: testResponse.status,
                ok: testResponse.ok
            }
        };

        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            testResult.testResponse.error = errorData;
        }

        // Get available accounts
        console.log('Fetching available ad accounts...');
        const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            testResult.availableAccounts = accountsData.data || [];
        } else {
            const errorData = await accountsResponse.json();
            testResult.accountsError = errorData;
        }

        await localPrisma.$disconnect();

        return res.json({
            success: true,
            data: testResult
        });

    } catch (error) {
        console.error('Error testing Meta accounts:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to test Meta accounts' }
        });
    }
}

// Fix Meta Account ID Handler
async function handleFixMetaAccountId(req, res) {
    try {
        const localPrisma = new PrismaClient();

        // Find the Meta connection
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            await localPrisma.$disconnect();
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Current stored account ID:', connection.accountId);

        // Get available accounts to find the correct one
        const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!accountsResponse.ok) {
            await localPrisma.$disconnect();
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to fetch ad accounts' }
            });
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.data || [];

        if (accounts.length === 0) {
            await localPrisma.$disconnect();
            return res.status(400).json({
                success: false,
                error: { message: 'No ad accounts found' }
            });
        }

        // Find the correct account ID (with act_ prefix)
        const correctAccountId = accounts[0].id; // This should be act_1323519419104478
        console.log('Correct account ID:', correctAccountId);

        // Update the connection with the correct account ID
        await localPrisma.adPlatformConnection.update({
            where: { id: connection.id },
            data: {
                accountId: correctAccountId
            }
        });

        await localPrisma.$disconnect();

        return res.json({
            success: true,
            data: {
                message: 'Meta account ID fixed successfully',
                oldAccountId: connection.accountId,
                newAccountId: correctAccountId,
                accountName: accounts[0].name
            }
        });

    } catch (error) {
        console.error('Error fixing Meta account ID:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fix Meta account ID' }
        });
    }
}

// Test Token Conversion Handler
async function handleTestTokenConversion(req, res) {
    try {
        const localPrisma = new PrismaClient();

        // Find the Meta connection
        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: { platform: 'meta', isActive: true }
        });

        if (!connection) {
            await localPrisma.$disconnect();
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Testing token conversion for connection:', connection.id);

        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );

        // Test the conversion process
        console.log('Attempting token conversion...');
        const convertResult = await metaService.convertToAppToken();

        console.log('Conversion result:', convertResult);

        await localPrisma.$disconnect();

        return res.json({
            success: true,
            data: {
                message: 'Token conversion test completed',
                originalTokenLength: connection.accessToken.length,
                conversionResult: convertResult
            }
        });

    } catch (error) {
        console.error('Error testing token conversion:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to test token conversion' }
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
        console.log('Connection details:', connections.map(conn => ({
            id: conn.id,
            platform: conn.platform,
            accountId: conn.accountId,
            isActive: conn.isActive,
            workspaceId: conn.workspaceId
        })));
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
        console.log('Meta publishing - Connection details:', {
            id: connection.id,
            platform: connection.platform,
            accountId: connection.accountId,
            accountInfo: connection.accountInfo,
            accessTokenLength: connection.accessToken ? connection.accessToken.length : 0
        }); // Debug log

        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );

        // Validate token and attempt refresh if needed
        const tokenValidation = await metaService.validateAndRefreshToken();
        console.log('Token validation result:', tokenValidation);

        // If token validation fails but we can still proceed, try publishing directly
        if (!tokenValidation.success) {
            console.log('Token validation failed, but attempting to publish anyway...');
            const validAccountId = await metaService.getValidAdAccount(connection.accountId);
            const directPublishResult = await metaService.publishCampaign(validAccountId, creative, campaignSettings);
            if (directPublishResult.success) {
                console.log('Direct publishing succeeded despite token validation failure');
                return directPublishResult;
            }

            if (tokenValidation.needsRefresh) {
                console.log('Attempting to refresh Meta token...');

                // First try to convert to app access token (more stable)
                console.log('Attempting to convert to app access token...');
                const convertResult = await metaService.convertToAppToken();

                if (convertResult.success) {
                    console.log('Converted to app access token successfully, updating database...');
                    // Update the connection with new token
                    const localPrisma = new PrismaClient();
                    await localPrisma.adPlatformConnection.update({
                        where: { id: connection.id },
                        data: {
                            accessToken: convertResult.data.accessToken,
                            lastConnected: new Date()
                        }
                    });
                    await localPrisma.$disconnect();

                    // Create new MetaAPIService with updated token
                    const updatedMetaService = new MetaAPIService(
                        convertResult.data.accessToken,
                        connection.appSecret,
                        (connection.accountInfo && connection.accountInfo.appId)
                    );

                    // Retry publishing with new token
                    return await updatedMetaService.publishCampaign(connection.accountId, creative, campaignSettings);
                } else {
                    console.log('App token conversion failed, trying regular refresh...');
                    const refreshResult = await metaService.refreshToken();

                    if (refreshResult.success) {
                        console.log('Token refreshed successfully, updating database...');
                        // Update the connection with new token
                        const localPrisma = new PrismaClient();
                        await localPrisma.adPlatformConnection.update({
                            where: { id: connection.id },
                            data: {
                                accessToken: refreshResult.data.accessToken,
                                lastConnected: new Date()
                            }
                        });
                        await localPrisma.$disconnect();

                        // Create new MetaAPIService with updated token
                        const updatedMetaService = new MetaAPIService(
                            refreshResult.data.accessToken,
                            connection.appSecret,
                            (connection.accountInfo && connection.accountInfo.appId)
                        );

                        // Retry publishing with new token
                        return await updatedMetaService.publishCampaign(connection.accountId, creative, campaignSettings);
                    } else {
                        console.error('Both app token conversion and refresh failed:', convertResult.error, refreshResult.error);
                        return {
                            success: false,
                            error: `Token expired and all refresh attempts failed. Please reconnect your Meta account. Conversion error: ${convertResult.error}, Refresh error: ${refreshResult.error}`
                        };
                    }
                }
            } else {
                return {
                    success: false,
                    error: `Meta API error: ${tokenValidation.error}`
                };
            }
        }

        console.log('Token validation passed, proceeding with publishing...');
        console.log('Using token for publishing:', metaService.accessToken.substring(0, 20) + '...');
        console.log('Using account ID for publishing:', connection.accountId);

        // Check if current token is long enough (USER tokens are usually 200+ chars)
        if (connection.accessToken.length < 100) {
            console.log('Current token appears to be invalid/truncated, attempting conversion...');
            const convertResult = await metaService.convertToAppToken();
            if (convertResult.success && convertResult.data.accessToken.length > 100) {
                console.log('Successfully converted to app access token, updating database...');
                // Update the connection with new long-lived token
                const localPrisma = new PrismaClient();
                await localPrisma.adPlatformConnection.update({
                    where: { id: connection.id },
                    data: {
                        accessToken: convertResult.data.accessToken,
                        lastConnected: new Date()
                    }
                });
                await localPrisma.$disconnect();

                // Create new MetaAPIService with long-lived token
                const longLivedMetaService = new MetaAPIService(
                    convertResult.data.accessToken,
                    connection.appSecret,
                    (connection.accountInfo && connection.accountInfo.appId)
                );

                const validAccountId = await longLivedMetaService.getValidAdAccount(connection.accountId);
                console.log('Valid account ID:', validAccountId);

                return await longLivedMetaService.publishCampaign(validAccountId, creative, campaignSettings);
            } else {
                console.log('Token conversion failed or returned invalid token, proceeding with current token...');
            }
        } else {
            console.log('Current token appears valid, proceeding with publishing...');
        }

        const validAccountId = await metaService.getValidAdAccount(connection.accountId);
        console.log('Valid account ID:', validAccountId);

        return await metaService.publishCampaign(validAccountId, creative, campaignSettings);
    } catch (error) {
        console.error('Meta publishing error:', error); // Debug log
        return {
            success: false,
            error: error.message
        };
    }
}

async function fetchMetaPerformance(connection, adId) {
    try {
        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );
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

// Handle test endpoints
async function handleTestEndpoints(req, res, pathSegments) {
    console.log('Test endpoint called:', pathSegments);

    if (pathSegments[1] === 'meta') {
        return handleMetaTest(req, res);
    }

    return res.status(404).json({
        success: false,
        error: { message: 'Test endpoint not found' }
    });
}

// Test Meta connection and API access
async function handleMetaTest(req, res) {
    try {
        console.log('Testing Meta connection...');

        // Get the Meta connection from database
        const localPrisma = new PrismaClient();

        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: {
                platform: 'meta',
                isActive: true
            }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Found Meta connection:', connection.id);

        // Test 1: Verify app access
        const appTest = await testMetaConnection(connection.accessToken, connection.accountId);

        // Test 2: Test sandbox account access (if available)
        let sandboxTest = null;
        if (connection.accountInfo && connection.accountInfo.sandboxAdAccountId) {
            sandboxTest = await testMetaSandboxAccount(connection.accessToken, connection.accountInfo.sandboxAdAccountId);
        }

        // Test 3: Get ad accounts
        const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        let adAccounts = null;
        if (adAccountsResponse.ok) {
            adAccounts = await adAccountsResponse.json();
        }

        await localPrisma.$disconnect();

        return res.status(200).json({
            success: true,
            data: {
                message: 'Meta connection test completed',
                connection: {
                    id: connection.id,
                    appId: connection.accountId,
                    appName: (connection.accountInfo && connection.accountInfo.name) || 'Unknown',
                    status: (connection.accountInfo && connection.accountInfo.status) || 'Unknown',
                    lastConnected: connection.lastConnected
                },
                tests: {
                    appAccess: appTest,
                    sandboxAccess: sandboxTest,
                    adAccounts: adAccounts ? {
                        count: (adAccounts.data && adAccounts.data.length) || 0,
                        accounts: (adAccounts.data && adAccounts.data.map(acc => ({
                            id: acc.id,
                            name: acc.name,
                            status: acc.account_status
                        }))) || []
                    } : null
                }
            }
        });

    } catch (error) {
        console.error('Error testing Meta connection:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to test Meta connection',
                details: error.message
            }
        });
    }
}

// Test Meta token refresh functionality
async function handleMetaTokenRefresh(req, res) {
    try {
        console.log('Testing Meta token refresh...');

        // Get the Meta connection from database
        const localPrisma = new PrismaClient();

        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: {
                platform: 'meta',
                isActive: true
            }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Found Meta connection:', connection.id);

        // Test token validation and refresh
        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );
        const tokenValidation = await metaService.validateAndRefreshToken();

        if (tokenValidation.success) {
            return res.json({
                success: true,
                data: {
                    message: 'Token is valid, no refresh needed',
                    tokenValid: true
                }
            });
        }

        if (tokenValidation.needsRefresh) {
            console.log('Token needs refresh, attempting...');
            const refreshResult = await metaService.refreshToken();

            if (refreshResult.success) {
                // Update the connection with new token
                await localPrisma.adPlatformConnection.update({
                    where: { id: connection.id },
                    data: {
                        accessToken: refreshResult.data.accessToken,
                        lastConnected: new Date()
                    }
                });

                return res.json({
                    success: true,
                    data: {
                        message: 'Token refreshed successfully',
                        tokenValid: true,
                        newToken: refreshResult.data.accessToken.substring(0, 20) + '...' // Show partial token for verification
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Token refresh failed',
                        details: refreshResult.error
                    }
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Token validation failed',
                    details: tokenValidation.error
                }
            });
        }

    } catch (error) {
        console.error('Error testing Meta token refresh:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to test token refresh',
                details: error.message
            }
        });
    } finally {
        if (localPrisma) {
            await localPrisma.$disconnect();
        }
    }
}

// Diagnose Meta token issues
async function handleMetaTokenDiagnosis(req, res) {
    try {
        console.log('Diagnosing Meta token...');

        // Get the Meta connection from database
        const localPrisma = new PrismaClient();

        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: {
                platform: 'meta',
                isActive: true
            }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Found Meta connection:', connection.id);

        // Test current token
        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret,
            (connection.accountInfo && connection.accountInfo.appId)
        );
        const tokenValidation = await metaService.validateAndRefreshToken();

        // Get token info from Meta
        let tokenInfo = null;
        try {
            const tokenInfoResponse = await fetch(`https://graph.facebook.com/v18.0/debug_token?input_token=${connection.accessToken}&access_token=${connection.accessToken}`);
            if (tokenInfoResponse.ok) {
                tokenInfo = await tokenInfoResponse.json();
            }
        } catch (error) {
            console.log('Could not get token info:', error.message);
        }

        // Try to convert to app token
        let appTokenResult = null;
        try {
            appTokenResult = await metaService.convertToAppToken();
        } catch (error) {
            console.log('App token conversion failed:', error.message);
        }

        await localPrisma.$disconnect();

        return res.json({
            success: true,
            data: {
                message: 'Meta token diagnosis completed',
                connection: {
                    id: connection.id,
                    lastConnected: connection.lastConnected,
                    hasAppSecret: !!connection.appSecret,
                    tokenLength: connection.accessToken.length
                },
                currentToken: {
                    isValid: tokenValidation.success,
                    needsRefresh: tokenValidation.needsRefresh,
                    error: tokenValidation.error
                },
                tokenInfo: tokenInfo ? {
                    appId: (tokenInfo.data && tokenInfo.data.app_id),
                    userId: (tokenInfo.data && tokenInfo.data.user_id),
                    type: (tokenInfo.data && tokenInfo.data.type),
                    isValid: (tokenInfo.data && tokenInfo.data.is_valid),
                    expiresAt: (tokenInfo.data && tokenInfo.data.expires_at),
                    scopes: (tokenInfo.data && tokenInfo.data.scopes)
                } : null,
                appTokenConversion: appTokenResult ? {
                    success: appTokenResult.success,
                    error: appTokenResult.error,
                    tokenType: (appTokenResult.data && appTokenResult.data.tokenType)
                } : null,
                recommendations: [
                    tokenValidation.success ?
                    "✅ Your current token is valid" :
                    "❌ Your current token is invalid",
                    (tokenInfo && tokenInfo.data && tokenInfo.data.type) === 'USER' ?
                    "⚠️ You're using a USER access token (can expire quickly)" :
                    "✅ You're using an APP access token (more stable)", !connection.appSecret ?
                    "❌ No app secret found - token refresh may not work" :
                    "✅ App secret available for token refresh",
                    (appTokenResult && appTokenResult.success) ?
                    "✅ Can convert to app access token" :
                    "❌ Cannot convert to app access token"
                ]
            }
        });

    } catch (error) {
        console.error('Error diagnosing Meta token:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to diagnose token',
                details: error.message
            }
        });
    }
}

// Force refresh Meta token with new credentials
async function handleRefreshMetaToken(req, res) {
    try {
        console.log('Force refreshing Meta token...');

        // Get the Meta connection from database
        const localPrisma = new PrismaClient();

        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: {
                platform: 'meta',
                isActive: true
            }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Found Meta connection:', connection.id);

        // Check if we have stored credentials in the connection
        if (!connection.appSecret && !process.env.META_APP_SECRET) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Meta app credentials not found',
                    details: 'App secret not found in connection or environment variables'
                }
            });
        }

        // Try to get a new app access token
        const metaService = new MetaAPIService(
            connection.accessToken,
            connection.appSecret || process.env.META_APP_SECRET,
            (connection.accountInfo && connection.accountInfo.appId) || process.env.META_APP_ID
        );
        const refreshResult = await metaService.convertToAppToken();

        if (refreshResult.success) {
            console.log('Refresh result:', refreshResult);
            console.log('New token length:', refreshResult.data.accessToken ? refreshResult.data.accessToken.length : 'undefined');
            console.log('New token preview:', refreshResult.data.accessToken ? refreshResult.data.accessToken.substring(0, 50) + '...' : 'undefined');

            // Update the connection with new token
            const updateResult = await localPrisma.adPlatformConnection.update({
                where: { id: connection.id },
                data: {
                    accessToken: refreshResult.data.accessToken,
                    lastConnected: new Date()
                }
            });

            console.log('Database updated with new token');
            console.log('Updated token length in DB:', updateResult.accessToken ? updateResult.accessToken.length : 'undefined');

            await localPrisma.$disconnect();

            return res.json({
                success: true,
                data: {
                    message: 'Meta token refreshed successfully',
                    tokenType: refreshResult.data.tokenType,
                    newToken: refreshResult.data.accessToken.substring(0, 20) + '...'
                }
            });
        } else {
            await localPrisma.$disconnect();
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Token refresh failed',
                    details: refreshResult.error
                }
            });
        }

    } catch (error) {
        console.error('Error refreshing Meta token:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to refresh token',
                details: error.message
            }
        });
    }
}

// Handle real performance data from connected platforms
async function handleRealPerformanceData(req, res, pathSegments) {
    console.log('Real performance endpoint called:', pathSegments);

    if (pathSegments[1] === 'meta') {
        return handleMetaRealPerformance(req, res);
    }

    return res.status(404).json({
        success: false,
        error: { message: 'Real performance endpoint not found' }
    });
}

// Get real Meta performance data
async function handleMetaRealPerformance(req, res) {
    try {
        console.log('Fetching real Meta performance data...');

        // Get the Meta connection from database
        const localPrisma = new PrismaClient();

        const connection = await localPrisma.adPlatformConnection.findFirst({
            where: {
                platform: 'meta',
                isActive: true
            }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: { message: 'No active Meta connection found' }
            });
        }

        console.log('Found Meta connection:', connection.id);

        // Get ad accounts first
        const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!adAccountsResponse.ok) {
            throw new Error('Failed to fetch ad accounts');
        }

        const adAccounts = await adAccountsResponse.json();
        const adAccountId = adAccounts.data && adAccounts.data[0] ? adAccounts.data[0].id : null;

        if (!adAccountId) {
            return res.status(404).json({
                success: false,
                error: { message: 'No ad accounts found' }
            });
        }

        console.log('Using ad account:', adAccountId);

        // Get campaigns from the ad account
        const campaignsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        let campaigns = [];
        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            campaigns = campaignsData.data || [];
        }

        // Get insights for the ad account (last 7 days)
        const insightsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/insights?date_preset=last_7d&fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        let insights = null;
        if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            insights = insightsData.data && insightsData.data[0] ? insightsData.data[0] : null;
        }

        await localPrisma.$disconnect();

        // Format the response
        const performanceData = {
            platform: 'meta',
            adAccountId: adAccountId,
            campaigns: {
                total: campaigns.length,
                active: campaigns.filter(c => c.status === 'ACTIVE').length,
                list: campaigns.slice(0, 5).map(campaign => ({
                    id: campaign.id,
                    name: campaign.name,
                    status: campaign.status,
                    objective: campaign.objective
                }))
            },
            insights: insights ? {
                impressions: parseInt(insights.impressions) || 0,
                clicks: parseInt(insights.clicks) || 0,
                spend: parseFloat(insights.spend) || 0,
                ctr: parseFloat(insights.ctr) || 0,
                cpc: parseFloat(insights.cpc) || 0,
                cpm: parseFloat(insights.cpm) || 0,
                reach: parseInt(insights.reach) || 0,
                frequency: parseFloat(insights.frequency) || 0
            } : {
                impressions: 0,
                clicks: 0,
                spend: 0,
                ctr: 0,
                cpc: 0,
                cpm: 0,
                reach: 0,
                frequency: 0
            },
            lastUpdated: new Date().toISOString()
        };

        return res.status(200).json({
            success: true,
            data: {
                message: 'Real Meta performance data retrieved',
                performance: performanceData
            }
        });

    } catch (error) {
        console.error('Error fetching real Meta performance:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch real Meta performance data',
                details: error.message
            }
        });
    }
}