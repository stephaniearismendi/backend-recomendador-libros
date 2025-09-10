const FavoriteService = require('../services/FavoriteService');
const asyncHandler = require('../errors/asyncHandler');

const favoriteService = new FavoriteService();

exports.getFavorites = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const favorites = await favoriteService.getFavorites(userId);
    res.json(favorites);
});

exports.addFavorite = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const rawBookId = req.params.bookId ?? req.query.bookId ?? req.body.bookId ?? req.body.id;
    
    const bookData = {
        id: rawBookId,
        ...(req.body.book || req.body)
    };

    const result = await favoriteService.addFavorite(userId, bookData);
    res.status(200).json(result);
});

exports.removeFavorite = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const rawBookId = req.params.bookId ?? req.query.bookId ?? req.body.bookId ?? req.body.id;
    
    const result = await favoriteService.removeFavorite(userId, rawBookId);
    res.status(200).json(result);
});
