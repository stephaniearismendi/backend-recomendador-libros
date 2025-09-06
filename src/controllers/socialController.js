const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

function userFromReq(req) {
    const uid = req.user?.userId || req.body?.userId || 0;
    const name = req.user?.name || 'Usuario';
    const avatar = `https://i.pravatar.cc/150?u=${uid || 'guest'}`;
    return {id: Number(uid), name, avatar};
}

exports.getFeed = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        
        let posts;
        if (meId) {
            // Feed personalizado: solo posts de usuarios que sigue
            posts = await prisma.post.findMany({
                where: {
                    user: {
                        followers: {
                            some: { followerId: meId }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                include: { 
                    user: true,
                    likes: true, 
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: true }
                    }
                },
                take: 50,
            });
        } else {
            // Feed público: todos los posts
            posts = await prisma.post.findMany({
                orderBy: { createdAt: 'desc' },
                include: { 
                    user: true,
                    likes: true, 
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: true }
                    }
                },
                take: 50,
            });
        }
        
        const data = posts.map(p => ({
            id: p.id,
            user: { id: p.user.id, name: p.user.name || p.user.username, avatar: p.user.avatar },
            time: p.createdAt,
            text: p.text || '',
            book: p.bookTitle ? { title: p.bookTitle, author: p.bookAuthor, cover: p.bookCover } : null,
            likes: p.likes.length,
            comments: p.comments.map(c => ({
                id: c.id,
                user: { id: c.user.id, name: c.user.name || c.user.username, avatar: c.user.avatar },
                text: c.text,
                time: c.createdAt
            }))
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
        
        const { text, book } = req.body || {};
        const created = await prisma.post.create({
            data: {
                userId: meId,
                text: text || null,
                bookTitle: book?.title || null,
                bookAuthor: book?.author || null,
                bookCover: book?.cover || null
            }
        });
        res.status(201).json({ id: created.id });
    } catch (error) {
        console.error('[createPost]', error);
        res.status(500).json({ error: 'CREATE_POST_ERROR' });
    }
};

exports.toggleLike = async (req, res) => {
    const me = userFromReq(req);
    const {postId} = req.params;
    const key = {userId_postId: {userId: me.id, postId}};
    const exists = await prisma.like.findUnique({where: key}).catch(() => null);
    if (exists) {
        await prisma.like.delete({where: key});
    } else {
        await prisma.like.create({data: {userId: me.id, postId}});
    }
    const count = await prisma.like.count({where: {postId}});
    res.json({liked: !exists, likes: count});
};

exports.addComment = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });
        
        const { postId } = req.params;
        const { text } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: 'EMPTY_COMMENT' });
        
        const comment = await prisma.postComment.create({
            data: {
                postId,
                userId: meId,
                text: text.trim()
            },
            include: { user: true }
        });
        
        res.status(201).json({
            id: comment.id,
            user: { id: comment.user.id, name: comment.user.name || comment.user.username, avatar: comment.user.avatar },
            text: comment.text,
            time: comment.createdAt
        });
    } catch (error) {
        console.error('[addComment]', error);
        res.status(500).json({ error: 'ADD_COMMENT_ERROR' });
    }
};

exports.getClubs = async (_req, res) => {
    let clubs = await prisma.club.findMany({include: {members: true}});
    if (clubs.length === 0) {
        const seed = [
            {name: 'Club Austen', cover: 'https://covers.openlibrary.org/b/id/10409424-M.jpg'},
            {name: 'Misterio de Domingo', cover: 'https://covers.openlibrary.org/b/id/11153226-M.jpg'},
            {name: 'Fantasía Chill', cover: 'https://covers.openlibrary.org/b/id/9251956-M.jpg'},
            {name: 'Clásicos Breves', cover: 'https://covers.openlibrary.org/b/id/12091267-M.jpg'},
        ];
        await prisma.$transaction(seed.map(s => prisma.club.create({data: s})));
        clubs = await prisma.club.findMany({include: {members: true}});
    }
    res.json(clubs.map(c => ({id: c.id, name: c.name, cover: c.cover, members: c.members.length})));
};

exports.toggleJoinClub = async (req, res) => {
    const me = userFromReq(req);
    const {clubId} = req.params;
    const key = {userId_clubId: {userId: me.id, clubId}};
    const exists = await prisma.clubMember.findUnique({where: key}).catch(() => null);
    if (exists) await prisma.clubMember.delete({where: key});
    else await prisma.clubMember.create({data: {userId: me.id, clubId}});
    const count = await prisma.clubMember.count({where: {clubId}});
    res.json({joined: !exists, members: count});
};

exports.getSuggestions = async (req, res) => {
    try {
        const meId = req.user?.userId || parseInt(req.query.meId, 10) || null;
        if (!meId) return res.status(401).json({error: 'UNAUTHENTICATED'});

        const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);

        // Obtener usuarios que ya sigue
        const following = await prisma.follow.findMany({
            where: {followerId: meId},
            select: {followingId: true},
        });
        const excludeIds = [meId, ...following.map(f => f.followingId)];

        // Obtener usuarios sugeridos de la BD
        const users = await prisma.user.findMany({
            where: {id: {notIn: excludeIds}},
            select: {
                id: true, 
                username: true, 
                name: true,
                bio: true,
                avatar: true,
                _count: {
                    select: {
                        followers: true,
                        following: true
                    }
                }
            },
            take: limit,
            orderBy: {id: 'desc'},
        });

        // Solo devolver usuarios reales de la base de datos, sin fallback
        if (users.length === 0) {
            return res.json([]);
        }

        const payload = users.map(u => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestions]', err);
        // En caso de error, devolver array vacío en lugar de fallback
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
                        following: true
                    }
                }
            },
            take: limit,
            orderBy: {id: 'desc'},
        });

        const payload = users.map(u => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestionsNoAuth]', err);
        res.status(500).json({error: 'SUGGESTIONS_ERROR'});
    }
};

// Endpoint temporal con filtrado pero sin autenticación
exports.getSuggestionsTemp = async (req, res) => {
    try {
        const meId = parseInt(req.query.meId || '1', 10); // Default al usuario 1 para testing
        const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);

        // Obtener usuarios que ya sigue
        const following = await prisma.follow.findMany({
            where: {followerId: meId},
            select: {followingId: true},
        });
        const excludeIds = [meId, ...following.map(f => f.followingId)];

        // Obtener usuarios sugeridos de la BD
        const users = await prisma.user.findMany({
            where: {id: {notIn: excludeIds}},
            select: {
                id: true, 
                username: true, 
                name: true,
                bio: true,
                avatar: true,
                _count: {
                    select: {
                        followers: true,
                        following: true
                    }
                }
            },
            take: limit,
            orderBy: {id: 'desc'},
        });

        const payload = users.map(u => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: u._count.followers,
            followingCount: u._count.following
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getSuggestionsTemp]', err);
        res.status(500).json({error: 'SUGGESTIONS_ERROR'});
    }
};

// Endpoint simple para obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true, 
                username: true, 
                name: true,
                bio: true,
                avatar: true
            },
            orderBy: {id: 'desc'},
        });

        const payload = users.map(u => ({
            id: u.id,
            name: u.name || u.username,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
            isFollowing: false,
            followersCount: 0,
            followingCount: 0
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getAllUsers]', err);
        res.status(500).json({error: 'USERS_ERROR'});
    }
};

// Obtener seguidores de un usuario
exports.getFollowers = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!userId || isNaN(userId)) {
            return res.status(400).json({error: 'INVALID_USER_ID'});
        }

        // Obtener los seguidores del usuario
        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        bio: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const payload = followers.map(f => ({
            id: f.follower.id,
            name: f.follower.name || f.follower.username,
            username: f.follower.username,
            bio: f.follower.bio,
            avatar: f.follower.avatar || `https://i.pravatar.cc/150?u=${f.follower.id}`,
            followedAt: f.createdAt
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getFollowers]', err);
        res.status(500).json({error: 'FOLLOWERS_ERROR'});
    }
};

// Obtener usuarios que sigue un usuario
exports.getFollowing = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!userId || isNaN(userId)) {
            return res.status(400).json({error: 'INVALID_USER_ID'});
        }

        // Obtener los usuarios que sigue
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        bio: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const payload = following.map(f => ({
            id: f.following.id,
            name: f.following.name || f.following.username,
            username: f.following.username,
            bio: f.following.bio,
            avatar: f.following.avatar || `https://i.pravatar.cc/150?u=${f.following.id}`,
            followedAt: f.createdAt
        }));

        res.json(payload);
    } catch (err) {
        console.error('[getFollowing]', err);
        res.status(500).json({error: 'FOLLOWING_ERROR'});
    }
};

exports.toggleFollow = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({error: 'UNAUTHENTICATED'});
        if (!targetId || isNaN(targetId)) return res.status(400).json({error: 'INVALID_TARGET'});
        if (meId === targetId) return res.status(400).json({error: 'CANNOT_FOLLOW_SELF'});


        const target = await prisma.user.findUnique({where: {id: targetId}});
        if (!target) return res.status(404).json({error: 'USER_NOT_FOUND'});

        const whereKey = {followerId_followingId: {followerId: meId, followingId: targetId}};
        const existing = await prisma.follow.findUnique({where: whereKey});

        let following;
        if (existing) {
            await prisma.follow.delete({where: whereKey});
            following = false;
        } else {
            await prisma.follow.create({data: {followerId: meId, followingId: targetId}});
            following = true;
        }

        const followersCount = await prisma.follow.count({where: {followingId: targetId}});
        const followingCount = await prisma.follow.count({where: {followerId: meId}});

        res.json({
            following, 
            followersCount, 
            followingCount,
            message: following ? 'Usuario seguido' : 'Usuario dejado de seguir'
        });
    } catch (err) {
        console.error('[toggleFollow]', err);
        res.status(500).json({error: 'FOLLOW_TOGGLE_ERROR'});
    }
};

exports.followUser = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({error: 'UNAUTHENTICATED'});
        if (!targetId || isNaN(targetId)) return res.status(400).json({error: 'INVALID_TARGET'});
        if (meId === targetId) return res.status(400).json({error: 'CANNOT_FOLLOW_SELF'});

        const target = await prisma.user.findUnique({where: {id: targetId}});
        if (!target) return res.status(404).json({error: 'USER_NOT_FOUND'});

        const whereKey = {followerId_followingId: {followerId: meId, followingId: targetId}};
        const existing = await prisma.follow.findUnique({where: whereKey});

        if (existing) {
            return res.status(409).json({error: 'ALREADY_FOLLOWING'});
        }

        await prisma.follow.create({data: {followerId: meId, followingId: targetId}});

        const followersCount = await prisma.follow.count({where: {followingId: targetId}});
        const followingCount = await prisma.follow.count({where: {followerId: meId}});

        res.json({
            following: true,
            followersCount, 
            followingCount,
            message: 'Usuario seguido exitosamente'
        });
    } catch (err) {
        console.error('[followUser]', err);
        res.status(500).json({error: 'FOLLOW_ERROR'});
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({error: 'UNAUTHENTICATED'});
        if (!targetId || isNaN(targetId)) return res.status(400).json({error: 'INVALID_TARGET'});
        if (meId === targetId) return res.status(400).json({error: 'CANNOT_UNFOLLOW_SELF'});

        const target = await prisma.user.findUnique({where: {id: targetId}});
        if (!target) return res.status(404).json({error: 'USER_NOT_FOUND'});

        const whereKey = {followerId_followingId: {followerId: meId, followingId: targetId}};
        const existing = await prisma.follow.findUnique({where: whereKey});

        if (!existing) {
            return res.status(409).json({error: 'NOT_FOLLOWING'});
        }

        await prisma.follow.delete({where: whereKey});

        const followersCount = await prisma.follow.count({where: {followingId: targetId}});
        const followingCount = await prisma.follow.count({where: {followerId: meId}});

        res.json({
            following: false,
            followersCount, 
            followingCount,
            message: 'Usuario dejado de seguir exitosamente'
        });
    } catch (err) {
        console.error('[unfollowUser]', err);
        res.status(500).json({error: 'UNFOLLOW_ERROR'});
    }
};

exports.getFollowStatus = async (req, res) => {
    try {
        const meId = req.user?.userId || null;
        const targetId = parseInt(req.params.userId, 10);

        if (!meId) return res.status(401).json({error: 'UNAUTHENTICATED'});
        if (!targetId || isNaN(targetId)) return res.status(400).json({error: 'INVALID_TARGET'});

        const target = await prisma.user.findUnique({where: {id: targetId}});
        if (!target) return res.status(404).json({error: 'USER_NOT_FOUND'});

        const whereKey = {followerId_followingId: {followerId: meId, followingId: targetId}};
        const existing = await prisma.follow.findUnique({where: whereKey});

        const followersCount = await prisma.follow.count({where: {followingId: targetId}});
        const followingCount = await prisma.follow.count({where: {followerId: meId}});

        res.json({
            following: !!existing,
            followersCount, 
            followingCount,
            isOwnProfile: meId === targetId
        });
    } catch (err) {
        console.error('[getFollowStatus]', err);
        res.status(500).json({error: 'FOLLOW_STATUS_ERROR'});
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
            await prisma.$transaction(
                toCreate.map((num) =>
                    prisma.clubChapter.create({
                        data: {
                            clubId: club.id,
                            chapter: num,
                            title:
                                (Array.isArray(titles) && titles[num - 1] && String(titles[num - 1]).trim()) ||
                                null,
                        },
                    }),
                ),
            );
        }

        res.status(201).json({ id: club.id, name: club.name, cover: club.cover });
    } catch (e) {
        console.error('[createClub]', e);
        res.status(500).json({ error: 'CREATE_CLUB_ERROR' });
    }
};

// ========== STORIES ENDPOINTS ==========

// Crear una nueva historia
exports.createStory = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        const { content, bookTitle, bookCover } = req.body || {};
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'CONTENT_REQUIRED' });
        }

        // Las historias expiran en 24 horas
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = await prisma.story.create({
            data: {
                userId: meId,
                content: content.trim(),
                bookTitle: bookTitle || null,
                bookCover: bookCover || null,
                expiresAt
            },
            include: { user: true }
        });

        res.status(201).json({
            id: story.id,
            content: story.content,
            book: story.bookTitle ? {
                title: story.bookTitle,
                cover: story.bookCover
            } : null,
            user: {
                id: story.user.id,
                name: story.user.name || story.user.username,
                avatar: story.user.avatar
            },
            createdAt: story.createdAt,
            expiresAt: story.expiresAt
        });
    } catch (error) {
        console.error('[createStory]', error);
        res.status(500).json({ error: 'CREATE_STORY_ERROR' });
    }
};

// Obtener historias de usuarios que sigue
exports.getStories = async (req, res) => {
    try {
        const meId = req.user?.userId;
        if (!meId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

        // Obtener historias de usuarios que sigue (que no hayan expirado)
        const stories = await prisma.story.findMany({
            where: {
                user: {
                    followers: {
                        some: { followerId: meId }
                    }
                },
                expiresAt: {
                    gt: new Date() // Solo historias que no han expirado
                }
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Agrupar historias por usuario
        const storiesByUser = {};
        stories.forEach(story => {
            const userId = story.user.id;
            if (!storiesByUser[userId]) {
                storiesByUser[userId] = {
                    user: {
                        id: story.user.id,
                        name: story.user.name || story.user.username,
                        avatar: story.user.avatar
                    },
                    stories: []
                };
            }
            storiesByUser[userId].stories.push({
                id: story.id,
                content: story.content,
                book: story.bookTitle ? {
                    title: story.bookTitle,
                    cover: story.bookCover
                } : null,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt
            });
        });

        res.json(Object.values(storiesByUser));
    } catch (error) {
        console.error('[getStories]', error);
        res.status(500).json({ error: 'GET_STORIES_ERROR' });
    }
};

// Limpiar historias expiradas (endpoint para mantenimiento)
exports.cleanExpiredStories = async (req, res) => {
    try {
        const deleted = await prisma.story.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        res.json({ 
            message: 'Historias expiradas eliminadas',
            deletedCount: deleted.count 
        });
    } catch (error) {
        console.error('[cleanExpiredStories]', error);
        res.status(500).json({ error: 'CLEAN_STORIES_ERROR' });
    }
};

// Seeder de historias de ejemplo
exports.seedStories = async (req, res) => {
    try {
        const { initStories } = require('../../scripts/init-stories');
        await initStories();
        res.json({ success: true, message: 'Historias de ejemplo creadas exitosamente' });
    } catch (error) {
        console.error('[seedStories]', error);
        res.status(500).json({ error: 'Error al crear historias de ejemplo' });
    }
};
