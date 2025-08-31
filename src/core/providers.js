const { AX } = require('./http');
const { stripHtml } = require('../utils/utils.js');

const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const DEEPL_KEY  = process.env.DEEPL_API_KEY;

const DETAILS_CACHE = global.__DETAILS_CACHE__ ||= new Map();
const TRANSLATE_CACHE = global.__TRANSLATE_CACHE__ ||= new Map();

async function googleDetailsFast(title, author) {
    const q = [title, author].filter(Boolean).join(' ');
    const { data } = await AX.get('https://www.googleapis.com/books/v1/volumes', {
        params: { q, printType: 'books', maxResults: 1, key: GOOGLE_KEY },
        timeout: 9000
    });
    const it = data?.items?.[0]; const v = it?.volumeInfo || {};
    return {
        description: stripHtml(v.description || ''),
        publishedDate: v.publishedDate || null,
        image: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null
    };
}

async function openLibraryDetailsFast(title) {
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
    const img = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null;
    const pub = d.first_publish_year ? String(d.first_publish_year) : null;
    return { description: desc, publishedDate: pub, image: img };
}

async function translateEsFast(text) {
    if (!DEEPL_KEY || !text) return text;
    if (TRANSLATE_CACHE.has(text)) return TRANSLATE_CACHE.get(text);
    if (/[áéíóúñü¿¡]/i.test(text)) { TRANSLATE_CACHE.set(text, text); return text; } // ya parece ES

    const body = new URLSearchParams({
        auth_key: DEEPL_KEY, text, source_lang: 'EN', target_lang: 'ES'
    }).toString();

    try {
        const { data } = await AX.post('https://api-free.deepl.com/v2/translate', body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 9000
        });
        const t = data?.translations?.[0]?.text || text;
        TRANSLATE_CACHE.set(text, t);
        return t;
    } catch {
        return text;
    }
}

module.exports = {
    googleDetailsFast,
    openLibraryDetailsFast,
    translateEsFast,
    DETAILS_CACHE,
    TRANSLATE_CACHE,
};
