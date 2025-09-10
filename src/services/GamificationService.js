const prisma = require('../database/prisma');

class GamificationService {
  async getUserStats(userId) {
    try {
      let stats = await prisma.userStats.findUnique({
        where: { userId }
      });

      if (!stats) {
        stats = await prisma.userStats.create({
          data: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            totalPoints: 0,
            lastReadingDate: null
          }
        });
      }

      // Calculate stats from reading sessions
      const readingStats = await this.calculateReadingStats(userId);
      
      return {
        ...stats,
        ...readingStats
      };
    } catch (error) {
      throw new Error(`Error getting user stats: ${error.message}`);
    }
  }

  async calculateReadingStats(userId) {
    try {
      const completedSessions = await prisma.readingSession.findMany({
        where: {
          userId,
          isActive: false,
          endedAt: { not: null }
        },
        include: {
          book: true
        }
      });

      const uniqueBooks = new Set();
      let totalPagesRead = 0;
      const genresExplored = new Set();

      completedSessions.forEach(session => {
        if (session.totalPages && session.totalPages > 0) {
          const progressPercentage = session.progress / session.totalPages;
          if (progressPercentage >= 0.9) {
            uniqueBooks.add(session.bookId);
            totalPagesRead += session.progress;
            if (session.book && session.book.category) {
              genresExplored.add(session.book.category);
            }
          }
        }
      });

      return {
        totalBooksRead: uniqueBooks.size,
        totalPagesRead,
        genresExplored: genresExplored.size
      };
    } catch (error) {
      console.error('Error calculating reading stats:', error);
      return {
        totalBooksRead: 0,
        totalPagesRead: 0,
        genresExplored: 0
      };
    }
  }


  async completeReadingSession(userId, sessionData) {
    try {
      const { pagesRead, duration, bookId } = sessionData;
      
      let stats = await this.getUserStats(userId);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let newStreak = stats.currentStreak;
      
      if (stats.lastReadingDate) {
        const lastReadingDate = new Date(stats.lastReadingDate);
        const daysDiff = Math.floor((today - lastReadingDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          newStreak = stats.currentStreak + 1;
        } else if (daysDiff > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      
      const updatedStats = await prisma.userStats.update({
        where: { userId },
        data: {
          totalPagesRead: stats.totalPagesRead + (pagesRead || 0),
          currentStreak: newStreak,
          longestStreak: Math.max(stats.longestStreak, newStreak),
          lastReadingDate: today
        }
      });

      await this.checkReadingAchievements(userId, updatedStats);
      
      return updatedStats;
    } catch (error) {
      throw new Error(`Error completing reading session: ${error.message}`);
    }
  }

  /**
   * Get all available achievements
   * @returns {Promise<object[]>} Array of all achievements
   */
  async getAllAchievements() {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: {
          points: 'asc'
        }
      });

      return achievements.map(achievement => ({
        id: achievement.id,
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        points: achievement.points,
        condition: achievement.condition
      }));
    } catch (error) {
      throw new Error(`Error getting all achievements: ${error.message}`);
    }
  }

  /**
   * Get user's achievements with progress
   * @param {number} userId - The user ID
   * @returns {Promise<object[]>} Array of user achievements with progress
   */
  async getUserAchievements(userId) {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true
        },
        orderBy: {
          unlockedAt: 'desc'
        }
      });

      const allAchievements = await prisma.achievement.findMany({
        orderBy: {
          points: 'asc'
        }
      });

      const unlockedAchievementIds = new Set(
        userAchievements.map(ua => ua.achievementId)
      );

      const achievementsWithProgress = await Promise.all(
        allAchievements.map(async (achievement) => {
          const userAchievement = userAchievements.find(
            ua => ua.achievementId === achievement.id
          );

          return {
            id: achievement.id,
            type: achievement.type,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points,
            unlockedAt: userAchievement?.unlockedAt,
            progress: await this.calculateProgress(achievement, userId)
          };
        })
      );

      const totalPoints = userAchievements.reduce(
        (sum, ua) => sum + ua.pointsEarned, 0
      );

      return {
        achievements: achievementsWithProgress,
        totalPoints,
        unlockedCount: userAchievements.length,
        totalCount: allAchievements.length
      };
    } catch (error) {
      throw new Error(`Error getting user achievements: ${error.message}`);
    }
  }

  /**
   * Update reading progress and check for achievements
   * @param {number} userId - The user ID
   * @param {string} bookId - The book ID
   * @param {object} sessionData - The session data
   * @param {number} [sessionData.pagesRead] - Number of pages read
   * @param {number} [sessionData.totalPages] - Total pages in book
   * @param {boolean} [sessionData.isCompleted] - Whether book is completed
   * @returns {Promise<object>} Updated user stats and new achievements
   */
  async updateReadingProgress(userId, bookId, sessionData) {
    try {
      const { pagesRead = 0, totalPages, isCompleted = false } = sessionData;
      
      console.log('=== GAMIFICATION SERVICE ===');
      console.log('updateReadingProgress called with:', { userId, bookId, pagesRead, totalPages, isCompleted });
      
      const book = await prisma.book.findUnique({
        where: { id: bookId }
      });
      console.log('Book found:', book);

      if (!book) {
        console.log('Book not found, throwing AppError');
        const { AppError } = require('../errors/AppError');
        throw new AppError(`Book with ID "${bookId}" not found`, 404);
      }

      const newAchievements = [];
      const updates = {};

      if (pagesRead > 0) {
        updates.lastReadingDate = new Date();
      }

      if (Object.keys(updates).length > 0) {
        await prisma.userStats.update({
          where: { userId },
          data: updates
        });
        console.log('Updated UserStats:', updates);
      }

      const currentStats = await this.getUserStats(userId);

      if (isCompleted) {
        console.log('Book completed! Checking achievements...');
        
        const achievements = await this.checkBookAchievements(userId, currentStats);
        newAchievements.push(...achievements);
        
        const genreAchievements = await this.checkGenreAchievements(userId);
        newAchievements.push(...genreAchievements);
        
        await this.updateChallengeProgress(userId, new Date().getFullYear());
      }

      if (pagesRead > 0) {
        const pageAchievements = await this.checkPageAchievements(userId, currentStats);
        newAchievements.push(...pageAchievements);
      }

      const streakUpdate = await this.updateReadingStreak(userId);
      
      if (streakUpdate.newAchievements.length > 0) {
        newAchievements.push(...streakUpdate.newAchievements);
      }

      const totalNewPoints = newAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
      
      if (totalNewPoints > 0) {
        await prisma.userStats.update({
          where: { userId },
          data: {
            totalPoints: {
              increment: totalNewPoints
            }
          }
        });
      }

      const finalStats = await this.getUserStats(userId);

      return {
        success: true,
        newAchievements,
        updatedStats: finalStats
      };
    } catch (error) {
      throw new Error(`Error updating reading progress: ${error.message}`);
    }
  }

  async checkBookAchievements(userId, stats) {
    const newAchievements = [];
    
    const bookAchievements = await prisma.achievement.findMany({
      where: {
        type: {
          in: ['first_book', 'books_read_5', 'books_read_10', 'books_read_25', 'books_read_50']
        }
      }
    });

    for (const achievement of bookAchievements) {
      const condition = achievement.condition;
      const booksRequired = condition.booksRead;
      
      if (stats.totalBooksRead >= booksRequired) {
        const existingUserAchievement = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id
            }
          }
        });

        if (!existingUserAchievement) {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              pointsEarned: achievement.points
            }
          });

          newAchievements.push({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points
          });
        }
      }
    }

    return newAchievements;
  }

  async checkPageAchievements(userId, stats) {
    const newAchievements = [];
    
    const pageAchievements = await prisma.achievement.findMany({
      where: {
        type: {
          in: ['pages_read_1000', 'pages_read_5000']
        }
      }
    });

    for (const achievement of pageAchievements) {
      const condition = achievement.condition;
      const pagesRequired = condition.pagesRead;
      
      if (stats.totalPagesRead >= pagesRequired) {
        const existingUserAchievement = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id
            }
          }
        });

        if (!existingUserAchievement) {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              pointsEarned: achievement.points
            }
          });


          newAchievements.push({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points
          });
        }
      }
    }

    return newAchievements;
  }

  async updateReadingStreak(userId) {
    const stats = await this.getUserStats(userId);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = stats.currentStreak;
    let newAchievements = [];

    if (stats.lastReadingDate) {
      const lastReadingDate = new Date(stats.lastReadingDate);
      const daysDiff = Math.floor((today - lastReadingDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        newStreak = stats.currentStreak + 1;
      } else if (daysDiff > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(stats.longestStreak, newStreak);

    await prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak
      }
    });

    const streakAchievements = await prisma.achievement.findMany({
      where: {
        type: {
          in: ['streak_7', 'streak_30']
        }
      }
    });

    for (const achievement of streakAchievements) {
      const condition = achievement.condition;
      const streakRequired = condition.streakDays;
      
      if (newStreak >= streakRequired) {
        const existingUserAchievement = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id
            }
          }
        });

        if (!existingUserAchievement) {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              pointsEarned: achievement.points
            }
          });


          newAchievements.push({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points
          });
        }
      }
    }

    return { newAchievements };
  }

  async getReadingChallenge(userId, year) {
    try {
      const challenge = await prisma.readingChallenge.findUnique({
        where: {
          userId_year: {
            userId,
            year
          }
        }
      });

      if (!challenge) {
        return null;
      }

      return {
        year: challenge.year,
        goal: challenge.goal,
        completed: challenge.completed,
        isCompleted: challenge.isCompleted,
        progress: Math.round((challenge.completed / challenge.goal) * 100)
      };
    } catch (error) {
      throw new Error(`Error getting reading challenge: ${error.message}`);
    }
  }

  async setReadingChallenge(userId, year, goal) {
    try {
      const challenge = await prisma.readingChallenge.upsert({
        where: {
          userId_year: {
            userId,
            year
          }
        },
        update: {
          goal,
          isCompleted: false
        },
        create: {
          userId,
          year,
          goal,
          completed: 0,
          isCompleted: false
        }
      });

      return {
        success: true,
        challenge: {
          year: challenge.year,
          goal: challenge.goal,
          completed: challenge.completed,
          isCompleted: challenge.isCompleted,
          progress: Math.round((challenge.completed / challenge.goal) * 100)
        }
      };
    } catch (error) {
      throw new Error(`Error setting reading challenge: ${error.message}`);
    }
  }

  async updateChallengeProgress(userId, year) {
    try {
      const challenge = await prisma.readingChallenge.findUnique({
        where: {
          userId_year: {
            userId,
            year
          }
        }
      });

      if (!challenge) {
        return;
      }

      const stats = await this.getUserStats(userId);
      const isCompleted = stats.totalBooksRead >= challenge.goal;

      await prisma.readingChallenge.update({
        where: {
          userId_year: {
            userId,
            year
          }
        },
        data: {
          completed: stats.totalBooksRead,
          isCompleted
        }
      });

      if (isCompleted && !challenge.isCompleted) {
        const challengeAchievement = await prisma.achievement.findFirst({
          where: { type: 'challenge_completed' }
        });

        if (challengeAchievement) {
          const existingUserAchievement = await prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: challengeAchievement.id
              }
            }
          });

          if (!existingUserAchievement) {
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: challengeAchievement.id,
                pointsEarned: challengeAchievement.points
              }
            });

          }
        }
      }
    } catch (error) {
      throw new Error(`Error updating challenge progress: ${error.message}`);
    }
  }

  async calculateProgress(achievement, userId) {
    try {
      const stats = await this.getUserStats(userId);
      
      switch (achievement.type) {
        case 'first_book':
        case 'books_read_5':
        case 'books_read_10':
        case 'books_read_25':
        case 'books_read_50':
          const booksRequired = achievement.condition.booksRead;
          return Math.min(Math.round((stats.totalBooksRead / booksRequired) * 100), 100);
          
        case 'pages_read_1000':
        case 'pages_read_5000':
          const pagesRequired = achievement.condition.pagesRead;
          return Math.min(Math.round((stats.totalPagesRead / pagesRequired) * 100), 100);
          
        case 'streak_7':
        case 'streak_30':
          const streakRequired = achievement.condition.streakDays;
          return Math.min(Math.round((stats.currentStreak / streakRequired) * 100), 100);
          
        case 'genres_5':
        case 'genres_10':
          const genresRequired = achievement.condition.genresExplored;
          const genresExplored = await this.calculateGenresExplored(userId);
          return Math.min(Math.round((genresExplored / genresRequired) * 100), 100);
          
        case 'challenge_completed':
          const currentYear = new Date().getFullYear();
          const challenge = await this.getReadingChallenge(userId, currentYear);
          if (!challenge) return 0;
          return challenge.progress;
          
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }

  async calculateGenresExplored(userId) {
    try {
      const userBooks = await prisma.readingSession.findMany({
        where: {
          userId,
          isActive: false
        },
        include: {
          book: true
        }
      });

      const genres = new Set();
      userBooks.forEach(session => {
        if (session.book && session.book.category) {
          genres.add(session.book.category);
        }
      });

      return genres.size;
    } catch (error) {
      console.error('Error calculating genres explored:', error);
      return 0;
    }
  }

  async checkGenreAchievements(userId) {
    try {
      const genresExplored = await this.calculateGenresExplored(userId);
      
      const genreAchievements = await prisma.achievement.findMany({
        where: {
          type: {
            in: ['genres_5', 'genres_10']
          }
        }
      });

      const newAchievements = [];

      for (const achievement of genreAchievements) {
        const condition = achievement.condition;
        const genresRequired = condition.genresExplored;
        
        if (genresExplored >= genresRequired) {
          const existingUserAchievement = await prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: achievement.id
              }
            }
          });

          if (!existingUserAchievement) {
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
                pointsEarned: achievement.points
              }
            });

            newAchievements.push({
              id: achievement.id,
              title: achievement.title,
              description: achievement.description,
              icon: achievement.icon,
              rarity: achievement.rarity,
              points: achievement.points
            });
          }
        }
      }

      await prisma.userStats.update({
        where: { userId },
        data: {
          genresExplored
        }
      });

      return newAchievements;
    } catch (error) {
      console.error('Error checking genre achievements:', error);
      return [];
    }
  }

}

module.exports = GamificationService;
