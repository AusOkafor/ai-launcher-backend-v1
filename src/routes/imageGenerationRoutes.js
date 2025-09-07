import express from 'express';
import imageGenerationService from '../services/imageGenerationService.js';
import { prisma } from '../db.js';

const router = express.Router();

// Create comprehensive ad creatives with text overlays and effects
router.post('/creative/:creativeId/create-ad-creative', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const { originalImageUrl, productData, imageSettings, platform, count } = req.body;

        if (!originalImageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Original image URL is required' }
            });
        }

        const adCreatives = await imageGenerationService.createAdCreative(creativeId, {
            originalImageUrl,
            productData,
            imageSettings,
            platform,
            count
        });

        res.json({
            success: true,
            data: { images: adCreatives },
            message: 'Ad creatives created successfully'
        });

    } catch (error) {
        console.error('Error creating ad creatives:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to create ad creatives' }
        });
    }
});

// Generate variations with different settings
router.post('/creative/:creativeId/generate-variations', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const { originalImageUrl, productData, imageSettings, count } = req.body;

        if (!originalImageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Original image URL is required' }
            });
        }

        const variations = await imageGenerationService.generateVariations(creativeId, {
            originalImageUrl,
            productData,
            imageSettings,
            count
        });

        res.json({
            success: true,
            data: { images: variations },
            message: 'Variations generated successfully'
        });

    } catch (error) {
        console.error('Error generating variations:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to generate variations' }
        });
    }
});

// Enhance existing product images
router.post('/creative/:creativeId/enhance-images', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const { originalImageUrl, enhancementType, style, background, mood, count } = req.body;

        if (!originalImageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Original image URL is required' }
            });
        }

        const enhancedImages = await imageGenerationService.enhanceProductImages(creativeId, {
            originalImageUrl,
            enhancementType,
            style,
            background,
            mood,
            count
        });

        res.json({
            success: true,
            data: { images: enhancedImages },
            message: 'Images enhanced successfully'
        });

    } catch (error) {
        console.error('Error enhancing images:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to enhance images' }
        });
    }
});

// Generate background variations for product images
router.post('/creative/:creativeId/background-variations', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const { originalImageUrl, style, background, mood, count } = req.body;

        if (!originalImageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Original image URL is required' }
            });
        }

        const variations = await imageGenerationService.generateBackgroundVariations(creativeId, {
            originalImageUrl,
            style,
            background,
            mood,
            count
        });

        res.json({
            success: true,
            data: { images: variations },
            message: 'Background variations generated successfully'
        });

    } catch (error) {
        console.error('Error generating background variations:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to generate background variations' }
        });
    }
});

// Create product mockups
router.post('/creative/:creativeId/mockups', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const { originalImageUrl, style, count } = req.body;

        if (!originalImageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Original image URL is required' }
            });
        }

        const mockups = await imageGenerationService.createProductMockups(creativeId, {
            originalImageUrl,
            style,
            count
        });

        res.json({
            success: true,
            data: { images: mockups },
            message: 'Product mockups created successfully'
        });

    } catch (error) {
        console.error('Error creating mockups:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to create mockups' }
        });
    }
});

// Get available image styles and options
router.get('/styles', async(req, res) => {
    try {
        const styles = await imageGenerationService.getImageStyles();

        res.json({
            success: true,
            data: styles,
            message: 'Image styles retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching image styles:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to fetch image styles' }
        });
    }
});

// Get all images for a creative
router.get('/creative/:creativeId/images', async(req, res) => {
    try {
        const { creativeId } = req.params;
        const images = await imageGenerationService.getCreativeImages(creativeId);

        res.json({
            success: true,
            data: { images },
            message: 'Creative images retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching creative images:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to fetch creative images' }
        });
    }
});

// Delete an image
router.delete('/image/:imageId', async(req, res) => {
    try {
        const { imageId } = req.params;
        await imageGenerationService.deleteImage(imageId);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to delete image' }
        });
    }
});

export default router;