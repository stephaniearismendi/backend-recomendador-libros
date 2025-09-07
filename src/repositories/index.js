/**
 * Repository layer exports
 * Centralized exports for all repository classes
 */

const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const BookRepository = require('./BookRepository');

module.exports = {
    BaseRepository,
    UserRepository,
    BookRepository,
};
