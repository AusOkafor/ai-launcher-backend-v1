import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addWhatsAppEnabledField() {
    console.log('🔧 Adding whatsappEnabled field to Product model...');
    
    try {
        // First, let's check if the field already exists by trying to query it
        try {
            await prisma.$queryRaw`SELECT "whatsappEnabled" FROM products LIMIT 1`;
            console.log('✅ whatsappEnabled field already exists');
            return;
        } catch (error) {
            if (error.message.includes('column "whatsappenabled" does not exist') || error.message.includes('column "whatsappEnabled" does not exist')) {
                console.log('📝 whatsappEnabled field does not exist, adding it...');
            } else {
                throw error;
            }
        }

        // Add the whatsappEnabled column
        await prisma.$executeRaw`ALTER TABLE products ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false`;
        
        console.log('✅ Successfully added whatsappEnabled field to products table');
        
        // Update existing products to have whatsappEnabled = false by default
        const updateResult = await prisma.product.updateMany({
            data: {
                whatsappEnabled: false
            }
        });
        
        console.log(`✅ Updated ${updateResult.count} existing products with whatsappEnabled = false`);
        
    } catch (error) {
        console.error('❌ Error adding whatsappEnabled field:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addWhatsAppEnabledField();
