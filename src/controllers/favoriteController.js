const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getFavorites = async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });

        const books = favorites.map(fav => fav.book);
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    const userId = parseInt(req.params.userId);
    const bookId = req.params.bookId;
    const {
        title,
        author,
        imageUrl,
        description,
        rating,
        category
    } = req.body;

    try {
        await prisma.book.upsert({
            where: { id: bookId },
            update: {},
            create: {
                id: bookId,
                title,
                author,
                imageUrl,
                description,
                rating,
                category,
            },
        });

        await prisma.favorite.create({
            data: {
                user: { connect: { id: userId } },
                book: { connect: { id: bookId } },
            },
        });

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al agregar favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    const userId = parseInt(req.params.userId);
    const bookId = req.params.bookId;
    try {
        await prisma.favorite.delete({
            where: {
                userId_bookId: {
                    userId: parseInt(userId),
                    bookId,
                },
            },
        });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al quitar favorito' });
    }
};

