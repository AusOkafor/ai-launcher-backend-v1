import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';
import imageUpscaler from './imageUpscaler.js';

class ImageGenerationService {
    async createAdCreative(creativeId, options) {
        try {
            const { originalImageUrl, productData, imageSettings, platform, count = 3 } = options;

            // Validate creative exists and get product data
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                throw new Error('Creative not found');
            }

            const product = productData || creative.launch.product;

            // Generate ad creatives with actual product image manipulation
            const adCreatives = [];
            for (let i = 0; i < count; i++) {
                const adCreative = await this.generateAdCreative(
                    originalImageUrl,
                    product,
                    imageSettings,
                    platform,
                    i
                );
                adCreatives.push(adCreative);
            }

            // Save to database
            const savedCreatives = await this.saveGeneratedImages(creativeId, adCreatives, 'GENERATED');

            logger.info(`Created ${adCreatives.length} ad creatives for creative ${creativeId}`);
            return savedCreatives;

        } catch (error) {
            logger.error('Error creating ad creative:', error);
            throw error;
        }
    }

    async generateVariations(creativeId, options) {
        try {
            const { originalImageUrl, productData, imageSettings, count = 4 } = options;

            // Validate creative exists
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                throw new Error('Creative not found');
            }

            const product = productData || creative.launch.product;

            // Generate variations with different settings
            const variations = [];
            const variationSettings = this.generateVariationSettings(imageSettings);

            for (let i = 0; i < count; i++) {
                const variationSetting = variationSettings[i % variationSettings.length];
                const variation = await this.generateAdCreative(
                    originalImageUrl,
                    product,
                    variationSetting,
                    imageSettings.platform,
                    i
                );
                variations.push(variation);
            }

            // Save to database
            const savedVariations = await this.saveGeneratedImages(creativeId, variations, 'VARIATION');

            logger.info(`Generated ${variations.length} variations for creative ${creativeId}`);
            return savedVariations;

        } catch (error) {
            logger.error('Error generating variations:', error);
            throw error;
        }
    }

    async enhanceProductImages(creativeId, options) {
        try {
            const { originalImageUrl, enhancementType, style, background, mood, count = 3 } = options;

            // Validate creative exists
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                throw new Error('Creative not found');
            }

            const product = creative.launch.product;

            // Build enhancement prompt based on product details
            const enhancementPrompt = this.buildEnhancementPrompt(
                product,
                enhancementType,
                style,
                background,
                mood
            );

            // Generate enhanced images with actual product image
            const enhancedImages = [];
            for (let i = 0; i < count; i++) {
                const enhancedImage = await this.enhanceImage(originalImageUrl, enhancementPrompt, i);
                enhancedImages.push(enhancedImage);
            }

            // Save to database
            const savedImages = await this.saveGeneratedImages(creativeId, enhancedImages, 'ENHANCED');

            logger.info(`Enhanced ${enhancedImages.length} images for creative ${creativeId}`);
            return savedImages;

        } catch (error) {
            logger.error('Error enhancing product images:', error);
            throw error;
        }
    }

    async generateBackgroundVariations(creativeId, options) {
        try {
            const { originalImageUrl, style, background, mood, count = 3 } = options;

            // Validate creative exists
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                throw new Error('Creative not found');
            }

            const product = creative.launch.product;

            // Build variation prompt
            const variationPrompt = this.buildVariationPrompt(product, style, background, mood);

            // Generate background variations with actual product image
            const variations = [];
            for (let i = 0; i < count; i++) {
                const variation = await this.generateBackgroundVariation(originalImageUrl, variationPrompt, i);
                variations.push(variation);
            }

            // Save to database
            const savedVariations = await this.saveGeneratedImages(creativeId, variations, 'BACKGROUND_VARIATION');

            logger.info(`Generated ${variations.length} background variations for creative ${creativeId}`);
            return savedVariations;

        } catch (error) {
            logger.error('Error generating background variations:', error);
            throw error;
        }
    }

    async createProductMockups(creativeId, options) {
        try {
            const { originalImageUrl, style, count = 3 } = options;

            // Validate creative exists
            const creative = await prisma.adCreative.findUnique({
                where: { id: creativeId },
                include: {
                    launch: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!creative) {
                throw new Error('Creative not found');
            }

            // Build mockup prompt
            const product = creative.launch.product;
            const mockupPrompt = this.buildMockupPrompt(product, style);

            // Generate mockups with actual product image
            const mockups = [];
            for (let i = 0; i < count; i++) {
                const mockup = await this.generateMockup(originalImageUrl, mockupPrompt, i);
                mockups.push(mockup);
            }

            // Save mockups to database
            const savedMockups = await this.saveGeneratedImages(creativeId, mockups, 'MOCKUP');

            logger.info(`Created ${mockups.length} mockups for creative ${creativeId}`);
            return savedMockups;

        } catch (error) {
            logger.error('Error creating product mockups:', error);
            throw error;
        }
    }

    async getCreativeImages(creativeId) {
        try {
            const images = await prisma.creativeImage.findMany({
                where: {
                    creativeId,
                    status: 'ACTIVE'
                },
                orderBy: { createdAt: 'desc' }
            });

            return images;
        } catch (error) {
            logger.error('Error fetching creative images:', error);
            throw error;
        }
    }

    async deleteImage(imageId) {
        try {
            await prisma.creativeImage.update({
                where: { id: imageId },
                data: { status: 'DELETED' }
            });

            logger.info(`Image ${imageId} marked as deleted`);
            return { success: true };
        } catch (error) {
            logger.error('Error deleting image:', error);
            throw error;
        }
    }

    async getImageStyles() {
        // Return available styles for image enhancement
        return {
            styles: [
                { id: 'professional', name: 'Professional', description: 'Clean and business-like' },
                { id: 'lifestyle', name: 'Lifestyle', description: 'Casual and relatable' },
                { id: 'minimalist', name: 'Minimalist', description: 'Simple and clean' },
                { id: 'bold', name: 'Bold & Dynamic', description: 'Eye-catching and energetic' },
                { id: 'elegant', name: 'Elegant', description: 'Sophisticated and refined' }
            ],
            backgrounds: [
                { id: 'clean', name: 'Clean White', description: 'Pure white background' },
                { id: 'gradient', name: 'Gradient', description: 'Colorful gradient background' },
                { id: 'lifestyle', name: 'Lifestyle Scene', description: 'Real-world context' },
                { id: 'studio', name: 'Studio Setup', description: 'Professional studio lighting' },
                { id: 'nature', name: 'Nature', description: 'Natural outdoor setting' }
            ],
            enhancementTypes: [
                { id: 'enhance', name: 'Enhance Quality', description: 'Improve overall image quality' },
                { id: 'background', name: 'Change Background', description: 'Replace background' },
                { id: 'style', name: 'Apply Style', description: 'Apply artistic style' },
                { id: 'lighting', name: 'Improve Lighting', description: 'Enhance lighting and shadows' }
            ]
        };
    }

    // Generate different variation settings for variety
    generateVariationSettings(baseSettings) {
        const variations = [
            {...baseSettings, filter: 'warm', headlineColor: '#FF6B35', ctaBackground: '#FF6B35' },
            {...baseSettings, filter: 'cool', headlineColor: '#4A90E2', ctaBackground: '#4A90E2' },
            {...baseSettings, filter: 'vintage', headlineColor: '#8B4513', ctaBackground: '#8B4513' },
            {...baseSettings, filter: 'dramatic', headlineColor: '#FFD700', ctaBackground: '#000000' },
            {...baseSettings, filter: 'bright', headlineColor: '#000000', ctaBackground: '#FFD700' },
        ];
        return variations;
    }

    // Generate ad creative with actual image manipulation using the upscaler
    async generateAdCreative(originalImageUrl, product, imageSettings, platform, index) {
        try {
            // Fetch the original image
            console.log(`🔄 Fetching image from: ${originalImageUrl}`);
            const response = await fetch(originalImageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBuffer = Buffer.from(await response.arrayBuffer());
            console.log(`✅ Image fetched successfully, size: ${imageBuffer.length} bytes`);

            // Create ad creative using the upscaler
            console.log('🔄 Processing image with upscaler...');
            const result = await imageUpscaler.createAdCreative(imageBuffer, {
                aspectRatio: imageSettings.aspectRatio || '1:1',
                background: imageSettings.background || 'gradient',
                backgroundColor: imageSettings.backgroundColor || '#667eea',
                filter: imageSettings.filter || 'none',
                brightness: imageSettings.brightness || 100,
                contrast: imageSettings.contrast || 100,
                saturation: imageSettings.saturation || 100,
                blur: imageSettings.blur || 0,
                overlay: imageSettings.overlay || false,
                overlayOpacity: imageSettings.overlayOpacity || 0.3,
                quality: 95,
                format: 'jpeg',
                // Text overlay settings
                headline: imageSettings.headline || '',
                subheadline: imageSettings.subheadline || '',
                cta: imageSettings.cta || '',
                showPrice: imageSettings.showPrice || false,
                productPrice: product.price || '0',
                headlinePosition: imageSettings.headlinePosition || { x: 4, y: 4 },
                ctaPosition: imageSettings.ctaPosition || { x: 4, y: 85 },
                pricePosition: imageSettings.pricePosition || { x: 85, y: 4 },
                headlineFont: imageSettings.headlineFont || 'bold',
                headlineSize: imageSettings.headlineSize || 32,
                headlineColor: imageSettings.headlineColor || '#ffffff',
                ctaFont: imageSettings.ctaFont || 'bold',
                ctaSize: imageSettings.ctaSize || 16,
                ctaColor: imageSettings.ctaColor || '#ffffff',
                ctaBackground: imageSettings.ctaBackground || '#000000'
            });

            // For now, we'll return a data URL of the processed image
            // In production, you'd upload this to a CDN and return the URL
            const dataUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;
            console.log('✅ Image processing completed successfully!');

            return {
                url: dataUrl,
                type: 'GENERATED',
                status: 'ACTIVE',
                metadata: {
                    originalImage: originalImageUrl,
                    productId: product.id,
                    productTitle: product.title,
                    imageSettings,
                    platform,
                    variationIndex: index,
                    processedImage: {
                        width: result.width,
                        height: result.height,
                        size: result.size,
                        format: result.format
                    }
                }
            };
        } catch (error) {
            logger.error('Error generating ad creative:', error);
            console.error('❌ Upscaler failed, falling back to old method:', error.message);
            // Fallback to original method if upscaler fails
            const enhancedUrl = await this.applyImageEnhancements(
                originalImageUrl,
                imageSettings,
                product
            );

            return {
                url: enhancedUrl,
                type: 'GENERATED',
                status: 'ACTIVE',
                metadata: {
                    originalImage: originalImageUrl,
                    productId: product.id,
                    productTitle: product.title,
                    imageSettings,
                    platform,
                    variationIndex: index,
                    error: error.message
                }
            };
        }
    }

    // Apply image enhancements (fallback method)
    async applyImageEnhancements(originalImageUrl, imageSettings, product) {
        try {
            console.log('🔄 Using fallback image processing method...');

            // Try to fetch the image and process it with basic Sharp operations
            const response = await fetch(originalImageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Import Sharp dynamically to avoid issues
            const sharp = (await
                import ('sharp')).default;

            // Create a simple processed image with basic enhancements
            let processedImage = sharp(imageBuffer);

            // Apply basic adjustments
            if (imageSettings.brightness !== 100) {
                processedImage = processedImage.modulate({
                    brightness: imageSettings.brightness / 100
                });
            }

            if (imageSettings.contrast !== 100) {
                processedImage = processedImage.linear(imageSettings.contrast / 100, -(imageSettings.contrast / 100 - 1) / 2);
            }

            if (imageSettings.saturation !== 100) {
                processedImage = processedImage.modulate({
                    saturation: imageSettings.saturation / 100
                });
            }

            // Resize to aspect ratio
            const metadata = await processedImage.metadata();
            let targetWidth = metadata.width;
            let targetHeight = metadata.height;

            if (imageSettings.aspectRatio === '1:1') {
                const size = Math.max(metadata.width, metadata.height);
                targetWidth = targetHeight = size;
            }

            processedImage = processedImage.resize(targetWidth, targetHeight, {
                kernel: sharp.kernel.lanczos3,
                fit: 'cover',
                position: 'center'
            });

            // Convert to JPEG
            const processedBuffer = await processedImage
                .jpeg({ quality: 90, progressive: true })
                .toBuffer();

            console.log('✅ Fallback processing completed');

            // Return as data URL
            return `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

        } catch (error) {
            console.error('❌ Fallback processing also failed:', error.message);
            // If even the fallback fails, return the original URL
            return originalImageUrl;
        }
    }

    // Helper methods for building prompts
    buildEnhancementPrompt(product, enhancementType, style, background, mood) {
        const basePrompt = `Enhance this product image of ${product.title}`;

        let prompt = basePrompt;

        switch (enhancementType) {
            case 'enhance':
                prompt += ` with improved quality, sharpness, and color accuracy`;
                break;
            case 'background':
                prompt += ` by replacing the background with a ${background} style`;
                break;
            case 'style':
                prompt += ` applying a ${style} artistic style`;
                break;
            case 'lighting':
                prompt += ` with enhanced lighting and professional shadows`;
                break;
        }

        if (style) {
            prompt += ` in a ${style} aesthetic`;
        }

        if (mood) {
            prompt += ` with a ${mood} mood`;
        }

        prompt += `. Product category: ${product.category}, Price: $${product.price}`;

        return prompt;
    }

    buildVariationPrompt(product, style, background, mood) {
        return `Create background variations for ${product.title} (${product.category}, $${product.price}) with ${background} background in ${style} style with ${mood} mood. Generate different contextual backgrounds that showcase the product effectively.`;
    }

    buildMockupPrompt(product, style) {
        return `Create product mockups for ${product.title} (${product.category}, $${product.price}) in ${style} style. Show the product in realistic usage scenarios, packaging, or lifestyle contexts.`;
    }

    // Enhanced image generation methods that work with actual product images
    async enhanceImage(originalImageUrl, prompt, index) {
        try {
            // Fetch the original image
            const response = await fetch(originalImageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Enhance image using the upscaler
            const result = await imageUpscaler.enhanceImage(imageBuffer, {
                brightness: 1.1,
                contrast: 1.05,
                saturation: 1.1,
                sharpness: 1.2,
                quality: 95,
                format: 'jpeg'
            });

            // Return data URL of the enhanced image
            const dataUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

            return {
                url: dataUrl,
                type: 'ENHANCED',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    enhancementType: 'quality_improvement',
                    variationIndex: index,
                    processedImage: {
                        size: result.size,
                        format: result.format
                    }
                }
            };
        } catch (error) {
            logger.error('Error enhancing image:', error);
            // Fallback to original method
            const enhancedUrl = await this.applyImageEnhancements(originalImageUrl, {
                filter: 'enhanced',
                brightness: 110,
                contrast: 105,
                saturation: 110,
                blur: 0
            });

            return {
                url: enhancedUrl,
                type: 'ENHANCED',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    enhancementType: 'quality_improvement',
                    variationIndex: index,
                    error: error.message
                }
            };
        }
    }

    async generateBackgroundVariation(originalImageUrl, prompt, index) {
        try {
            // Fetch the original image
            const response = await fetch(originalImageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Apply background variations using the upscaler
            const backgrounds = ['gradient', 'solid', 'transparent'];
            const background = backgrounds[index % backgrounds.length];

            const result = await imageUpscaler.createAdCreative(imageBuffer, {
                aspectRatio: '1:1',
                background,
                backgroundColor: background === 'solid' ? '#f0f0f0' : '#667eea',
                filter: 'none',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
                quality: 95,
                format: 'jpeg'
            });

            // Return data URL of the processed image
            const dataUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

            return {
                url: dataUrl,
                type: 'VARIATION',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    variationType: 'background_change',
                    background,
                    variationIndex: index,
                    processedImage: {
                        width: result.width,
                        height: result.height,
                        size: result.size,
                        format: result.format
                    }
                }
            };
        } catch (error) {
            logger.error('Error generating background variation:', error);
            // Fallback to original method
            const enhancedUrl = await this.applyImageEnhancements(originalImageUrl, {
                background,
                filter: 'none',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0
            });

            return {
                url: enhancedUrl,
                type: 'VARIATION',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    variationType: 'background_change',
                    background,
                    variationIndex: index,
                    error: error.message
                }
            };
        }
    }

    async generateMockup(originalImageUrl, prompt, index) {
        try {
            // Fetch the original image
            const response = await fetch(originalImageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Apply mockup effects using the upscaler
            const mockupStyles = ['lifestyle', 'packaging', 'studio', 'minimal', 'bold'];
            const style = mockupStyles[index % mockupStyles.length];

            // Apply different filters based on style
            let filter = 'none';
            switch (style) {
                case 'lifestyle':
                    filter = 'warm';
                    break;
                case 'packaging':
                    filter = 'bright';
                    break;
                case 'studio':
                    filter = 'none';
                    break;
                case 'minimal':
                    filter = 'cool';
                    break;
                case 'bold':
                    filter = 'dramatic';
                    break;
            }

            const result = await imageUpscaler.createAdCreative(imageBuffer, {
                aspectRatio: '1:1',
                background: 'gradient',
                backgroundColor: '#667eea',
                filter,
                brightness: 105,
                contrast: 110,
                saturation: 105,
                blur: 0,
                quality: 95,
                format: 'jpeg'
            });

            // Return data URL of the processed image
            const dataUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

            return {
                url: dataUrl,
                type: 'MOCKUP',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    mockupType: 'lifestyle_context',
                    style,
                    variationIndex: index,
                    processedImage: {
                        width: result.width,
                        height: result.height,
                        size: result.size,
                        format: result.format
                    }
                }
            };
        } catch (error) {
            logger.error('Error generating mockup:', error);
            // Fallback to original method
            const enhancedUrl = await this.applyImageEnhancements(originalImageUrl, {
                layout: 'mockup',
                style,
                filter: 'none',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0
            });

            return {
                url: enhancedUrl,
                type: 'MOCKUP',
                status: 'ACTIVE',
                metadata: {
                    prompt,
                    originalImage: originalImageUrl,
                    mockupType: 'lifestyle_context',
                    style,
                    variationIndex: index,
                    error: error.message
                }
            };
        }
    }

    async saveGeneratedImages(creativeId, images, type) {
        try {
            const savedImages = [];

            for (const image of images) {
                const savedImage = await prisma.creativeImage.create({
                    data: {
                        creativeId,
                        imageUrl: image.url,
                        type: type,
                        status: 'ACTIVE',
                        metadata: image.metadata || {}
                    }
                });

                savedImages.push({
                    id: savedImage.id,
                    url: savedImage.imageUrl,
                    type: savedImage.type,
                    status: savedImage.status,
                    metadata: savedImage.metadata
                });
            }

            return savedImages;
        } catch (error) {
            logger.error('Error saving generated images:', error);
            throw error;
        }
    }
}

export default new ImageGenerationService();