import { prisma } from '../db.js';
import creativeTemplateService from '../services/creativeTemplateService.js';

async function seedTemplates() {
    try {
        console.log('🌱 Starting template seeding process...');

        const result = await creativeTemplateService.seedDefaultTemplates();

        console.log('✅ Templates seeded successfully!');
        console.log(`📊 Created ${result.count} new templates`);
        if (result.templates && result.templates.length > 0) {
            console.log('📝 New templates:');
            result.templates.forEach(template => {
                console.log(`  - ${template.name} (${template.category})`);
            });
        }

            // Get all templates to show what was created
    const templates = await creativeTemplateService.getAllTemplatesRaw();
    console.log('\n📋 All available templates:');
    templates.forEach(template => {
      console.log(`  - ${template.name} (${template.category})`);
    });

    } catch (error) {
        console.error('❌ Error seeding templates:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
seedTemplates();