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
    PASSWORD_CHANGED: 'Contraseña actualizada',
    PASSWORD_ERR: 'Error al cambiar contraseña',
    OLD_PASSWORD_INVALID: 'La contraseña actual es incorrecta',
    PASSWORD_REQUIRED: 'Contraseña actual y nueva contraseña requeridas',
    USER_DELETED: 'Usuario eliminado',
    DELETE_ERR: 'Error al eliminar usuario',
    DELETE_PASSWORD_REQUIRED: 'Contraseña requerida para eliminar cuenta',
};

exports.register = async (req, res) => {
    try {
        const { email, password, name = '' } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ error: 'Email y password requeridos' });
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
        console.log('[getProfile] userId:', userId);

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
                        followers: true,
                    },
                },
            },
        });

        if (!user) {
            console.log('[getProfile] Usuario no encontrado');
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        console.log('[getProfile] Usuario encontrado con _count:', user._count);
        res.json({ user });
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
                return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
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
            return res.status(400).json({ error: 'URL del avatar requerida' });
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
            message: 'Avatar actualizado',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Error al actualizar avatar' });
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
                .json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        // Obtener el usuario actual
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        // Verificar que la contraseña actual sea correcta
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: MSG.OLD_PASSWORD_INVALID });
        }

        // Encriptar la nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar la contraseña en la base de datos
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

// Eliminar usuario
exports.deleteAccount = async (req, res) => {
    try {
        const { userId } = req.user;
        const { password } = req.body;

        // Validar que se proporcione la contraseña
        if (!password) {
            return res.status(400).json({ error: MSG.DELETE_PASSWORD_REQUIRED });
        }

        // Obtener el usuario actual
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return res.status(404).json({ error: MSG.USER_NOT_FOUND });
        }

        // Verificar que la contraseña sea correcta
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: MSG.BAD_CRED });
        }

        // Eliminar el usuario (esto también eliminará automáticamente todos los datos relacionados
        // debido a las restricciones de clave foránea configuradas en Prisma)
        await prisma.user.delete({
            where: { id: userId },
        });

        res.json({ message: MSG.USER_DELETED });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: MSG.DELETE_ERR });
    }
};