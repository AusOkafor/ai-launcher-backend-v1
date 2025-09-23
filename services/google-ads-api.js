/**
 * Google Ads API Integration Service
 * Handles Google Ads campaign management
 */

const GOOGLE_ADS_API_VERSION = 'v14';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

class GoogleAdsAPIService {
    constructor(refreshToken, customerId) {
        this.refreshToken = refreshToken;
        this.customerId = customerId;
        this.accessToken = null;
    }

    /**
     * Get access token using refresh token
     */
    async getAccessToken() {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.error_description || 'Failed to get access token'
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
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test connection to Google Ads API
     */
    async testConnection() {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to connect to Google Ads account'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    id: data.id,
                    name: data.descriptiveName,
                    currency: data.currencyCode,
                    timezone: data.timeZone
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
    async createCampaign(campaignData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/campaigns:mutate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operations: [{
                        create: {
                            name: campaignData.name,
                            advertisingChannelType: 'SEARCH',
                            status: 'PAUSED',
                            campaignBudget: `customers/${this.customerId}/campaignBudgets/${campaignData.budgetId}`,
                            ...campaignData
                        }
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create campaign'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    campaignId: data.results[0].resourceName.split('/').pop()
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
     * Create an ad group
     */
    async createAdGroup(campaignId, adGroupData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/adGroups:mutate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operations: [{
                        create: {
                            name: adGroupData.name,
                            campaign: `customers/${this.customerId}/campaigns/${campaignId}`,
                            status: 'ENABLED',
                            cpcBidMicros: adGroupData.cpcBidMicros || 1000000, // $1.00
                            ...adGroupData
                        }
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create ad group'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    adGroupId: data.results[0].resourceName.split('/').pop()
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
     * Create a text ad
     */
    async createTextAd(adGroupId, adData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/adGroupAds:mutate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operations: [{
                        create: {
                            adGroup: `customers/${this.customerId}/adGroups/${adGroupId}`,
                            status: 'ENABLED',
                            ad: {
                                type: 'EXPANDED_TEXT_AD',
                                expandedTextAd: {
                                    headlinePart1: adData.headline1,
                                    headlinePart2: adData.headline2,
                                    description: adData.description,
                                    path1: adData.path1,
                                    path2: adData.path2
                                },
                                finalUrls: [adData.finalUrl]
                            }
                        }
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create text ad'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    adId: data.results[0].resourceName.split('/').pop()
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
    async publishCampaign(creative, campaignSettings) {
        try {
            // 1. Create campaign budget first
            const budgetResult = await this.createCampaignBudget({
                name: `${creative.launch.product.title} - Budget`,
                amountMicros: (campaignSettings.dailyBudget || 50) * 1000000, // Convert to micros
                deliveryMethod: 'STANDARD'
            });

            if (!budgetResult.success) {
                return budgetResult;
            }

            // 2. Create campaign
            const campaignResult = await this.createCampaign({
                name: `${creative.launch.product.title} - Campaign`,
                budgetId: budgetResult.data.budgetId
            });

            if (!campaignResult.success) {
                return campaignResult;
            }

            // 3. Create ad group
            const adGroupResult = await this.createAdGroup(campaignResult.data.campaignId, {
                name: `${creative.launch.product.title} - Ad Group`
            });

            if (!adGroupResult.success) {
                return adGroupResult;
            }

            // 4. Create text ad
            const adResult = await this.createTextAd(adGroupResult.data.adGroupId, {
                headline1: creative.outputs.headline,
                headline2: creative.outputs.description.substring(0, 30),
                description: creative.outputs.description,
                finalUrl: creative.launch.product.url || 'https://example.com'
            });

            if (!adResult.success) {
                return adResult;
            }

            return {
                success: true,
                data: {
                    campaignId: campaignResult.data.campaignId,
                    adGroupId: adGroupResult.data.adGroupId,
                    adId: adResult.data.adId,
                    budgetId: budgetResult.data.budgetId
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
     * Create campaign budget
     */
    async createCampaignBudget(budgetData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/campaignBudgets:mutate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operations: [{
                        create: {
                            name: budgetData.name,
                            amountMicros: budgetData.amountMicros,
                            deliveryMethod: budgetData.deliveryMethod || 'STANDARD'
                        }
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to create campaign budget'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    budgetId: data.results[0].resourceName.split('/').pop()
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
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/googleAds:search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        SELECT 
                            metrics.impressions,
                            metrics.clicks,
                            metrics.cost_micros,
                            metrics.ctr,
                            metrics.average_cpc
                        FROM ad_group_ad 
                        WHERE ad_group_ad.ad.id = ${adId}
                        AND segments.date DURING LAST_7_DAYS
                    `
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: (error.error && error.error.message) || 'Failed to fetch ad performance'
                };
            }

            const data = await response.json();
            const metrics = data.results && data.results[0] ? data.results[0].metrics : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(metrics.impressions) || 0,
                    clicks: parseInt(metrics.clicks) || 0,
                    spend: parseFloat(metrics.costMicros) / 1000000 || 0, // Convert from micros
                    ctr: parseFloat(metrics.ctr) || 0,
                    cpc: parseFloat(metrics.averageCpc) || 0
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

export default GoogleAdsAPIService;