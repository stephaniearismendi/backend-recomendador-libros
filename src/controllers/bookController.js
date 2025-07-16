const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

const ERRORS = {
    DB_BOOKS: 'Error al obtener libros',
    OPENLIBRARY: 'Error al consultar libros externos',
    MISSING_QUERY: 'Falta el parámetro `q`',
    MISSING_GENRE: 'Falta el parámetro `g` (género)',
    FAVORITES_GET: 'No se pudieron obtener los favoritos',
    FAVORITES_ADD: 'No se pudo agregar el favorito',
    FAVORITES_REMOVE: 'No se pudo eliminar el favorito',
    TRANSLATION: 'Error al traducir contenido',
};

const translateToSpanish = async (text) => {
    try {
        const res = await axios.post(
            'https://api-free.deepl.com/v2/translate',
            new URLSearchParams({
                auth_key: process.env.DEEPL_API_KEY,
                text,
                target_lang: 'ES',
                source_lang: 'EN',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return res.data.translations[0].text;
    } catch (err) {
        console.error(ERRORS.TRANSLATION, err.message);
        return text;
    }
};

const getBasicBookInfo = async (w) => {
    let rating = null;
    try {
        const ratingRes = await axios.get(`https://openlibrary.org${w.key}/ratings.json`);
        rating = ratingRes.data.summary?.average?.toFixed(1) || null;
    } catch {}
    return {
        id: w.key,
        title: w.title,
        author: w.authors?.[0]?.name || 'Desconocido',
        description: '',
        image: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg` : null,
        rating,
        publishedDate: null,
    };
};

const mapOpenLibraryBooks = async (works = []) => {
    const mapped = [];
    for (const w of works) {
        const book = await getBasicBookInfo(w);
        mapped.push(book);
    }
    return mapped;
};

const extractDescription = (work) => {
    if (typeof work.description === 'string') return work.description;
    if (work.description?.value) return work.description.value;
    if (work.first_sentence?.value) return work.first_sentence.value;
    return '';
};

const stripHtml = (html) => {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
};

exports.getBookDetails = async (req, res) => {
    const { key } = req.params;

    const isOpenLibraryId = key?.startsWith('/works/') || key?.startsWith('OL');

    try {
        if (isOpenLibraryId) {
            const cleanKey = key.replace(/^\/?works\//, '');

            const workRes = await axios.get(`https://openlibrary.org/works/${cleanKey}.json`);
            const work = workRes.data;

            const rawDescription = extractDescription(work);
            const translatedRaw = rawDescription
                ? await translateToSpanish(rawDescription)
                : '';
            const description = stripHtml(translatedRaw);

            let rating = null;
            try {
                const ratingRes = await axios.get(`https://openlibrary.org/works/${cleanKey}/ratings.json`);
                rating = ratingRes.data.summary?.average?.toFixed(1) || null;
            } catch {
            }

            return res.json({
                title: work.title,
                description,
                rating,
            });
        }

        // fallback
        const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes/${key}`, {
            params: { key: process.env.GOOGLE_BOOKS_API_KEY },
        });

        const info = googleRes.data.volumeInfo;
        const translatedRaw = info.description
            ? await translateToSpanish(info.description)
            : '';
        const description = stripHtml(translatedRaw);

        return res.json({
            title: info.title,
            description,
            rating: null,
        });

    } catch (err) {
        console.error('[getBookDetails]', err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};



exports.getAllBooks = async (_req, res) => {
    try {
        const books = await prisma.book.findMany();
        res.json(books);
    } catch (err) {
        console.error(ERRORS.DB_BOOKS, err);
        res.status(500).json({ error: ERRORS.DB_BOOKS });
    }
};

exports.searchBooks = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: ERRORS.MISSING_QUERY });
    try {
        const { data } = await axios.get('https://openlibrary.org/search.json', {
            params: { q: query, language: 'spa', limit: 10 },
        });
        const results = await mapOpenLibraryBooks(data.docs);
        res.json(results);
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getBestSellersBooks = async (_req, res) => {
    try {
        const { data } = await axios.get('https://openlibrary.org/subjects/bestsellers.json', {
            params: { limit: 10 },
        });
        const mapped = await mapOpenLibraryBooks(data.works);
        res.json(mapped);
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getPopularBooks = async (_req, res) => {
    const subjects = ['fiction.json', 'romance.json'];
    try {
        const results = await Promise.all(
            subjects.map(s =>
                axios.get(`https://openlibrary.org/subjects/${s}`, { params: { limit: 15 } })
            )
        );
        let works = results.flatMap(r => r.data.works);
        works = Array.from(new Map(works.map(w => [w.key, w])).values());
        works.sort((a, b) => (b.edition_count || 0) - (a.edition_count || 0));
        const top = works.slice(0, 12);
        const mapped = await mapOpenLibraryBooks(top);
        res.json(mapped);
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getBooksByGenre = async (req, res) => {
    const genre = req.query.g;
    if (!genre) return res.status(400).json({ error: ERRORS.MISSING_GENRE });
    try {
        const { data } = await axios.get(
            `https://openlibrary.org/subjects/${encodeURIComponent(genre)}.json`,
            { params: { limit: 10 } }
        );
        const mapped = await mapOpenLibraryBooks(data.works);
        res.json(mapped);
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getAdaptedBooks = async (_req, res) => {
    try {
        const { data } = await axios.get('https://openlibrary.org/subjects/motion_pictures.json', {
            params: { limit: 12 }
        });
        const mapped = await mapOpenLibraryBooks(data.works);
        res.json(mapped);
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getNYTBooks = async (_req, res) => {
    try {
        const nyData = await axios.get('https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json', {
            params: { 'api-key': process.env.NYT_KEY }
        });

        const books = await Promise.all(
            nyData.data.results.books.slice(0, 12).map(async (b) => {
                const isbn = b.primary_isbn13;

                const gbRes = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                    params: {
                        q: `isbn:${isbn}`,
                        key: process.env.GOOGLE_BOOKS_API_KEY,
                    },
                });

                const item = gbRes.data.items?.[0];
                const info = item?.volumeInfo;

                if (!info) return null;

                return {
                    id: item.id || isbn,
                    title: info.title || b.title,
                    author: info.authors?.[0] || b.author || 'Desconocido',
                    description: info.description || b.description || '',
                    image: info.imageLinks?.thumbnail || null,
                    rating: `#${b.rank} NYT (${b.weeks_on_list} semanas)`,
                    publishedDate: info.publishedDate || b.published_date || null,
                };
            })
        );

        res.json(books.filter(Boolean));
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getFavorites = async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });
        res.json(favorites.map(f => f.book));
    } catch (err) {
        console.error(ERRORS.FAVORITES_GET, err);
        res.status(500).json({ error: ERRORS.FAVORITES_GET });
    }
};

exports.addFavorite = async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        const favorite = await prisma.favorite.create({ data: { userId, bookId } });
        res.status(201).json(favorite);
    } catch (err) {
        console.error(ERRORS.FAVORITES_ADD, err);
        res.status(500).json({ error: ERRORS.FAVORITES_ADD });
    }
};

exports.removeFavorite = async (req, res) => {
    const { userId, bookId } = req.params;
    try {
        await prisma.favorite.delete({
            where: { userId_bookId: { userId: parseInt(userId), bookId } },
        });
        res.status(204).end();
    } catch (err) {
        console.error(ERRORS.FAVORITES_REMOVE, err);
        res.status(500).json({ error: ERRORS.FAVORITES_REMOVE });
    }
};
