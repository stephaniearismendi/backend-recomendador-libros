/**
 * Validation schemas for request validation
 * Centralized validation rules for API endpoints
 */

const validationSchemas = {
    // User validation schemas
    user: {
        register: {
            email: {
                required: true,
                type: 'string',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email debe ser válido',
            },
            password: {
                required: true,
                type: 'string',
                minLength: 6,
                message: 'Password debe tener al menos 6 caracteres',
            },
            name: {
                required: false,
                type: 'string',
                maxLength: 100,
                message: 'Nombre no puede exceder 100 caracteres',
            },
        },
        login: {
            email: {
                required: true,
                type: 'string',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email debe ser válido',
            },
            password: {
                required: true,
                type: 'string',
                message: 'Password es requerido',
            },
        },
        updateProfile: {
            name: {
                required: false,
                type: 'string',
                maxLength: 100,
                message: 'Nombre no puede exceder 100 caracteres',
            },
            bio: {
                required: false,
                type: 'string',
                maxLength: 500,
                message: 'Bio no puede exceder 500 caracteres',
            },
            username: {
                required: false,
                type: 'string',
                pattern: /^[a-zA-Z0-9_]+$/,
                minLength: 3,
                maxLength: 30,
                message: 'Username debe contener solo letras, números y guiones bajos (3-30 caracteres)',
            },
        },
        updateAvatar: {
            avatar: {
                required: true,
                type: 'string',
                pattern: /^https?:\/\/.+/,
                message: 'Avatar debe ser una URL válida',
            },
        },
        changePassword: {
            currentPassword: {
                required: true,
                type: 'string',
                message: 'Contraseña actual es requerida',
            },
            newPassword: {
                required: true,
                type: 'string',
                minLength: 6,
                message: 'Nueva contraseña debe tener al menos 6 caracteres',
            },
        },
        deleteAccount: {
            password: {
                required: true,
                type: 'string',
                message: 'Contraseña es requerida para eliminar cuenta',
            },
        },
    },

    // Book validation schemas
    book: {
        create: {
            id: {
                required: true,
                type: 'string',
                minLength: 1,
                message: 'ID del libro es requerido',
            },
            title: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 200,
                message: 'Título es requerido y no puede exceder 200 caracteres',
            },
            author: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 100,
                message: 'Autor es requerido y no puede exceder 100 caracteres',
            },
            imageUrl: {
                required: false,
                type: 'string',
                pattern: /^https?:\/\/.+/,
                message: 'URL de imagen debe ser válida',
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 1000,
                message: 'Descripción no puede exceder 1000 caracteres',
            },
            rating: {
                required: false,
                type: 'string',
                pattern: /^[0-9]+(\.[0-9]+)?$/,
                message: 'Rating debe ser un número válido',
            },
            category: {
                required: false,
                type: 'string',
                maxLength: 50,
                message: 'Categoría no puede exceder 50 caracteres',
            },
        },
        update: {
            title: {
                required: false,
                type: 'string',
                minLength: 1,
                maxLength: 200,
                message: 'Título no puede exceder 200 caracteres',
            },
            author: {
                required: false,
                type: 'string',
                minLength: 1,
                maxLength: 100,
                message: 'Autor no puede exceder 100 caracteres',
            },
            imageUrl: {
                required: false,
                type: 'string',
                pattern: /^https?:\/\/.+/,
                message: 'URL de imagen debe ser válida',
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 1000,
                message: 'Descripción no puede exceder 1000 caracteres',
            },
            rating: {
                required: false,
                type: 'string',
                pattern: /^[0-9]+(\.[0-9]+)?$/,
                message: 'Rating debe ser un número válido',
            },
            category: {
                required: false,
                type: 'string',
                maxLength: 50,
                message: 'Categoría no puede exceder 50 caracteres',
            },
        },
        search: {
            title: {
                required: false,
                type: 'string',
                maxLength: 100,
                message: 'Título de búsqueda no puede exceder 100 caracteres',
            },
            author: {
                required: false,
                type: 'string',
                maxLength: 100,
                message: 'Autor de búsqueda no puede exceder 100 caracteres',
            },
            category: {
                required: false,
                type: 'string',
                maxLength: 50,
                message: 'Categoría no puede exceder 50 caracteres',
            },
            limit: {
                required: false,
                type: 'number',
                min: 1,
                max: 100,
                message: 'Límite debe estar entre 1 y 100',
            },
            offset: {
                required: false,
                type: 'number',
                min: 0,
                message: 'Offset debe ser mayor o igual a 0',
            },
        },
    },

    // Query parameter validation
    query: {
        pagination: {
            limit: {
                required: false,
                type: 'number',
                min: 1,
                max: 100,
                default: 20,
                message: 'Límite debe estar entre 1 y 100',
            },
            offset: {
                required: false,
                type: 'number',
                min: 0,
                default: 0,
                message: 'Offset debe ser mayor o igual a 0',
            },
        },
        email: {
            email: {
                required: true,
                type: 'string',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email debe ser válido',
            },
        },
    },
};

module.exports = validationSchemas;
