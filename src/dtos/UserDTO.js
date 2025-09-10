/**
 * User Data Transfer Objects (DTOs)
 * Defines the structure of user-related API responses
 */

/**
 * User profile DTO
 * @param {object} user - User data from database
 * @returns {object} Formatted user profile
 */
const userProfileDTO = (user) => {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
        stats: {
            favorites: user._count?.favorites || 0,
            following: user._count?.following || 0,
            followers: user._count?.followers || 0,
        },
    };
};

/**
 * User basic info DTO
 * @param {object} user - User data from database
 * @returns {object} Formatted user basic info
 */
const userBasicDTO = (user) => {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
    };
};

/**
 * User registration response DTO
 * @param {object} user - User data from database
 * @returns {object} Formatted registration response
 */
const userRegistrationDTO = (user) => {
    return {
        message: 'Usuario creado',
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
        },
    };
};

/**
 * User login response DTO
 * @param {object} result - Login result with token and user
 * @returns {object} Formatted login response
 */
const userLoginDTO = (result) => {
    return {
        token: result.token,
        user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
        },
    };
};

/**
 * User profile update response DTO
 * @param {object} user - Updated user data
 * @returns {object} Formatted update response
 */
const userProfileUpdateDTO = (user) => {
    return {
        message: 'Perfil actualizado',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            bio: user.bio,
            avatar: user.avatar,
            updatedAt: user.updatedAt,
        },
    };
};

/**
 * User avatar update response DTO
 * @param {object} user - Updated user data
 * @returns {object} Formatted avatar update response
 */
const userAvatarUpdateDTO = (user) => {
    return {
        message: 'Avatar actualizado',
        user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
        },
    };
};

/**
 * User ID response DTO
 * @param {number} userId - User ID
 * @returns {object} Formatted user ID response
 */
const userIdDTO = (userId) => {
    return { userId };
};

/**
 * Success message DTO
 * @param {string} message - Success message
 * @returns {object} Formatted success response
 */
const successMessageDTO = (message) => {
    return { message };
};

module.exports = {
    userProfileDTO,
    userBasicDTO,
    userRegistrationDTO,
    userLoginDTO,
    userProfileUpdateDTO,
    userAvatarUpdateDTO,
    userIdDTO,
    successMessageDTO,
};
