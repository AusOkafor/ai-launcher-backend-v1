// Enhanced Creative Template Routes
// Comprehensive API for custom template builder system

import express from 'express';
import { CreativeTemplateService } from '../services/creativeTemplates.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Get all templates (with filtering and pagination)
router.get('/', async(req, res) => {
    try {
        const {
            category,
            subcategory,
            tags,
            search,
            isPublic,
            isPremium,
            limit = 50,
            skip = 0,
            sortBy = 'usageCount',
            sortOrder = 'desc'
        } = req.query;

        let templates;
        let categories;

        if (search) {
            // Search templates
            templates = await CreativeTemplateService.searchTemplates(search, {
                category,
                isPublic: isPublic === 'true',
                isPremium: isPremium === 'true',
                limit: parseInt(limit),
                skip: parseInt(skip)
            });
        } else if (category) {
            // Get templates by category
            templates = await CreativeTemplateService.getTemplatesByCategory(category, {
                subcategory,
                tags: tags ? tags.split(',') : undefined,
                isPublic: isPublic === 'true',
                isPremium: isPremium === 'true',
                limit: parseInt(limit),
                skip: parseInt(skip)
            });
        } else {
            // Get all templates
            templates = await CreativeTemplateService.getAllTemplates();
        }

        // Get template categories
        categories = await CreativeTemplateService.getTemplateCategories();

        res.json({
            success: true,
            data: {
                templates,
                categories,
                pagination: {
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    total: templates.length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates'
        });
    }
});

// Test route for saving templates (no auth required for testing)
router.post('/test-template', async(req, res) => {
    try {
        console.log('Test template route hit');
        const templateData = req.body;
        console.log('Received template data:', JSON.stringify(templateData, null, 2));

        // Simple validation
        if (!templateData.name || !templateData.settings) {
            console.log('Validation failed - missing name or settings');
            return res.status(400).json({
                success: false,
                error: 'Template name and settings are required',
                received: {
                    hasName: !!templateData.name,
                    hasSettings: !!templateData.settings,
                    name: templateData.name,
                    settingsKeys: templateData.settings ? Object.keys(templateData.settings) : []
                }
            });
        }

        console.log('Validation passed, returning success');
        // For testing, just return success
        res.json({
            success: true,
            message: 'Template saved successfully (test mode)',
            data: {
                template: {
                    id: `test_${Date.now()}`,
                    ...templateData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error in test template save:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save test template',
            details: error.message
        });
    }
});

// Get templates by platform (legacy support)
router.get('/:platform', async(req, res) => {
    try {
        const { platform } = req.params;
        const templates = CreativeTemplateService.getTemplatesByPlatform(platform);

        res.json({
            success: true,
            data: {
                templates,
                categories: {
                    [platform]: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Templates`
                }
            }
        });
    } catch (error) {
        console.error('Error fetching platform templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch platform templates'
        });
    }
});

// Get specific template by ID
router.get('/template/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const template = await CreativeTemplateService.getTemplateById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Increment usage count
        await CreativeTemplateService.incrementUsageCount(id);

        res.json({
            success: true,
            data: { template }
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template'
        });
    }
});

// Create new template
router.post('/template', authenticate, async(req, res) => {
    try {
        const templateData = {
            ...req.body,
            createdBy: req.user.id,
            storeId: req.user.storeId
        };

        const template = await CreativeTemplateService.createTemplate(templateData);

        res.status(201).json({
            success: true,
            data: { template }
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create template'
        });
    }
});

// Update template
router.put('/template/:id', authenticate, async(req, res) => {
    try {
        const { id } = req.params;
        const template = await CreativeTemplateService.getTemplateById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Check if user owns the template or is admin
        if (template.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this template'
            });
        }

        const updatedTemplate = await CreativeTemplateService.updateTemplate(id, req.body);

        res.json({
            success: true,
            data: { template: updatedTemplate }
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update template'
        });
    }
});

// Delete template
router.delete('/template/:id', authenticate, async(req, res) => {
    try {
        const { id } = req.params;
        const template = await CreativeTemplateService.getTemplateById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Check if user owns the template or is admin
        if (template.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this template'
            });
        }

        await CreativeTemplateService.deleteTemplate(id);

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete template'
        });
    }
});

// User Template Management
router.post('/user-template', authenticate, async(req, res) => {
    try {
        const { templateId, customSettings } = req.body;

        const userTemplate = await CreativeTemplateService.saveUserTemplate(
            req.user.id,
            templateId,
            customSettings
        );

        res.json({
            success: true,
            data: { userTemplate }
        });
    } catch (error) {
        console.error('Error saving user template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save user template'
        });
    }
});

// Get user's templates
router.get('/user-templates', authenticate, async(req, res) => {
    try {
        const userTemplates = await CreativeTemplateService.getUserTemplates(req.user.id);

        res.json({
            success: true,
            data: { userTemplates }
        });
    } catch (error) {
        console.error('Error fetching user templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user templates'
        });
    }
});

// Template Collections
router.get('/collections', async(req, res) => {
    try {
        const { category, isPublic } = req.query;

        const collections = await CreativeTemplateService.getCollections({
            category,
            isPublic: isPublic === 'true'
        });

        res.json({
            success: true,
            data: { collections }
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch collections'
        });
    }
});

router.post('/collection', authenticate, async(req, res) => {
    try {
        const collectionData = {
            ...req.body,
            createdBy: req.user.id,
            storeId: req.user.storeId
        };

        const collection = await CreativeTemplateService.createCollection(collectionData);

        res.status(201).json({
            success: true,
            data: { collection }
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create collection'
        });
    }
});

// Template Analytics
router.get('/template/:id/analytics', authenticate, async(req, res) => {
    try {
        const { id } = req.params;
        const analytics = await CreativeTemplateService.getTemplateAnalytics(id);

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Error fetching template analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template analytics'
        });
    }
});

// Template Recommendations
router.get('/recommendations', authenticate, async(req, res) => {
    try {
        const { category, limit = 5 } = req.query;

        const recommendations = await CreativeTemplateService.getRecommendedTemplates(
            req.user.id,
            category,
            parseInt(limit)
        );

        res.json({
            success: true,
            data: { recommendations }
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recommendations'
        });
    }
});

// Template Categories
router.get('/categories', async(req, res) => {
    try {
        const categories = await CreativeTemplateService.getTemplateCategories();

        res.json({
            success: true,
            data: { categories }
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Creative Template API is running',
        timestamp: new Date().toISOString()
    });
});

export default router;