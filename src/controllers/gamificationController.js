const GamificationService = require('../services/GamificationService');
const gamificationService = new GamificationService();
const asyncHandler = require('../errors/asyncHandler');
const AppError = require('../errors/AppError');

const getUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const stats = await gamificationService.getUserStats(parseInt(userId));
  
  res.status(200).json({
    success: true,
    data: {
      totalBooksRead: stats.totalBooksRead,
      totalPagesRead: stats.totalPagesRead,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      genresExplored: stats.genresExplored,
      totalPoints: stats.totalPoints,
      lastReadingDate: stats.lastReadingDate
    }
  });
});

const getUserAchievements = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const result = await gamificationService.getUserAchievements(parseInt(userId));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

const updateReadingProgress = asyncHandler(async (req, res) => {
  const { userId, bookId, pagesRead, totalPages, isCompleted, completion } = req.body;
  
  if (!userId || !bookId) {
    throw new AppError('User ID and Book ID are required', 400);
  }

  if (pagesRead === undefined || totalPages === undefined) {
    throw new AppError('Pages read and total pages are required', 400);
  }

  let completionStatus = isCompleted;
  if (completion !== undefined) {
    completionStatus = completion === 'true' || completion === true;
  }

  if (completionStatus === undefined) {
    throw new AppError('Completion status is required', 400);
  }

  const ReadingSessionRepository = require('../repositories/ReadingSessionRepository');
  const readingSessionRepository = new ReadingSessionRepository();
  
  const activeSession = await readingSessionRepository.findActiveSession(parseInt(userId), bookId);
  
  if (!activeSession) {
    const newSession = await readingSessionRepository.createSession({
      userId: parseInt(userId),
      bookId,
      currentPage: pagesRead,
      totalPages: parseInt(totalPages),
      progress: pagesRead
    });
    
    if (completionStatus) {
      await readingSessionRepository.endSession(newSession.id);
    }
  } else {
    await readingSessionRepository.updateSessionProgress(activeSession.id, {
      currentPage: pagesRead,
      progress: pagesRead
    });
    
    if (completionStatus) {
      await readingSessionRepository.endSession(activeSession.id);
    }
  }

  const result = await gamificationService.updateReadingProgress(
    parseInt(userId),
    bookId,
    parseInt(pagesRead),
    parseInt(totalPages),
    completionStatus
  );
  
  res.status(200).json({
    success: true,
    data: result
  });
});

const getReadingChallenge = asyncHandler(async (req, res) => {
  const { userId, year } = req.params;
  
  if (!userId || isNaN(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  if (!year || isNaN(year)) {
    throw new AppError('Invalid year', 400);
  }

  const challenge = await gamificationService.getReadingChallenge(
    parseInt(userId),
    parseInt(year)
  );
  
  if (!challenge) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }
  
  res.status(200).json({
    success: true,
    data: challenge
  });
});

const setReadingChallenge = asyncHandler(async (req, res) => {
  const { userId, year, goal } = req.body;
  
  if (!userId || !year || !goal) {
    throw new AppError('User ID, year, and goal are required', 400);
  }

  if (isNaN(userId) || isNaN(year) || isNaN(goal)) {
    throw new AppError('User ID, year, and goal must be numbers', 400);
  }

  if (goal <= 0) {
    throw new AppError('Goal must be greater than 0', 400);
  }

  const result = await gamificationService.setReadingChallenge(
    parseInt(userId),
    parseInt(year),
    parseInt(goal)
  );
  
  res.status(200).json({
    success: true,
    data: result
  });
});

const getAllAchievements = asyncHandler(async (req, res) => {
  const achievements = await gamificationService.getAllAchievements();
  
  res.status(200).json({
    success: true,
    data: achievements
  });
});

module.exports = {
  getUserStats,
  getUserAchievements,
  updateReadingProgress,
  getReadingChallenge,
  setReadingChallenge,
  getAllAchievements
};
