import express from 'express';
import { abTestingService } from '../services/abTestingService.js';

const router = express.Router();

// Get all A/B tests
router.get('/', async(req, res) => {
    try {
        const result = await abTestingService.getAllABTests();
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in GET /ab-tests:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Get A/B test by ID
router.get('/:id', async(req, res) => {
    try {
        const result = await abTestingService.getABTestById(req.params.id);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in GET /ab-tests/:id:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Create A/B test
router.post('/', async(req, res) => {
    try {
        const { launchId, ...testData } = req.body;
        const result = await abTestingService.createABTest(launchId, testData);
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /ab-tests:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Get A/B tests for a launch
router.get('/launch/:launchId', async(req, res) => {
    try {
        const result = await abTestingService.getABTestsByLaunch(req.params.launchId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in GET /ab-tests/launch/:launchId:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Start A/B test
router.post('/:id/start', async(req, res) => {
    try {
        const result = await abTestingService.startABTest(req.params.id);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /ab-tests/:id/start:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Stop A/B test
router.post('/:id/stop', async(req, res) => {
    try {
        const result = await abTestingService.stopABTest(req.params.id);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /ab-tests/:id/stop:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Create variations for A/B test
router.post('/:id/variations', async(req, res) => {
    try {
        const result = await abTestingService.createVariations(req.params.id, req.body.variations);
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /ab-tests/:id/variations:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Analyze A/B test results
router.post('/:id/analyze', async(req, res) => {
    try {
        const result = await abTestingService.analyzeABTestResults(req.params.id);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error in POST /ab-tests/:id/analyze:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Get A/B test statistics
router.get('/:id/stats', async(req, res) => {
    try {
        const result = await abTestingService.getABTestStats(req.params.id);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in GET /ab-tests/:id/stats:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

// Delete A/B test
router.delete('/:id', async(req, res) => {
    try {
        const result = await abTestingService.deleteABTest(req.params.id);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in DELETE /ab-tests/:id:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
});

export default router;