/**
 * Meta Marketing API Integration Service
 * Handles Facebook and Instagram ad management
 */

const META_API_VERSION = 'v18.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

class MetaAPIService {
    constructor(accessToken, appSecret = null, appId = null) {
        this.accessToken = accessToken;
        this.appSecret = appSecret;
        this.appId = appId;
    }

    /**
     * Check if token is expired and attempt to refresh if possible
     */
    async validateAndRefreshToken() {
        try {
            // Test the current token by making a simple API call
            // For app access tokens, we should test with the app's own info
            const response = await fetch(`${META_BASE_URL}/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return { success: true, needsRefresh: false };
            }

            const error = await response.json();
            console.log('Token validation response:', error);
            
            if (error.error && (error.error.code === 190 || error.error.code === 102)) {
                // Token expired or invalid
                console.log('Meta token expired or invalid, attempting refresh...');
                return { success: false, needsRefresh: true, error: 'Token expired' };
            }

            return { success: false, needsRefresh: false, error: (error.error && error.error.message) || 'Token validation failed' };
        } catch (error) {
            console.log('Token validation error:', error);
            return { success: false, needsRefresh: false, error: error.message };
        }
    }

    /**
     * Refresh access token using app secret (for app access tokens)
     */
    async refreshToken() {
        if (!this.appSecret) {
            return {
                success: false,
                error: 'App secret required for token refresh'
            };
        }

        // Use the stored app ID from the connection instead of environment variable
        const appId = this.appId || process.env.META_APP_ID;
        if (!appId) {
            return {
                success: false,
                error: 'App ID not found in connection or environment'
            };
        }

        try {
            const response = await fetch(`${META_BASE_URL}/oauth/access_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: appId,
                    client_secret: this.appSecret
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Meta token refresh failed:', error);
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to refresh token'
                };
            }

            const data = await response.json();
            this.accessToken = data.access_token;

            return {
                success: true,
                data: {
                    accessToken: data.access_token,
                    expiresIn: data.expires_in
                }
            };
        } catch (error) {
            console.error('Meta token refresh error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert user access token to app access token (more stable)
     */
    async convertToAppToken() {
        if (!this.appSecret) {
            return {
                success: false,
                error: 'App secret required for token conversion'
            };
        }

        // Use the stored app ID from the connection instead of environment variable
        const appId = this.appId || process.env.META_APP_ID;
        if (!appId) {
            return {
                success: false,
                error: 'App ID not found in connection or environment'
            };
        }

        try {
            // Get app access token directly (most stable option)
            const appTokenResponse = await fetch(`${META_BASE_URL}/oauth/access_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: appId,
                    client_secret: this.appSecret
                })
            });

            if (!appTokenResponse.ok) {
                const error = await appTokenResponse.json();
                console.error('Meta app token conversion failed:', error);
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to get app access token'
                };
            }

            const appTokenData = await appTokenResponse.json();
            this.accessToken = appTokenData.access_token;

            return {
                success: true,
                data: {
                    accessToken: appTokenData.access_token,
                    expiresIn: appTokenData.expires_in,
                    tokenType: 'app_access_token'
                }
            };
        } catch (error) {
            console.error('Meta app token conversion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test connection to Meta Marketing API
     */
    async testConnection(adAccountId) {
        try {
            const response = await fetch(`${META_BASE_URL}/${adAccountId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    fields: 'id,name,account_status,currency,timezone_name'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to connect to Meta account'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    id: data.id,
                    name: data.name,
                    status: data.account_status,
                    currency: data.currency,
                    timezone: data.timezone_name
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a campaign
     */
    async createCampaign(adAccountId, campaignData) {
        try {
            // Handle account ID formatting - remove act_ if present, then add it back
            let cleanAccountId = adAccountId;
            if (adAccountId.startsWith('act_')) {
                cleanAccountId = adAccountId.substring(4); // Remove 'act_' prefix
            }
            const formattedAccountId = `act_${cleanAccountId}`;

            console.log('Meta API - createCampaign details:', {
                originalAccountId: adAccountId,
                cleanAccountId: cleanAccountId,
                formattedAccountId: formattedAccountId,
                url: `${META_BASE_URL}/${formattedAccountId}/campaigns`,
                tokenLength: this.accessToken ? this.accessToken.length : 0
            }); // Debug log

            const requestBody = {
                name: campaignData.name,
                objective: campaignData.objective || 'OUTCOME_TRAFFIC', // Updated to use new objective names
                status: campaignData.status || 'PAUSED',
                special_ad_categories: [], // Required parameter for Meta API
                ...campaignData
            };

            console.log('Meta API - createCampaign request body:', requestBody); // Debug log

            const response = await fetch(`${META_BASE_URL}/${formattedAccountId}/campaigns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Meta API - createCampaign error response:', error); // Debug log
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create campaign'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    campaignId: data.id
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create an ad set
     */
    async createAdSet(campaignId, adSetData) {
        try {
            const response = await fetch(`${META_BASE_URL}/${campaignId}/adsets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: adSetData.name,
                    campaign_id: campaignId,
                    daily_budget: adSetData.dailyBudget,
                    billing_event: adSetData.billingEvent || 'IMPRESSIONS',
                    optimization_goal: adSetData.optimizationGoal || 'CONVERSIONS',
                    targeting: adSetData.targeting,
                    status: adSetData.status || 'PAUSED',
                    ...adSetData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create ad set'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    adSetId: data.id
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create an ad creative
     */
    async createAdCreative(adAccountId, creativeData) {
        try {
            // Handle account ID formatting - remove act_ if present, then add it back
            let cleanAccountId = adAccountId;
            if (adAccountId.startsWith('act_')) {
                cleanAccountId = adAccountId.substring(4); // Remove 'act_' prefix
            }
            const formattedAccountId = `act_${cleanAccountId}`;

            const response = await fetch(`${META_BASE_URL}/${formattedAccountId}/adcreatives`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: creativeData.name,
                    object_story_spec: creativeData.objectStorySpec,
                    call_to_action_type: creativeData.callToActionType || 'LEARN_MORE',
                    ...creativeData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create ad creative'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    creativeId: data.id
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create an ad
     */
    async createAd(adSetId, adData) {
        try {
            const response = await fetch(`${META_BASE_URL}/${adSetId}/ads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: adData.name,
                    adset_id: adSetId,
                    creative: adData.creative,
                    status: adData.status || 'PAUSED',
                    ...adData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create ad'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    adId: data.id
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Publish a complete ad campaign
     */
    async publishCampaign(adAccountId, creative, campaignSettings) {
        try {
            console.log('Meta API - publishCampaign called with:', {
                adAccountId,
                creativeId: creative.id,
                campaignSettings,
                creativeData: {
                    id: creative.id,
                    platform: creative.platform,
                    outputs: creative.outputs,
                    launch: creative.launch ? {
                        id: creative.launch.id,
                        product: creative.launch.product
                    } : null
                }
            }); // Debug log

            // 1. Create campaign
            const campaignResult = await this.createCampaign(adAccountId, {
                name: `${creative.launch.product.title} - ${creative.platform.toUpperCase()} Campaign`,
                objective: 'OUTCOME_TRAFFIC', // Updated to use new objective names
                status: 'PAUSED' // Start paused for review
            });

            if (!campaignResult.success) {
                return campaignResult;
            }

            // 2. Create ad set
            const adSetResult = await this.createAdSet(campaignResult.data.campaignId, {
                name: `${creative.launch.product.title} - Ad Set`,
                dailyBudget: campaignSettings.dailyBudget || 50,
                targeting: {
                    geo_locations: (campaignSettings.targeting && campaignSettings.targeting.geo_locations) || { countries: ['US'] },
                    age_min: (campaignSettings.targeting && campaignSettings.targeting.age_min) || 18,
                    age_max: (campaignSettings.targeting && campaignSettings.targeting.age_max) || 65,
                    interests: (campaignSettings.targeting && campaignSettings.targeting.interests) || []
                }
            });

            if (!adSetResult.success) {
                return adSetResult;
            }

            // 3. Create ad creative
            console.log('Using page ID for ad creative:', campaignSettings.pageId); // Debug log

            const creativeResult = await this.createAdCreative(adAccountId, {
                name: `${creative.launch.product.title} - Creative`,
                object_story_spec: {
                    page_id: campaignSettings.pageId,
                    link_data: {
                        message: creative.outputs.description,
                        link: creative.launch.product.url || 'https://example.com',
                        name: creative.outputs.headline,
                        description: creative.outputs.description,
                        call_to_action: {
                            type: creative.outputs.cta || 'LEARN_MORE'
                        }
                    }
                }
            });

            if (!creativeResult.success) {
                return creativeResult;
            }

            // 4. Create ad
            const adResult = await this.createAd(adSetResult.data.adSetId, {
                name: `${creative.launch.product.title} - Ad`,
                creative: {
                    creative_id: creativeResult.data.creativeId
                }
            });

            if (!adResult.success) {
                return adResult;
            }

            return {
                success: true,
                data: {
                    campaignId: campaignResult.data.campaignId,
                    adSetId: adSetResult.data.adSetId,
                    creativeId: creativeResult.data.creativeId,
                    adId: adResult.data.adId
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get ad performance data
     */
    async getAdPerformance(adId) {
        try {
            const response = await fetch(`${META_BASE_URL}/${adId}/insights`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    fields: 'impressions,clicks,spend,ctr,cpc,cpm,conversions',
                    date_preset: 'last_7d'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to fetch ad performance'
                };
            }

            const data = await response.json();
            const insights = data.data && data.data[0] ? data.data[0] : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(insights.impressions) || 0,
                    clicks: parseInt(insights.clicks) || 0,
                    spend: parseFloat(insights.spend) || 0,
                    ctr: parseFloat(insights.ctr) || 0,
                    cpc: parseFloat(insights.cpc) || 0,
                    cpm: parseFloat(insights.cpm) || 0,
                    conversions: parseInt(insights.conversions) || 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get account insights
     */
    async getAccountInsights(adAccountId) {
        try {
            const response = await fetch(`${META_BASE_URL}/act_${adAccountId}/insights`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    fields: 'impressions,clicks,spend,ctr,cpc,cpm,conversions',
                    date_preset: 'last_7d'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to fetch account insights'
                };
            }

            const data = await response.json();
            const insights = data.data && data.data[0] ? data.data[0] : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(insights.impressions) || 0,
                    clicks: parseInt(insights.clicks) || 0,
                    spend: parseFloat(insights.spend) || 0,
                    ctr: parseFloat(insights.ctr) || 0,
                    cpc: parseFloat(insights.cpc) || 0,
                    cpm: parseFloat(insights.cpm) || 0,
                    conversions: parseInt(insights.conversions) || 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default MetaAPIService;