// utils/whatsapp/synonyms.js

export const tokenizeAndExpandSearchTerms = (message) => {
    if (!message || typeof message !== 'string') return []

    const tokens = message.toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token => token.length > 2)

    const expanded = new Set()

    tokens.forEach(token => {
        expanded.add(token)

        // Add synonyms
        const synonyms = getSynonyms(token)
        synonyms.forEach(synonym => expanded.add(synonym))
    })

    return Array.from(expanded)
}

export const isStockQuery = (message) => {
    const stockKeywords = ['in stock', 'available', 'stock', 'inventory', 'have']
    return stockKeywords.some(keyword => message.toLowerCase().includes(keyword))
}

export const isExploratoryProductQuestion = (message) => {
    const exploratoryKeywords = [
        'what do you have', 'what products', 'show me', 'browse',
        'categories', 'types', 'options', 'selection'
    ]
    return exploratoryKeywords.some(keyword => message.toLowerCase().includes(keyword))
}

export const buildSearchPlan = (message) => {
    const tokens = tokenizeAndExpandSearchTerms(message)
    const inStock = isStockQuery(message)

    // Try to identify main product anchor
    const anchor = extractMainProduct(message)

    return {
        terms: tokens,
        anchor,
        inStock
    }
}

const getSynonyms = (word) => {
    const synonymMap = {
        'jewelry': ['jewellery', 'accessories', 'ornaments'],
        'necklace': ['chain', 'pendant'],
        'earring': ['earrings', 'studs'],
        'bracelet': ['bangle', 'wristband'],
        'ring': ['band', 'wedding ring'],
        'watch': ['timepiece', 'wristwatch'],
        'bag': ['purse', 'handbag', 'tote'],
        'shoe': ['shoes', 'footwear', 'sneaker', 'boot'],
        'dress': ['gown', 'frock', 'outfit'],
        'shirt': ['blouse', 'top', 'tee']
    }

    return synonymMap[word] || []
}

const extractMainProduct = (message) => {
    const productKeywords = [
        'necklace', 'earring', 'bracelet', 'ring', 'watch',
        'bag', 'purse', 'shoe', 'dress', 'shirt', 'jewelry'
    ]

    const words = message.toLowerCase().split(/\s+/)
    return productKeywords.find(keyword => words.some(word => word.includes(keyword))) || null
}