const Validator = require('../validators/validator');
const validationSchemas = require('../validators/validationSchemas');

/**
 * Middleware factory for request validation
 * Creates validation middleware for different types of requests
 */
class ValidationMiddleware {
    /**
     * Create validation middleware for request body
     * @param {string} schemaPath - The path to the validation schema (e.g., 'user.register')
     * @returns {Function} Express middleware function
     */
    static validateBody(schemaPath) {
        return (req, res, next) => {
            try {
                const schema = this._getSchemaByPath(schemaPath);
                req.body = Validator.validateBody(req.body, schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Create validation middleware for query parameters
     * @param {string} schemaPath - The path to the validation schema
     * @returns {Function} Express middleware function
     */
    static validateQuery(schemaPath) {
        return (req, res, next) => {
            try {
                const schema = this._getSchemaByPath(schemaPath);
                req.query = Validator.validateQuery(req.query, schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Create validation middleware for route parameters
     * @param {string} schemaPath - The path to the validation schema
     * @returns {Function} Express middleware function
     */
    static validateParams(schemaPath) {
        return (req, res, next) => {
            try {
                const schema = this._getSchemaByPath(schemaPath);
                req.params = Validator.validateParams(req.params, schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Create validation middleware for pagination parameters
     * @returns {Function} Express middleware function
     */
    static validatePagination() {
        return (req, res, next) => {
            try {
                req.query = Validator.validatePagination(req.query);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Create validation middleware for ID parameter
     * @param {string} paramName - The name of the ID parameter (default: 'id')
     * @param {string} type - The type of ID ('string' or 'number')
     * @returns {Function} Express middleware function
     */
    static validateId(paramName = 'id', type = 'string') {
        return (req, res, next) => {
            try {
                req.params[paramName] = Validator.validateId(req.params[paramName], type);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Get schema by path (e.g., 'user.register' -> validationSchemas.user.register)
     * @private
     * @param {string} path - The schema path
     * @returns {object} The validation schema
     * @throws {Error} If schema path is invalid
     */
    static _getSchemaByPath(path) {
        const pathParts = path.split('.');
        let schema = validationSchemas;

        for (const part of pathParts) {
            if (!schema[part]) {
                throw new Error(`Validation schema not found: ${path}`);
            }
            schema = schema[part];
        }

        return schema;
    }
}

// Convenience functions for common validations
const validateUserRegister = ValidationMiddleware.validateBody('user.register');
const validateUserLogin = ValidationMiddleware.validateBody('user.login');
const validateUserUpdateProfile = ValidationMiddleware.validateBody('user.updateProfile');
const validateUserUpdateAvatar = ValidationMiddleware.validateBody('user.updateAvatar');
const validateUserChangePassword = ValidationMiddleware.validateBody('user.changePassword');
const validateUserDeleteAccount = ValidationMiddleware.validateBody('user.deleteAccount');

const validateBookCreate = ValidationMiddleware.validateBody('book.create');
const validateBookUpdate = ValidationMiddleware.validateBody('book.update');
const validateBookSearch = ValidationMiddleware.validateQuery('book.search');

const validateEmailQuery = ValidationMiddleware.validateQuery('query.email');
const validatePagination = ValidationMiddleware.validatePagination();

const validateUserId = ValidationMiddleware.validateId('id', 'number');
const validateBookId = ValidationMiddleware.validateId('id', 'string');

module.exports = {
    ValidationMiddleware,
    // User validations
    validateUserRegister,
    validateUserLogin,
    validateUserUpdateProfile,
    validateUserUpdateAvatar,
    validateUserChangePassword,
    validateUserDeleteAccount,
    // Book validations
    validateBookCreate,
    validateBookUpdate,
    validateBookSearch,
    // Common validations
    validateEmailQuery,
    validatePagination,
    validateUserId,
    validateBookId,
};
