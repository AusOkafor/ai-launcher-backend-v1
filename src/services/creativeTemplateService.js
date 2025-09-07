import { prisma } from '../db.js';

class CreativeTemplateService {
    // Get all creative templates
    async getAllTemplates() {
        try {
            const templates = await prisma.creativeTemplate.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: { templates },
                message: 'Templates retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting templates:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve templates' }
            };
        }
    }

    // Get all templates (for scripts - no ApiResponse)
    async getAllTemplatesRaw() {
        try {
            const templates = await prisma.creativeTemplate.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            return templates;
        } catch (error) {
            console.error('Error getting templates:', error);
            throw new Error(`Failed to retrieve templates: ${error.message}`);
        }
    }

    // Get template by ID
    async getTemplateById(templateId) {
        try {
            const template = await prisma.creativeTemplate.findUnique({
                where: { id: templateId }
            });

            if (!template) {
                return {
                    success: false,
                    error: { message: 'Template not found' }
                };
            }

            return {
                success: true,
                data: { template },
                message: 'Template retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting template:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve template' }
            };
        }
    }

    // Create new template
    async createTemplate(templateData) {
        try {
            const template = await prisma.creativeTemplate.create({
                data: {
                    name: templateData.name,
                    description: templateData.description,
                    category: templateData.category,
                    style: templateData.style,
                    focus: templateData.focus,
                    bestFor: templateData.bestFor,
                    color: templateData.color
                }
            });

            return {
                success: true,
                data: { template },
                message: 'Template created successfully'
            };
        } catch (error) {
            console.error('Error creating template:', error);
            return {
                success: false,
                error: { message: 'Failed to create template' }
            };
        }
    }

    // Update template
    async updateTemplate(templateId, templateData) {
        try {
            const template = await prisma.creativeTemplate.update({
                where: { id: templateId },
                data: templateData
            });

            return {
                success: true,
                data: { template },
                message: 'Template updated successfully'
            };
        } catch (error) {
            console.error('Error updating template:', error);
            return {
                success: false,
                error: { message: 'Failed to update template' }
            };
        }
    }

    // Delete template (soft delete)
    async deleteTemplate(templateId) {
        try {
            const template = await prisma.creativeTemplate.update({
                where: { id: templateId },
                data: { isActive: false }
            });

            return {
                success: true,
                data: { template },
                message: 'Template deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting template:', error);
            return {
                success: false,
                error: { message: 'Failed to delete template' }
            };
        }
    }

    // Seed default templates
    async seedDefaultTemplates() {
        try {
            console.log('🌱 Seeding default creative templates...');

            const defaultTemplates = [{
                    name: 'Lifestyle',
                    description: 'Aspirational lifestyle imagery that connects emotionally',
                    category: 'lifestyle',
                    style: 'Inspirational and aspirational',
                    focus: 'Emotional connection',
                    bestFor: ['Fashion', 'Beauty', 'Luxury', 'Wellness'],
                    color: 'bg-gradient-to-br from-purple-500 to-pink-500'
                },
                {
                    name: 'Product Showcase',
                    description: 'Clean, professional product presentation',
                    category: 'product-focused',
                    style: 'Professional and trustworthy',
                    focus: 'Product benefits and features',
                    bestFor: ['Electronics', 'Home & Garden', 'Tools', 'Business'],
                    color: 'bg-gradient-to-br from-blue-500 to-cyan-500'
                },
                {
                    name: 'Social Proof',
                    description: 'Customer testimonials and authentic reviews',
                    category: 'social-proof',
                    style: 'Authentic and relatable',
                    focus: 'Social validation',
                    bestFor: ['Services', 'Software', 'Food', 'Education'],
                    color: 'bg-gradient-to-br from-green-500 to-emerald-500'
                },
                {
                    name: 'Urgency & FOMO',
                    description: 'Limited-time offers and exclusive deals',
                    category: 'urgency',
                    style: 'Exciting and urgent',
                    focus: 'Immediate action',
                    bestFor: ['Sales', 'Events', 'Limited Editions', 'Flash Deals'],
                    color: 'bg-gradient-to-br from-orange-500 to-red-500'
                },
                {
                    name: 'Minimalist',
                    description: 'Clean, simple design with focus on essentials',
                    category: 'minimalist',
                    style: 'Clean and modern',
                    focus: 'Simplicity and clarity',
                    bestFor: ['Tech', 'Design', 'Minimalist Brands', 'Premium'],
                    color: 'bg-gradient-to-br from-gray-500 to-slate-500'
                },
                {
                    name: 'Bold & Dynamic',
                    description: 'Eye-catching, high-energy creative content',
                    category: 'bold',
                    style: 'Bold and energetic',
                    focus: 'Attention-grabbing',
                    bestFor: ['Sports', 'Entertainment', 'Youth Brands', 'Events'],
                    color: 'bg-gradient-to-br from-yellow-500 to-orange-500'
                }
            ];

            const createdTemplates = [];

            for (const template of defaultTemplates) {
                const existingTemplate = await prisma.creativeTemplate.findFirst({
                    where: { name: template.name }
                });

                if (!existingTemplate) {
                    const newTemplate = await prisma.creativeTemplate.create({
                        data: template
                    });
                    createdTemplates.push(newTemplate);
                    console.log(`✅ Created template: ${template.name}`);
                } else {
                    console.log(`⏭️  Template already exists: ${template.name}`);
                }
            }

            return {
                success: true,
                message: 'Default templates seeded successfully',
                count: createdTemplates.length,
                templates: createdTemplates
            };
        } catch (error) {
            console.error('❌ Error seeding templates:', error);
            throw new Error(`Failed to seed default templates: ${error.message}`);
        }
    }

    // Get templates by category
    async getTemplatesByCategory(category) {
        try {
            const templates = await prisma.creativeTemplate.findMany({
                where: {
                    category: category,
                    isActive: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: { templates },
                message: 'Templates retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting templates by category:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve templates' }
            };
        }
    }

    // Get templates suitable for product category
    async getTemplatesForProductCategory(productCategory) {
        try {
            const templates = await prisma.creativeTemplate.findMany({
                where: {
                    isActive: true,
                    bestFor: {
                        has: productCategory
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                success: true,
                data: { templates },
                message: 'Templates retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting templates for product category:', error);
            return {
                success: false,
                error: { message: 'Failed to retrieve templates' }
            };
        }
    }
}

export const creativeTemplateService = new CreativeTemplateService();