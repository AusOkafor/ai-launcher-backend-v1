// Seed Templates Script
// Populate database with initial professional templates

import { PrismaClient } from '@prisma/client';
import { CREATIVE_TEMPLATES } from '../src/services/creativeTemplates.js';

const prisma = new PrismaClient();

const seedTemplates = async() => {
    try {
        console.log('🌱 Starting template seeding...');

        // Create template categories
        const categories = [
            { name: 'Business', slug: 'business', description: 'Professional business templates', icon: 'briefcase', color: '#2563eb', sortOrder: 1 },
            { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle and personal templates', icon: 'heart', color: '#dc2626', sortOrder: 2 },
            { name: 'Fashion', slug: 'fashion', description: 'Fashion and beauty templates', icon: 'shirt', color: '#7c3aed', sortOrder: 3 },
            { name: 'Technology', slug: 'technology', description: 'Tech and software templates', icon: 'cpu', color: '#059669', sortOrder: 4 },
            { name: 'Food', slug: 'food', description: 'Food and restaurant templates', icon: 'utensils', color: '#d97706', sortOrder: 5 },
            { name: 'Travel', slug: 'travel', description: 'Travel and tourism templates', icon: 'plane', color: '#0891b2', sortOrder: 6 }
        ];

        for (const category of categories) {
            await prisma.templateCategory.create({
                data: category
            });
        }

        console.log('✅ Template categories created');

        // Convert legacy templates to database format
        const templatesToSeed = [];

        Object.entries(CREATIVE_TEMPLATES).forEach(([platform, platformTemplates]) => {
            Object.entries(platformTemplates).forEach(([key, template]) => {
                templatesToSeed.push({
                    name: template.name,
                    description: template.description,
                    category: template.category || platform,
                    subcategory: template.subcategory || 'general',
                    tags: template.tags || [],
                    settings: template.settings,
                    thumbnail: null,
                    isPublic: true,
                    isPremium: false,
                    usageCount: Math.floor(Math.random() * 100),
                    createdBy: 'system',
                    storeId: null
                });
            });
        });

        // Add additional premium templates
        const premiumTemplates = [{
                name: 'Enterprise Solution',
                description: 'Professional enterprise-grade design for B2B products',
                category: 'linkedin',
                subcategory: 'enterprise',
                tags: ['enterprise', 'b2b', 'corporate', 'professional'],
                settings: {
                    headline: '',
                    subheadline: '',
                    cta: 'SCHEDULE DEMO',
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
                    ctaBackground: '#059669',
                    filter: 'none',
                    brightness: 105,
                    contrast: 110,
                    saturation: 105,
                    blur: 0,
                    background: 'gradient',
                    backgroundGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    overlay: true,
                    overlayOpacity: 0.2,
                    platform: 'linkedin',
                    aspectRatio: '1:1',
                    layout: 'product-focus'
                },
                isPremium: true
            },
            {
                name: 'Luxury Brand',
                description: 'Ultra-premium design for luxury brands',
                category: 'instagram',
                subcategory: 'luxury',
                tags: ['luxury', 'premium', 'exclusive', 'high-end'],
                settings: {
                    headline: '',
                    subheadline: '',
                    cta: 'EXPLORE COLLECTION',
                    showPrice: true,
                    headlinePosition: { x: 50, y: 20 },
                    ctaPosition: { x: 50, y: 75 },
                    pricePosition: { x: 85, y: 15 },
                    headlineFont: 'bold',
                    headlineSize: 36,
                    headlineColor: '#ffffff',
                    ctaFont: 'bold',
                    ctaSize: 18,
                    ctaColor: '#000000',
                    ctaBackground: '#ffffff',
                    filter: 'none',
                    brightness: 110,
                    contrast: 115,
                    saturation: 110,
                    blur: 0,
                    background: 'gradient',
                    backgroundGradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
                    overlay: true,
                    overlayOpacity: 0.5,
                    platform: 'instagram',
                    aspectRatio: '1:1',
                    layout: 'product-focus'
                },
                isPremium: true
            }
        ];

        templatesToSeed.push(...premiumTemplates);

        // Seed templates
        for (const template of templatesToSeed) {
            await prisma.creativeTemplate.create({
                data: template
            });
        }

        console.log(`✅ ${templatesToSeed.length} templates seeded`);

        // Create template collections
        const collections = [{
                name: 'Business Essentials',
                description: 'Essential templates for business marketing',
                category: 'business',
                tags: ['business', 'professional', 'corporate'],
                isPublic: true,
                isPremium: false
            },
            {
                name: 'Premium Collection',
                description: 'Exclusive premium templates for serious marketers',
                category: 'all',
                tags: ['premium', 'exclusive', 'professional'],
                isPublic: true,
                isPremium: true
            },
            {
                name: 'Social Media Starter',
                description: 'Perfect templates for social media beginners',
                category: 'social',
                tags: ['beginner', 'social', 'easy'],
                isPublic: true,
                isPremium: false
            }
        ];

        for (const collection of collections) {
            await prisma.templateCollection.create({
                data: collection
            });
        }

        console.log(`✅ ${collections.length} collections created`);

        console.log('🎉 Template seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding templates:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};

// Run the seeding
if (
    import.meta.url === `file://${process.argv[1]}`) {
    seedTemplates()
        .then(() => {
            console.log('✅ Seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

export default seedTemplates;