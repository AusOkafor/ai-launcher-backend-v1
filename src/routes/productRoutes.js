import { Router } from 'express'
import { prisma } from '../db.js'
import { ApiResponse } from '../utils/apiResponse.js'

const router = Router()

// Get all products
router.get('/', async(req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                store: {
                    select: {
                        name: true,
                        platform: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return ApiResponse.success(res, { products })
    } catch (error) {
        console.error('Error fetching products:', error)
        return ApiResponse.error(res, 'Failed to fetch products', 500)
    }
})

// Get product by ID
router.get('/:id', async(req, res) => {
    try {
        const { id } = req.params

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                store: {
                    select: {
                        name: true,
                        platform: true
                    }
                },
                variants: true
            }
        })

        if (!product) {
            return ApiResponse.error(res, 'Product not found', 404)
        }

        return ApiResponse.success(res, { product })
    } catch (error) {
        console.error('Error fetching product:', error)
        return ApiResponse.error(res, 'Failed to fetch product', 500)
    }
})

// Get products by store
router.get('/store/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params

        const products = await prisma.product.findMany({
            where: { storeId },
            include: {
                store: {
                    select: {
                        name: true,
                        platform: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return ApiResponse.success(res, { products })
    } catch (error) {
        console.error('Error fetching store products:', error)
        return ApiResponse.error(res, 'Failed to fetch store products', 500)
    }
})

// Get products by category
router.get('/category/:category', async(req, res) => {
    try {
        const { category } = req.params

        const products = await prisma.product.findMany({
            where: {
                category: {
                    contains: category,
                    mode: 'insensitive'
                }
            },
            include: {
                store: {
                    select: {
                        name: true,
                        platform: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return ApiResponse.success(res, { products })
    } catch (error) {
        console.error('Error fetching category products:', error)
        return ApiResponse.error(res, 'Failed to fetch category products', 500)
    }
})

export { router as productRoutes }