const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CREDENTIAL_INVALID = 'Credenciales inválidas';
const EMAIL_REGISTERED = 'Email ya registrado';
const EMAIL_REQUIRED = 'Email requerido';
const USER_CREATED = 'Usuario creado';
const USER_NOT_FOUND = 'Usuario no encontrado';
const REGISTER_ERROR = 'Error en el registro';
const LOGIN_ERROR = 'Error al iniciar sesión';
const GET_USER_ERROR = 'Error al obtener ID de usuario';

const prisma = new PrismaClient();

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: EMAIL_REGISTERED });

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, email, password: hashed },
        });
        res.status(201).json({ message: USER_CREATED, user });
    } catch (err) {
        res.status(500).json({ error: REGISTER_ERROR });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: CREDENTIAL_INVALID });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: CREDENTIAL_INVALID });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: LOGIN_ERROR });
    }
};

exports.getUserIdByEmail = async (req, res) => {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: EMAIL_REQUIRED });

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!user) return res.status(404).json({ error: USER_NOT_FOUND });

        res.json({ id: user.id });
    } catch (err) {
        res.status(500).json({ error: GET_USER_ERROR });
    }
};

exports.getUserIdFromToken = async (req, res) => {
    try {
        const { userId } = req.user;
        res.status(200).json({ userId });
    } catch (err) {
        res.status(500).json({ error: USER_NOT_FOUND });
    }
};


