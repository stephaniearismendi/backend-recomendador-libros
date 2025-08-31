const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function userFromReq(req) {
    const uid = req.user?.userId || req.body?.userId || 0;
    const name = req.user?.name || 'Usuario';
    const avatar = `https://i.pravatar.cc/150?u=${uid || 'guest'}`;
    return { id: Number(uid), name, avatar };
}

exports.getFeed = async (req, res) => {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: { likes: true, comments: { orderBy: { createdAt: 'asc' } } },
        take: 50,
    });
    const data = posts.map(p => ({
        id: p.id,
        user: { id: p.userId, name: p.userName, avatar: p.userAvatar },
        time: p.createdAt,
        text: p.text || '',
        book: p.bookTitle ? { title: p.bookTitle, author: p.bookAuthor, cover: p.bookCover } : null,
        likes: p.likes.length,
        comments: p.comments.map(c => ({
            id: c.id,
            user: { id: c.userId, name: c.userName, avatar: c.userAvatar },
            text: c.text,
            time: c.createdAt
        }))
    }));
    res.json(data);
};

exports.createPost = async (req, res) => {
    const me = userFromReq(req);
    const { text, book } = req.body || {};
    const created = await prisma.post.create({
        data: {
            userId: me.id || 0,
            userName: me.name,
            userAvatar: me.avatar,
            text: text || null,
            bookTitle: book?.title || null,
            bookAuthor: book?.author || null,
            bookCover: book?.cover || null
        }
    });
    res.status(201).json({ id: created.id });
};

exports.toggleLike = async (req, res) => {
    const me = userFromReq(req);
    const { postId } = req.params;
    const key = { userId_postId: { userId: me.id, postId } };
    const exists = await prisma.like.findUnique({ where: key }).catch(() => null);
    if (exists) {
        await prisma.like.delete({ where: key });
    } else {
        await prisma.like.create({ data: { userId: me.id, postId } });
    }
    const count = await prisma.like.count({ where: { postId } });
    res.json({ liked: !exists, likes: count });
};

exports.addComment = async (req, res) => {
    const me = userFromReq(req);
    const { postId } = req.params;
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'empty' });
    const c = await prisma.comment.create({
        data: {
            postId,
            userId: me.id,
            userName: me.name,
            userAvatar: me.avatar,
            text: text.trim()
        }
    });
    res.status(201).json({
        id: c.id,
        user: { id: c.userId, name: c.userName, avatar: c.userAvatar },
        text: c.text,
        time: c.createdAt
    });
};

exports.getClubs = async (_req, res) => {
    let clubs = await prisma.club.findMany({ include: { members: true } });
    if (clubs.length === 0) {
        const seed = [
            { name: 'Club Austen', cover: 'https://covers.openlibrary.org/b/id/10409424-M.jpg' },
            { name: 'Misterio de Domingo', cover: 'https://covers.openlibrary.org/b/id/11153226-M.jpg' },
            { name: 'Fantasía Chill', cover: 'https://covers.openlibrary.org/b/id/9251956-M.jpg' },
            { name: 'Clásicos Breves', cover: 'https://covers.openlibrary.org/b/id/12091267-M.jpg' },
        ];
        await prisma.$transaction(seed.map(s => prisma.club.create({ data: s })));
        clubs = await prisma.club.findMany({ include: { members: true } });
    }
    res.json(clubs.map(c => ({ id: c.id, name: c.name, cover: c.cover, members: c.members.length })));
};

exports.toggleJoinClub = async (req, res) => {
    const me = userFromReq(req);
    const { clubId } = req.params;
    const key = { userId_clubId: { userId: me.id, clubId } };
    const exists = await prisma.clubMember.findUnique({ where: key }).catch(() => null);
    if (exists) await prisma.clubMember.delete({ where: key });
    else await prisma.clubMember.create({ data: { userId: me.id, clubId } });
    const count = await prisma.clubMember.count({ where: { clubId } });
    res.json({ joined: !exists, members: count });
};

exports.getSuggestions = async (req, res) => {
    try {
        const meId = req.user?.userId || parseInt(req.query.meId, 10) || null;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);

        const following = await prisma.follow.findMany({
            where: { followerId: meId },
            select: { followingId: true },
        });
        const excludeIds = [meId, ...following.map(f => f.followingId)];

        const users = await prisma.user.findMany({
            where: { id: { notIn: excludeIds } },
            select: { id: true, username: true },
            take: limit,
            orderBy: { id: 'desc' },
        });

        const payload = users.map(u => ({
            id: u.id,
            name: u.username,
            avatar: `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestions]', err);
        res.status(500).json({ error: 'SUGGESTIONS_ERROR' });
    }
};


exports.toggleFollow = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });
        if (!targetId || isNaN(targetId)) return res.status(400).json({ error: 'INVALID_TARGET' });
        if (meId === targetId) return res.status(400).json({ error: 'CANNOT_FOLLOW_SELF' });

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

        const whereKey = { followerId_followingId: { followerId: meId, followingId: targetId } };
        const existing = await prisma.follow.findUnique({ where: whereKey });

        let following;
        if (existing) {
            await prisma.follow.delete({ where: whereKey });
            following = false;
        } else {
            await prisma.follow.create({ data: { followerId: meId, followingId: targetId } });
            following = true;
        }

        const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
        const followingCount = await prisma.follow.count({ where: { followerId: meId } });

        res.json({ following, followersCount, followingCount });
    } catch (err) {
        console.error('[toggleFollow]', err);
        res.status(500).json({ error: 'FOLLOW_TOGGLE_ERROR' });
    }
};
