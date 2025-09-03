const prisma = require('../database/prisma');

function normBookId(raw) {
    const v = (raw ?? '').toString().trim();
    if (!v) return '';
    return '/' + v.replace(/^\/+/, '');
}

exports.getFavorites = async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: 'userId inválido' });
    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { book: true },
        });
        res.json(favorites.map(f => f.book));
    } catch {
        res.status(500).json({ error: 'Error al obtener favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    const userId = Number(req.params.userId);
    const bookId = normBookId(req.params.bookId || req.query.bookId || req.body.bookId);
    if (!Number.isInteger(userId) || !bookId) return res.status(400).json({ error: 'Parámetros inválidos' });
    try {
        await prisma.book.upsert({
            where: { id: bookId },
            update: {},
            create: { id: bookId, title: req.body?.title || '', author: req.body?.author || '' },
        });
        await prisma.favorite.upsert({
            where: { userId_bookId: { userId, bookId } },
            update: {},
            create: { userId, bookId },
        });
        res.status(200).json({ success: true });
    } catch {
        res.status(500).json({ error: 'Error al añadir favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    const userId = Number(req.params.userId);
    const bookId = normBookId(req.params.bookId || req.query.bookId || req.body.bookId);
    if (!Number.isInteger(userId) || !bookId) return res.status(400).json({ error: 'Parámetros inválidos' });
    try {
        await prisma.favorite.delete({ where: { userId_bookId: { userId, bookId } } });
        res.status(200).json({ success: true });
    } catch {
        res.status(500).json({ error: 'Error al quitar favorito' });
    }
};
