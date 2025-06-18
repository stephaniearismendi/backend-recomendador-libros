const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.addFavorite = async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        const favorite = await prisma.favorite.create({
            data: { userId, bookId },
        });
        res.status(201).json(favorite);
    } catch (err) {
        res.status(500).json({ error: 'Error al agregar favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    const { userId, bookId } = req.params;
    try {
        await prisma.favorite.deleteMany({ where: { userId: parseInt(userId), bookId: parseInt(bookId) } });
        res.json({ message: 'Favorito eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar favorito' });
    }
};
