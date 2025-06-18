const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ERROR_RETRIEVING_BOOKS = 'Error al obtener libros';

exports.getAllBooks = async (req, res) => {
    try {
        const books = await prisma.book.findMany();
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: ERROR_RETRIEVING_BOOKS });
    }
};
