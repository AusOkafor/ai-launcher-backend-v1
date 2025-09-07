import { prisma } from '../../db.js'

export const getAllConversations = async(filters, pagination) => {
    const { status, search } = filters
    const { limit, offset } = pagination

    const where = {
        ...(status && status !== 'all' ? { status } : {}),
        ...(search && {
            OR: [
                { sessionId: { contains: search, mode: 'insensitive' } },
                { messages: { some: { content: { contains: search, mode: 'insensitive' } } } }
            ]
        })
    }

    try {
        const conversations = await prisma.conversation.findMany({
            where,
            skip: offset,
            take: limit,
            include: {
                chatbot: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        fromBot: true,
                        timestamp: true
                    }
                },
                _count: {
                    select: {
                        messages: true
                    }
                }
            },
            orderBy: { lastActiveAt: 'desc' }
        })

        const total = await prisma.conversation.count({ where })

        return {
            data: conversations,
            total,
            limit,
            offset
        }
    } catch (error) {
        console.error('Error fetching conversations:', error)
        return {
            data: [],
            total: 0,
            limit,
            offset
        }
    }
}

export const getConversationById = async(id) => {
    return await prisma.conversation.findUnique({
        where: { id },
        include: {
            chatbot: {
                select: {
                    id: true,
                    name: true,
                    type: true
                }
            },
            messages: {
                orderBy: { timestamp: 'asc' }
            }
        }
    })
}

export const addMessageToConversation = async(conversationId, messageData) => {
    const { fromBot, content, phone, userId, workspaceId } = messageData

    return await prisma.conversationMessage.create({
        data: {
            fromBot,
            content,
            phone,
            conversationId,
            workspaceId
        }
    })
}

export const updateConversationStatus = async(id, status) => {
    return await prisma.conversation.update({
        where: { id },
        data: { status }
    })
}

export const getConversationsForExport = async(workspaceId) => {
    return await prisma.conversation.findMany({
        where: { workspaceId },
        include: {
            chatbot: {
                select: {
                    name: true
                }
            },
            messages: {
                orderBy: { timestamp: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export default {
    getAllConversations,
    getConversationById,
    addMessageToConversation,
    updateConversationStatus,
    getConversationsForExport
}
