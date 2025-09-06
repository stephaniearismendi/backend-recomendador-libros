const userSeeder = require('../services/userSeeder');

// Seeder de usuarios
exports.seedUsers = async (req, res) => {
    try {
        const { count = 20 } = req.body;
        
        if (count > 100) {
            return res.status(400).json({ 
                error: 'Count too high', 
                message: 'Maximum 100 users can be seeded at once' 
            });
        }

        const result = await userSeeder.seedUsers(count);
        res.json(result);
    } catch (error) {
        console.error('Error seeding users:', error);
        res.status(500).json({ 
            error: 'SEED_ERROR', 
            message: 'Error seeding users' 
        });
    }
};

// Obtener usuarios aleatorios de la BD
exports.getRandomUsers = async (req, res) => {
    try {
        const { count = 10 } = req.query;
        const users = await userSeeder.getRandomUsersFromDB(parseInt(count));
        res.json(users);
    } catch (error) {
        console.error('Error getting random users:', error);
        res.status(500).json({ 
            error: 'RANDOM_USERS_ERROR', 
            message: 'Error getting random users' 
        });
    }
};

// Limpiar usuarios de prueba
exports.clearTestUsers = async (req, res) => {
    try {
        const result = await userSeeder.clearTestUsers();
        res.json(result);
    } catch (error) {
        console.error('Error clearing test users:', error);
        res.status(500).json({ 
            error: 'CLEAR_ERROR', 
            message: 'Error clearing test users' 
        });
    }
};

// Verificar estado del seeding
exports.getSeedStatus = async (req, res) => {
    try {
        const hasUsers = await userSeeder.hasExistingUsers();
        res.json({ 
            hasUsers,
            message: hasUsers ? 'Users exist in database' : 'No users found'
        });
    } catch (error) {
        console.error('Error getting seed status:', error);
        res.status(500).json({ 
            error: 'STATUS_ERROR', 
            message: 'Error getting seed status' 
        });
    }
};
