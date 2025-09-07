import { prisma } from '../../db.js';

export const getChatbots = async(req, res) => {
    try {
        // Validate workspace
        if (!req.workspace ? .id) {
            return res.status(401).json({
                success: false,
                error: "Workspace access required"
            });
        }

        // Validate type parameter
        const { type } = req.query;
        if (type && !['FLOW', 'PROMPT'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: "Invalid type parameter. Must be 'FLOW' or 'PROMPT'"
            });
        }

        // Build query safely
        const where = {
            workspaceId: req.workspace.id,
            ...(type && { type })
        };

        // Get chatbots with transaction
        const chatbots = await prisma.$transaction(async(tx) => {
            const bots = await tx.chatbot.findMany({
                where,
                include: {
                    prompts: true,
                    flows: true,
                    _count: { select: { conversations: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Add stats safely
            return Promise.all(
                bots.map(async(bot) => {
                    let accuracy = null;
                    if (bot._count.conversations > 0) {
                        const { _avg } = await tx.conversation.aggregate({
                            where: { chatbotId: bot.id },
                            _avg: { accuracy: true }
                        });
                        accuracy = _avg.accuracy;
                    }

                    return {
                        ...bot,
                        accuracy,
                        totalConversations: bot._count.conversations,
                        createdAt: bot.createdAt.toISOString(),
                        updatedAt: bot.updatedAt.toISOString()
                    };
                })
            );
        });

        res.json({ success: true, data: chatbots });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            error: 'Database operation failed',
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
                stack: err.stack
            })
        });
    }
};

export const getChatbotStats = async(req, res) => {
    try {
        // Validate workspace
        if (!req.workspace ? .id) {
            return res.status(401).json({
                success: false,
                error: "Workspace access required"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await prisma.$transaction(async(tx) => {
            const [totalBots, activeBots, conversationsToday, avgAccuracy] = await Promise.all([
                tx.chatbot.count({ where: { workspaceId: req.workspace.id } }),
                tx.chatbot.count({ where: { workspaceId: req.workspace.id, isActive: true } }),
                tx.conversation.count({
                    where: {
                        chatbot: { workspaceId: req.workspace.id },
                        createdAt: { gte: today }
                    }
                }),
                tx.conversation.aggregate({
                    where: { chatbot: { workspaceId: req.workspace.id } },
                    _avg: { accuracy: true }
                })
            ]);

            return {
                totalBots,
                activeBots,
                conversationsToday,
                averageAccuracy: avgAccuracy._avg.accuracy || 0
            };
        });

        res.json({ success: true, data: stats });

    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to compute stats',
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message
            })
        });
    }
};

export const createChatbot = async(req, res) => {
    try {
        // Debug: Log the incoming workspace
        console.log('Authenticated Workspace:', req.workspace);

        if (!req.workspace ? .id) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized - Missing workspace ID"
            });
        }

        const { name, type } = req.body;
        const chatbot = await prisma.chatbot.create({
            data: {
                workspaceId: req.workspace.id,
                name,
                type
            }
        });

        res.status(201).json({ success: true, data: chatbot });
    } catch (err) {
        console.error('Chatbot creation error:', err);
        if (err.code === 'P2002') { // Unique constraint violation
            return res.status(409).json({
                success: false,
                error: "Chatbot name already exists"
            });
        }
        res.status(500).json({
            success: false,
            error: "Database error",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    };
}

export const getChatbot = async(req, res) => {
    try {
        const workspaceId = req.workspace.id;
        const { id } = req.params;

        const chatbot = await prisma.chatbot.findUnique({
            where: { id },
            include: {
                prompts: true,
                flows: { orderBy: { order: 'asc' } },
                conversations: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!chatbot || chatbot.workspaceId !== workspaceId) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...chatbot,
                createdAt: chatbot.createdAt.toISOString(),
                updatedAt: chatbot.updatedAt.toISOString(),
                flows: chatbot.flows.map(flow => ({
                    ...flow,
                    createdAt: flow.createdAt.toISOString()
                })),
                conversations: chatbot.conversations.map(conv => ({
                    ...conv,
                    createdAt: conv.createdAt.toISOString()
                }))
            }
        });
    } catch (err) {
        console.error('Error fetching chatbot:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chatbot',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const updateChatbot = async(req, res) => {
    try {
        const workspaceId = req.workspace.id;
        const { id } = req.params;
        const { name, isActive } = req.body;

        const chatbot = await prisma.chatbot.findUnique({
            where: { id }
        });

        if (!chatbot || chatbot.workspaceId !== workspaceId) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found'
            });
        }

        const updatedChatbot = await prisma.chatbot.update({
            where: { id },
            data: { name, isActive }
        });

        res.json({
            success: true,
            data: {
                ...updatedChatbot,
                createdAt: updatedChatbot.createdAt.toISOString(),
                updatedAt: updatedChatbot.updatedAt.toISOString()
            }
        });
    } catch (err) {
        console.error('Error updating chatbot:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update chatbot',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const deleteChatbot = async(req, res) => {
    try {
        const workspaceId = req.workspace.id;
        const { id } = req.params;

        const chatbot = await prisma.chatbot.findUnique({
            where: { id }
        });

        if (!chatbot || chatbot.workspaceId !== workspaceId) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found'
            });
        }

        await prisma.chatbot.delete({ where: { id } });

        res.status(204).end();
    } catch (err) {
        console.error('Error deleting chatbot:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete chatbot',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const savePromptConfig = async(req, res) => {
    try {
        const { id: chatbotId } = req.params;
        const { prompt, model, temperature = 0.7 } = req.body;

        // 1. Get existing prompt (if any)
        const currentPrompt = await prisma.promptBot.findUnique({
            where: { chatbotId }
        });

        // 2. Upsert main prompt
        const updatedPrompt = await prisma.promptBot.upsert({
            where: { chatbotId },
            update: { prompt, modelUsed: model, temperature },
            create: { chatbotId, prompt, modelUsed: model, temperature }
        });

        // 3. Create version if prompt changed
        if (currentPrompt ? .prompt !== prompt) {
            await prisma.promptVersion.create({
                data: {
                    prompt: currentPrompt ? .prompt || "[initial]",
                    modelUsed: currentPrompt ? .modelUsed || model,
                    promptBotId: updatedPrompt.id
                }
            });
        }

        res.json({
            success: true,
            data: updatedPrompt
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Failed to save prompt"
        });
    }
};

export const getFlowNodes = async(req, res) => {
    try {
        const workspaceId = req.workspace.id;
        const { id } = req.params;

        const chatbot = await prisma.chatbot.findUnique({
            where: { id }
        });

        if (!chatbot || chatbot.workspaceId !== workspaceId || chatbot.type !== 'FLOW') {
            return res.status(404).json({
                success: false,
                error: 'Flow chatbot not found'
            });
        }

        const flows = await prisma.flowNode.findMany({
            where: { chatbotId: id },
            orderBy: { order: 'asc' }
        });

        res.json({
            success: true,
            data: flows.map(flow => ({
                ...flow,
                createdAt: flow.createdAt.toISOString()
            }))
        });
    } catch (err) {
        console.error('Error fetching flow nodes:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch flow nodes',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const saveFlowNode = async(req, res) => {
    try {
        const workspaceId = req.workspace.id;
        const { id } = req.params;
        const { title, message, options, order } = req.body;

        const chatbot = await prisma.chatbot.findUnique({
            where: { id }
        });

        if (!chatbot || chatbot.workspaceId !== workspaceId || chatbot.type !== 'FLOW') {
            return res.status(404).json({
                success: false,
                error: 'Flow chatbot not found'
            });
        }

        const flowNode = await prisma.flowNode.create({
            data: {
                chatbotId: id,
                title,
                message,
                options,
                order: order || 0
            }
        });

        res.status(201).json({
            success: true,
            data: {
                ...flowNode,
                createdAt: flowNode.createdAt.toISOString()
            }
        });
    } catch (err) {
        console.error('Error saving flow node:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to save flow node',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};