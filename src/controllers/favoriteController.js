const prisma = require('../database/prisma');

const safeDecode = (s) => {
    try {
        return decodeURIComponent(String(s ?? ''));
    } catch {
        return String(s ?? '');
    }
};
const normBookId = (raw) => {
    const d = safeDecode(raw).trim();
    if (!d) return '';
    return d.startsWith('/') ? d : '/' + d;
};

function firstIsbn(b = {}) {
    if (Array.isArray(b.isbn) && b.isbn[0]) return String(b.isbn[0]);
    if (typeof b.primary_isbn13 === 'string' && b.primary_isbn13) return b.primary_isbn13;
    if (typeof b.primary_isbn10 === 'string' && b.primary_isbn10) return b.primary_isbn10;
    if (typeof b.isbn13 === 'string' && b.isbn13) return b.isbn13;
    if (typeof b.isbn10 === 'string' && b.isbn10) return b.isbn10;
    if (Array.isArray(b.isbns) && (b.isbns[0]?.isbn13 || b.isbns[0]?.isbn10)) {
        return b.isbns[0].isbn13 || b.isbns[0].isbn10;
    }
    return null;
}

function coverFrom(b = {}) {
    const direct = b.image || b.imageUrl || b.book_image || b.coverUrl || b.cover;
    if (direct) return direct;

    const isbn = firstIsbn(b);
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    if (b.cover_i) return `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg`;
    if (b.title)
        return `https://covers.openlibrary.org/b/title/${encodeURIComponent(b.title)}-L.jpg`;
    return null;
}

exports.getFavorites = async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: 'userId inválido' });

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });

        const out = favorites
            .map(({ book }) => {
                if (!book) {
                    console.warn('Favorite without book found');
                    return null;
                }
                const img = book?.imageUrl || coverFrom(book) || null;
                return {
                    ...book,
                    imageUrl: img,
                    image: img,
                    coverUrl: img,
                    cover: img,
                };
            })
            .filter(Boolean);

        res.json(out);
    } catch (err) {
        console.error('[getFavorites]', err);
        res.status(500).json({ error: 'Error al obtener favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    const userId = Number(req.params.userId);
    const rawBookId = req.params.bookId ?? req.query.bookId ?? req.body.bookId ?? req.body.id;

    if (!Number.isInteger(userId) || !rawBookId) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    try {
        const b = req.body || {};

        let bookId = rawBookId;

        const bookData = b.book || b;

        if (!bookId && bookData.title && bookData.author) {
            bookId = `/books/${encodeURIComponent(bookData.title)}-${encodeURIComponent(bookData.author)}`;
        }

        console.log('[addFavorite] Debug:', {
            userId,
            rawBookId,
            bookId,
            title: bookData.title,
            author: bookData.author,
            description: bookData.description,
            book: b.book,
            fullBody: b,
        });

        const img = coverFrom(bookData);    

        await prisma.book.upsert({
            where: { id: bookId },
            update: {
                title: bookData.title ?? undefined,
                author: bookData.author ?? undefined,
                imageUrl: img ?? undefined,
                description: bookData.description ?? undefined,
                rating: bookData.rating ? String(bookData.rating) : undefined,
                category: bookData.category ?? undefined,
            },
            create: {
                id: bookId,
                title: bookData.title || 'Libro sin título',
                author: bookData.author || 'Autor desconocido',
                imageUrl: img || null,
                description: bookData.description ?? null,
                rating: bookData.rating ? String(bookData.rating) : null,
                category: bookData.category ?? null,
            },
        });

        await prisma.favorite.upsert({
            where: { userId_bookId: { userId, bookId } },
            update: {},
            create: { userId, bookId },
        });

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[addFavorite]', err);
        res.status(500).json({ error: 'Error al añadir favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    const userId = Number(req.params.userId);
    const rawBookId = req.params.bookId ?? req.query.bookId ?? req.body.bookId ?? req.body.id;
    const bookId = normBookId(rawBookId);


    if (!Number.isInteger(userId) || !bookId) {
        console.error('[removeFavorite] Invalid params:', { userId, bookId, rawBookId });
        return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    try {
        const possibleIds = [
            bookId,
            bookId.startsWith('/') ? bookId.substring(1) : '/' + bookId,
            rawBookId,
            rawBookId.startsWith('/') ? rawBookId.substring(1) : '/' + rawBookId,
        ].filter((id, index, arr) => arr.indexOf(id) === index);


        let existingFavorite = null;
        let correctBookId = null;

        for (const id of possibleIds) {
            existingFavorite = await prisma.favorite.findUnique({
                where: { userId_bookId: { userId, bookId: id } },
            });
            if (existingFavorite) {
                correctBookId = id;
                break;
            }
        }

        if (!existingFavorite) {
            console.log('[removeFavorite] Favorite not found with any ID variation');
            return res.status(200).json({ success: true, message: 'Favorito ya eliminado' });
        }

        await prisma.favorite.delete({
            where: { userId_bookId: { userId, bookId: correctBookId } },
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[removeFavorite] Error:', err);
        res.status(500).json({ error: 'Error al quitar favorito' });
    }
};
