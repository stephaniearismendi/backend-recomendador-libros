/**
 * Repository layer exports
 * Centralized exports for all repository classes
 */

const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const BookRepository = require('./BookRepository');
const FavoriteRepository = require('./FavoriteRepository');
const RecommenderRepository = require('./RecommenderRepository');
const ClubRoomRepository = require('./ClubRoomRepository');

module.exports = {
    BaseRepository,
    UserRepository,
    BookRepository,
    FavoriteRepository,
    RecommenderRepository,
    ClubRoomRepository,
};
