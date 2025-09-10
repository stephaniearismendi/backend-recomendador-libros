const ClubRoomService = require('../services/ClubRoomService');
const asyncHandler = require('../errors/asyncHandler');

const clubRoomService = new ClubRoomService();

function meFromReq(req) {
    const id = Number(req.user?.userId || 0);
    const name = req.user?.name || 'Usuario';
    const avatar = `https://i.pravatar.cc/150?u=${id || 'guest'}`;
    return { id, name, avatar };
}

exports.getClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const club = await clubRoomService.getClub(clubId);
    res.json(club);
});

exports.listChapters = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const chapters = await clubRoomService.listChapters(clubId);
    res.json(chapters);
});

exports.createChapter = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const chapterData = {
        chapter: parseInt(req.body?.chapter, 10),
        title: req.body?.title
    };
    const result = await clubRoomService.createChapter(clubId, chapterData);
    res.status(201).json(result);
});

exports.listComments = asyncHandler(async (req, res) => {
    const { clubId, chapter } = req.params;
    const options = {
        limit: parseInt(req.query.limit || '30', 10),
        before: req.query.before
    };
    const comments = await clubRoomService.listComments(clubId, chapter, options);
    res.json(comments);
});

exports.postMessage = asyncHandler(async (req, res) => {
    const { id: userId } = meFromReq(req);
    const { clubId, chapter } = req.params;
    const messageData = { text: req.body?.text };
    const result = await clubRoomService.postMessage(userId, clubId, chapter, messageData);
    res.status(201).json(result);
});

exports.getChapterComments = exports.listComments;
exports.addChapterComment = exports.postMessage;
