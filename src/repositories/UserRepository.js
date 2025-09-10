const BaseRepository = require('./BaseRepository');

/**
 * User Repository - Handles all user-related database operations
 * Extends BaseRepository with user-specific methods
 */
class UserRepository extends BaseRepository {
    constructor() {
        super('user');
    }

    /**
     * Find user by email
     * @param {string} email - The email to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<object|null>} The found user or null
     */
    async findByEmail(email, options = {}) {
        return this.findOne({ email }, options);
    }

    /**
     * Find user by username
     * @param {string} username - The username to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<object|null>} The found user or null
     */
    async findByUsername(username, options = {}) {
        return this.findOne({ username }, options);
    }

    /**
     * Check if email exists
     * @param {string} email - The email to check
     * @returns {Promise<boolean>} True if email exists, false otherwise
     */
    async emailExists(email) {
        return this.exists({ email });
    }

    /**
     * Check if username exists
     * @param {string} username - The username to check
     * @returns {Promise<boolean>} True if username exists, false otherwise
     */
    async usernameExists(username) {
        return this.exists({ username });
    }

    /**
     * Get user profile with counts
     * @param {number} userId - The user ID
     * @returns {Promise<object|null>} The user profile with counts
     */
    async getProfileWithCounts(userId) {
        return this.findById(userId, {
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                bio: true,
                avatar: true,
                createdAt: true,
                _count: {
                    select: {
                        favorites: true,
                        following: true,
                        followers: true,
                    },
                },
            },
        });
    }

    /**
     * Generate unique username based on email
     * @param {string} email - The email to generate username from
     * @returns {Promise<string>} A unique username
     */
    async generateUniqueUsername(email) {
        const baseUsername = email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        
        let username = baseUsername;
        let counter = 1;

        while (await this.usernameExists(username)) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        return username;
    }

    /**
     * Update user profile
     * @param {number} userId - The user ID
     * @param {object} profileData - The profile data to update
     * @returns {Promise<object>} The updated user
     */
    async updateProfile(userId, profileData) {
        return this.updateById(userId, profileData, {
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                bio: true,
                avatar: true,
                updatedAt: true,
            },
        });
    }

    /**
     * Update user password
     * @param {number} userId - The user ID
     * @param {string} hashedPassword - The hashed password
     * @returns {Promise<object>} The updated user
     */
    async updatePassword(userId, hashedPassword) {
        return this.updateById(userId, { password: hashedPassword });
    }

    /**
     * Get user with password for authentication
     * @param {string} email - The email to search for
     * @returns {Promise<object|null>} The user with password or null
     */
    async findForAuthentication(email) {
        return this.findByEmail(email, {
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
            },
        });
    }
}

module.exports = UserRepository;
