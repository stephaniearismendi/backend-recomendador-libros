const { AX, limit } = require('../core/http');
const { googleDetailsFast, openLibraryDetailsFast, translateEsFast } = require('../core/providers');
const { firstAuthorName, toFrontendBook } = require('../utils/utils.js');

const BIGBOOK_BASE = process.env.BIGBOOK_BASE || 'https://api.bigbookapi.com';
const BIGBOOK_KEY  = process.env.BIGBOOK_API_KEY;

const ERRORS = { BIGBOOK: 'Error al consultar BigBookAPI', RECS_ERROR: 'Error al generar recomendaciones' };

async function recommendWithBigBook({ userId, favorites, limit = 24 }) {
    try {
        const params = {};
        if (userId) params.userId = userId;
        if (favorites?.length) params.favorites = favorites.join(',');
        const { data } = await AX.get(`${BIGBOOK_BASE}/books/recommendations`, {
            params, headers: { 'x-api-key': BIGBOOK_KEY }, timeout: 12000,
        });
        return Array.isArray(data) ? data : (data?.items || []);
    } catch {
        throw new Error(ERRORS.BIGBOOK);
    }
}

function flattenBooksArray(books) {
    if (!Array.isArray(books)) return [];
    const out = [];
    for (const it of books) Array.isArray(it) ? out.push(...it) : (it && out.push(it));
    return out;
}

async function enrichItems(items) {
    return Promise.all(items.map(async (b) => {
        const title = (b.title || '').trim();
        const author = firstAuthorName(b.authors || b.author);

        const [g, o] = await Promise.allSettled([
            googleDetailsFast(title, author),
            openLibraryDetailsFast(title),
        ]);
        const desc = g.value?.description || o.value?.description || '';
        const image = g.value?.image || o.value?.image || b.image || null;
        const publishedDate = g.value?.publishedDate || o.value?.publishedDate || b.publishedDate || null;

        const finalDesc = desc ? await translateEsFast(desc) : '';
        return { ...b, description: finalDesc, image, publishedDate };
    }));
}

exports.getPersonalRecommendations = async (req, res) => {
    try {
        const userId = req.body?.userId || req.user?.userId || null;
        const favorites = Array.isArray(req.body?.favorites) ? req.body.favorites : [];
        const base = await recommendWithBigBook({ userId, favorites, limit: 24 });
        const enriched = await enrichItems(base);
        res.json(enriched.map(toFrontendBook));
    } catch (err) {
        console.error('[getPersonalRecommendations]', err?.message || err);
        res.status(500).json({ error: ERRORS.RECS_ERROR });
    }
};
