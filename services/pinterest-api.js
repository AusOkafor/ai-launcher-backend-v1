/**
 * Pinterest Ads API Integration Service
 * Handles Pinterest ad management
 */

const PINTEREST_API_VERSION = 'v5';
const PINTEREST_BASE_URL = `https://api.pinterest.com/${PINTEREST_API_VERSION}`;

class PinterestAPIService {
    constructor(accessToken, advertiserId) {
        this.accessToken = accessToken;
        this.advertiserId = advertiserId;
    }

    /**
     * Test connection to Pinterest Ads API
     */
    async testConnection() {
        try {
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to connect to Pinterest account'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    id: data.id,
                    name: data.name,
                    currency: data.currency,
                    country: data.country,
                    owner: data.owner
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
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}/campaigns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: campaignData.name,
                    status: campaignData.status || 'PAUSED',
                    objective_type: campaignData.objective || 'AWARENESS',
                    daily_budget_in_micro_currency: (campaignData.dailyBudget || 50) * 1000000, // Convert to micro currency
                    order_line_id: campaignData.orderLineId,
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
     * Create an ad group
     */
    async createAdGroup(campaignId, adGroupData) {
        try {
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}/ad_groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: adGroupData.name,
                    campaign_id: campaignId,
                    status: adGroupData.status || 'PAUSED',
                    budget_in_micro_currency: (adGroupData.budget || 20) * 1000000,
                    bid_in_micro_currency: (adGroupData.bid || 1) * 1000000,
                    optimization_goal_metadata: {
                        conversion_tag_id: adGroupData.conversionTagId,
                        optimization_goal: adGroupData.optimizationGoal || 'IMPRESSION'
                    },
                    targeting_spec: adGroupData.targeting || {},
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
                    adGroupId: data.id
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
     * Create a promoted pin
     */
    async createPromotedPin(adGroupId, pinData) {
        try {
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}/ads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ad_group_id: adGroupId,
                    creative_type: pinData.creativeType || 'REGULAR',
                    pin_id: pinData.pinId,
                    status: pinData.status || 'PAUSED',
                    ...pinData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to create promoted pin'
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
     * Create a pin
     */
    async createPin(pinData) {
        try {
            const response = await fetch(`${PINTEREST_BASE_URL}/pins`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    board_id: pinData.boardId,
                    title: pinData.title,
                    description: pinData.description,
                    link: pinData.link,
                    media_source: {
                        source_type: 'image_url',
                        url: pinData.imageUrl
                    },
                    ...pinData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to create pin'
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    pinId: data.id
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
                name: `${creative.launch.product.title} - Pinterest Campaign`,
                objective: 'AWARENESS',
                dailyBudget: campaignSettings.dailyBudget || 50
            });

            if (!campaignResult.success) {
                return campaignResult;
            }

            // 2. Create ad group
            const adGroupResult = await this.createAdGroup(campaignResult.data.campaignId, {
                name: `${creative.launch.product.title} - Ad Group`,
                budget: campaignSettings.dailyBudget || 20,
                targeting: {
                    age_bucket: (campaignSettings.targeting && campaignSettings.targeting.ageBucket) || ['25-34', '35-44'],
                    gender: (campaignSettings.targeting && campaignSettings.targeting.gender) || ['male', 'female'],
                    interests: (campaignSettings.targeting && campaignSettings.targeting.interests) || []
                }
            });

            if (!adGroupResult.success) {
                return adGroupResult;
            }

            // 3. Create pin first
            const pinResult = await this.createPin({
                boardId: campaignSettings.boardId,
                title: creative.outputs.headline,
                description: creative.outputs.description,
                link: creative.launch.product.url || 'https://example.com',
                imageUrl: creative.launch.product.image || 'https://via.placeholder.com/600x900'
            });

            if (!pinResult.success) {
                return pinResult;
            }

            // 4. Create promoted pin
            const promotedPinResult = await this.createPromotedPin(adGroupResult.data.adGroupId, {
                pinId: pinResult.data.pinId,
                creativeType: 'REGULAR'
            });

            if (!promotedPinResult.success) {
                return promotedPinResult;
            }

            return {
                success: true,
                data: {
                    campaignId: campaignResult.data.campaignId,
                    adGroupId: adGroupResult.data.adGroupId,
                    pinId: pinResult.data.pinId,
                    adId: promotedPinResult.data.adId
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
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}/ads/${adId}/analytics`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    columns: 'IMPRESSION,CLICKTHROUGH,SPEND_IN_MICRO_DOLLAR,CTR,ECPC_IN_MICRO_DOLLAR',
                    granularity: 'DAY'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to fetch ad performance'
                };
            }

            const data = await response.json();
            const metrics = data.data && data.data[0] ? data.data[0] : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(metrics.IMPRESSION) || 0,
                    clicks: parseInt(metrics.CLICKTHROUGH) || 0,
                    spend: parseFloat(metrics.SPEND_IN_MICRO_DOLLAR) / 1000000 || 0, // Convert from micro dollars
                    ctr: parseFloat(metrics.CTR) || 0,
                    cpc: parseFloat(metrics.ECPC_IN_MICRO_DOLLAR) / 1000000 || 0 // Convert from micro dollars
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
     * Get account analytics
     */
    async getAccountAnalytics() {
        try {
            const response = await fetch(`${PINTEREST_BASE_URL}/ad_accounts/${this.advertiserId}/analytics`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    columns: 'IMPRESSION,CLICKTHROUGH,SPEND_IN_MICRO_DOLLAR,CTR,ECPC_IN_MICRO_DOLLAR',
                    granularity: 'DAY'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to fetch account analytics'
                };
            }

            const data = await response.json();
            const metrics = data.data && data.data[0] ? data.data[0] : {};

            return {
                success: true,
                data: {
                    impressions: parseInt(metrics.IMPRESSION) || 0,
                    clicks: parseInt(metrics.CLICKTHROUGH) || 0,
                    spend: parseFloat(metrics.SPEND_IN_MICRO_DOLLAR) / 1000000 || 0,
                    ctr: parseFloat(metrics.CTR) || 0,
                    cpc: parseFloat(metrics.ECPC_IN_MICRO_DOLLAR) / 1000000 || 0
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

export default PinterestAPIService;