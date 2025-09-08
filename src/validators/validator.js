const AppError = require('../errors/AppError');

class Validator {
    static validate(data, schema, context = 'data') {
        const errors = [];
        const validatedData = {};

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            const fieldErrors = this._validateField(field, value, rules);

            if (fieldErrors.length > 0) {
                errors.push(...fieldErrors);
            } else if (value !== undefined) {
                validatedData[field] = this._sanitizeValue(value, rules);
            } else if (rules.default !== undefined) {
                validatedData[field] = rules.default;
            }
        }

        if (errors.length > 0) {
            throw new AppError(`Validation failed for ${context}: ${errors.join(', ')}`, 400);
        }

        return validatedData;
    }

    static validateBody(body, schema) {
        return this.validate(body, schema, 'request body');
    }

    static validateQuery(query, schema) {
        return this.validate(query, schema, 'query parameters');
    }

    static validateParams(params, schema) {
        return this.validate(params, schema, 'route parameters');
    }

    static _validateField(field, value, rules) {
        const errors = [];

        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} es requerido`);
            return errors;
        }

        if (!rules.required && (value === undefined || value === null || value === '')) {
            return errors;
        }

        if (rules.type && !this._validateType(value, rules.type)) {
            errors.push(`${field} debe ser de tipo ${rules.type}`);
        }

        if (rules.type === 'string' && typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${field} debe tener al menos ${rules.minLength} caracteres`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field} no puede exceder ${rules.maxLength} caracteres`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(rules.message || `${field} no tiene el formato correcto`);
            }
        }

        if (rules.type === 'number') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                errors.push(`${field} debe ser un número válido`);
            } else {
                if (rules.min !== undefined && numValue < rules.min) {
                    errors.push(`${field} debe ser mayor o igual a ${rules.min}`);
                }
                if (rules.max !== undefined && numValue > rules.max) {
                    errors.push(`${field} debe ser menor o igual a ${rules.max}`);
                }
            }
        }

        if (errors.length > 0 && rules.message) {
            errors[0] = rules.message;
        }

        return errors;
    }

    static _validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' || !isNaN(Number(value));
            case 'boolean':
                return typeof value === 'boolean' || value === 'true' || value === 'false';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }

    static _sanitizeValue(value, rules) {
        if (rules.type === 'string' && typeof value === 'string') {
            value = value.trim();
            
            if (rules.toLowerCase) {
                value = value.toLowerCase();
            }
        }

        if (rules.type === 'number') {
            value = Number(value);
        }

        if (rules.type === 'boolean') {
            if (typeof value === 'string') {
                value = value.toLowerCase() === 'true';
            }
        }

        return value;
    }

    static validatePagination(query) {
        const schema = {
            limit: {
                required: false,
                type: 'number',
                min: 1,
                max: 100,
                default: 20,
            },
            offset: {
                required: false,
                type: 'number',
                min: 0,
                default: 0,
            },
        };

        return this.validateQuery(query, schema);
    }

    static validateId(id, type = 'string') {
        if (!id) {
            throw new AppError('ID es requerido', 400);
        }

        if (type === 'number') {
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) {
                throw new AppError('ID debe ser un número válido', 400);
            }
            return numId;
        }

        if (typeof id !== 'string' || id.trim() === '') {
            throw new AppError('ID debe ser una cadena válida', 400);
        }

        return id.trim();
    }
}

module.exports = Validator;
