// Recomendador con filtro de popularidad + diversidad (MMR) basado en favoritos.
// Endpoint intacto: POST /recommendations/personal  -> Array<BookFront>

const prisma = require('../database/prisma');
const { AX } = require('../core/http');

// utilitarios opcionales si existen en tu proyecto
let firstAuthorName = (a) => (Array.isArray(a) ? a[0] : (a || ''));
let toFrontendBook = null;
try {
    const utils = require('../utils/utils.js');
    if (utils?.firstAuthorName) firstAuthorName = utils.firstAuthorName;
    if (utils?.toFrontendBook) toFrontendBook = utils.toFrontendBook;
} catch { /* noop */ }

/* ───────────────── Config ───────────────── */

const TIMEOUT_MS = 9000;
const LIMIT_FINAL = 24;
const MAX_SEED_FAVS = 8;
const MAX_SUBJECTS_PER_SEED = 6;
const MAX_AUTHORS_PER_SEED = 2;

// filtros de “calidad” (paso 1 estricto; si no llegamos, relajamos)
const HARD_MIN_EDITIONS = 8;
const HARD_MIN_RATINGS  = 25;
const SOFT_MIN_EDITIONS = 3;
const SOFT_MIN_RATINGS  = 5;

// pesos de scoring
const W_SIM       = 6.0; // similitud con favoritos (Jaccard)
const W_AUTHOR    = 2.5; // boost si viene de autor semilla
const W_POP_ED    = 1.6; // popularidad por nº ediciones (log)
const W_POP_AVG   = 2.0; // media de rating (0..5)
const W_POP_CNT   = 2.0; // nº votos (log10)
const MMR_LAMBDA  = 0.72;

/* ──────────────── Cachés ──────────────── */

const cache = (global.__RECS_CACHE3__ ||= {
    SUBJECT: new Map(),   // subject -> { t, v }
    AUTHOR:  new Map(),   // /authors/OL..A -> { t, v }
    WORK:    new Map(),   // /works/OL..W   -> { t, v }
    RAT:     new Map(),   // /works/OL..W/ratings.json -> { t, v }
    RES:     new Map(),   // resultado final -> { t, v }
});
const TTL = {
    SUBJECT: 6 * 60 * 60 * 1000,
    AUTHOR:  12 * 60 * 60 * 1000,
    WORK:    24 * 60 * 60 * 1000,
    RAT:     24 * 60 * 60 * 1000,
    RES:     10 * 60 * 1000,
};
const getC = (b, k, ttl) => {
    const it = b.get(k);
    if (!it) return null;
    if (Date.now() - it.t > ttl) { b.delete(k); return null; }
    return it.v;
};
const setC = (b, k, v) => (b.set(k, { t: Date.now(), v }), v);

/* ──────────────── Utils ──────────────── */

const norm = (s) =>
    (s || '')
        .toString()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normId = (id) => {
    const v = (id || '').toString().trim();
    return v ? (v.startsWith('/') ? v : `/${v}`) : '';
};

const keyTitleAuthor = (b) =>
    `${norm(b.title)}::${norm(b.author || (Array.isArray(b.authors) ? b.authors[0] : ''))}`;

const tokensOf = (title, author, subjects = []) => {
    const toks = new Set();
    for (const w of norm(title).split(' ')) if (w.length > 2) toks.add(w);
    for (const w of norm(author).split(' ')) if (w.length > 2) toks.add(w);
    for (const s of subjects) for (const w of norm(s).split(' ')) if (w.length > 2) toks.add(w);
    return toks;
};

const jaccard = (aSet, bSet) => {
    if (!aSet.size || !bSet.size) return 0;
    let inter = 0;
    for (const x of aSet) if (bSet.has(x)) inter++;
    const uni = aSet.size + bSet.size - inter;
    return inter / uni;
};

function seededShuffle(arr, seedStr = '') {
    const s0 = Array.from(seedStr).reduce((a, c) => (a ^ c.charCodeAt(0)) >>> 0, 0x9e3779b9) || 1;
    let x = s0 >>> 0;
    const rnd = () => {
        x ^= x << 13; x >>>= 0;
        x ^= x >> 17; x >>>= 0;
        x ^= x << 5;  x >>>= 0;
        return (x >>> 0) / 0xFFFFFFFF;
    };
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/* ─────────────── Open Library fetchers ─────────────── */

// /works/OL...W.json
async function getWorkMeta(workKey) {
    const k = normId(workKey);
    const hit = getC(cache.WORK, k, TTL.WORK);
    if (hit) return hit;

    try {
        const { data } = await AX.get(`https://openlibrary.org${k}.json`, { timeout: TIMEOUT_MS });
        const subjects = Array.isArray(data?.subjects) ? data.subjects.slice(0, 30) : [];
        const authors = Array.isArray(data?.authors) ? data.authors.map(a => a?.author?.key).filter(Boolean) : [];
        return setC(cache.WORK, k, { key: k, title: data?.title || '', subjects, authors });
    } catch {
        return setC(cache.WORK, k, { key: k, title: '', subjects: [], authors: [] });
    }
}

// /authors/OL...A/works.json
async function getAuthorWorks(authorKey, limit = 60) {
    const k = normId(authorKey);
    const hit = getC(cache.AUTHOR, k, TTL.AUTHOR);
    if (hit) return hit;

    try {
        const { data } = await AX.get(`https://openlibrary.org${k}/works.json`, {
            params: { limit },
            timeout: TIMEOUT_MS,
        });
        const entries = Array.isArray(data?.entries) ? data.entries : [];
        const name = data?.name || '';
        const out = entries.map((w) => ({
            id: w.key,
            title: w.title,
            authors: [name],
            author: name,
            cover_id: w.covers?.[0] || null,
            image: w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : null,
            edition_count: w.edition_count || 0,
            _origin: 'author',
        }));
        return setC(cache.AUTHOR, k, out);
    } catch {
        return setC(cache.AUTHOR, k, []);
    }
}

// /subjects/<subject>.json
async function getSubjectWorks(subject, limit = 60) {
    const key = subject.toLowerCase();
    const hit = getC(cache.SUBJECT, key, TTL.SUBJECT);
    if (hit) return hit;

    try {
        const { data } = await AX.get(`https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json`, {
            params: { limit },
            timeout: TIMEOUT_MS,
        });
        const works = Array.isArray(data?.works) ? data.works : [];
        const out = works.map((w) => ({
            id: w.key,
            title: w.title,
            authors: (w.authors || []).map(a => a.name).filter(Boolean),
            author: (w.authors && w.authors[0]?.name) || '',
            first_publish_year: w.first_publish_year || null,
            cover_id: w.cover_id || null,
            image: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg` : null,
            edition_count: w.edition_count || 0,
            ratings_average: typeof w.ratings_average === 'number' ? w.ratings_average : null,
            _subject: subject,
            _origin: 'subject',
        }));
        return setC(cache.SUBJECT, key, out);
    } catch {
        return setC(cache.SUBJECT, key, []);
    }
}

// /works/OL...W/ratings.json  → { summary: { average, count } }
async function getWorkRatings(workKey) {
    const k = normId(workKey);
    const hit = getC(cache.RAT, k, TTL.RAT);
    if (hit) return hit;
    try {
        const { data } = await AX.get(`https://openlibrary.org${k}/ratings.json`, { timeout: TIMEOUT_MS });
        const avg = Number(data?.summary?.average ?? data?.average) || null;
        const cnt = Number(data?.summary?.count ?? data?.count) || null;
        return setC(cache.RAT, k, { avg, cnt });
    } catch {
        return setC(cache.RAT, k, { avg: null, cnt: null });
    }
}

/* ─────────────── Seeds desde favoritos ─────────────── */

async function loadFavoriteSeeds(userId) {
    const favs = await prisma.favorite.findMany({
        where: { userId: Number(userId) },
        include: { book: true },
        take: MAX_SEED_FAVS, // Favorite no tiene createdAt
    });

    const favIds = new Set(favs.map(f => normId(f.bookId)));
    const favPairs = new Set(favs.map(f => keyTitleAuthor(f.book || {})));

    const subjectsCount = new Map();
    const authorKeys = new Set();
    const favTokenSets = [];

    for (const f of favs) {
        const key = normId(f.bookId);
        if (!key.startsWith('/works/')) continue;

        const meta = await getWorkMeta(key);
        favTokenSets.push(tokensOf(meta.title, '', meta.subjects));
        for (const s of meta.subjects.slice(0, MAX_SUBJECTS_PER_SEED)) {
            const k = s.toLowerCase();
            subjectsCount.set(k, (subjectsCount.get(k) || 0) + 1);
        }
        for (const a of meta.authors.slice(0, MAX_AUTHORS_PER_SEED)) authorKeys.add(a);
    }

    const subjects = Array.from(subjectsCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([s]) => s)
        .slice(0, 10);

    const authors = Array.from(authorKeys).slice(0, 8);

    return { favIds, favPairs, subjects, authors, favTokenSets };
}

/* ─────────────── Pool + popularidad ─────────────── */

async function buildCandidatePool(seeds) {
    const tasks = [
        ...seeds.authors.map(a => getAuthorWorks(a, 60)),
        ...seeds.subjects.map(s => getSubjectWorks(s, 60)),
    ];
    const settled = await Promise.allSettled(tasks);
    const pool = [];
    for (const r of settled) if (r.status === 'fulfilled' && Array.isArray(r.value)) pool.push(...r.value);

    // de-dup por id
    const seen = new Set();
    const out = [];
    for (const b of pool) {
        const id = normId(b.id || b.key || b.bookId || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(b);
    }
    return out;
}

async function hydrateRatings(pool, max = 120) {
    // enriquece con ratings para un subconjunto (capped)
    const slice = pool.slice(0, max);
    await Promise.allSettled(slice.map(async (b) => {
        const id = normId(b.id || b.key || b.bookId || '');
        if (!id || b.ratings_count != null) return;
        const r = await getWorkRatings(id);
        if (r) {
            b.ratings_average = b.ratings_average ?? r.avg;
            b.ratings_count   = r.cnt ?? null;
        }
    }));
}

function filterByPopularity(pool, { minEditions, minRatings }) {
    return pool
        .filter(b => b.image) // portada obligatoria
        .filter(b => (b.edition_count || 0) >= minEditions || (b.ratings_count || 0) >= minRatings);
}

/* ─────────────── Scoring + diversidad ─────────────── */

function scoreAndDiversify(cands, seeds) {
    // tokens precalculados
    const tok = cands.map((b) => {
        const t = b.title || '';
        const a = b.author || (Array.isArray(b.authors) ? b.authors[0] : '');
        const s = b._subject ? [b._subject] : [];
        return tokensOf(t, a, s);
    });

    const scored = cands.map((b, i) => {
        let sim = 0;
        for (const fav of seeds.favTokenSets) sim = Math.max(sim, jaccard(tok[i], fav));
        const authorBoost = b._origin === 'author' ? 1 : 0;

        const popEd  = Math.min(3, Math.log2(1 + (b.edition_count || 0))) / 3; // 0..1
        const popAvg = (typeof b.ratings_average === 'number' ? b.ratings_average : 0) / 5;
        const popCnt = Math.min(1, Math.log10(1 + (b.ratings_count || 0)) / 3); // 0..~1

        const score =
            W_SIM * sim +
            W_AUTHOR * authorBoost +
            W_POP_ED * popEd +
            W_POP_AVG * popAvg +
            W_POP_CNT * popCnt;

        return { ...b, _score: score, _tok: tok[i] };
    });

    // MMR
    const sel = [];
    const used = new Set();
    while (sel.length < Math.min(LIMIT_FINAL * 2, scored.length)) {
        let best = -1, bestVal = -Infinity;
        for (let i = 0; i < scored.length; i++) {
            if (used.has(i)) continue;
            const rel = scored[i]._score;
            let maxSimSel = 0;
            for (const s of sel) maxSimSel = Math.max(maxSimSel, jaccard(scored[i]._tok, s._tok));
            const mmr = MMR_LAMBDA * rel - (1 - MMR_LAMBDA) * maxSimSel;
            if (mmr > bestVal) { bestVal = mmr; best = i; }
        }
        if (best === -1) break;
        used.add(best);
        sel.push(scored[best]);
        if (sel.length >= LIMIT_FINAL) break;
    }
    return sel;
}

/* ─────────────── Mapeo seguro a frontend ─────────────── */

function safeToFrontend(b) {
    if (toFrontendBook) {
        try {
            const m = toFrontendBook(b);
            if (m && m.id && m.title) return m;
        } catch {}
    }
    return {
        id: normId(b.id || b.key || b.bookId || ''),
        title: b.title || 'Sin título',
        author: b.author || (Array.isArray(b.authors) ? b.authors[0] : '') || '',
        image: b.image || (b.cover_id ? `https://covers.openlibrary.org/b/id/${b.cover_id}-L.jpg` : null),
        description: b.description || '',
        rating: b.ratings_average ?? b.rating ?? null,
        category: b.category || (b._subject || ''),
        publishedDate: b.first_publish_year || b.publishedDate || null,
    };
}

/* ─────────────── Handler ─────────────── */

exports.getPersonalRecommendations = async (req, res) => {
    try {
        const userId = req.body?.userId || req.user?.userId || null;
        const seed = String(req.body?.seed ?? (userId ? `${userId}-${new Date().toISOString().slice(0,10)}` : 'anon'));

        // clave de caché estable por usuario+favoritos+seed
        const favShort = await prisma.favorite.findMany({
            where: { userId: Number(userId) },
            select: { bookId: true },
            take: 50,
        });
        const key = JSON.stringify({ u: userId, f: favShort.map(f => f.bookId).sort(), s: seed });
        const cached = getC(cache.RES, key, TTL.RES);
        if (cached) return res.json(cached);

        // si no hay favoritos -> subjects “seguros”
        const hasFavs = favShort.length > 0;
        const seeds = hasFavs
            ? await loadFavoriteSeeds(userId)
            : { favIds: new Set(), favPairs: new Set(), subjects: ['fiction', 'fantasy', 'mystery', 'romance'], authors: [], favTokenSets: [new Set()] };

        // candidatos
        let pool = await buildCandidatePool(seeds);

        // excluye favoritos
        pool = pool.filter((b) => {
            const idN = normId(b.id || b.key || b.bookId || '');
            if (idN && seeds.favIds.has(idN)) return false;
            if (seeds.favPairs.has(keyTitleAuthor(b))) return false;
            return true;
        });

        // hidrata popularidad (ratings) para un subconjunto
        await hydrateRatings(pool, 120);

        // filtro de calidad (dos pasadas)
        let filtered = filterByPopularity(pool, { minEditions: HARD_MIN_EDITIONS, minRatings: HARD_MIN_RATINGS });
        if (filtered.length < LIMIT_FINAL) {
            filtered = filterByPopularity(pool, { minEditions: SOFT_MIN_EDITIONS, minRatings: SOFT_MIN_RATINGS });
            if (filtered.length < LIMIT_FINAL) filtered = pool.filter(b => b.image); // última relajación: solo que tenga portada
        }

        // ranking + diversidad
        let ranked = scoreAndDiversify(filtered, seeds);
        ranked = seededShuffle(ranked, seed); // variación determinista

        const payload = ranked.slice(0, LIMIT_FINAL).map(safeToFrontend);
        setC(cache.RES, key, payload);
        res.json(payload);
    } catch (err) {
        console.error('[getPersonalRecommendations]', err?.message || err);
        res.status(500).json({ error: 'Error al generar recomendaciones' });
    }
};
