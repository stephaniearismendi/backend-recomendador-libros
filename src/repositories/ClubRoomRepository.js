const BaseRepository = require('./BaseRepository');

/**
 * Club Room Repository - Handles all club room-related database operations
 * Extends BaseRepository with club room-specific methods
 */
class ClubRoomRepository extends BaseRepository {
    constructor() {
        super('club');
    }

    /**
     * Find club by ID with members included
     * @param {number} clubId - The club ID
     * @returns {Promise<object|null>} The club with members or null
     */
    async findByIdWithMembers(clubId) {
        return this.findById(clubId, {
            include: { members: true }
        });
    }

    /**
     * Find chapter by club ID and chapter number
     * @param {number} clubId - The club ID
     * @param {number} chapter - The chapter number
     * @returns {Promise<object|null>} The chapter or null
     */
    async findChapterByClubAndNumber(clubId, chapter) {
        return this.prisma.clubChapter.findUnique({
            where: { 
                clubId_chapter: { 
                    clubId, 
                    chapter: parseInt(chapter, 10) 
                } 
            }
        });
    }

    /**
     * Find all chapters for a club with comment counts and latest comment
     * @param {number} clubId - The club ID
     * @returns {Promise<Array>} Array of chapters with comment data
     */
    async findChaptersByClub(clubId) {
        return this.prisma.clubChapter.findMany({
            where: { clubId },
            orderBy: { chapter: 'asc' },
            include: {
                _count: { select: { comments: true } },
                comments: { 
                    orderBy: { createdAt: 'desc' }, 
                    take: 1, 
                    select: { createdAt: true } 
                },
            },
        });
    }

    /**
     * Create multiple chapters in a transaction
     * @param {Array} chaptersData - Array of chapter data objects
     * @returns {Promise<Array>} Array of created chapters
     */
    async createChapters(chaptersData) {
        return this.prisma.$transaction(
            chaptersData.map(data => 
                this.prisma.clubChapter.create({ data })
            )
        );
    }

    /**
     * Create or update a chapter
     * @param {number} clubId - The club ID
     * @param {number} chapter - The chapter number
     * @param {string} title - The chapter title
     * @returns {Promise<object>} The upserted chapter
     */
    async upsertChapter(clubId, chapter, title) {
        return this.prisma.clubChapter.upsert({
            where: { clubId_chapter: { clubId, chapter } },
            update: { title },
            create: { clubId, chapter, title },
        });
    }

    /**
     * Find comments for a chapter with pagination
     * @param {number} chapterId - The chapter ID
     * @param {object} options - Pagination options (limit, before)
     * @returns {Promise<Array>} Array of comments with user data
     */
    async findChapterComments(chapterId, options = {}) {
        const { limit = 30, before } = options;
        
        const where = { chapterId };
        if (before) {
            where.createdAt = { lt: before };
        }

        return this.prisma.chapterComment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { user: true },
        });
    }

    /**
     * Create a new chapter comment
     * @param {object} commentData - The comment data
     * @returns {Promise<object>} The created comment with user data
     */
    async createChapterComment(commentData) {
        return this.prisma.chapterComment.create({
            data: commentData,
            include: { user: true },
        });
    }

    /**
     * Create or update a chapter for commenting purposes
     * @param {number} clubId - The club ID
     * @param {number} chapter - The chapter number
     * @returns {Promise<object>} The chapter with ID
     */
    async upsertChapterForComment(clubId, chapter) {
        return this.prisma.clubChapter.upsert({
            where: { clubId_chapter: { clubId, chapter: parseInt(chapter, 10) } },
            update: {},
            create: { clubId, chapter: parseInt(chapter, 10), title: null },
            select: { id: true },
        });
    }
}

module.exports = ClubRoomRepository;
