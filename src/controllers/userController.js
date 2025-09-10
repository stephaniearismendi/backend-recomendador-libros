const prisma = require('../database/prisma');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MSG = {
    BAD_CRED: 'Invalid credentials',
    EMAIL_USED: 'Email already registered',
    USER_CREATED: 'User created',
    USER_NOT_FOUND: 'User not found',
    REG_ERR: 'Registration error',
    LOGIN_ERR: 'Login error',
    GET_ME_ERR: 'Error getting user ID',
    PROFILE_UPDATED: 'Profile updated',
    PROFILE_ERR: 'Error updating profile',
    GET_PROFILE_ERR: 'Error getting profile',
    PASSWORD_CHANGED: 'Password updated',
    PASSWORD_ERR: 'Error changing password',
    OLD_PASSWORD_INVALID: 'Current password is incorrect',
    PASSWORD_REQUIRED: 'Current and new password required',
    USER_DELETED: 'User deleted',
    DELETE_ERR: 'Error deleting user',
    DELETE_PASSWORD_REQUIRED: 'Password required to delete account',
};

exports.register = async (req, res) => {
    try {
        const { email, password, name = '' } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password required' });
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(409).json({ error: MSG.EMAIL_USED });

        const baseUsername = email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;

        while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        const hash = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { email, password: hash, name, username } });
        res.status(201).json({ message: MSG.USER_CREATED });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ error: MSG.REG_ERR });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: MSG.BAD_CRED });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: MSG.BAD_CRED });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: MSG.BAD_CRED });

        const token = jwt.sign({ userId: user.id, name: user.name || '' }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: MSG.LOGIN_ERR });
    }
};

exports.getUserIdByEmail = async (req, res) => {
    try {
        const email = req.query?.email || '';
        const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
        if (!user) return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        res.json({ userId: user.id });
    } catch {
        res.status(500).json({ error: MSG.GET_ME_ERR });
    }
};

exports.getUserIdFromToken = async (req, res) => {
    try {
        const { userId } = req.user;
        res.json({ userId });
    } catch {
        res.status(500).json({ error: MSG.USER_NOT_FOUND });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { userId } = req.user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                bio: true,
                avatar: true,
                createdAt: true,
                stats: true,
                _count: {
                    select: {
                        favorites: true,
                        sessions: true,
                        posts: true,
                        following: true,
                        followers: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        const currentYear = new Date().getFullYear();
        const currentChallenge = await prisma.readingChallenge.findUnique({
            where: {
                userId_year: {
                    userId,
                    year: currentYear
                }
            }
        });

        const userWithGamification = {
            ...user,
            currentChallenge: currentChallenge ? {
                year: currentChallenge.year,
                goal: currentChallenge.goal,
                completed: currentChallenge.completed,
                isCompleted: currentChallenge.isCompleted,
                progress: Math.round((currentChallenge.completed / currentChallenge.goal) * 100)
            } : null
        };

        res.json({ user: userWithGamification });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ error: MSG.GET_PROFILE_ERR });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { name, bio, username } = req.body;

        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username: username,
                    id: { not: userId },
                },
            });
            if (existingUser) {
                return res.status(409).json({ error: 'Username already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(bio !== undefined && { bio }),
                ...(username !== undefined && { username }),
            },
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

        res.json({
            message: MSG.PROFILE_UPDATED,
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: MSG.PROFILE_ERR });
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        const { userId } = req.user;
        const { avatar } = req.body;

        if (!avatar) {
            return res.status(400).json({ error: 'Avatar URL required' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar },
            select: {
                id: true,
                username: true,
                avatar: true,
            },
        });

        res.json({
            message: 'Avatar updated',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Error updating avatar' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: MSG.PASSWORD_REQUIRED });
        }

        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ error: 'New password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: MSG.OLD_PASSWORD_INVALID });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        res.json({ message: MSG.PASSWORD_CHANGED });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: MSG.PASSWORD_ERR });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const { userId } = req.user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        await prisma.$transaction(async (tx) => {
            await tx.favorite.deleteMany({
                where: { userId }
            });

            await tx.readingSession.deleteMany({
                where: { userId }
            });

            await tx.post.deleteMany({
                where: { userId }
            });

            await tx.postComment.deleteMany({
                where: { userId }
            });

            await tx.like.deleteMany({
                where: { userId }
            });

            await tx.chapterComment.deleteMany({
                where: { userId }
            });

            await tx.story.deleteMany({
                where: { userId }
            });

            await tx.follow.deleteMany({
                where: { 
                    OR: [
                        { followerId: userId },
                        { followingId: userId }
                    ]
                }
            });

            await tx.userAchievement.deleteMany({
                where: { userId }
            });

            await tx.userStats.deleteMany({
                where: { userId }
            });

            await tx.readingChallenge.deleteMany({
                where: { userId }
            });

            await tx.clubMember.deleteMany({
                where: { userId }
            });

            await tx.user.delete({
                where: { id: userId }
            });
        });

        res.json({ message: MSG.USER_DELETED });
    } catch (error) {
        res.status(500).json({ error: MSG.DELETE_ERR });
    }
};