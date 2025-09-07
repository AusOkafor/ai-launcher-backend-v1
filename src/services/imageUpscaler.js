import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import ort from 'onnxruntime-node';

class ImageUpscaler {
    constructor() {
        this.model = null;
        this.modelPath = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // For now, we'll use a simple upscaling approach with Sharp
            // In production, you'd download the Real-ESRGAN ONNX model
            this.isInitialized = true;
            console.log('✅ Image upscaler initialized');
        } catch (error) {
            console.error('❌ Failed to initialize image upscaler:', error);
            throw error;
        }
    }

    async upscaleImage(inputBuffer, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            scale = 2,
                quality = 90,
                format = 'jpeg',
                enhance = true
        } = options;

        try {
            let image = sharp(inputBuffer);

            // Apply basic enhancements
            if (enhance) {
                image = image
                    .sharpen(1, 1, 2) // Enhance sharpness
                    .modulate({
                        brightness: 1.05, // Slightly brighter
                        saturation: 1.1, // Slightly more saturated
                        hue: 0
                    })
                    .gamma(1.1); // Slight gamma correction
            }

            // Resize with high quality
            const metadata = await image.metadata();
            const newWidth = Math.round(metadata.width * scale);
            const newHeight = Math.round(metadata.height * scale);

            image = image.resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3, // High quality resampling
                fit: 'fill'
            });

            // Apply final processing
            if (format === 'jpeg') {
                image = image.jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                });
            } else if (format === 'png') {
                image = image.png({
                    quality,
                    progressive: true
                });
            } else if (format === 'webp') {
                image = image.webp({
                    quality,
                    effort: 6
                });
            }

            const upscaledBuffer = await image.toBuffer();

            return {
                buffer: upscaledBuffer,
                width: newWidth,
                height: newHeight,
                originalWidth: metadata.width,
                originalHeight: metadata.height,
                scale,
                format,
                size: upscaledBuffer.length
            };
        } catch (error) {
            console.error('❌ Image upscaling failed:', error);
            throw new Error(`Failed to upscale image: ${error.message}`);
        }
    }

    async upscaleFromUrl(imageUrl, options = {}) {
        try {
            // Fetch image from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            return await this.upscaleImage(Buffer.from(buffer), options);
        } catch (error) {
            console.error('❌ Failed to upscale from URL:', error);
            throw error;
        }
    }

    async enhanceImage(inputBuffer, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            brightness = 1.0,
                contrast = 1.0,
                saturation = 1.0,
                sharpness = 1.0,
                quality = 90,
                format = 'jpeg'
        } = options;

        try {
            let image = sharp(inputBuffer);

            // Apply enhancements
            image = image
                .modulate({
                    brightness,
                    saturation,
                    hue: 0
                })
                .linear(contrast, -(contrast - 1) / 2) // Contrast adjustment
                .sharpen(sharpness, 1, 2); // Sharpness adjustment

            // Apply final processing
            if (format === 'jpeg') {
                image = image.jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                });
            } else if (format === 'png') {
                image = image.png({
                    quality,
                    progressive: true
                });
            } else if (format === 'webp') {
                image = image.webp({
                    quality,
                    effort: 6
                });
            }

            const enhancedBuffer = await image.toBuffer();

            return {
                buffer: enhancedBuffer,
                format,
                size: enhancedBuffer.length
            };
        } catch (error) {
            console.error('❌ Image enhancement failed:', error);
            throw new Error(`Failed to enhance image: ${error.message}`);
        }
    }

    async applyFilter(inputBuffer, filterType, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            intensity = 0.5,
                quality = 90,
                format = 'jpeg'
        } = options;

        try {
            let image = sharp(inputBuffer);

            switch (filterType) {
                case 'warm':
                    image = image.modulate({
                        brightness: 1.0,
                        saturation: 1.2,
                        hue: 15
                    }).gamma(1.1);
                    break;

                case 'cool':
                    image = image.modulate({
                        brightness: 1.0,
                        saturation: 1.1,
                        hue: -15
                    }).gamma(0.95);
                    break;

                case 'vintage':
                    image = image
                        .modulate({
                            brightness: 0.9,
                            saturation: 0.8,
                            hue: 0
                        })
                        .gamma(1.2)
                        .tint({ r: 255, g: 240, b: 220 });
                    break;

                case 'dramatic':
                    image = image
                        .modulate({
                            brightness: 0.8,
                            saturation: 1.3,
                            hue: 0
                        })
                        .gamma(1.3)
                        .sharpen(2, 1, 3);
                    break;

                case 'bright':
                    image = image
                        .modulate({
                            brightness: 1.2,
                            saturation: 1.1,
                            hue: 0
                        })
                        .gamma(1.1)
                        .sharpen(1.5, 1, 2);
                    break;

                default:
                    // No filter applied
                    break;
            }

            // Apply final processing
            if (format === 'jpeg') {
                image = image.jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                });
            } else if (format === 'png') {
                image = image.png({
                    quality,
                    progressive: true
                });
            } else if (format === 'webp') {
                image = image.webp({
                    quality,
                    effort: 6
                });
            }

            const filteredBuffer = await image.toBuffer();

            return {
                buffer: filteredBuffer,
                filter: filterType,
                format,
                size: filteredBuffer.length
            };
        } catch (error) {
            console.error('❌ Filter application failed:', error);
            throw new Error(`Failed to apply filter: ${error.message}`);
        }
    }

        async createAdCreative(inputBuffer, settings = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            aspectRatio = '1:1',
            background = 'gradient',
            backgroundColor = '#667eea',
            backgroundGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            filter = 'none',
            brightness = 100,
            contrast = 100,
            saturation = 100,
            blur = 0,
            overlay = false,
            overlayOpacity = 0.3,
            quality = 90,
            format = 'jpeg',
            // Text overlay settings
            headline = '',
            subheadline = '',
            cta = '',
            showPrice = false,
            productPrice = '0',
            headlinePosition = { x: 4, y: 4 },
            ctaPosition = { x: 4, y: 85 },
            pricePosition = { x: 85, y: 4 },
            headlineFont = 'bold',
            headlineSize = 32,
            headlineColor = '#ffffff',
            ctaFont = 'bold',
            ctaSize = 16,
            ctaColor = '#ffffff',
            ctaBackground = '#000000'
        } = settings;

        try {
            // Get image metadata
            const metadata = await sharp(inputBuffer).metadata();

            // Calculate target dimensions based on aspect ratio
            let targetWidth, targetHeight;
            const [ratioW, ratioH] = aspectRatio.split(':').map(Number);

            if (ratioW === ratioH) {
                // Square
                targetWidth = targetHeight = Math.max(metadata.width, metadata.height);
            } else if (ratioW > ratioH) {
                // Landscape
                targetWidth = metadata.width;
                targetHeight = Math.round((targetWidth * ratioH) / ratioW);
            } else {
                // Portrait
                targetHeight = metadata.height;
                targetWidth = Math.round((targetHeight * ratioW) / ratioH);
            }

            // Create background
            let backgroundImage;
            if (background === 'gradient') {
                // Create a gradient background using SVG
                const gradientSvg = `
                    <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grad)"/>
                    </svg>
                `;
                backgroundImage = sharp(Buffer.from(gradientSvg));
            } else if (background === 'solid') {
                const color = backgroundColor.startsWith('#') ? backgroundColor : '#667eea';
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                backgroundImage = sharp({
                    create: {
                        width: targetWidth,
                        height: targetHeight,
                        channels: 4,
                        background: { r, g, b, alpha: 1 }
                    }
                });
            } else {
                // Transparent background
                backgroundImage = sharp({
                    create: {
                        width: targetWidth,
                        height: targetHeight,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
                });
            }

            // Process main image
            let mainImage = sharp(inputBuffer)
                .resize(targetWidth, targetHeight, {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'cover',
                    position: 'center'
                });

            // Apply filters and effects
            if (filter !== 'none') {
                mainImage = await this.applyFilter(await mainImage.toBuffer(), filter, { quality, format });
                mainImage = sharp(mainImage.buffer);
            }

            // Apply adjustments
            mainImage = mainImage
                .modulate({
                    brightness: brightness / 100,
                    saturation: saturation / 100
                })
                .linear(contrast / 100, -(contrast / 100 - 1) / 2);

            if (blur > 0) {
                mainImage = mainImage.blur(blur);
            }

            // Create text overlays if provided
            const textOverlays = [];
            
            // Headline overlay
            if (headline) {
                const headlineSvg = `
                    <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
                        <text 
                            x="${headlinePosition.x}%" 
                            y="${headlinePosition.y}%" 
                            font-family="Arial, sans-serif" 
                            font-size="${headlineSize}" 
                            font-weight="${headlineFont === 'bold' ? '700' : headlineFont === 'semibold' ? '600' : '500'}" 
                            fill="${headlineColor}"
                            text-anchor="start"
                            dominant-baseline="hanging"
                            filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.8))"
                        >
                            ${headline}
                        </text>
                    </svg>
                `;
                textOverlays.push({
                    input: Buffer.from(headlineSvg),
                    top: 0,
                    left: 0
                });
            }

            // CTA overlay
            if (cta) {
                const ctaSvg = `
                    <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
                        <rect 
                            x="${ctaPosition.x}%" 
                            y="${ctaPosition.y}%" 
                            width="200" 
                            height="50" 
                            rx="25" 
                            fill="${ctaBackground}"
                            opacity="0.9"
                        />
                        <text 
                            x="${ctaPosition.x + 10}%" 
                            y="${ctaPosition.y + 3}%" 
                            font-family="Arial, sans-serif" 
                            font-size="${ctaSize}" 
                            font-weight="${ctaFont === 'bold' ? '700' : ctaFont === 'semibold' ? '600' : '500'}" 
                            fill="${ctaColor}"
                            text-anchor="start"
                            dominant-baseline="hanging"
                        >
                            ${cta}
                        </text>
                    </svg>
                `;
                textOverlays.push({
                    input: Buffer.from(ctaSvg),
                    top: 0,
                    left: 0
                });
            }

            // Price overlay
            if (showPrice && productPrice) {
                const priceSvg = `
                    <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
                        <rect 
                            x="${pricePosition.x - 5}%" 
                            y="${pricePosition.y}%" 
                            width="100" 
                            height="40" 
                            rx="20" 
                            fill="rgba(255,255,255,0.95)"
                            stroke="#e0e0e0"
                            stroke-width="1"
                        />
                        <text 
                            x="${pricePosition.x}%" 
                            y="${pricePosition.y + 2}%" 
                            font-family="Arial, sans-serif" 
                            font-size="18" 
                            font-weight="700" 
                            fill="#000000"
                            text-anchor="start"
                            dominant-baseline="hanging"
                        >
                            $${productPrice}
                        </text>
                    </svg>
                `;
                textOverlays.push({
                    input: Buffer.from(priceSvg),
                    top: 0,
                    left: 0
                });
            }

            // Composite images with text overlays
            const composite = await backgroundImage
                .composite([
                    {
                        input: await mainImage.toBuffer(),
                        top: 0,
                        left: 0
                    },
                    ...textOverlays
                ])
                .jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();

            return {
                buffer: composite,
                width: targetWidth,
                height: targetHeight,
                aspectRatio,
                filter,
                format: 'jpeg',
                size: composite.length
            };
        } catch (error) {
            console.error('❌ Ad creative creation failed:', error);
            throw new Error(`Failed to create ad creative: ${error.message}`);
        }
    }
}

// Create singleton instance
const imageUpscaler = new ImageUpscaler();

export default imageUpscaler;