/**
 * Recommender Service
 * Handles book recommendation logic using OpenLibrary API and user preferences
 */

const { AX } = require('../core/http');
const RecommenderRepository = require('../repositories/RecommenderRepository');

let toFrontendBook = null;
try {
    const utils = require('../utils/utils.js');
    if (utils?.toFrontendBook) toFrontendBook = utils.toFrontendBook;
} catch { }

/**
 * Timeout for the requests to OpenLibrary
 */
const TIMEOUT_MS = 9000;
const LIMIT_FINAL = 24;
const MAX_SEED_FAVS = 8;
const MAX_SUBJECTS_PER_SEED = 6;
const MAX_AUTHORS_PER_SEED = 2;

/**
 * Minimum editions and ratings for the books
 */
const HARD_MIN_EDITIONS = 8;
const HARD_MIN_RATINGS = 25;
const SOFT_MIN_EDITIONS = 3;
const SOFT_MIN_RATINGS = 5;

/**
 * Weights for the scoring and diversification
 */
const W_SIM = 6.0;
const W_AUTHOR = 2.5;
const W_POP_ED = 1.6;
const W_POP_AVG = 2.0;
const W_POP_CNT = 2.0;
const MMR_LAMBDA = 0.72;

/**
 * Cache for the recommendations
 */
const cache = (global.__RECS_CACHE3__ ||= {
    SUBJECT: new Map(),
    AUTHOR: new Map(),
    WORK: new Map(),
    RAT: new Map(),
    RES: new Map(),
});

/**
 * Time to live for the cache
 */
const TTL = {
    SUBJECT: 6 * 60 * 60 * 1000,
    AUTHOR: 12 * 60 * 60 * 1000,
    WORK: 24 * 60 * 60 * 1000,
    RAT: 24 * 60 * 60 * 1000,
    RES: 10 * 60 * 1000,
};

class RecommenderService {
    constructor() {
        this.repository = new RecommenderRepository();
    }

    /**
     * Gets a cached item from the cache
     * @param {Map} cache - Cache map to retrieve from
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in milliseconds
     * @returns {*} Cached value or null if expired/not found
     */
    getCachedItem(cache, key, ttl) {
        const item = cache.get(key);
        if (!item) return null;
        if (Date.now() - item.t > ttl) {
            cache.delete(key);
            return null;
        }
        return item.v;
    }

    /**
     * Sets a cached item in the cache
     * @param {Map} cache - Cache map to store in
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @returns {*} The cached value
     */
    setCachedItem(cache, key, value) {
        cache.set(key, { t: Date.now(), v: value });
        return value;
    }

    /**
     * Normalizes a string for comparison
     * @param {string} string - String to normalize
     * @returns {string} Normalized string
     */
    normalizeString(string) {
        return (string || '')
            .toString()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Normalizes an ID by adding leading slash if missing
     * @param {string} id - ID to normalize
     * @returns {string} Normalized ID with leading slash
     */
    normalizeId(id) {
        const value = (id || '').toString().trim();
        return value ? (value.startsWith('/') ? value : `/${value}`) : '';
    }

    /**
     * Creates a unique key for a book based on title and author
     * @param {object} book - Book object with title and author
     * @returns {string} Unique book key
     */
    createBookKey(book) {
        return `${this.normalizeString(book.title)}::${this.normalizeString(book.author || (Array.isArray(book.authors) ? book.authors[0] : ''))}`;
    }

    /**
     * Creates a set of tokens for a book from title, author and subjects
     * @param {string} title - Book title
     * @param {string} author - Book author
     * @param {Array} subjects - Array of subject strings
     * @returns {Set} Set of normalized tokens
     */
    extractTokens(title, author, subjects = []) {
        const tokens = new Set();
        for (const word of this.normalizeString(title).split(' ')) if (word.length > 2) tokens.add(word);
        for (const word of this.normalizeString(author).split(' ')) if (word.length > 2) tokens.add(word);
        for (const subject of subjects)
            for (const word of this.normalizeString(subject).split(' ')) if (word.length > 2) tokens.add(word);
        return tokens;
    }

    /**
     * Calculates the Jaccard similarity between two sets
     * @param {Set} setA - First set
     * @param {Set} setB - Second set
     * @returns {number} Jaccard similarity coefficient (0-1)
     */
    calculateJaccardSimilarity(setA, setB) {
        if (!setA.size || !setB.size) return 0;
        let intersection = 0;
        for (const item of setA) if (setB.has(item)) intersection++;
        const union = setA.size + setB.size - intersection;
        return intersection / union;
    }

    /**
     * Shuffles an array based on a seed for deterministic randomization
     * @param {Array} array - Array to shuffle
     * @param {string} seedString - Seed string for randomization
     * @returns {Array} Shuffled array
     */
    shuffleWithSeed(array, seedString = '') {
        const seed0 =
            Array.from(seedString).reduce((acc, char) => (acc ^ char.charCodeAt(0)) >>> 0, 0x9e3779b9) || 1;
        let x = seed0 >>> 0;
        const random = () => {
            x ^= x << 13;
            x >>>= 0;
            x ^= x >> 17;
            x >>>= 0;
            x ^= x << 5;
            x >>>= 0;
            return (x >>> 0) / 0xffffffff;
        };
        const result = array.slice();
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Gets the metadata of a work from OpenLibrary
     * @param {string} workKey - Work key identifier
     * @returns {Promise<object>} Work metadata with title, subjects and authors
     */
    async getWorkMeta(workKey) {
        const k = this.normalizeId(workKey);
        const hit = this.getCachedItem(cache.WORK, k, TTL.WORK);
        if (hit) return hit;

        try {
            const { data } = await AX.get(`https://openlibrary.org${k}.json`, {
                timeout: TIMEOUT_MS,
            });
            const subjects = Array.isArray(data?.subjects) ? data.subjects.slice(0, 30) : [];
            const authors = Array.isArray(data?.authors)
                ? data.authors.map((a) => a?.author?.key).filter(Boolean)
                : [];
            return this.setCachedItem(cache.WORK, k, {
                key: k,
                title: data?.title || '',
                subjects,
                authors,
            });
        } catch {
            return this.setCachedItem(cache.WORK, k, { key: k, title: '', subjects: [], authors: [] });
        }
    }

    /**
     * Gets the works of an author from OpenLibrary
     * @param {string} authorKey - Author key identifier
     * @param {number} limit - Maximum number of works to retrieve
     * @returns {Promise<Array>} Array of author works
     */
    async getAuthorWorks(authorKey, limit = 60) {
        const k = this.normalizeId(authorKey);
        const hit = this.getCachedItem(cache.AUTHOR, k, TTL.AUTHOR);
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
                image: w.covers?.[0]
                    ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg`
                    : null,
                edition_count: w.edition_count || 0,
                _origin: 'author',
            }));
            return this.setCachedItem(cache.AUTHOR, k, out);
        } catch {
            return this.setCachedItem(cache.AUTHOR, k, []);
        }
    }

    /**
     * Gets the works of a subject from OpenLibrary
     * @param {string} subject - Subject name
     * @param {number} limit - Maximum number of works to retrieve
     * @returns {Promise<Array>} Array of subject works
     */
    async getSubjectWorks(subject, limit = 60) {
        const key = subject.toLowerCase();
        const hit = this.getCachedItem(cache.SUBJECT, key, TTL.SUBJECT);
        if (hit) return hit;

        try {
            const { data } = await AX.get(
                `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json`,
                {
                    params: { limit },
                    timeout: TIMEOUT_MS,
                }
            );
            const works = Array.isArray(data?.works) ? data.works : [];
            const out = works.map((w) => ({
                id: w.key,
                title: w.title,
                authors: (w.authors || []).map((a) => a.name).filter(Boolean),
                author: (w.authors && w.authors[0]?.name) || '',
                first_publish_year: w.first_publish_year || null,
                cover_id: w.cover_id || null,
                image: w.cover_id
                    ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`
                    : null,
                edition_count: w.edition_count || 0,
                ratings_average: typeof w.ratings_average === 'number' ? w.ratings_average : null,
                _subject: subject,
                _origin: 'subject',
            }));
            return this.setCachedItem(cache.SUBJECT, key, out);
        } catch {
            return this.setCachedItem(cache.SUBJECT, key, []);
        }
    }

    /**
     * Gets the ratings of a book from OpenLibrary
     * @param {string} workKey - Work key identifier
     * @returns {Promise<object>} Ratings data with average and count
     */
    async getWorkRatings(workKey) {
        const k = this.normalizeId(workKey);
        const hit = this.getCachedItem(cache.RAT, k, TTL.RAT);
        if (hit) return hit;
        try {
            const { data } = await AX.get(`https://openlibrary.org${k}/ratings.json`, {
                timeout: TIMEOUT_MS,
            });
            const avg = Number(data?.summary?.average ?? data?.average) || null;
            const cnt = Number(data?.summary?.count ?? data?.count) || null;
            return this.setCachedItem(cache.RAT, k, { avg, cnt });
        } catch {
            return this.setCachedItem(cache.RAT, k, { avg: null, cnt: null });
        }
    }

    /**
     * Loads favorite seeds from the database from a seed. That seed is retreived from the favorites of the user
     * @description The seeds are used to generate recommendations for a user
     * @param {string} userId - User ID
     * @returns {Promise<object>} Favorite seeds
     */
    async loadFavoriteSeeds(userId) {
        const favs = await this.repository.getFavoriteSeeds(userId, MAX_SEED_FAVS);

        const favIds = new Set(favs.map((f) => this.normalizeId(f.bookId)));
        const favPairs = new Set(favs.map((f) => this.createBookKey(f.book || {})));

        const subjectsCount = new Map();
        const authorKeys = new Set();
        const favTokenSets = [];

        for (const f of favs) {
            const key = this.normalizeId(f.bookId);
            if (!key.startsWith('/works/')) continue;

            // Get the meta data of the book and create a set of tokens
            const meta = await this.getWorkMeta(key);
            favTokenSets.push(this.extractTokens(meta.title, '', meta.subjects));
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


    /**
     * Creates a candidate pool of books from OpenLibrary based on seeds
     * @param {object} seeds - Seeds object with authors and subjects
     * @returns {Promise<Array>} Array of candidate books
     */
    async buildCandidatePool(seeds) {
        const tasks = [
            ...seeds.authors.map((a) => this.getAuthorWorks(a, 60)),
            ...seeds.subjects.map((s) => this.getSubjectWorks(s, 60)),
        ];
        const settled = await Promise.allSettled(tasks);
        const pool = [];
        for (const r of settled)
            if (r.status === 'fulfilled' && Array.isArray(r.value)) pool.push(...r.value);

        const seen = new Set();
        const out = [];
        for (const b of pool) {
            const id = this.normalizeId(b.id || b.key || b.bookId || '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push(b);
        }
        return out;
    }

    /**
     * Hydrates ratings for books in the pool
     * @param {Array} pool - Array of books to hydrate
     * @param {number} max - Maximum number of books to process
     * @returns {Promise<void>}
     */
    async hydrateRatings(pool, max = 120) {
        const slice = pool.slice(0, max);
        await Promise.allSettled(
            slice.map(async (b) => {
                const id = this.normalizeId(b.id || b.key || b.bookId || '');
                if (!id || b.ratings_count != null) return;
                const r = await this.getWorkRatings(id);
                if (r) {
                    b.ratings_average = b.ratings_average ?? r.avg;
                    b.ratings_count = r.cnt ?? null;
                }
            })
        );
    }

    /**
     * Filters books by popularity criteria
     * @param {Array} pool - Array of books to filter
     * @param {object} criteria - Filter criteria with minEditions and minRatings
     * @returns {Array} Filtered array of popular books
     */
    filterByPopularity(pool, { minEditions, minRatings }) {
        return pool
            .filter((b) => b.image)
            .filter(
                (b) => (b.edition_count || 0) >= minEditions || (b.ratings_count || 0) >= minRatings
            );
    }

    /**
     * Scores and diversifies candidate books using MMR algorithm
     * @param {Array} cands - Array of candidate books
     * @param {object} seeds - Seeds object for scoring
     * @returns {Array} Scored and diversified book selection
     */
    scoreAndDiversify(cands, seeds) {
        const tok = cands.map((b) => {
            const t = b.title || '';
            const a = b.author || (Array.isArray(b.authors) ? b.authors[0] : '');
            const s = b._subject ? [b._subject] : [];
            return this.extractTokens(t, a, s);
        });

        const scored = cands.map((b, i) => {
            let sim = 0;
            for (const fav of seeds.favTokenSets) sim = Math.max(sim, this.calculateJaccardSimilarity(tok[i], fav));
            const authorBoost = b._origin === 'author' ? 1 : 0;

            const popEd = Math.min(3, Math.log2(1 + (b.edition_count || 0))) / 3;
            const popAvg = (typeof b.ratings_average === 'number' ? b.ratings_average : 0) / 5;
            const popCnt = Math.min(1, Math.log10(1 + (b.ratings_count || 0)) / 3);

            const score =
                W_SIM * sim +
                W_AUTHOR * authorBoost +
                W_POP_ED * popEd +
                W_POP_AVG * popAvg +
                W_POP_CNT * popCnt;

            return { ...b, _score: score, _tok: tok[i] };
        });

        const sel = [];
        const used = new Set();
        while (sel.length < Math.min(LIMIT_FINAL * 2, scored.length)) {
            let best = -1,
                bestVal = -Infinity;
            for (let i = 0; i < scored.length; i++) {
                if (used.has(i)) continue;
                const rel = scored[i]._score;
                let maxSimSel = 0;
                for (const s of sel)
                    maxSimSel = Math.max(maxSimSel, this.calculateJaccardSimilarity(scored[i]._tok, s._tok));
                const mmr = MMR_LAMBDA * rel - (1 - MMR_LAMBDA) * maxSimSel;
                if (mmr > bestVal) {
                    bestVal = mmr;
                    best = i;
                }
            }
            if (best === -1) break;
            used.add(best);
            sel.push(scored[best]);
            if (sel.length >= LIMIT_FINAL) break;
        }
        return sel;
    }

    /**
     * Safely converts book data to frontend format
     * @param {object} b - Book object to convert
     * @returns {object} Frontend-formatted book object
     */
    safeToFrontend(b) {
        if (toFrontendBook) {
            try {
                const m = toFrontendBook(b);
                if (m && m.id && m.title) return m;
            } catch (error) {
                console.warn('Error converting book to frontend format:', error.message);
            }
        }
        return {
            id: this.normalizeId(b.id || b.key || b.bookId || ''),
            title: b.title || 'Sin título',
            author: b.author || (Array.isArray(b.authors) ? b.authors[0] : '') || '',
            image:
                b.image ||
                (b.cover_id ? `https://covers.openlibrary.org/b/id/${b.cover_id}-L.jpg` : null),
            description: b.description || '',
            rating: b.ratings_average ?? b.rating ?? null,
            category: b.category || b._subject || '',
            publishedDate: b.first_publish_year || b.publishedDate || null,
        };
    }

    /**
     * Gets personalized book recommendations for a user
     * @param {string} userId - User ID
     * @param {string} seed - Seed for randomization
     * @returns {Promise<Array>} Array of recommended books
     */
    async getPersonalRecommendations(userId, seed) {
        const favShort = await this.repository.getFavoriteIds(userId, 50);
        const key = JSON.stringify({ u: userId, f: favShort.map((f) => f.bookId).sort(), s: seed });
        const cached = this.getCachedItem(cache.RES, key, TTL.RES);
        if (cached) return cached;

        const hasFavs = favShort.length > 0;
        const seeds = hasFavs
            ? await this.loadFavoriteSeeds(userId)
            : {
                favIds: new Set(),
                favPairs: new Set(),
                subjects: ['fiction', 'fantasy', 'mystery', 'romance'],
                authors: [],
                favTokenSets: [new Set()],
            };

        let pool = await this.buildCandidatePool(seeds);

        pool = pool.filter((b) => {
            const idN = this.normalizeId(b.id || b.key || b.bookId || '');
            if (idN && seeds.favIds.has(idN)) return false;
            if (seeds.favPairs.has(this.createBookKey(b))) return false;
            return true;
        });

        await this.hydrateRatings(pool, 120);

        let filtered = this.filterByPopularity(pool, {
            minEditions: HARD_MIN_EDITIONS,
            minRatings: HARD_MIN_RATINGS,
        });
        if (filtered.length < LIMIT_FINAL) {
            filtered = this.filterByPopularity(pool, {
                minEditions: SOFT_MIN_EDITIONS,
                minRatings: SOFT_MIN_RATINGS,
            });
            if (filtered.length < LIMIT_FINAL) filtered = pool.filter((b) => b.image);
        }

        let ranked = this.scoreAndDiversify(filtered, seeds);
        ranked = this.shuffleWithSeed(ranked, seed);

        const payload = ranked.slice(0, LIMIT_FINAL).map((b) => this.safeToFrontend(b));
        this.setCachedItem(cache.RES, key, payload);
        return payload;
    }
}

module.exports = RecommenderService;
