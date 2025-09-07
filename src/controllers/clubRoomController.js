// src/controllers/clubRoomController.js
const prisma = require('../database/prisma');

function meFromReq(req) {
    const id = Number(req.user?.userId || 0);
    const name = req.user?.name || 'Usuario';
    const avatar = `https://i.pravatar.cc/150?u=${id || 'guest'}`;
    return { id, name, avatar };
}

// GET /social/clubs/:clubId
exports.getClub = async (req, res) => {
    const { clubId } = req.params;
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: { members: true },
    });
    if (!club) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({
        id: club.id,
        name: club.name,
        cover: club.cover,
        members: club.members.length,
    });
};

// GET /social/clubs/:clubId/chapters
exports.listChapters = async (req, res) => {
    const { clubId } = req.params;

    let chapters = await prisma.clubChapter.findMany({
        where: { clubId },
        orderBy: { chapter: 'asc' },
        include: {
            _count: { select: { comments: true } },
            comments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        },
    });

    // Si no hay capítulos, crear aleatoriamente 8..18
    if (chapters.length === 0) {
        const n = 8 + Math.floor(Math.random() * 11);
        await prisma.$transaction(
            Array.from({ length: n }, (_, i) =>
                prisma.clubChapter.create({ data: { clubId, chapter: i + 1, title: null } })
            )
        );
        chapters = await prisma.clubChapter.findMany({
            where: { clubId },
            orderBy: { chapter: 'asc' },
            include: {
                _count: { select: { comments: true } },
                comments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
            },
        });
    }

    const data = chapters.map((ch) => ({
        id: ch.id,
        chapter: ch.chapter,
        title: ch.title,
        commentsCount: ch._count.comments,
        lastCommentAt: ch.comments[0]?.createdAt ?? null,
    }));
    res.json(data);
};

// POST /social/clubs/:clubId/chapters  { chapter, title? }
exports.createChapter = async (req, res) => {
    const { clubId } = req.params;
    const chapter = parseInt(req.body?.chapter, 10);
    const title = (req.body?.title || '').trim() || null;
    if (!Number.isFinite(chapter) || chapter <= 0) {
        return res.status(400).json({ error: 'INVALID_CHAPTER' });
    }
    const up = await prisma.clubChapter.upsert({
        where: { clubId_chapter: { clubId, chapter } }, // por @@unique([clubId, chapter])
        update: { title },
        create: { clubId, chapter, title },
    });
    res.status(201).json({ id: up.id, chapter: up.chapter, title: up.title });
};

// GET /social/clubs/:clubId/chapters/:chapter/comments?before&limit
exports.listComments = async (req, res) => {
    const { clubId, chapter } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const ch = await prisma.clubChapter.findUnique({
        where: { clubId_chapter: { clubId, chapter: parseInt(chapter, 10) } },
        select: { id: true },
    });
    if (!ch) return res.json([]); // sin capítulo -> sin comentarios

    const where = { chapterId: ch.id };
    if (before) where.createdAt = { lt: before };

    const rows = await prisma.chapterComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: true },
    });

    // Transformar para mantener compatibilidad con el frontend
    const comments = rows.reverse().map((comment) => ({
        id: comment.id,
        userId: comment.userId,
        userName: comment.user.name || comment.user.username,
        userAvatar: comment.user.avatar,
        text: comment.text,
        createdAt: comment.createdAt,
    }));

    res.json(comments);
};

// POST /social/clubs/:clubId/chapters/:chapter/messages  { text }
exports.postMessage = async (req, res) => {
    const { id: userId } = meFromReq(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

    const { clubId, chapter } = req.params;
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'EMPTY' });

    // asegúrate de que el capítulo existe
    const ch = await prisma.clubChapter.upsert({
        where: { clubId_chapter: { clubId, chapter: parseInt(chapter, 10) } },
        update: {},
        create: { clubId, chapter: parseInt(chapter, 10), title: null },
        select: { id: true },
    });

    const comment = await prisma.chapterComment.create({
        data: { chapterId: ch.id, userId, text },
        include: { user: true },
    });

    res.status(201).json({
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        userId: comment.userId,
        userName: comment.user.name || comment.user.username,
        userAvatar: comment.user.avatar,
    });
};

// Alias for test compatibility
exports.getChapterComments = exports.listComments;
exports.addChapterComment = exports.postMessage;
