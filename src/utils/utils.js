function norm(s) {
    return (s || '')
        .toString()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s]/g, '')
        .trim();
}

function firstAuthorName(authors) {
    if (!authors) return '';
    if (Array.isArray(authors) && authors.length) {
        const a0 = authors[0];
        if (typeof a0 === 'string') return a0;
        if (a0 && typeof a0.name === 'string') return a0.name;
    }
    if (typeof authors === 'string') return authors;
    return '';
}

const RE_BR = /<br\s*\/?>/gi;
const RE_TAG = /<[^>]+>/g;
function stripHtml(html) {
    return (html || '')
        .replace(RE_BR, '\n')
        .replace(RE_TAG, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

function dedup(items) {
    const seen = new Set(); const out = [];
    for (const it of items) {
        const k = `${norm(it.title)}::${norm(it.author)}`;
        if (seen.has(k)) continue;
        seen.add(k); out.push(it);
    }
    return out;
}

function topCounts(arr, k = 5) {
    const m = new Map();
    for (const x of arr) if (x) m.set(x, (m.get(x) || 0) + 1);
    return [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map(([v]) => v);
}

function filterFiction(cands = []) {
    const bad = [
        'literary criticism','criticism','historia','history','ensayo','manual',
        'textbook','guide','teacher','linguistics','study guide','analysis',
        'notes','introducción','introduction','reference'
    ];
    return cands.filter(c => {
        const t = norm(c.title);
        const cats = (c.genres || c.subjects || []).map(norm).join(' | ');
        return !bad.some(w => t.includes(w) || cats.includes(w));
    });
}

function withTimeout(promise, ms = 12000, label = 'op') {
    let t;
    const to = new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`timeout:${label}`)), ms)));
    return Promise.race([promise.finally(() => clearTimeout(t)), to]);
}

function createLimiter(max = Number(process.env.HTTP_CONCURRENCY || 6)) {
    let active = 0; const queue = [];
    const run = async (fn, resolve, reject) => {
        active++;
        try { resolve(await fn()); }
        catch (e) { reject(e); }
        finally {
            active--;
            if (queue.length) {
                const next = queue.shift();
                run(next.fn, next.resolve, next.reject);
            }
        }
    };
    return (fn) => new Promise((res, rej) => {
        if (active < max) run(fn, res, rej);
        else queue.push({ fn, resolve: res, reject: rej });
    });
}

function toFrontendBook(b) {
    const title = b.title || '';
    const author = b.author || firstAuthorName(b.authors) || 'Desconocido';
    return {
        id: b.id || b.isbn || b.key || `${title}-${author}`,
        title,
        author,
        image: b.image || b.image_url || b.cover || null,
        description: b.description || '',
        rating: typeof b.rating?.average === 'number'
            ? Number(b.rating.average)
            : (typeof b.rating === 'number' ? b.rating : null),
        publishedDate: b.publishedDate || b.published_date || null,
    };
}

module.exports = {
    norm, firstAuthorName, stripHtml,
    dedup, topCounts, filterFiction,
    withTimeout, createLimiter,
    toFrontendBook,
};
