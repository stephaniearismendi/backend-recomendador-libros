const prisma = require('../database/prisma');
const { AX, limit, withTimeout } = require('../core/http');
const {
    googleDetailsFast, openLibraryDetailsFast, translateEsFast, DETAILS_CACHE
} = require('../core/providers');
const {
    norm, topCounts, dedup, filterFiction, firstAuthorName, toFrontendBook
} = require('../utils/utils.js');

const BIGBOOK_BASE = process.env.BIGBOOK_BASE || 'https://api.bigbookapi.com';
const BIGBOOK_KEY  = process.env.BIGBOOK_API_KEY;

const ERRORS = {
    BIGBOOK: 'Error al consultar BigBookAPI',
    RECS_ERROR: 'Error al generar recomendaciones'
};

const RECS_CACHE = global.__RECS_CACHE__ ||= new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function bbRequest(path, params = {}) {
    try {
        const { data } = await AX.get(`${BIGBOOK_BASE}${path}`, {
            params,
            headers: { 'x-api-key': BIGBOOK_KEY },
            timeout: 12000
        });
        return data;
    } catch {
        throw new Error(ERRORS.BIGBOOK);
    }
}

function flattenBooksArray(books) {
    if (!Array.isArray(books)) return [];
    const flat = [];
    for (const item of books) {
        if (Array.isArray(item)) { for (const b of item) flat.push(b); }
        else if (item && typeof item === 'object') { flat.push(item); }
    }
    return flat;
}

function normalizeBigBook(b) {
    return {
        id: b.id || b.isbn || b.key || `${b.title}-${firstAuthorName(b.authors)}`,
        title: b.title || '',
        author: b.author || firstAuthorName(b.authors) || '',
        image: b.image || b.image_url || b.cover || null,
        genres: b.genres || b.categories || b.subjects || [],
        rating: Number(b.rating?.average ?? b.rating ?? b.averageRating ?? 0),
        popularity: Number(b.ratingsCount || b.popularity || b.rating?.count || 0),
        description: b.description || '',
        publishedDate: b.publishedDate || b.published_date || null,
    };
}

async function bbSearchBooks(query, limitN = 24) {
    const data = await bbRequest('/search-books', { query });
    const arr = flattenBooksArray(data?.books);
    const out = (limitN && limitN > 0) ? arr.slice(0, limitN) : arr;
    return out.map(normalizeBigBook);
}

async function bbSearchByAuthor(q, limitN = 24) { return bbSearchBooks(q, limitN); }
async function bbSearchByGenre(q, limitN = 24) { return bbSearchBooks(q, limitN); }

async function getFavoritesFromDB(userId) {
    const favs = await prisma.favorite.findMany({
        where: { userId: Number(userId) },
        include: { book: true }
    });
    return favs.map(f => {
        const b = f.book || {};
        const genres = [];
        if (b.category) genres.push(b.category);
        if (Array.isArray(b.subjects)) genres.push(...b.subjects);
        return { id: b.id, title: b.title, author: b.author, genres };
    });
}

function buildProfile(favs = []) {
    const sample = favs.slice(0, 200);
    const g = [], a = [], kw = [];
    for (const b of sample) {
        (b.genres || b.subjects || []).forEach(x => g.push(norm(x)));
        if (b.author) a.push(norm(b.author));
        norm(b.title).split(/\s+/).filter(w => w.length > 3).forEach(w => kw.push(w));
    }
    return {
        topGenres: topCounts(g, 6),
        topAuthors: topCounts(a, 4),
        topKeywords: topCounts(kw, 10),
        favTitles: new Set(favs.map(f => norm(f.title))),
    };
}

function scoreFactory(profile, pool) {
    const maxPop = Math.max(1, ...pool.map(x => x.popularity || 0));
    return (c, seenByAuthor) => {
        const cg = (c.genres || []).map(norm);
        const ca = norm(c.author);
        const ct = norm(c.title);

        let sG = 0; for (const g of cg) if (profile.topGenres.includes(g)) sG += 1;
        sG = Math.min(1, sG / Math.max(1, cg.length));

        const sA = profile.topAuthors.includes(ca) ? 1 : 0;

        const words = new Set(ct.split(/\s+/).filter(w => w.length > 3));
        let sK = 0; for (const k of profile.topKeywords) if (words.has(k)) sK += 1;
        sK = Math.min(1, sK / Math.max(1, profile.topKeywords.length));

        const sP = (c.popularity || 0) / maxPop;
        const pen = Math.max(0, (seenByAuthor[ca] || 0) - 1) * 0.12;

        return Number((0.5 * sG + 0.25 * sA + 0.15 * sK + 0.10 * sP - pen).toFixed(4));
    };
}

async function fetchCandidates(profile) {
    const tasks = [];
    for (const g of profile.topGenres.slice(0, 3)) tasks.push(bbSearchByGenre(g, 24));
    for (const a of profile.topAuthors.slice(0, 3)) tasks.push(bbSearchByAuthor(a, 24));

    if (!tasks.length) {
        const fallback = ['fiction', 'novel', 'fantasy', 'romance', 'young adult', 'mystery', 'thriller', 'contemporary'];
        for (const q of fallback) tasks.push(bbSearchBooks(q, 24));
    }

    const settled = await Promise.allSettled(tasks);
    let cands = settled.flatMap(s => s.status === 'fulfilled' ? s.value : []);
    cands = dedup(filterFiction(cands));
    return cands.slice(0, 150);
}

function favsCacheKey(userId, favorites) {
    if (favorites?.length) {
        const ids = favorites.map(f => f.id || norm(`${f.title}-${f.author}`)).sort().join('|');
        return `bb:${userId || 'nouser'}:${ids}`;
    }
    return `bb:${userId || 'nouser'}:nofavs`;
}

async function recommendWithBigBook({ userId, favorites = [], limit = 24 }) {
    const cacheKey = favsCacheKey(userId, favorites);
    const now = Date.now();
    const cached = RECS_CACHE.get(cacheKey);
    if (cached && (now - cached.t) < CACHE_TTL_MS) return cached.data.slice(0, limit);

    const favs = favorites.length ? favorites : (userId ? await getFavoritesFromDB(userId) : []);
    const profile = favs.length ? buildProfile(favs) : { topGenres: [], topAuthors: [], topKeywords: [], favTitles: new Set() };

    let pool = await fetchCandidates(profile);
    if (favs.length) pool = pool.filter(c => !profile.favTitles.has(norm(c.title)));

    const ranked = favs.length
        ? (() => {
            const seenByAuthor = {};
            const score = scoreFactory(profile, pool);
            return pool.map(c => {
                const a = norm(c.author);
                seenByAuthor[a] = (seenByAuthor[a] || 0) + 1;
                return { ...c, score: score(c, seenByAuthor) };
            }).sort((x, y) => y.score - x.score);
        })()
        : pool;

    RECS_CACHE.set(cacheKey, { t: now, data: ranked });
    return ranked.slice(0, limit);
}

async function enrichItems(items) {
    const needs = items.map(b => ({
        base: b,
        needDesc: !b.description || b.description.length < 60,
        needPub: !b.publishedDate,
        needImg: !b.image
    }));

    const tasks = needs.map(({ base, needDesc, needPub, needImg }) => limit(async () => {
        const key = `${norm(base.title)}::${norm(base.author || '')}`;
        let details = DETAILS_CACHE.get(key);

        if ((!details) && (needDesc || needPub || needImg)) {
            try {
                details = await withTimeout(
                    Promise.any([
                        googleDetailsFast(base.title, base.author),
                        openLibraryDetailsFast(base.title)
                    ]),
                    10000,
                    'details-any'
                );
                DETAILS_CACHE.set(key, details);
            } catch { details = null; }
        }

        const desc = (base.description || details?.description || '') || '';
        const pub  = base.publishedDate || details?.publishedDate || null;
        const img  = base.image || details?.image || null;

        const finalDesc = (/^[\x00-\x7F]*$/.test(desc) ? await translateEsFast(desc) : desc);

        return {
            id: base.id,
            title: base.title,
            author: base.author || 'Desconocido',
            image: img || null,
            description: finalDesc,
            rating: base.rating || null,
            publishedDate: pub || null
        };
    }));

    const settled = await Promise.allSettled(tasks);
    return settled.filter(s => s.status === 'fulfilled').map(s => s.value);
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
