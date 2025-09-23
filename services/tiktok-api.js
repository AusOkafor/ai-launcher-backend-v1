/**
 * TikTok Marketing API Integration Service
 * Handles TikTok ad management
 */

const TIKTOK_API_VERSION = 'v1.3';
const TIKTOK_BASE_URL = `https://business-api.tiktok.com/open_api/${TIKTOK_API_VERSION}`;

class TikTokAPIService {
    constructor(accessToken, advertiserId) {
        this.accessToken = accessToken;
        this.advertiserId = advertiserId;
    }

    /**
     * Test connection to TikTok Marketing API
     */
    async testConnection() {
        try {
            const response = await fetch(`${TIKTOK_BASE_URL}/advertiser/info/`, {
                method: 'GET',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                params: {
                    advertiser_ids: JSON.stringify([this.advertiserId])
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to connect to TikTok account'
                };
            }

            const data = await response.json();
            const advertiser = data.data.list && data.data.list[0] ? data.data.list[0] : null;

            if (!advertiser) {
                return {
                    success: false,
                    error: 'Advertiser not found'
                };
            }

            return {
                success: true,
                data: {
                    id: advertiser.advertiser_id,
                    name: advertiser.name,
                    currency: advertiser.currency,
                    timezone: advertiser.timezone
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
            const response = await fetch(`${TIKTOK_BASE_URL}/campaign/create/`, {
                method: 'POST',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    campaign_name: campaignData.name,
                    objective_type: campaignData.objective || 'CONVERSIONS',
                    budget_mode: campaignData.budgetMode || 'BUDGET_MODE_DAY',
                    budget: campaignData.budget || 50,
                    status: campaignData.status || 'ENABLE',
                    ...campaignData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to create campaign'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    campaignId: data.data.campaign_id
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
            const response = await fetch(`${TIKTOK_BASE_URL}/adgroup/create/`, {
                method: 'POST',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    campaign_id: campaignId,
                    adgroup_name: adGroupData.name,
                    placement_type: adGroupData.placementType || 'AUTOMATIC',
                    optimization_goal: adGroupData.optimizationGoal || 'CONVERSION',
                    budget_mode: adGroupData.budgetMode || 'BUDGET_MODE_DAY',
                    budget: adGroupData.budget || 20,
                    bid_type: adGroupData.bidType || 'BID_TYPE_NO_BID',
                    status: adGroupData.status || 'ENABLE',
                    targeting: adGroupData.targeting || {},
                    ...adGroupData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to create ad group'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    adGroupId: data.data.adgroup_id
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
    async createAdCreative(adGroupId, creativeData) {
        try {
            const response = await fetch(`${TIKTOK_BASE_URL}/ad/creative/create/`, {
                method: 'POST',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    adgroup_id: adGroupId,
                    ad_name: creativeData.name,
                    ad_format: creativeData.adFormat || 'SINGLE_IMAGE',
                    landing_page_url: creativeData.landingPageUrl,
                    call_to_action: creativeData.callToAction || 'LEARN_MORE',
                    ad_text: creativeData.adText,
                    ad_keywords: creativeData.adKeywords || [],
                    status: creativeData.status || 'ENABLE',
                    ...creativeData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to create ad creative'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    creativeId: data.data.creative_id
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
            // 1. Create campaign
            const campaignResult = await this.createCampaign({
                name: `${creative.launch.product.title} - TikTok Campaign`,
                objective: 'CONVERSIONS',
                budget: campaignSettings.dailyBudget || 50
            });

            if (!campaignResult.success) {
                return campaignResult;
            }

            // 2. Create ad group
            const adGroupResult = await this.createAdGroup(campaignResult.data.campaignId, {
                name: `${creative.launch.product.title} - Ad Group`,
                budget: campaignSettings.dailyBudget || 20,
                targeting: {
                    age: (campaignSettings.targeting && campaignSettings.targeting.age) || [18, 65],
                    gender: (campaignSettings.targeting && campaignSettings.targeting.gender) || ['MALE', 'FEMALE'],
                    interests: (campaignSettings.targeting && campaignSettings.targeting.interests) || []
                }
            });

            if (!adGroupResult.success) {
                return adGroupResult;
            }

            // 3. Create ad creative
            const creativeResult = await this.createAdCreative(adGroupResult.data.adGroupId, {
                name: `${creative.launch.product.title} - Creative`,
                adText: creative.outputs.description,
                landingPageUrl: creative.launch.product.url || 'https://example.com',
                callToAction: creative.outputs.cta || 'LEARN_MORE',
                adKeywords: creative.outputs.keywords || []
            });

            if (!creativeResult.success) {
                return creativeResult;
            }

            return {
                success: true,
                data: {
                    campaignId: campaignResult.data.campaignId,
                    adGroupId: adGroupResult.data.adGroupId,
                    creativeId: creativeResult.data.creativeId
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
            const response = await fetch(`${TIKTOK_BASE_URL}/reports/integrated/get/`, {
                method: 'POST',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    service_type: 'AUCTION',
                    report_type: 'BASIC',
                    data_level: 'AUCTION_AD',
                    dimensions: ['ad_id'],
                    metrics: ['impressions', 'clicks', 'cost', 'ctr', 'cpc'],
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    filters: [{
                        field: 'ad_id',
                        operator: 'IN',
                        values: [adId]
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to fetch ad performance'
                };
            }

            const data = await response.json();
            const metrics = data.data && data.data.list && data.data.list[0] ? data.data.list[0].metrics : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(metrics.impressions) || 0,
                    clicks: parseInt(metrics.clicks) || 0,
                    spend: parseFloat(metrics.cost) || 0,
                    ctr: parseFloat(metrics.ctr) || 0,
                    cpc: parseFloat(metrics.cpc) || 0
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
     * Get advertiser insights
     */
    async getAdvertiserInsights() {
        try {
            const response = await fetch(`${TIKTOK_BASE_URL}/reports/integrated/get/`, {
                method: 'POST',
                headers: {
                    'Access-Token': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    service_type: 'AUCTION',
                    report_type: 'BASIC',
                    data_level: 'AUCTION_ADVERTISER',
                    dimensions: ['advertiser_id'],
                    metrics: ['impressions', 'clicks', 'cost', 'ctr', 'cpc'],
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to fetch advertiser insights'
                };
            }

            const data = await response.json();
            const metrics = data.data && data.data.list && data.data.list[0] ? data.data.list[0].metrics : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(metrics.impressions) || 0,
                    clicks: parseInt(metrics.clicks) || 0,
                    spend: parseFloat(metrics.cost) || 0,
                    ctr: parseFloat(metrics.ctr) || 0,
                    cpc: parseFloat(metrics.cpc) || 0
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

export default TikTokAPIService;