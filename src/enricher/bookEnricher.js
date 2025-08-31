const axios = require('axios');
const Bottleneck = require('bottleneck');
const pRetry = require('p-retry');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const http = axios.create({
    timeout: 12000,
    headers: { 'User-Agent': 'books-app/1.0 (+https://example.local)' },
});

const limiter = new Bottleneck({ minTime: 600, maxConcurrent: 2 });

const run = (fn) =>
    limiter.schedule(() =>
        pRetry(fn, { retries: 3, factor: 2, minTimeout: 800, maxTimeout: 3000 })
    );

const FALLBACK_IMG = 'https://covers.openlibrary.org/b/id/240727-M.jpg';

const slug = (s) => (s || '').toString().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 64);
const cleanDesc = (d) => (typeof d === 'string' ? d : d?.value || null);

async function getWork(workId) {
    const url = `https://openlibrary.org/works/${workId}.json`;
    const { data } = await run(() => http.get(url));
    return data;
}

async function searchOL({ title, author }) {
    const params = { title: title || '', author: author || '', limit: 1 };
    const { data } = await run(() => http.get('https://openlibrary.org/search.json', { params }));
    const doc = data?.docs?.[0];
    if (!doc) return null;
    return {
        workKey: (doc.key || '').replace(/^\/?works\//, ''),
        title: doc.title || title,
        author: (doc.author_name && doc.author_name[0]) || author || null,
        coverId: doc.cover_i || null,
    };
}

function coverFromPieces({ coverId, isbn }) {
    if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    return FALLBACK_IMG;
}

async function enrichOne(input) {
    const workKey = (input.key || input.workKey || '').replace(/^\/?works\//, '') || null;
    const isbn = Array.isArray(input.isbn) ? input.isbn[0] : input.isbn || null;
    let id = String(input.id || '') || workKey || isbn || slug(`${input.title || ''}|${input.author || ''}`);

    const cached = await prisma.book.findUnique({ where: { id } });
    if (cached) return cached;

    let title = input.title || null;
    let author = input.author || null;
    let coverId = null;
    let description = null;

    if (workKey) {
        try {
            const w = await getWork(workKey);
            title = title || w.title || null;
            description = cleanDesc(w.description) || null;
            coverId = Array.isArray(w.covers) && w.covers[0] ? w.covers[0] : null;
            id = id || workKey;
        } catch {}
    }

    if (!title || !coverId) {
        try {
            const s = await searchOL({ title, author });
            if (s) {
                title = title || s.title;
                author = author || s.author;
                coverId = coverId || s.coverId;
                if (!workKey && s.workKey) id = id || s.workKey;
            }
        } catch {}
    }

    const imageUrl = coverFromPieces({ coverId, isbn });
    const safeTitle = title || input.title || 'Título desconocido';
    const safeAuthor = author || input.author || 'Autor desconocido';

    const saved = await prisma.book.upsert({
        where: { id },
        update: { title: safeTitle, author: safeAuthor, imageUrl, description },
        create: { id, title: safeTitle, author: safeAuthor, imageUrl, description, rating: null, category: input.category || null },
        select: { id: true, title: true, author: true, imageUrl: true, description: true, rating: true, category: true },
    });

    return saved;
}

async function enrichMany(list) {
    const uniq = [];
    const seen = new Set();
    for (const it of list || []) {
        const key =
            String(it.id || '') ||
            (it.key || it.workKey || '').replace(/^\/?works\//, '') ||
            (Array.isArray(it.isbn) ? it.isbn[0] : it.isbn) ||
            slug(`${it.title || ''}|${it.author || ''}`);
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(it);
    }
    const out = [];
    for (const it of uniq) out.push(await enrichOne(it));
    return out;
}

module.exports = { enrichOne, enrichMany };
