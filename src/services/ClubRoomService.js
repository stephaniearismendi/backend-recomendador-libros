const ClubRoomRepository = require('../repositories/ClubRoomRepository');
const AppError = require('../errors/AppError');

class ClubRoomService {
    constructor() {
        this.clubRoomRepository = new ClubRoomRepository();
    }

    /**
     * Get club information by ID
     * @param {number} clubId - The club ID
     * @returns {Promise<object>} The club information
     * @throws {AppError} If club not found
     */
    async getClub(clubId) {
        const club = await this.clubRoomRepository.findByIdWithMembers(clubId);
        if (!club) {
            throw new AppError('NOT_FOUND', 404);
        }

        return {
            id: club.id,
            name: club.name,
            cover: club.cover,
            members: club.members.length,
        };
    }

    /**
     * List chapters for a club
     * @param {number} clubId - The club ID
     * @returns {Promise<object[]>} Array of chapter information
     */
    async listChapters(clubId) {
        let chapters = await this.clubRoomRepository.findChaptersByClub(clubId);

        if (chapters.length === 0) {
            const n = 8 + Math.floor(Math.random() * 11);
            const chaptersData = Array.from({ length: n }, (_, i) => ({
                clubId,
                chapter: i + 1,
                title: null
            }));
            
            await this.clubRoomRepository.createChapters(chaptersData);
            chapters = await this.clubRoomRepository.findChaptersByClub(clubId);
        }

        return chapters.map((ch) => ({
            id: ch.id,
            chapter: ch.chapter,
            title: ch.title,
            commentsCount: ch._count.comments,
            lastCommentAt: ch.comments[0]?.createdAt ?? null,
        }));
    }

    /**
     * Create or update a chapter
     * @param {number} clubId - The club ID
     * @param {object} chapterData - The chapter data
     * @param {number} chapterData.chapter - Chapter number
     * @param {string} [chapterData.title] - Chapter title
     * @returns {Promise<object>} The created/updated chapter
     * @throws {AppError} If chapter number is invalid
     */
    async createChapter(clubId, chapterData) {
        const { chapter, title } = chapterData;
        
        if (!Number.isFinite(chapter) || chapter <= 0) {
            throw new AppError('INVALID_CHAPTER', 400);
        }

        const trimmedTitle = (title || '').trim() || null;
        const result = await this.clubRoomRepository.upsertChapter(clubId, chapter, trimmedTitle);
        
        return {
            id: result.id,
            chapter: result.chapter,
            title: result.title
        };
    }

    /**
     * List comments for a chapter
     * @param {number} clubId - The club ID
     * @param {number} chapter - The chapter number
     * @param {object} [options] - Query options
     * @param {number} [options.limit] - Maximum number of comments
     * @param {string} [options.before] - Get comments before this date
     * @returns {Promise<object[]>} Array of comments
     */
    async listComments(clubId, chapter, options = {}) {
        const { limit = 30, before } = options;
        
        const chapterRecord = await this.clubRoomRepository.findChapterByClubAndNumber(clubId, chapter);
        if (!chapterRecord) {
            return [];
        }

        const comments = await this.clubRoomRepository.findChapterComments(chapterRecord.id, {
            limit: Math.min(Math.max(limit, 1), 100),
            before: before ? new Date(before) : null
        });

        return comments.reverse().map((comment) => ({
            id: comment.id,
            userId: comment.userId,
            userName: comment.user.name || comment.user.username,
            userAvatar: comment.user.avatar,
            text: comment.text,
            createdAt: comment.createdAt,
        }));
    }

    /**
     * Post a message/comment to a chapter
     * @param {number} userId - The user ID
     * @param {number} clubId - The club ID
     * @param {number} chapter - The chapter number
     * @param {object} messageData - The message data
     * @param {string} messageData.text - The message text
     * @returns {Promise<object>} The created comment
     * @throws {AppError} If user is not authenticated or message is empty
     */
    async postMessage(userId, clubId, chapter, messageData) {
        if (!userId) {
            throw new AppError('UNAUTHENTICATED', 401);
        }

        const { text } = messageData;
        const trimmedText = (text || '').trim();
        
        if (!trimmedText) {
            throw new AppError('EMPTY', 400);
        }

        const chapterRecord = await this.clubRoomRepository.upsertChapterForComment(clubId, chapter);
        
        const comment = await this.clubRoomRepository.createChapterComment({
            chapterId: chapterRecord.id,
            userId,
            text: trimmedText,
        });

        return {
            id: comment.id,
            text: comment.text,
            createdAt: comment.createdAt,
            userId: comment.userId,
            userName: comment.user.name || comment.user.username,
            userAvatar: comment.user.avatar,
        };
    }
}

module.exports = ClubRoomService;
