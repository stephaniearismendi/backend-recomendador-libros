const prisma = require('../database/prisma');

// -------- helpers ----------
const safeDecode = (s) => {
    try { return decodeURIComponent(String(s ?? '')); } catch { return String(s ?? ''); }
};
const normBookId = (raw) => {
    const d = safeDecode(raw).trim();
    if (!d) return '';
    // Si ya tiene barra inicial, mantenerla; si no, agregarla
    return d.startsWith('/') ? d : '/' + d;
};

// ISBN en distintos formatos (NYT incluido)
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

// saca portada de los campos habituales + NYT + OpenLibrary (sin llamadas HTTP)
function coverFrom(b = {}) {
    // Prioridad: image directo, luego imageUrl, luego book_image (NYT)
    const direct = b.image || b.imageUrl || b.book_image || b.coverUrl || b.cover;
    if (direct) return direct;

    const isbn = firstIsbn(b);
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    if (b.cover_i) return `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg`;
    if (b.title) return `https://covers.openlibrary.org/b/title/${encodeURIComponent(b.title)}-L.jpg`;
    return null;
}

// -------- endpoints ----------
exports.getFavorites = async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: 'userId inválido' });

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });

        // asegura que siempre devolvemos una URL de portada
        const out = favorites.map(({ book }) => {
            if (!book) {
                console.warn('Favorite without book found');
                return null;
            }
            const img = book?.imageUrl || coverFrom(book) || null;
            return {
                ...book,
                imageUrl: img,
                image: img,     // por compat con componentes que miran "image"
                coverUrl: img,
                cover: img,
            };
        }).filter(Boolean);

        res.json(out);
    } catch (err) {
        console.error('[getFavorites]', err);
        res.status(500).json({ error: 'Error al obtener favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    const userId = Number(req.params.userId);
    const bookId = normBookId(
        req.params.bookId ?? req.query.bookId ?? req.body.bookId ?? req.body.id
    );
    if (!Number.isInteger(userId) || !bookId) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    try {
        const b = req.body || {};
        const img = coverFrom(b); // incluye NYT (book_image) e ISBN

        // guarda/actualiza el libro con la portada en imageUrl (según tu esquema)
        await prisma.book.upsert({
            where: { id: bookId },
            update: {
                title: b.title ?? undefined,
                author: b.author ?? undefined,
                imageUrl: img ?? undefined,          // 👈 AQUÍ guardamos la URL
                description: b.description ?? undefined,
                rating: b.rating ?? undefined,
                category: b.category ?? undefined,
            },
            create: {
                id: bookId,
                title: b.title || '',
                author: b.author || '',
                imageUrl: img || null,               // 👈 y al crear también
                description: b.description ?? null,
                rating: b.rating ?? null,
                category: b.category ?? null,
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
    
    // console.log('[removeFavorite] Debug:', { userId, rawBookId, bookId });
    
    if (!Number.isInteger(userId) || !bookId) {
        console.error('[removeFavorite] Invalid params:', { userId, bookId, rawBookId });
        return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    try {
        // Buscar el favorito con diferentes variaciones del ID
        const possibleIds = [
            bookId,
            bookId.startsWith('/') ? bookId.substring(1) : '/' + bookId,
            rawBookId,
            rawBookId.startsWith('/') ? rawBookId.substring(1) : '/' + rawBookId
        ].filter((id, index, arr) => arr.indexOf(id) === index); // Eliminar duplicados

        // console.log('[removeFavorite] Trying IDs:', possibleIds);

        let existingFavorite = null;
        let correctBookId = null;

        for (const id of possibleIds) {
            existingFavorite = await prisma.favorite.findUnique({
                where: { userId_bookId: { userId, bookId: id } }
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

        await prisma.favorite.delete({ where: { userId_bookId: { userId, bookId: correctBookId } } });
        // console.log('[removeFavorite] Successfully removed:', { userId, bookId: correctBookId });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[removeFavorite] Error:', err);
        res.status(500).json({ error: 'Error al quitar favorito' });
    }
};
