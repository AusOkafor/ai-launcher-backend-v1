import { prisma } from '../../db.js';

const getConversations = async(req, res, next) => {
    try {
        const { status, search } = req.query;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const workspaceId = req.workspace ? .id;

        if (!workspaceId) {
            return res.status(401).json({
                success: false,
                message: 'Workspace access required',
            });
        }

        const where = {
            workspaceId,
            ...(status && { status }),
            ...(search && {
                OR: [
                    { sessionId: { contains: search, mode: 'insensitive' } },
                    { messages: { some: { content: { contains: search, mode: 'insensitive' } } } }
                ]
            })
        };

        const [conversations, total] = await Promise.all([
            prisma.conversation.findMany({
                where,
                include: {
                    chatbot: {
                        select: { id: true, name: true }
                    },
                    messages: {
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: { messages: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.conversation.count({ where })
        ]);

        res.json({
            success: true,
            data: conversations,
            pagination: {
                total,
                limit,
                offset,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getConversation = async(req, res, next) => {
    try {
        const workspaceId = req.workspace ? .id;
        const { id } = req.params;

        if (!workspaceId) {
            return res.status(401).json({
                success: false,
                message: 'Workspace access required',
            });
        }

        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                workspaceId
            },
            include: {
                chatbot: {
                    select: { id: true, name: true, type: true }
                },
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        res.json({
            success: true,
            data: conversation,
        });
    } catch (error) {
        next(error);
    }
};

const addMessage = async(req, res, next) => {
    try {
        const { fromBot, content, phone } = req.body;
        const workspaceId = req.workspace ? .id;
        const { id } = req.params;

        if (!workspaceId) {
            return res.status(401).json({
                success: false,
                message: 'Workspace access required',
            });
        }

        // Verify conversation belongs to workspace
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                workspaceId
            }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        const message = await prisma.conversationMessage.create({
            data: {
                conversationId: id,
                workspaceId,
                fromBot,
                content,
                phone
            }
        });

        res.status(201).json({
            success: true,
            data: message,
        });
    } catch (error) {
        next(error);
    }
};

const updateStatus = async(req, res, next) => {
    try {
        const { status } = req.body;
        const workspaceId = req.workspace ? .id;
        const { id } = req.params;

        if (!workspaceId) {
            return res.status(401).json({
                success: false,
                message: 'Workspace access required',
            });
        }

        // Verify conversation belongs to workspace
        const existingConversation = await prisma.conversation.findFirst({
            where: {
                id,
                workspaceId
            }
        });

        if (!existingConversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        const updatedConversation = await prisma.conversation.update({
            where: { id },
            data: { status }
        });

        res.json({
            success: true,
            data: updatedConversation,
        });
    } catch (error) {
        next(error);
    }
};

const exportConversations = async(req, res, next) => {
    try {
        const format = req.query.format || 'json';
        const workspaceId = req.workspace ? .id;

        if (!workspaceId) {
            return res.status(401).json({
                success: false,
                message: 'Workspace access required',
            });
        }

        const conversations = await prisma.conversation.findMany({
            where: { workspaceId },
            include: {
                chatbot: {
                    select: { id: true, name: true, type: true }
                },
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (format === 'csv') {
            // Simple CSV export - you might want to use a proper CSV library
            const csvHeaders = 'ConversationId,ChatbotName,SessionId,Status,CreatedAt,MessageCount\n';
            const csvData = conversations.map(conv =>
                `${conv.id},${conv.chatbot.name},${conv.sessionId},${conv.status},${conv.createdAt.toISOString()},${conv.messages.length}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');
            return res.send(csvHeaders + csvData);
        }

        res.json({
            success: true,
            data: conversations,
        });
    } catch (error) {
        next(error);
    }
};

export {
    getConversations,
    getConversation,
    addMessage,
    updateStatus,
    exportConversations,
};