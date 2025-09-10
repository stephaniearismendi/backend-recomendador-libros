const prisma = require('../database/prisma');

function userFromReq(req) {
    const uid = req.user?.userId || req.body?.userId || 0;
    const name = req.user?.name || 'Usuario';
    const avatar = req.user?.avatar || `https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png`;
    return { id: Number(uid), name, avatar };
}

exports.getFeed = async (req, res) => {
    try {
        const meId = req.user?.userId || null;

        let posts;
        if (meId) {
            posts = await prisma.post.findMany({
                where: {
                    user: {
                        followers: {
                            some: { followerId: meId },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    book: true,
                    likes: true,
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: true },
                    },
                },
                take: 50,
            });
        } else {
            posts = await prisma.post.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    book: true,
                    likes: true,
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: true },
                    },
                },
                take: 50,
            });
        }

        console.log(`[getFeed] Found ${posts.length} posts`);

        const data = posts.map((p) => ({
            id: p.id,
            user: { id: p.user.id, name: p.user.name || p.user.username, avatar: p.user.avatar },
            time: p.createdAt,
            text: p.text || '',
            book: p.book
                ? {
                    id: p.book.id,
                    title: p.book.title,
                    author: p.book.author,
                    cover: p.book.imageUrl,
                }
                : null,
            likes: p.likes.length,
            comments: p.comments.map((c) => ({
                id: c.id,
                user: {
                    id: c.user.id,
                    name: c.user.name || c.user.username,
                    avatar: c.user.avatar,
                },
                text: c.text,
                time: c.createdAt,
                book: c.bookTitle
                    ? {
                        title: c.bookTitle,
                        author: c.bookAuthor,
                        cover: c.bookCover,
                        id: `/books/${encodeURIComponent(c.bookTitle)}-${encodeURIComponent(c.bookAuthor || '')}`,
                    }
                    : null,
            })),
        }));

        res.json(data);
    } catch (error) {
        console.error('[getFeed]', error);
        res.status(500).json({ error: 'FEED_ERROR' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const { text, bookId, book } = req.body || {};
        let finalBookId = bookId;

        if (book && book.title && book.author) {
            const bookIdToUse =
                book.id ||
                `/books/${encodeURIComponent(book.title)}-${encodeURIComponent(book.author)}`;

            let existingBook = await prisma.book.findUnique({
                where: { id: bookIdToUse },
            });

            if (!existingBook) {
                existingBook = await prisma.book.create({
                    data: {
                        id: bookIdToUse,
                        title: book.title,
                        author: book.author,
                        imageUrl: book.cover || null,
                        description: book.description || null,
                        rating: book.rating ? String(book.rating) : null,
                        category: book.category || null,
                    },
                });
            } else {
                const updateData = {};
                if (book.description && !existingBook.description)
                    updateData.description = book.description;
                if (book.rating && !existingBook.rating) updateData.rating = String(book.rating);
                if (book.category && !existingBook.category) updateData.category = book.category;
                if (book.cover && !existingBook.imageUrl) updateData.imageUrl = book.cover;

                if (Object.keys(updateData).length > 0) {
                    existingBook = await prisma.book.update({
                        where: { id: bookIdToUse },
                        data: updateData,
                    });
                }
            }

            finalBookId = existingBook.id;
        }

        if (finalBookId && !book) {
            const book = await prisma.book.findUnique({
                where: { id: finalBookId },
            });
            if (!book) {
                return res.status(400).json({ error: 'BOOK_NOT_FOUND' });
            }
        }

        const created = await prisma.post.create({
            data: {
                userId: meId,
                text: text || null,
                bookId: finalBookId || null,
            },
            include: {
                user: true,
                book: true,
            },
        });

        const response = {
            id: created.id,
            user: {
                id: created.user.id,
                name: created.user.name || created.user.username,
                avatar: created.user.avatar,
            },
            time: created.createdAt,
            text: created.text || '',
            book: created.book
                ? {
                    id: created.book.id,
                    title: created.book.title,
                    author: created.book.author,
                    cover: created.book.imageUrl,
                }
                : null,
            likes: 0,
            comments: [],
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('[createPost]', error);
        res.status(500).json({ error: 'CREATE_POST_ERROR' });
    }
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
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const { postId } = req.params;
        const { text, book } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: 'EMPTY_COMMENT' });

        const comment = await prisma.postComment.create({
            data: {
                postId,
                userId: meId,
                text: text.trim(),
                bookTitle: book?.title || null,
                bookAuthor: book?.author || null,
                bookCover: book?.cover || null,
            },
            include: { user: true },
        });

        res.status(201).json({
            id: comment.id,
            user: {
                id: comment.user.id,
                name: comment.user.name || comment.user.username,
                avatar: comment.user.avatar,
            },
            text: comment.text,
            time: comment.createdAt,
            book: comment.bookTitle
                ? {
                    title: comment.bookTitle,
                    author: comment.bookAuthor,
                    cover: comment.bookCover,
                    id: `/books/${encodeURIComponent(comment.bookTitle)}-${encodeURIComponent(comment.bookAuthor || '')}`,
                }
                : null,
        });
    } catch (error) {
        console.error('[addComment]', error);
        res.status(500).json({ error: 'ADD_COMMENT_ERROR' });
    }
};

exports.getClubs = async (_req, res) => {
    const clubs = await prisma.club.findMany({ include: { members: true } });
    res.json(
        clubs.map((c) => ({ id: c.id, name: c.name, cover: c.cover, members: c.members.length }))
    );
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

        // Get users that the user follows
        const following = await prisma.follow.findMany({
            where: { followerId: meId },
            select: { followingId: true },
        });
        const excludeIds = [meId, ...following.map((f) => f.followingId)];

        // Get users suggested from the DB
        const users = await prisma.user.findMany({
            where: { id: { notIn: excludeIds } },
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                avatar: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
            take: limit,
            orderBy: { id: 'desc' },
        });


        if (users.length === 0) {
            return res.json([]);
        }

        const payload = users.map((u) => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestions]', err);
        res.json([]);
    }
};

exports.getSuggestionsNoAuth = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);

        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                avatar: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
            take: limit,
            orderBy: { id: 'desc' },
        });

        const payload = users.map((u) => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestionsNoAuth]', err);
        res.status(500).json({ error: 'SUGGESTIONS_ERROR' });
    }
};

exports.getSuggestionsTemp = async (req, res) => {
    try {
        const meId = parseInt(req.query.meId || '1', 10);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);

        // Get users that the user follows
        const following = await prisma.follow.findMany({
            where: { followerId: meId },
            select: { followingId: true },
        });
        // Exclude the user and the users that the user follows
        const excludeIds = [meId, ...following.map((f) => f.followingId)];

        const users = await prisma.user.findMany({
            where: { id: { notIn: excludeIds } },
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                avatar: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
            take: limit,
            orderBy: { id: 'desc' },
        });

        const payload = users.map((u) => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestionsTemp]', err);
        res.status(500).json({ error: 'SUGGESTIONS_ERROR' });
    }
};

// Endpoint simple to get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                avatar: true,
            },
            orderBy: { id: 'desc' },
        });

        const payload = users.map((u) => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: 0,
            followingCount: 0,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getAllUsers]', err);
        res.status(500).json({ error: 'USERS_ERROR' });
    }
};

exports.getFollowers = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'INVALID_USER_ID' });
        }

        // Get the followers of the user
        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        bio: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const payload = followers.map((f) => ({
            id: f.follower.id,
            name: f.follower.name || f.follower.username,
            username: f.follower.username,
            bio: f.follower.bio,
            avatar: f.follower.avatar || `https://i.pravatar.cc/150?u=${f.follower.id}`,
            followedAt: f.createdAt,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getFollowers]', err);
        res.status(500).json({ error: 'FOLLOWERS_ERROR' });
    }
};

// Get users that the user follows
exports.getFollowing = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'INVALID_USER_ID' });
        }

        // Get the users that the user follows
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        bio: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const payload = following.map((f) => ({
            id: f.following.id,
            name: f.following.name || f.following.username,
            username: f.following.username,
            bio: f.following.bio,
            avatar: f.following.avatar || `https://i.pravatar.cc/150?u=${f.following.id}`,
            followedAt: f.createdAt,
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getFollowing]', err);
        res.status(500).json({ error: 'FOLLOWING_ERROR' });
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

        res.json({
            following,
            followersCount,
            followingCount,
            message: following ? 'Usuario seguido' : 'Usuario dejado de seguir',
        });
    } catch (err) {
        console.error('[toggleFollow]', err);
        res.status(500).json({ error: 'FOLLOW_TOGGLE_ERROR' });
    }
};

exports.followUser = async (req, res) => {
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

        if (existing) {
            return res.status(409).json({ error: 'ALREADY_FOLLOWING' });
        }

        await prisma.follow.create({ data: { followerId: meId, followingId: targetId } });

        const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
        const followingCount = await prisma.follow.count({ where: { followerId: meId } });

        res.json({
            following: true,
            followersCount,
            followingCount,
            message: 'Usuario seguido exitosamente',
        });
    } catch (err) {
        console.error('[followUser]', err);
        res.status(500).json({ error: 'FOLLOW_ERROR' });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });
        if (!targetId || isNaN(targetId)) return res.status(400).json({ error: 'INVALID_TARGET' });
        if (meId === targetId) return res.status(400).json({ error: 'CANNOT_UNFOLLOW_SELF' });

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

        const whereKey = { followerId_followingId: { followerId: meId, followingId: targetId } };
        const existing = await prisma.follow.findUnique({ where: whereKey });

        if (!existing) {
            return res.status(409).json({ error: 'NOT_FOLLOWING' });
        }

        await prisma.follow.delete({ where: whereKey });

        const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
        const followingCount = await prisma.follow.count({ where: { followerId: meId } });

        res.json({
            following: false,
            followersCount,
            followingCount,
            message: 'Usuario dejado de seguir exitosamente',
        });
    } catch (err) {
        console.error('[unfollowUser]', err);
        res.status(500).json({ error: 'UNFOLLOW_ERROR' });
    }
};

exports.getFollowStatus = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });
        if (!targetId || isNaN(targetId)) return res.status(400).json({ error: 'INVALID_TARGET' });

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

        const whereKey = { followerId_followingId: { followerId: meId, followingId: targetId } };
        const existing = await prisma.follow.findUnique({ where: whereKey });

        const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
        const followingCount = await prisma.follow.count({ where: { followerId: meId } });

        res.json({
            following: !!existing,
            followersCount,
            followingCount,
            isOwnProfile: meId === targetId,
        });
    } catch (err) {
        console.error('[getFollowStatus]', err);
        res.status(500).json({ error: 'FOLLOW_STATUS_ERROR' });
    }
};

exports.createClub = async (req, res) => {
    try {
        const { name, cover, chapters = 0, titles = [] } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'NAME_REQUIRED' });
        }

        const club = await prisma.club.create({
            data: { name: String(name).trim(), cover: cover || null },
        });

        const n = Math.max(0, parseInt(chapters, 10) || 0);
        if (n > 0) {
            const toCreate = Array.from({ length: n }, (_, i) => i + 1);
            const createdChapters = await prisma.$transaction(
                toCreate.map((num) =>
                    prisma.clubChapter.create({
                        data: {
                            clubId: club.id,
                            chapter: num,
                            title:
                                (Array.isArray(titles) &&
                                    titles[num - 1] &&
                                    String(titles[num - 1]).trim()) ||
                                null,
                        },
                    })
                )
            );

            await generateRandomChapterComments(createdChapters);
        }

        res.status(201).json({ id: club.id, name: club.name, cover: club.cover });
    } catch (e) {
        console.error('[createClub]', e);
        res.status(500).json({ error: 'CREATE_CLUB_ERROR' });
    }
};

async function generateRandomChapterComments(chapters) {
    try {
        const users = await prisma.user.findMany({
            select: { id: true },
            take: 20,
        });

        if (users.length === 0) {
            console.log('No users available to generate comments');
            return;
        }

        const sampleComments = [
            '¡Qué capítulo tan interesante! Me encanta cómo se desarrolla la trama.',
            'Este capítulo me dejó con muchas preguntas. ¿Qué opinan ustedes?',
            'La descripción de los personajes en este capítulo es increíble.',
            'No puedo esperar a leer el siguiente capítulo. ¡Qué suspenso!',
            'Este capítulo me recordó a otra obra que leí. ¿Alguien más notó la similitud?',
            'La prosa del autor en este capítulo es simplemente hermosa.',
            'Me encanta cómo el autor maneja los diálogos aquí.',
            'Este capítulo cambió completamente mi perspectiva sobre el protagonista.',
            '¿Alguien más se sintió identificado con lo que pasó en este capítulo?',
            'La ambientación en este capítulo es perfecta para la historia.',
            'No me esperaba ese giro en la trama. ¡Qué sorpresa!',
            'Este capítulo me hizo reflexionar mucho sobre el tema principal.',
            'La tensión en este capítulo es palpable. ¡Excelente escritura!',
            'Me encanta cómo el autor construye el mundo en este capítulo.',
            'Este capítulo tiene algunos de mis pasajes favoritos del libro.',
            'La evolución del personaje en este capítulo es notable.',
            '¿Qué piensan sobre el simbolismo en este capítulo?',
            'Este capítulo me emocionó mucho. ¡Qué bien escrito!',
            'La estructura narrativa de este capítulo es muy inteligente.',
            'Este capítulo me dejó con ganas de más. ¡Qué adictivo!',
        ];

        for (const chapter of chapters) {
            const numComments = Math.floor(Math.random() * 8) + 3;
            const chapterComments = [];

            for (let i = 0; i < numComments; i++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const randomComment =
                    sampleComments[Math.floor(Math.random() * sampleComments.length)];

                chapterComments.push({
                    chapterId: chapter.id,
                    userId: randomUser.id,
                    text: randomComment,
                });
            }

            if (chapterComments.length > 0) {
                await prisma.chapterComment.createMany({
                    data: chapterComments,
                });
            }
        }

        console.log(`Random comments generated for ${chapters.length} chapters`);
    } catch (error) {
        console.error('Error generating random comments:', error);
    }
}

exports.generateChapterComments = async (req, res) => {
    try {
        const { clubId } = req.params;

        if (!clubId) {
            return res.status(400).json({ error: 'Club ID required' });
        }

        const chapters = await prisma.clubChapter.findMany({
            where: { clubId },
            select: { id: true, chapter: true, title: true },
        });

        if (chapters.length === 0) {
            return res.status(404).json({ error: 'No chapters found in this club' });
        }

        await generateRandomChapterComments(chapters);

        res.json({
            message: `Comments generated for ${chapters.length} chapters`,
            chapters: chapters.length,
        });
    } catch (error) {
        console.error('Error generating comments for existing chapters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ========== STORIES ENDPOINTS ==========

exports.createStory = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const { content, bookTitle, bookCover } = req.body || {};
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'CONTENT_REQUIRED' });
        }

        // Expire in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = await prisma.story.create({
            data: {
                userId: meId,
                content: content.trim(),
                bookTitle: bookTitle || null,
                bookCover: bookCover || null,
                expiresAt,
            },
            include: { user: true },
        });

        res.status(201).json({
            id: story.id,
            content: story.content,
            book: story.bookTitle
                ? {
                    title: story.bookTitle,
                    cover: story.bookCover,
                }
                : null,
            user: {
                id: story.user.id,
                name: story.user.name || story.user.username,
                avatar: story.user.avatar,
            },
            createdAt: story.createdAt,
            expiresAt: story.expiresAt,
        });
    } catch (error) {
        console.error('[createStory]', error);
        res.status(500).json({ error: 'CREATE_STORY_ERROR' });
    }
};

exports.getStories = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const stories = await prisma.story.findMany({
            where: {
                user: {
                    followers: {
                        some: { followerId: meId },
                    },
                },
                expiresAt: {
                    gt: new Date(), 
                },
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const storiesByUser = {};
        stories.forEach((story) => {
            const userId = story.user.id;
            if (!storiesByUser[userId]) {
                storiesByUser[userId] = {
                    user: {
                        id: story.user.id,
                        name: story.user.name || story.user.username,
                        avatar: story.user.avatar,
                    },
                    stories: [],
                };
            }
            storiesByUser[userId].stories.push({
                id: story.id,
                content: story.content,
                book: story.bookTitle
                    ? {
                        title: story.bookTitle,
                        cover: story.bookCover,
                    }
                    : null,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt,
            });
        });

        res.json(Object.values(storiesByUser));
    } catch (error) {
        console.error('[getStories]', error);
        res.status(500).json({ error: 'GET_STORIES_ERROR' });
    }
};

exports.getUserStories = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const userIdInt = parseInt(userId);

        const user = await prisma.user.findUnique({
            where: { id: userIdInt },
            select: { id: true, name: true, username: true, avatar: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stories = await prisma.story.findMany({
            where: {
                userId: userIdInt,
                expiresAt: {
                    gt: new Date(), 
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const formattedStories = stories.map((story) => ({
            id: story.id,
            content: story.content,
            book: story.bookTitle
                ? {
                    title: story.bookTitle,
                    cover: story.bookCover,
                }
                : null,
            createdAt: story.createdAt,
            expiresAt: story.expiresAt,
        }));

        res.json({
            user: {
                id: user.id,
                name: user.name || user.username,
                username: user.username,
                avatar: user.avatar,
            },
            stories: formattedStories,
            count: formattedStories.length,
        });
    } catch (error) {
        console.error('[getUserStories]', error);
        res.status(500).json({ error: 'Error al obtener historias del usuario' });
    }
};

// Clean expired stories
exports.cleanExpiredStories = async (req, res) => {
    try {
        const deleted = await prisma.story.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });

        res.json({
            message: 'Historias expiradas eliminadas',
            deletedCount: deleted.count,
        });
    } catch (error) {
        console.error('[cleanExpiredStories]', error);
        res.status(500).json({ error: 'CLEAN_STORIES_ERROR' });
    }
};

exports.seedStories = async (req, res) => {
    try {
        const { initStories } = require('../../scripts/init-stories');
        await initStories();
        res.json({ success: true, message: 'Sample stories created successfully' });
    } catch (error) {
        console.error('[seedStories]', error);
        res.status(500).json({ error: 'Error creating sample stories' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.user;

        if (!postId) {
            return res.status(400).json({ error: 'Post ID required' });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, userId: true },
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.userId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this post' });
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
