const { AX } = require('./http');
const { stripHtml } = require('../utils/utils.js');

const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const DEEPL_KEY  = process.env.DEEPL_API_KEY;

const DETAILS_CACHE = (global.__DETAILS_CACHE__ ||= new Map());
const TRANSLATE_CACHE = (global.__TRANSLATE_CACHE__ ||= new Map());
const TTL_MS = 10 * 60 * 1000;

function cget(map, key) {
    const it = map.get(key);
    if (!it) return null;
    if (Date.now() - it.t > TTL_MS) { map.delete(key); return null; }
    return it.v;
}
function cset(map, key, v) { map.set(key, { t: Date.now(), v }); return v; }

async function googleDetailsFast(title, author) {
    const q = [title, author].filter(Boolean).join(' ');
    const ck = `g:${q}`;
    const cached = cget(DETAILS_CACHE, ck);
    if (cached) return cached;

    const { data } = await AX.get('https://www.googleapis.com/books/v1/volumes', {
        params: { q, printType: 'books', maxResults: 1, key: GOOGLE_KEY },
        timeout: 9000
    });
    const it = data?.items?.[0]; const v = it?.volumeInfo || {};
    const out = {
        description: stripHtml(v.description || ''),
        publishedDate: v.publishedDate || null,
        image: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null,
    };
    return cset(DETAILS_CACHE, ck, out);
}

async function openLibraryDetailsFast(title) {
    const ck = `ol:${title}`;
    const cached = cget(DETAILS_CACHE, ck);
    if (cached) return cached;

    const { data } = await AX.get('https://openlibrary.org/search.json', { params: { title, limit: 1 }, timeout: 9000 });
    const d = data?.docs?.[0];
    if (!d) return { description: '', publishedDate: null, image: null };
    const workKey = d.key?.replace('/works/', '');
    let desc = '';
    try {
        const w = await AX.get(`https://openlibrary.org/works/${workKey}.json`, { timeout: 9000 });
        const raw = typeof w.data.description === 'string' ? w.data.description : (w.data.description?.value || '');
        desc = stripHtml(raw);
    } catch {}
    const img = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null;
    const out = { description: desc, publishedDate: d.first_publish_year || null, image: img };
    return cset(DETAILS_CACHE, ck, out);
}

async function translateEsFast(text) {
    if (!text) return '';
    const ck = `t:${text}`;
    const cached = cget(TRANSLATE_CACHE, ck);
    if (cached) return cached;

    try {
        const { data } = await AX.post('https://api-free.deepl.com/v2/translate', null, {
            params: { auth_key: DEEPL_KEY, text, target_lang: 'ES' },
            timeout: 8000,
        });
        const t = data?.translations?.[0]?.text || text;
        return cset(TRANSLATE_CACHE, ck, t);
    } catch {
        return text;
    }
}

module.exports = { googleDetailsFast, openLibraryDetailsFast, translateEsFast, DETAILS_CACHE, TRANSLATE_CACHE };
