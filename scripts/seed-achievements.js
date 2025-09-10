const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const achievements = [
  {
    type: 'first_book',
    title: 'Primer Paso',
    description: 'Completa tu primer libro',
    icon: '📖',
    rarity: 'common',
    points: 10,
    condition: { booksRead: 1 }
  },
  {
    type: 'books_read_5',
    title: 'Lector Novato',
    description: 'Lee 5 libros',
    icon: '📚',
    rarity: 'common',
    points: 25,
    condition: { booksRead: 5 }
  },
  {
    type: 'books_read_10',
    title: 'Lector Aficionado',
    description: 'Lee 10 libros',
    icon: '📖',
    rarity: 'uncommon',
    points: 50,
    condition: { booksRead: 10 }
  },
  {
    type: 'books_read_25',
    title: 'Lector Experto',
    description: 'Lee 25 libros',
    icon: '🏆',
    rarity: 'rare',
    points: 100,
    condition: { booksRead: 25 }
  },
  {
    type: 'books_read_50',
    title: 'Lector Maestro',
    description: 'Lee 50 libros',
    icon: '👑',
    rarity: 'epic',
    points: 200,
    condition: { booksRead: 50 }
  },
  {
    type: 'pages_read_1000',
    title: 'Mil Páginas',
    description: 'Lee 1,000 páginas',
    icon: '📄',
    rarity: 'common',
    points: 30,
    condition: { pagesRead: 1000 }
  },
  {
    type: 'pages_read_5000',
    title: 'Maratón de Lectura',
    description: 'Lee 5,000 páginas',
    icon: '🏃‍♂️',
    rarity: 'uncommon',
    points: 75,
    condition: { pagesRead: 5000 }
  },
  {
    type: 'streak_7',
    title: 'Racha Semanal',
    description: 'Lee 7 días consecutivos',
    icon: '🔥',
    rarity: 'uncommon',
    points: 40,
    condition: { streakDays: 7 }
  },
  {
    type: 'streak_30',
    title: 'Racha Mensual',
    description: 'Lee 30 días consecutivos',
    icon: '⚡',
    rarity: 'rare',
    points: 150,
    condition: { streakDays: 30 }
  },
  {
    type: 'challenge_completed',
    title: 'Desafío Completado',
    description: 'Completa tu desafío anual de lectura',
    icon: '🎯',
    rarity: 'rare',
    points: 100,
    condition: { challengeCompleted: true }
  },
  {
    type: 'genres_5',
    title: 'Explorador',
    description: 'Lee libros de 5 géneros diferentes',
    icon: '🗺️',
    rarity: 'uncommon',
    points: 60,
    condition: { genresExplored: 5 }
  },
  {
    type: 'genres_10',
    title: 'Lector Diverso',
    description: 'Lee libros de 10 géneros diferentes',
    icon: '🌈',
    rarity: 'epic',
    points: 250,
    condition: { genresExplored: 10 }
  }
];

async function seedAchievements() {
  try {
    console.log('Seeding achievements...');
    
    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { type: achievement.type },
        update: achievement,
        create: achievement
      });
    }
    
    console.log('Achievements seeded successfully!');
  } catch (error) {
    console.error('Error seeding achievements:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedAchievements();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedAchievements };
