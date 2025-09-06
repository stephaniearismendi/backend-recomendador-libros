const prisma = require('../database/prisma');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MSG = {
    BAD_CRED: 'Credenciales inválidas',
    EMAIL_USED: 'Email ya registrado',
    USER_CREATED: 'Usuario creado',
    USER_NOT_FOUND: 'Usuario no encontrado',
    REG_ERR: 'Error en el registro',
    LOGIN_ERR: 'Error al iniciar sesión',
    GET_ME_ERR: 'Error al obtener ID de usuario',
    PROFILE_UPDATED: 'Perfil actualizado',
    PROFILE_ERR: 'Error al actualizar perfil',
    GET_PROFILE_ERR: 'Error al obtener perfil',
};

exports.register = async (req, res) => {
    try {
        const { email, password, name = '' } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(409).json({ error: MSG.EMAIL_USED });

        const hash = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { email, password: hash, name } });
        res.status(201).json({ message: MSG.USER_CREATED });
    } catch (err) {
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

        const token = jwt.sign({ userId: user.id, name: user.name || '' }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

// Obtener perfil completo del usuario
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
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                        following: true,
                        followers: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ error: MSG.GET_PROFILE_ERR });
    }
};

// Actualizar perfil del usuario
exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { name, bio, username } = req.body;

        // Verificar si el username ya existe (si se está cambiando)
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username: username,
                    id: { not: userId }
                }
            });
            if (existingUser) {
                return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(bio !== undefined && { bio }),
                ...(username !== undefined && { username })
            },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                bio: true,
                avatar: true,
                updatedAt: true
            }
        });

        res.json({ 
            message: MSG.PROFILE_UPDATED, 
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: MSG.PROFILE_ERR });
    }
};

// Actualizar avatar del usuario
exports.updateAvatar = async (req, res) => {
    try {
        const { userId } = req.user;
        const { avatar } = req.body;

        if (!avatar) {
            return res.status(400).json({ error: 'URL del avatar requerida' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar },
            select: {
                id: true,
                username: true,
                avatar: true
            }
        });

        res.json({ 
            message: 'Avatar actualizado', 
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Error al actualizar avatar' });
    }
};
