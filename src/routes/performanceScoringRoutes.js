import express from 'express';
import { performanceScoringService } from '../services/performanceScoringService.js';

const router = express.Router();

// Score a creative
router.post('/score/:creativeId', async(req, res) => {
    try {
        const result = await performanceScoringService.scoreCreative(req.params.creativeId);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in POST /performance/score/:creativeId:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Get performance prediction
router.get('/prediction/:creativeId', async(req, res) => {
    try {
        const result = await performanceScoringService.getPerformancePrediction(req.params.creativeId);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in GET /performance/prediction/:creativeId:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Get creative insights
router.get('/insights/:creativeId', async(req, res) => {
    try {
        const result = await performanceScoringService.getCreativeInsights(req.params.creativeId);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in GET /performance/insights/:creativeId:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Batch score multiple creatives
router.post('/batch-score', async(req, res) => {
    try {
        const { creativeIds } = req.body;
        if (!creativeIds || !Array.isArray(creativeIds)) {
            return res.status(400).json({
                success: false,
                error: { message: 'creativeIds array is required' }
            });
        }

        const result = await performanceScoringService.batchScoreCreatives(creativeIds);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /performance/batch-score:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

export default router;