// Custom Template Builder Service
// Advanced template management system for SaaS applications

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const CREATIVE_TEMPLATES = {
    // Instagram Templates
    instagram: {
        'elegant-minimal': {
            name: 'Elegant Minimal',
            description: 'Clean, minimal design with subtle text overlay',
            category: 'instagram',
            subcategory: 'minimal',
            tags: ['minimal', 'elegant', 'clean', 'professional'],
            settings: {
                headline: '',
                subheadline: '',
                cta: 'SHOP NOW',
                showPrice: true,
                headlinePosition: { x: 50, y: 10 },
                ctaPosition: { x: 50, y: 85 },
                pricePosition: { x: 85, y: 10 },
                headlineFont: 'bold',
                headlineSize: 28,
                headlineColor: '#ffffff',
                ctaFont: 'bold',
                ctaSize: 18,
                ctaColor: '#ffffff',
                ctaBackground: '#000000',
                filter: 'none',
                brightness: 110,
                contrast: 105,
                saturation: 110,
                blur: 0,
                background: 'gradient',
                backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                overlay: true,
                overlayOpacity: 0.2,
                platform: 'instagram',
                aspectRatio: '1:1',
                layout: 'product-focus'
            }
        },
        'luxury-premium': {
            name: 'Luxury Premium',
            description: 'High-end, sophisticated design for premium products',
            category: 'instagram',
            subcategory: 'luxury',
            tags: ['luxury', 'premium', 'sophisticated', 'high-end'],
            settings: {
                headline: '',
                subheadline: '',
                cta: 'EXPLORE COLLECTION',
                showPrice: true,
                headlinePosition: { x: 50, y: 15 },
                ctaPosition: { x: 50, y: 80 },
                pricePosition: { x: 85, y: 10 },
                headlineFont: 'bold',
                headlineSize: 34,
                headlineColor: '#ffffff',
                ctaFont: 'bold',
                ctaSize: 16,
                ctaColor: '#000000',
                ctaBackground: '#ffffff',
                filter: 'none',
                brightness: 105,
                contrast: 110,
                saturation: 105,
                blur: 0,
                background: 'gradient',
                backgroundGradient: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
                overlay: true,
                overlayOpacity: 0.4,
                platform: 'instagram',
                aspectRatio: '1:1',
                layout: 'product-focus'
            }
        }
    },

    // Facebook Templates
    facebook: {
        'professional-business': {
            name: 'Professional Business',
            description: 'Clean, professional look for business products',
            category: 'facebook',
            subcategory: 'business',
            tags: ['business', 'professional', 'corporate', 'clean'],
            settings: {
                headline: '',
                subheadline: '',
                cta: 'LEARN MORE',
                showPrice: true,
                headlinePosition: { x: 50, y: 10 },
                ctaPosition: { x: 50, y: 85 },
                pricePosition: { x: 85, y: 10 },
                headlineFont: 'bold',
                headlineSize: 32,
                headlineColor: '#ffffff',
                ctaFont: 'bold',
                ctaSize: 18,
                ctaColor: '#ffffff',
                ctaBackground: '#2f3542',
                filter: 'none',
                brightness: 105,
                contrast: 110,
                saturation: 105,
                blur: 0,
                background: 'gradient',
                backgroundGradient: 'linear-gradient(135deg, #2f3542 0%, #57606f 100%)',
                overlay: true,
                overlayOpacity: 0.2,
                platform: 'facebook',
                aspectRatio: '1:1',
                layout: 'product-focus'
            }
        }
    },

    // LinkedIn Templates
    linkedin: {
        'executive-summary': {
            name: 'Executive Summary',
            description: 'Professional executive-level design for B2B marketing',
            category: 'linkedin',
            subcategory: 'executive',
            tags: ['executive', 'professional', 'b2b', 'corporate'],
            settings: {
                headline: '',
                subheadline: '',
                cta: 'CONNECT WITH US',
                showPrice: false,
                headlinePosition: { x: 50, y: 15 },
                ctaPosition: { x: 50, y: 80 },
                pricePosition: { x: 85, y: 10 },
                headlineFont: 'bold',
                headlineSize: 32,
                headlineColor: '#ffffff',
                ctaFont: 'bold',
                ctaSize: 18,
                ctaColor: '#ffffff',
                ctaBackground: '#0077b5',
                filter: 'none',
                brightness: 105,
                contrast: 110,
                saturation: 105,
                blur: 0,
                background: 'gradient',
                backgroundGradient: 'linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)',
                overlay: true,
                overlayOpacity: 0.3,
                platform: 'linkedin',
                aspectRatio: '1:1',
                layout: 'product-focus'
            }
        }
    }
};

export class CreativeTemplateService {
    // Database Operations
    static async createTemplate(templateData) {
        try {
            const template = await prisma.creativeTemplate.create({
                data: {
                    name: templateData.name,
                    description: templateData.description,
                    category: templateData.category,
                    subcategory: templateData.subcategory,
                    tags: templateData.tags || [],
                    settings: templateData.settings,
                    thumbnail: templateData.thumbnail,
                    isPublic: templateData.isPublic && templateData.isPublic !== false ? true : false,
                    isPremium: templateData.isPremium && templateData.isPremium !== false ? true : false,
                    createdBy: templateData.createdBy,
                    storeId: templateData.storeId
                }
            });
            return template;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }

    static async getTemplateById(id) {
        try {
            return await prisma.creativeTemplate.findUnique({
                where: { id },
                include: { store: true }
            });
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    static async getTemplatesByCategory(category, options = {}) {
        try {
            const where = { category };

            if (options.isPublic !== undefined) {
                where.isPublic = options.isPublic;
            }

            if (options.isPremium !== undefined) {
                where.isPremium = options.isPremium;
            }

            if (options.subcategory) {
                where.subcategory = options.subcategory;
            }

            if (options.tags && options.tags.length > 0) {
                where.tags = {
                    hasSome: options.tags
                };
            }

            return await prisma.creativeTemplate.findMany({
                where,
                orderBy: { usageCount: 'desc' },
                take: options.limit || 50,
                skip: options.skip || 0
            });
        } catch (error) {
            console.error('Error fetching templates by category:', error);
            throw error;
        }
    }

    static async searchTemplates(query, options = {}) {
        try {
            const where = {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { tags: { hasSome: [query] } }
                ]
            };

            if (options.category) {
                where.category = options.category;
            }

            if (options.isPublic !== undefined) {
                where.isPublic = options.isPublic;
            }

            return await prisma.creativeTemplate.findMany({
                where,
                orderBy: { usageCount: 'desc' },
                take: options.limit || 50,
                skip: options.skip || 0
            });
        } catch (error) {
            console.error('Error searching templates:', error);
            throw error;
        }
    }

    static async updateTemplate(id, updateData) {
        try {
            return await prisma.creativeTemplate.update({
                where: { id },
                data: updateData
            });
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }

    static async deleteTemplate(id) {
        try {
            return await prisma.creativeTemplate.delete({
                where: { id }
            });
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }

    static async incrementUsageCount(id) {
        try {
            return await prisma.creativeTemplate.update({
                where: { id },
                data: {
                    usageCount: {
                        increment: 1
                    }
                }
            });
        } catch (error) {
            console.error('Error incrementing usage count:', error);
            throw error;
        }
    }

    // User Template Management
    static async saveUserTemplate(userId, templateId, customSettings) {
        try {
            return await prisma.userTemplate.upsert({
                where: {
                    userId_templateId: {
                        userId,
                        templateId
                    }
                },
                update: {
                    customSettings,
                    lastUsed: new Date(),
                    useCount: {
                        increment: 1
                    }
                },
                create: {
                    userId,
                    templateId,
                    customSettings,
                    lastUsed: new Date(),
                    useCount: 1
                }
            });
        } catch (error) {
            console.error('Error saving user template:', error);
            throw error;
        }
    }

    static async getUserTemplates(userId) {
        try {
            return await prisma.userTemplate.findMany({
                where: { userId },
                include: {
                    template: true
                },
                orderBy: { lastUsed: 'desc' }
            });
        } catch (error) {
            console.error('Error fetching user templates:', error);
            throw error;
        }
    }

    // Template Categories
    static async getTemplateCategories() {
        try {
            return await prisma.templateCategory.findMany({
                orderBy: { sortOrder: 'asc' }
            });
        } catch (error) {
            console.error('Error fetching template categories:', error);
            throw error;
        }
    }

    // Template Collections
    static async createCollection(collectionData) {
        try {
            return await prisma.templateCollection.create({
                data: collectionData
            });
        } catch (error) {
            console.error('Error creating collection:', error);
            throw error;
        }
    }

    static async getCollections(options = {}) {
        try {
            const where = {};

            if (options.isPublic !== undefined) {
                where.isPublic = options.isPublic;
            }

            if (options.category) {
                where.category = options.category;
            }

            return await prisma.templateCollection.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            console.error('Error fetching collections:', error);
            throw error;
        }
    }

    // Legacy Methods (for backward compatibility)
    static getTemplatesByPlatform(platform) {
        return CREATIVE_TEMPLATES[platform] || {};
    }

    static getAllTemplates() {
        return CREATIVE_TEMPLATES;
    }

    static getTemplate(platform, templateKey) {
        return CREATIVE_TEMPLATES[platform] && CREATIVE_TEMPLATES[platform][templateKey];
    }

    static applyTemplateToSettings(template, productData) {
        if (!template) return null;

        const settings = {...template.settings };

        // Auto-populate headline with product name if not set
        if (!settings.headline && productData && productData.title) {
            settings.headline = productData.title;
        }

        // Ensure price is included
        if (settings.showPrice && productData && productData.price) {
            settings.productPrice = productData.price;
        }

        return settings;
    }

    // Template Analytics
    static async getTemplateAnalytics(templateId) {
        try {
            const template = await prisma.creativeTemplate.findUnique({
                where: { id: templateId },
                include: {
                    _count: {
                        select: {
                            userTemplates: true
                        }
                    }
                }
            });

            return {
                usageCount: template.usageCount,
                userCount: template._count.userTemplates,
                popularity: template.usageCount + (template._count.userTemplates * 2)
            };
        } catch (error) {
            console.error('Error fetching template analytics:', error);
            throw error;
        }
    }

    // Template Recommendations
    static async getRecommendedTemplates(userId, category, limit = 5) {
        try {
            // Get user's template usage history
            const userTemplates = await prisma.userTemplate.findMany({
                where: { userId },
                include: { template: true },
                orderBy: { useCount: 'desc' },
                take: 10
            });

            // Extract user preferences
            const userPreferences = userTemplates.reduce((prefs, ut) => {
                const template = ut.template;
                if (template.subcategory) {
                    prefs.subcategories[template.subcategory] = (prefs.subcategories[template.subcategory] || 0) + ut.useCount;
                }
                if (template.tags) {
                    template.tags.forEach(tag => {
                        prefs.tags[tag] = (prefs.tags[tag] || 0) + ut.useCount;
                    });
                }
                return prefs;
            }, { subcategories: {}, tags: {} });

            // Find similar templates
            const similarTemplates = await prisma.creativeTemplate.findMany({
                where: {
                    category,
                    isPublic: true,
                    id: {
                        notIn: userTemplates.map(ut => ut.templateId)
                    }
                },
                take: limit * 2
            });

            // Score and rank templates
            const scoredTemplates = similarTemplates.map(template => {
                let score = 0;

                // Subcategory match
                if (template.subcategory && userPreferences.subcategories[template.subcategory]) {
                    score += userPreferences.subcategories[template.subcategory] * 2;
                }

                // Tag matches
                if (template.tags) {
                    template.tags.forEach(tag => {
                        if (userPreferences.tags[tag]) {
                            score += userPreferences.tags[tag];
                        }
                    });
                }

                // Popularity bonus
                score += template.usageCount * 0.1;

                return { template, score };
            });

            // Return top templates
            return scoredTemplates
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(item => item.template);
        } catch (error) {
            console.error('Error getting recommended templates:', error);
            return [];
        }
    }
}