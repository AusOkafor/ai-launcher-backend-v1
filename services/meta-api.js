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
            console.log('App token response:', appTokenData);
            console.log('New token length:', appTokenData.access_token ? appTokenData.access_token.length : 'undefined');
            console.log('Full token preview:', appTokenData.access_token ? appTokenData.access_token.substring(0, 50) + '...' : 'undefined');

            if (!appTokenData.access_token || appTokenData.access_token.length < 100) {
                console.error('Token conversion returned invalid/short token:', appTokenData);
                return {
                    success: false,
                    error: 'Token conversion returned invalid token'
                };
            }

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
            // Ensure account ID has act_ prefix
            const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

            console.log('Meta API - createCampaign details:', {
                originalAccountId: adAccountId,
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
            // Ensure account ID has act_ prefix
            const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

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
            console.log('Creating campaign for account:', adAccountId);
            const campaignResult = await this.createCampaign(adAccountId, {
                name: `${creative.launch.product.title} - ${creative.platform.toUpperCase()} Campaign`,
                objective: 'OUTCOME_TRAFFIC', // Updated to use new objective names
                status: 'PAUSED' // Start paused for review
            });

            if (!campaignResult.success) {
                console.error('Campaign creation failed:', campaignResult);
                return campaignResult;
            }
            console.log('Campaign created successfully:', campaignResult.data.campaignId);

            // 2. Create ad set
            console.log('Creating ad set for campaign:', campaignResult.data.campaignId);
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
                console.error('Ad set creation failed:', adSetResult);
                return adSetResult;
            }
            console.log('Ad set created successfully:', adSetResult.data.adSetId);

            // 3. Create ad creative
            console.log('Using page ID for ad creative:', campaignSettings.pageId); // Debug log

            // Extract creative content from outputs JSON
            const outputs = creative.outputs || {};
            console.log('Creative outputs:', outputs);

            // Build creative spec with images if available
            const creativeSpec = {
                name: `${creative.launch.product.title} - Creative`,
                object_story_spec: {
                    page_id: campaignSettings.pageId,
                    link_data: {
                        message: outputs.description || outputs.message || creative.launch.product.description || 'Check out this amazing product!',
                        link: creative.launch.product.url || 'https://example.com',
                        name: outputs.headline || outputs.title || creative.launch.product.title,
                        description: outputs.description || outputs.message || creative.launch.product.description || 'Amazing product you need to see!',
                        call_to_action: {
                            type: outputs.cta || outputs.call_to_action || 'LEARN_MORE'
                        }
                    }
                }
            };

            // Add image if available
            if (outputs.image || outputs.image_url || (creative.launch.product.images && creative.launch.product.images.length > 0)) {
                const imageUrl = outputs.image || outputs.image_url || creative.launch.product.images[0];
                console.log('Using image for creative:', imageUrl);
                creativeSpec.object_story_spec.link_data.picture = imageUrl;
            }

            console.log('Creating ad creative with spec:', JSON.stringify(creativeSpec, null, 2));
            const creativeResult = await this.createAdCreative(adAccountId, creativeSpec);

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
     * Get a valid ad account ID, fallback to first available if stored one doesn't work
     */
    async getValidAdAccount(storedAccountId) {
        try {
            console.log('Attempting to validate account ID:', storedAccountId);

            // First try the stored account ID
            const testResponse = await fetch(`${META_BASE_URL}/${storedAccountId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (testResponse.ok) {
                console.log('Stored account ID is valid:', storedAccountId);
                return storedAccountId;
            }

            const errorData = await testResponse.json();
            console.log('Stored account ID failed with error:', errorData);

            console.log('Fetching available ad accounts...');

            // If stored account doesn't work, get available ad accounts
            const accountsResponse = await fetch(`${META_BASE_URL}/me/adaccounts?fields=id,name,account_status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!accountsResponse.ok) {
                const errorData = await accountsResponse.json();
                console.error('Failed to fetch ad accounts:', errorData);
                throw new Error('Failed to fetch ad accounts');
            }

            const accountsData = await accountsResponse.json();
            const accounts = accountsData.data || [];
            console.log('Available ad accounts:', accounts);

            if (accounts.length === 0) {
                throw new Error('No ad accounts found');
            }

            // Find an active account
            const activeAccount = accounts.find(account =>
                account.account_status === 1 || account.account_status === 'ACTIVE'
            );

            const accountId = activeAccount ? activeAccount.id : accounts[0].id;

            // Ensure the account ID has the 'act_' prefix
            const validAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
            console.log('Using account:', validAccountId, 'from', accounts.length, 'available accounts');

            return validAccountId;

        } catch (error) {
            console.error('Error getting valid ad account:', error);
            // Fallback to stored account ID if all else fails
            return storedAccountId;
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