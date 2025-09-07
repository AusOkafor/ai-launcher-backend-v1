// services/whatsapp/facetsService.js
import { prisma } from '../../db.js'

// Returns top tag facets (subtypes) with counts for a workspace, optionally filtered by tokens
export async function getTopTagFacets(workspaceId, tokens = [], limit = 5) {
    // Simple approach: fetch candidate products and aggregate tags in memory
    const where = {
        store: {
            workspaceId: workspaceId
        },
        status: 'ACTIVE',
        ...(tokens.length > 0 ?
            {
                OR: [
                    { tags: { hasSome: tokens } },
                    ...tokens.map(t => ({ title: { contains: t, mode: 'insensitive' } })),
                    ...tokens.map(t => ({ description: { contains: t, mode: 'insensitive' } }))
                ]
            } :
            {})
    }

    const products = await prisma.product.findMany({ where, take: 200 })
    const counts = new Map()
    for (const p of products) {
        const tags = Array.isArray(p.tags) ? p.tags : []
        for (const tag of tags) {
            const key = (tag || '').toLowerCase()
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
        }
    }

    const facets = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }))

    return facets
}

export default {
    getTopTagFacets
}