const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const config = require('../config');
const AppError = require('../errors/AppError');

class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async register(userData) {
        const { email, password, name = '' } = userData;

        if (!email || !password) {
            throw new AppError('Email y password requeridos', 400);
        }

        const emailExists = await this.userRepository.emailExists(email);
        if (emailExists) {
            throw new AppError('Email ya registrado', 409);
        }

        const username = await this.userRepository.generateUniqueUsername(email);

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.userRepository.create({
            email,
            password: hashedPassword,
            name,
            username,
        });

        return {
            message: 'Usuario creado',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
        };
    }

    /**
     * Authenticate user login
     * @param {object} credentials - The login credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @returns {Promise<object>} The authentication result with token
     * @throws {AppError} If credentials are invalid
     */
    async login(credentials) {
        const { email, password } = credentials;

        if (!email || !password) {
            throw new AppError('Credenciales inválidas', 400);
        }

        const user = await this.userRepository.findForAuthentication(email);
        if (!user) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const token = jwt.sign(
            { userId: user.id, name: user.name || '' },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }

    /**
     * Get user profile by ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The user profile
     * @throws {AppError} If user not found
     */
    async getProfile(userId) {
        const user = await this.userRepository.getProfileWithCounts(userId);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        return { user };
    }

    /**
     * Update user profile
     * @param {number} userId - The user ID
     * @param {object} profileData - The profile data to update
     * @returns {Promise<object>} The updated profile
     * @throws {AppError} If username already exists or user not found
     */
    async updateProfile(userId, profileData) {
        const { name, bio, username } = profileData;

        if (username) {
            const existingUser = await this.userRepository.findByUsername(username);
            if (existingUser && existingUser.id !== userId) {
                throw new AppError('El nombre de usuario ya está en uso', 409);
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (username !== undefined) updateData.username = username;

        const updatedUser = await this.userRepository.updateProfile(userId, updateData);

        return {
            message: 'Perfil actualizado',
            user: updatedUser,
        };
    }

    /**
     * Update user avatar
     * @param {number} userId - The user ID
     * @param {string} avatarUrl - The avatar URL
     * @returns {Promise<object>} The updated user
     * @throws {AppError} If avatar URL is not provided
     */
    async updateAvatar(userId, avatarUrl) {
        if (!avatarUrl) {
            throw new AppError('URL del avatar requerida', 400);
        }

        const updatedUser = await this.userRepository.updateById(userId, { avatar: avatarUrl }, {
            select: {
                id: true,
                username: true,
                avatar: true,
            },
        });

        return {
            message: 'Avatar actualizado',
            user: updatedUser,
        };
    }

    /**
     * Change user password
     * @param {number} userId - The user ID
     * @param {object} passwordData - The password change data
     * @param {string} passwordData.currentPassword - Current password
     * @param {string} passwordData.newPassword - New password
     * @returns {Promise<object>} The change result
     * @throws {AppError} If current password is invalid or validation fails
     */
    async changePassword(userId, passwordData) {
        const { currentPassword, newPassword } = passwordData;

        if (!currentPassword || !newPassword) {
            throw new AppError('Contraseña actual y nueva contraseña requeridas', 400);
        }

        if (newPassword.length < 6) {
            throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
        }

        const user = await this.userRepository.findById(userId, {
            select: { id: true, password: true },
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new AppError('La contraseña actual es incorrecta', 401);
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await this.userRepository.updatePassword(userId, hashedNewPassword);

        return { message: 'Contraseña actualizada' };
    }

    /**
     * Delete user account
     * @param {number} userId - The user ID
     * @param {string} password - User password for confirmation
     * @returns {Promise<object>} The deletion result
     * @throws {AppError} If password is invalid or user not found
     */
    async deleteAccount(userId, password) {
        if (!password) {
            throw new AppError('Contraseña requerida para eliminar cuenta', 400);
        }

        const user = await this.userRepository.findById(userId, {
            select: { id: true, password: true },
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Credenciales inválidas', 401);
        }

        // Delete user (cascade will handle related data)
        await this.userRepository.deleteById(userId);

        return { message: 'Usuario eliminado' };
    }

    /**
     * Get user ID by email
     * @param {string} email - The email to search for
     * @returns {Promise<object>} The user ID
     * @throws {AppError} If user not found
     */
    async getUserIdByEmail(email) {
        if (!email) {
            throw new AppError('Email requerido', 400);
        }

        const user = await this.userRepository.findByEmail(email, {
            select: { id: true },
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        return { userId: user.id };
    }

    /**
     * Get user ID from token (for authenticated requests)
     * @param {number} userId - The user ID from token
     * @returns {Promise<object>} The user ID
     */
    async getUserIdFromToken(userId) {
        return { userId };
    }
}

module.exports = UserService;
