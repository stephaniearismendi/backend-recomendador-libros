/**
 * Service layer exports
 * Centralized exports for all service classes
 */

const UserService = require('./UserService');
const BookService = require('./BookService');

module.exports = {
    UserService,
    BookService,
};
