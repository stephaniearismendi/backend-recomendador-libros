const RecommenderService = require('../services/RecommenderService');

const recommenderService = new RecommenderService();

const getPersonalRecommendations = async (req, res) => {
    try {
        const userId = req.body?.userId || req.user?.userId || null;
        const seed = String(
            req.body?.seed ??
                (userId ? `${userId}-${new Date().toISOString().slice(0, 10)}` : 'anon')
        );

        const recommendations = await recommenderService.getPersonalRecommendations(userId, seed);
        res.json(recommendations);
    } catch (err) {
        console.error('[getPersonalRecommendations]', err?.message || err);
        res.status(500).json({ error: 'Error al generar recomendaciones' });
    }
};

module.exports = {
    getPersonalRecommendations,
};