const prisma = require('../database/prisma');
const { AX } = require('../core/http');
const { stripHtml, toFrontendBook } = require('../utils/utils');
const httpService = require('../services/httpService');
const { translateEsFast } = require('../core/providers');

const ERRORS = {
    DB_BOOKS: 'Error al obtener libros',
    OPENLIBRARY: 'Error al consultar libros externos',
    MISSING_QUERY: 'Falta el parámetro `q`',
    MISSING_GENRE: 'Falta el parámetro `g` (género)',
    FAVORITES_GET: 'No se pudieron obtener los favoritos',
    FAVORITES_ADD: 'No se pudo agregar el favorito',
    FAVORITES_REMOVE: 'No se pudo eliminar el favorito',
};

const getBasicBookInfo = async (w) => {
    // Optimización: no buscar rating para mayor velocidad
    const description = extractDescription(w);
    const image = w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-L.jpg` : 
                  w.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${w.cover_edition_key}-L.jpg` : null;
    
    return {
        id: w.key,
        title: w.title || 'Sin título',
        author: w.authors?.[0]?.name || 'Desconocido',
        description: description || '',
        image,
        rating: null, // Sin rating para mayor velocidad
        publishedDate: w.first_publish_year ? new Date(w.first_publish_year, 0, 1) : null,
    };
};

const mapOpenLibraryBooks = async (works = [], subject = null) => {
    const mapped = [];
    for (const w of works) {
        try {
            // Procesamiento directo sin llamadas HTTP para mayor velocidad
            const image = w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-L.jpg` : 
                          w.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${w.cover_edition_key}-L.jpg` : null;
            
            if (w.title && w.title !== 'Sin título' && image) {
                const book = {
                    id: w.key,
                    title: w.title,
                    author: w.authors?.[0]?.name || 'Desconocido',
                    description: extractDescription(w) || '',
                    image,
                    rating: null,
                    publishedDate: w.first_publish_year ? new Date(w.first_publish_year, 0, 1) : null,
                    category: extractGenre(w, subject),
                };
                mapped.push(book);
            }
        } catch (error) {
            console.warn(`Error processing book ${w.key}:`, error.message);
        }
    }
    return mapped;
};

const extractDescription = (work) => {
    if (typeof work.description === 'string') {
        return work.description.length > 500 ? work.description.substring(0, 500) + '...' : work.description;
    }
    if (work.description?.value) {
        const desc = work.description.value;
        return desc.length > 500 ? desc.substring(0, 500) + '...' : desc;
    }
    if (work.first_sentence?.value) {
        return Array.isArray(work.first_sentence.value) 
            ? work.first_sentence.value.join(' ')
            : work.first_sentence.value;
    }
    if (work.subtitle) {
        return work.subtitle;
    }
    return '';
};

const extractGenre = (work, subject = null) => {
    // Prioridad: subject específico > subjects del work > genre > category
    if (subject) return subject;
    
    if (work.subjects && Array.isArray(work.subjects)) {
        // Tomar el primer subject que no sea muy genérico
        const genericSubjects = ['fiction', 'nonfiction', 'books', 'literature'];
        const validSubject = work.subjects.find(s => 
            s && !genericSubjects.includes(s.toLowerCase())
        );
        if (validSubject) return validSubject;
    }
    
    if (work.genre) return work.genre;
    if (work.category) return work.category;
    if (work._subject) return work._subject;
    
    return null;
};

exports.getBookDetails = async (req, res) => {
    const { key } = req.params;
    const isOpenLibraryId = key?.startsWith('/works/') || key?.startsWith('OL');
    const isISBN = /^\d{10,13}$/.test(key); // ISBN de 10 o 13 dígitos

    try {
        // Primero intentar obtener de la base de datos
        try {
            const book = await prisma.book.findUnique({
                where: { id: key }
            });
            
            if (book) {
                return res.json({
                    title: book.title,
                    description: book.description || 'Descripción no disponible',
                    rating: book.rating,
                });
            }
        } catch (dbError) {
            console.warn('Could not fetch book from database:', dbError.message);
        }

        // Si es OpenLibrary ID, usar OpenLibrary
        if (isOpenLibraryId) {
            const cleanKey = key.replace(/^\/?works\//, '');
            const workRes = await AX.get(`https://openlibrary.org/works/${cleanKey}.json`);
            const work = workRes.data;

            const rawDescription = extractDescription(work);
            const translatedRaw = rawDescription ? await translateEsFast(rawDescription) : '';
            const description = stripHtml(translatedRaw);

            return res.json({
                title: work.title,
                description,
                rating: null,
            });
        }

        // Si es ISBN, intentar obtener de NYT primero
        if (isISBN) {
            try {
                const nyData = await AX.get('https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json', {
                    params: { 'api-key': process.env.NYT_KEY },
                    timeout: 5000
                });

                const nytBook = nyData.data.results.books.find(b => b.primary_isbn13 === key);
                if (nytBook) {
                    return res.json({
                        title: nytBook.title,
                        description: nytBook.description || 'Descripción no disponible',
                        rating: `#${nytBook.rank} NYT (${nytBook.weeks_on_list} semanas)`,
                    });
                }
            } catch (nytError) {
                console.warn('Could not fetch from NYT:', nytError.message);
            }

            // Si no está en NYT, intentar Google Books
            try {
                const googleRes = await AX.get(`https://www.googleapis.com/books/v1/volumes`, {
                    params: { q: `isbn:${key}`, key: process.env.GOOGLE_BOOKS_API_KEY },
                    timeout: 5000
                });
                
                const item = googleRes.data.items?.[0];
                const info = item?.volumeInfo;
                
                if (info) {
                    const translatedRaw = info.description ? await translateEsFast(info.description) : '';
                    const description = stripHtml(translatedRaw);

                    return res.json({
                        title: info.title,
                        description,
                        rating: null,
                    });
                }
            } catch (googleError) {
                if (googleError.response?.status === 429) {
                    console.warn('Google Books rate limit exceeded');
                } else {
                    console.warn('Google Books error:', googleError.message);
                }
            }
        }

        // Si no se encuentra en ningún lado
        return res.json({
            title: 'Libro no encontrado',
            description: 'No se pudo obtener información del libro',
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
        res.json(books.map(toFrontendBook));
    } catch (err) {
        console.error(ERRORS.DB_BOOKS, err);
        res.status(500).json({ error: ERRORS.DB_BOOKS });
    }
};

exports.searchBooks = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: ERRORS.MISSING_QUERY });
    
    try {
        const { data } = await AX.get('https://openlibrary.org/search.json', {
            params: { q: query, language: 'spa', limit: 10 },
        });
        const results = await mapOpenLibraryBooks(data.docs);
        res.json(results.map(toFrontendBook));
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getBestSellersBooks = async (_req, res) => {
    try {
        const { data } = await AX.get('https://openlibrary.org/subjects/bestsellers.json', {
            params: { limit: 10 },
        });
        const mapped = await mapOpenLibraryBooks(data.works, 'bestsellers');
        res.json(mapped.map(toFrontendBook));
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getPopularBooks = async (_req, res) => {
    try {
        const subjects = ['fiction.json', 'romance.json'];
        const results = await httpService.getOpenLibrarySubjects(subjects, 15);
        
        if (results.length === 0) {
            return res.json([]);
        }
        
        let works = results.flatMap((r, index) => 
            (r.works || []).map(w => ({ ...w, _subject: subjects[index].replace('.json', '') }))
        );
        works = Array.from(new Map(works.map(w => [w.key, w])).values());
        
        // Filtrar solo libros con portada disponible
        works = works.filter(w => 
            w.title && 
            w.authors && 
            w.authors.length > 0 && 
            (w.cover_i || w.cover_edition_key)
        );
        
        const shuffled = works.sort(() => Math.random() - 0.5);
        const top = shuffled.slice(0, 20);
        
        const mapped = await mapOpenLibraryBooks(top);
        const finalBooks = mapped.map(toFrontendBook);
        
        res.json(finalBooks);
    } catch (err) {
        console.error('Error in getPopularBooks:', err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getBooksByGenre = async (req, res) => {
    const genre = req.query.g;
    if (!genre) return res.status(400).json({ error: ERRORS.MISSING_GENRE });
    try {
        const { data } = await AX.get(
            `https://openlibrary.org/subjects/${encodeURIComponent(genre)}.json`,
            { params: { limit: 10 } }
        );
        const mapped = await mapOpenLibraryBooks(data.works, genre);
        res.json(mapped.map(toFrontendBook));
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getAdaptedBooks = async (_req, res) => {
    try {
        const { data } = await AX.get('https://openlibrary.org/subjects/motion_pictures.json', {
            params: { limit: 12 }
        });
        const mapped = await mapOpenLibraryBooks(data.works, 'motion_pictures');
        res.json(mapped.map(toFrontendBook));
    } catch (err) {
        console.error(ERRORS.OPENLIBRARY, err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getNYTBooks = async (_req, res) => {
    try {
        // Verificar si las API keys están disponibles
        if (!process.env.NYT_KEY || !process.env.GOOGLE_BOOKS_API_KEY) {
            console.warn('NYT or Google Books API keys not configured, returning empty array');
            return res.json([]);
        }

        const nyData = await httpService.getNYTBooks();

        // Crear libros directamente desde los datos del NYT con traducción de descripciones
        const books = await Promise.all(
            nyData.results.books.slice(0, 15).map(async (b) => {
                const isbn = b.primary_isbn13;
                
                // Traducir descripción si existe
                let description = 'Descripción no disponible';
                if (b.description && b.description.trim() !== '') {
                    try {
                        const translatedRaw = await translateEsFast(b.description);
                        description = stripHtml(translatedRaw);
                    } catch (error) {
                        console.warn(`Could not translate description for ${b.title}:`, error.message);
                        description = b.description; // Usar original si falla la traducción
                    }
                }
                
                return {
                    id: isbn || `nyt-${b.rank}`,
                    title: b.title || 'Sin título',
                    author: b.author || 'Desconocido',
                    description,
                    image: b.book_image || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : null), // Usar imagen del NYT primero
                    rating: `#${b.rank} NYT (${b.weeks_on_list} semanas)`,
                    publishedDate: b.published_date || null,
                    category: 'bestseller', // NYT books son bestsellers
                };
            })
        );

        // Filtrar libros que no tengan ni descripción ni portada
        const validBooks = books.filter(book => {
            const hasDescription = book.description && 
                                 book.description.trim() !== '' && 
                                 book.description !== 'Descripción no disponible';
            const hasImage = book.image && book.image.trim() !== '';
            
            // Solo incluir libros que tengan al menos descripción O portada
            return hasDescription || hasImage;
        });

        // Guardar libros NYT en la base de datos para que estén disponibles en getBookDetails
        await Promise.all(
            validBooks.map(async (book) => {
                try {
                    await prisma.book.upsert({
                        where: { id: book.id },
                        update: {
                            title: book.title,
                            author: book.author,
                            description: book.description,
                            imageUrl: book.image,
                            rating: book.rating,
                            category: book.category
                        },
                        create: {
                            id: book.id,
                            title: book.title,
                            author: book.author,
                            description: book.description,
                            imageUrl: book.image,
                            rating: book.rating,
                            category: book.category
                        }
                    });
                } catch (error) {
                    console.warn(`Could not save NYT book ${book.id}:`, error.message);
                }
            })
        );

        res.json(validBooks.map(toFrontendBook));
    } catch (err) {
        console.error('Error in getNYTBooks:', err.message);
        res.status(500).json({ error: ERRORS.OPENLIBRARY });
    }
};

exports.getFavorites = async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });
        
        const validFavorites = favorites.filter(f => f.book);
        const books = validFavorites.map(f => f.book).map(toFrontendBook);
        
        res.json(books);
    } catch (err) {
        console.error('Error getting favorites:', err);
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
