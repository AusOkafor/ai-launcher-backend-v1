// controllers/whatsapp/chatController.js
import { sendPromptToTogether, detectIntent, extractProductDetails } from '../../utils/whatsapp/togetherClient.js';
import { tokenizeAndExpandSearchTerms, isStockQuery, isExploratoryProductQuestion, buildSearchPlan } from '../../utils/whatsapp/synonyms.js';
import { prisma } from '../../db.js';

const createSafeResponse = (content, type = 'text', products = null, buttons = null) => {
    return {
        text: content || 'I received your message',
        type,
        ...(products && { products }),
        ...(buttons && { buttons })
    };
};

async function handleProductQuery(productName, workspaceId, options = {}) {
    try {
        if (!productName) {
            throw new Error('No product name provided');
        }

        const tokens = tokenizeAndExpandSearchTerms(productName);
        const requireInStock = Boolean(options.requireInStock);
        const attributes = extractAttributes(productName);
        console.log('[ProductSearch] Tokens:', tokens, 'ProductName:', productName, 'Attributes:', attributes);

        // Build attribute-aware OR conditions
        let attributeConditions = [];
        if (attributes.length > 0) {
            attributeConditions = [
                ...attributes.map(attr => ({ title: { contains: attr, mode: 'insensitive' } })),
                ...attributes.map(attr => ({ description: { contains: attr, mode: 'insensitive' } }))
            ];
        }

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    ...attributeConditions,
                    ...tokens.map(t => ({ title: { contains: t, mode: 'insensitive' } })),
                    ...tokens.map(t => ({ description: { contains: t, mode: 'insensitive' } }))
                ],
                status: 'ACTIVE',
                store: {
                    workspaceId: workspaceId
                },
                ...(requireInStock ? { variants: { some: { stock: { gt: 0 } } } } : {})
            },
            include: {
                variants: {
                    orderBy: { price: 'asc' }
                },
                productVariants: {
                    orderBy: { price: 'asc' }
                }
            },
            take: 3
        });

        console.log('[ProductSearch] Initial products found:', products.length);

        if (!products || products.length === 0) {
            // Fallback to broader keyword search
            const fallback = await searchProductsByKeyword(productName, workspaceId);
            console.log('[ProductSearch] Fallback keyword search found:', fallback.length);
            if (!fallback || fallback.length === 0) {
                return {
                    text: `No products found matching "${productName}"`,
                    products: []
                };
            }
            const formattedFallback = fallback.map(product => formatProductForResponse(product));
            return {
                text: `Found ${formattedFallback.length} product(s) matching "${productName}":`,
                products: formattedFallback
            };
        }

        // Format products with proper image handling
        const formattedProducts = products.map(product => formatProductForResponse(product));

        return {
            text: formatTextResponse(products, productName),
            products: formattedProducts
        };

    } catch (error) {
        console.error('Product search failed:', error);
        return {
            text: 'Error searching for products',
            products: [],
            error: error.message
        };
    }
}

function formatProductForResponse(product) {
    const variants = product.variants || product.productVariants || [];
    return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: variants.length > 0 ? variants[0].price : (product.price || 0),
        image: product.images && product.images[0] ? product.images[0] : null,
        variants: variants.map(variant => ({
            id: variant.id,
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku
        })),
        url: `/products/${product.id}`
    };
}

function formatTextResponse(products, searchQuery) {
    if (!products || products.length === 0) {
        return `No products found matching "${searchQuery}"`;
    }

    const header = searchQuery ? `Found ${products.length} product(s) matching "${searchQuery}":` : `Here are some options:`;
    let response = header + `\n\n`;

    products.forEach(product => {
        response += `🛍️ ${product.title}`;

        // Use first variant price if available, otherwise product price
        const variants = product.variants || product.productVariants || [];
        const price = variants.length > 0 ? variants[0].price : product.price;
        if (price) {
            response += ` - $${price.toFixed(2)}`;
        }

        if (variants.length > 0) {
            response += `\nOptions:`;
            variants.forEach(variant => {
                response += `\n  • ${variant.name} - $${variant.price.toFixed(2)}`;
                if (variant.stock <= 0) response += ' (Out of stock)';
                else if (variant.stock < 5) response += ` (Only ${variant.stock} left)`;
            });
        }

        response += '\n';
    });

    return response;
}

// Generic attribute extraction from user message
function extractAttributes(message) {
    const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'are', 'was', 'were', 'can', 'will', 'you', 'your', 'our', 'their', 'his', 'her', 'its', 'but', 'not', 'all', 'any', 'out', 'get', 'got', 'buy', 'want', 'show', 'see', 'in', 'on', 'to', 'of', 'a', 'an', 'is', 'at', 'by', 'as', 'it', 'or', 'be', 'do', 'does', 'did', 'me', 'we', 'us', 'i', 'my', 'mine', 'yours', 'ours', 'they', 'them', 'he', 'she', 'who', 'what', 'which', 'where', 'when', 'how', 'why', 'so', 'if', 'then', 'than', 'just', 'about', 'up', 'down', 'over', 'under', 'again', 'more', 'most', 'some', 'such', 'no', 'nor', 'too', 'very', 'also', 'only', 'own', 'same', 's', 't', 'can', 'will', 'don', 'should', 'now']);
    return message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
}

async function searchProductsByKeyword(message, workspaceId) {
    return await prisma.product.findMany({
        where: {
            OR: [
                { title: { contains: message, mode: 'insensitive' } },
                { description: { contains: message, mode: 'insensitive' } }
            ],
            status: 'ACTIVE',
            store: {
                workspaceId: workspaceId
            }
        },
        include: {
            variants: { orderBy: { price: 'asc' } },
            productVariants: { orderBy: { price: 'asc' } }
        },
        take: 3
    });
}

async function handleGeneralQuery(message, workspaceId) {
    try {
        // Fallback to product search
        const products = await prisma.product.findMany({
            where: {
                store: {
                    workspaceId: workspaceId
                },
                OR: [
                    { title: { contains: message, mode: 'insensitive' } },
                    { description: { contains: message, mode: 'insensitive' } }
                ]
            },
            include: {
                variants: { orderBy: { price: 'asc' } },
                productVariants: { orderBy: { price: 'asc' } }
            },
            take: 3
        });

        if (products.length > 0) {
            const formattedProducts = products.map(product => formatProductForResponse(product));

            return {
                text: `I found these products:\n` +
                    formattedProducts
                    .map(p => `• ${p.title}${p.price ? ` - $${p.price}` : ''}`)
                        .join('\n') +
                    `\n\nHow can I help with these?`,
                products: formattedProducts,
                buttons: ["See more", "Refine search"]
            };
        }

        // Ultimate fallback
        return {
            text: `I'm here to help with shopping and orders. Try asking about products or order status.`
        };
    } catch (error) {
        console.error('Fallback search error:', error);
        return {
            text: `I'm here to help with shopping and orders. Try asking about products or order status.`
        };
    }
}

async function routeMessage(message, sessionId, chatbotId, workspaceId) {
    // Initialize base context
    const context = {
        chatbotId,
        sessionId,
        workspaceId,
        lastProduct: null,
        lastIntent: null
    };

    try {
        // Validate input
        if (!message || typeof message !== 'string') {
            return {
                reply: createSafeResponse('Please provide a valid message', 'error'),
                context
            };
        }

        // Intent-based routing
        try {
            const intent = await detectIntent(message);
            console.log(`DEBUG: Message "${message}" detected as intent: "${intent}"`);
            
            switch(intent) {
                case 'product_search': {
                    // Use AI-assisted extraction to understand product intent and attributes
                    let productName = '';
                    let attributes = [];
                    try {
                        const extracted = await extractProductDetails(message);
                        productName = (extracted && extracted.productName ? extracted.productName : '').trim();
                        attributes = Array.isArray(extracted && extracted.attributes) ? extracted.attributes : [];
                    } catch (_) {}

                    // Heuristic fallback extraction
                    if (!productName) {
                        try {
                            const lower = message.toLowerCase();
                            const phrases = [
                                { key: 'want to buy ', len: 'want to buy '.length },
                                { key: 'want to get ', len: 'want to get '.length },
                                { key: 'looking for ', len: 'looking for '.length },
                                { key: 'searching for ', len: 'searching for '.length },
                                { key: 'search for ', len: 'search for '.length },
                                { key: 'buy ', len: 4 },
                                { key: 'get ', len: 4 }
                            ];
                            let bestIndex = -1;
                            let bestLen = 0;
                            for (const p of phrases) {
                                const idx = lower.indexOf(p.key);
                                if (idx !== -1 && idx >= 0 && idx > bestIndex) {
                                    bestIndex = idx;
                                    bestLen = p.len;
                                }
                            }
                            if (bestIndex !== -1) {
                                productName = message.substring(bestIndex + bestLen).trim();
                            }
                            productName = productName.replace(/^(?:to|for|a|an|the)\s+/i, '').trim();
                            if (!productName && message.trim().split(/\s+/).length <= 8) {
                                productName = message.trim();
                            }
                        } catch (_) {}
                    }

                    try {
                        // Build robust search terms with anchor focusing
                        const plan = buildSearchPlan([productName, ...(attributes || []), message].filter(Boolean).join(' '));
                        const label = (plan.anchor || productName || message).trim();
                        const searchTerm = (plan.terms.join(' ') || label).trim();
                        const productResponse = await handleProductQuery(searchTerm, workspaceId, { requireInStock: plan.inStock });

                        const count = Array.isArray(productResponse.products) ? productResponse.products.length : 0;
                        const plural = label.endsWith('s') ? label : label + (count === 1 ? '' : 's');
                        const responseText = plan.inStock
                            ? (count > 0
                                ? `We currently have ${count} ${plural} in stock.`
                                : `We don't have ${plural} in stock right now.`)
                            : (count > 0
                                ? `Found ${count} product(s) matching "${label}":`
                                : `No products found matching "${label}"`);

                        return {
                            reply: createSafeResponse(
                                responseText,
                                'product_results',
                                productResponse.products
                            ),
                            context: {
                                ...context,
                                lastProduct: label,
                                lastIntent: plan.inStock ? 'stock_query' : 'product_search'
                            }
                        };
                    } catch (error) {
                        console.error('Product search error:', error);
                        return {
                            reply: createSafeResponse('Error searching for products', 'error'),
                            context
                        };
                    }
                }
                
                case 'general_question':
                default: {
                    const generalResponse = await handleGeneralQuery(message, workspaceId);
                    return {
                        reply: createSafeResponse(
                            generalResponse.text || 'How can I help you?',
                            'text',
                            generalResponse.products,
                            generalResponse.buttons
                        ),
                        context: {
                            ...context,
                            ...(generalResponse.context || {}),
                            lastIntent: 'general'
                        }
                    };
                }
            }
        } catch (error) {
            console.error('Intent handling error:', error);
            return {
                reply: createSafeResponse('Error processing your request', 'error'),
                context
            };
        }

    } catch (error) {
        console.error('Route message error:', error);
        return {
            reply: createSafeResponse('Sorry, I encountered an error', 'error'),
            context
        };
    }
}

export const handleChatMessage = async(req, res) => {
    const chatbotId = req.params.id || req.body.chatbotId;
    const { message, sessionId } = req.body;
    const workspaceId = req.workspace?.id;

    // Validate required fields
    if (!message || !sessionId || !chatbotId || !workspaceId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            code: 'MISSING_FIELDS'
        });
    }

    try {
        // Get chatbot configuration
        const chatbot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            include: { prompts: true, flows: true }
        });

        if (!chatbot) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found',
                code: 'CHATBOT_NOT_FOUND'
            });
        }

        // Process message
        const { reply, context } = await routeMessage(message, sessionId, chatbotId, workspaceId);

        // Ensure we always have a valid response
        const safeReply = {
            text: (reply && reply.text) || 'I received your message',
            type: (reply && reply.type) || 'text'
        };
        if (reply && reply.products) safeReply.products = reply.products;
        if (reply && reply.buttons) safeReply.buttons = reply.buttons;

        // --- Conversation & Message Recording ---
        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: { chatbotId, sessionId }
        });
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    chatbotId,
                    sessionId,
                    workspaceId,
                    status: 'ACTIVE'
                }
            });
        }
        
        // Save user message
        await prisma.conversationMessage.create({
            data: {
                conversationId: conversation.id,
                workspaceId,
                fromBot: false,
                content: message,
                phone: req.body.phone || null
            }
        });
        
        // Save bot reply
        await prisma.conversationMessage.create({
            data: {
                conversationId: conversation.id,
                workspaceId,
                fromBot: true,
                content: safeReply.text,
                phone: 'bot'
            }
        });
        // --- End Conversation & Message Recording ---

        return res.json({
            success: true,
            data: {
                reply: safeReply,
                context: context || {},
                conversationId: sessionId,
                sessionId,
                chatbotId,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Chat controller error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};