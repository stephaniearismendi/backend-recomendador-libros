/**
 * Service layer exports
 * Centralized exports for all service classes
 */

const UserService = require('./UserService');
const BookService = require('./BookService');
const FavoriteService = require('./FavoriteService');
const GamificationService = require('./GamificationService');
const ReadingSessionService = require('./ReadingSessionService');
const RecommenderService = require('./RecommenderService');
const ClubRoomService = require('./ClubRoomService');

module.exports = {
    UserService,
    BookService,
    FavoriteService,
    GamificationService,
    ReadingSessionService,
    RecommenderService,
    ClubRoomService,
};
