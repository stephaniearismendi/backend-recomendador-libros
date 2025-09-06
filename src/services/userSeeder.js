const axios = require('axios');
const prisma = require('../database/prisma');

class UserSeeder {
    constructor() {
        this.randomUserApiUrl = 'https://randomuser.me/api';
    }

    // Obtener usuarios aleatorios de la API externa
    async fetchRandomUsers(count = 10) {
        try {
            console.log(`🌐 Fetching ${count} random users from API...`);
            const response = await axios.get(`${this.randomUserApiUrl}/?results=${count}`);
            return response.data.results;
        } catch (error) {
            console.error('❌ Error fetching random users:', error.message);
            throw error;
        }
    }

    // Transformar datos de la API a formato de nuestra BD
    transformUserData(apiUser) {
        return {
            username: this.generateUsername(apiUser.name.first, apiUser.name.last),
            email: apiUser.email,
            password: this.generatePassword(), // Contraseña temporal
            name: `${apiUser.name.first} ${apiUser.name.last}`,
            bio: this.generateBio(apiUser),
            avatar: apiUser.picture.large,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    // Generar username único
    generateUsername(firstName, lastName) {
        const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
        const random = Math.floor(Math.random() * 1000);
        return `${base}${random}`;
    }

    // Generar contraseña temporal
    generatePassword() {
        return 'temp123'; // En producción, usar bcrypt
    }

    // Generar biografía basada en datos del usuario
    generateBio(apiUser) {
        const bios = [
            `Hola! Soy ${apiUser.name.first} y me encanta leer libros de ${this.getRandomGenre()}.`,
            `Lector apasionado de ${this.getRandomGenre()}. Siempre buscando nuevas historias.`,
            `Amante de los libros desde pequeño. Mi género favorito es ${this.getRandomGenre()}.`,
            `📚 Lector voraz de ${this.getRandomGenre()}. ¡Compartamos lecturas!`,
            `En mi tiempo libre leo ${this.getRandomGenre()}. ¿Alguna recomendación?`
        ];
        return bios[Math.floor(Math.random() * bios.length)];
    }

    // Géneros literarios aleatorios
    getRandomGenre() {
        const genres = [
            'fantasía', 'ciencia ficción', 'misterio', 'romance', 
            'thriller', 'histórica', 'biografías', 'poesía',
            'aventura', 'terror', 'drama', 'comedia'
        ];
        return genres[Math.floor(Math.random() * genres.length)];
    }

    // Verificar si ya existen usuarios en la BD
    async hasExistingUsers() {
        const count = await prisma.user.count();
        return count > 0;
    }

    // Seeder principal
    async seedUsers(count = 20, force = false) {
        try {
            console.log('🌱 Starting user seeding process...');

            // Verificar si ya hay usuarios (solo si no es forzado)
            if (!force) {
                const hasUsers = await this.hasExistingUsers();
                if (hasUsers) {
                    console.log('ℹ️ Users already exist in database. Skipping seed.');
                    return { message: 'Users already exist', count: 0 };
                }
            }

            // Obtener usuarios de la API
            const apiUsers = await this.fetchRandomUsers(count);
            console.log(`✅ Fetched ${apiUsers.length} users from API`);

            // Transformar datos
            const usersToCreate = apiUsers.map(apiUser => this.transformUserData(apiUser));

            // Verificar usernames únicos
            const uniqueUsers = await this.ensureUniqueUsernames(usersToCreate);

            // Crear usuarios en la BD
            const createdUsers = await prisma.user.createMany({
                data: uniqueUsers,
                skipDuplicates: true
            });

            console.log(`✅ Successfully created ${createdUsers.count} users in database`);
            
            return {
                message: 'Users seeded successfully',
                count: createdUsers.count,
                users: uniqueUsers.slice(0, 5) // Devolver primeros 5 como ejemplo
            };

        } catch (error) {
            console.error('❌ Error seeding users:', error);
            throw error;
        }
    }

    // Asegurar usernames únicos
    async ensureUniqueUsernames(users) {
        const uniqueUsers = [];
        
        for (const user of users) {
            let username = user.username;
            let counter = 1;
            
            // Verificar si el username ya existe
            while (await this.usernameExists(username)) {
                username = `${user.username}${counter}`;
                counter++;
            }
            
            uniqueUsers.push({
                ...user,
                username
            });
        }
        
        return uniqueUsers;
    }

    // Verificar si un username existe
    async usernameExists(username) {
        const existing = await prisma.user.findUnique({
            where: { username }
        });
        return !!existing;
    }

    // Obtener usuarios aleatorios de la BD local
    async getRandomUsersFromDB(count = 10) {
        try {
            const totalUsers = await prisma.user.count();
            if (totalUsers === 0) {
                return [];
            }

            const users = await prisma.user.findMany({
                take: count,
                orderBy: {
                    id: 'desc'
                },
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
                }
            });

            return users.map(user => ({
                id: user.id,
                name: user.name || user.username,
                avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
                isFollowing: false,
                followersCount: user._count.followers,
                followingCount: user._count.following
            }));

        } catch (error) {
            console.error('❌ Error getting random users from DB:', error);
            return [];
        }
    }

    // Limpiar usuarios de prueba (solo para desarrollo)
    async clearTestUsers() {
        try {
            console.log('🧹 Clearing test users...');
            const deleted = await prisma.user.deleteMany({
                where: {
                    password: 'temp123' // Solo eliminar usuarios de prueba
                }
            });
            console.log(`✅ Deleted ${deleted.count} test users`);
            return { message: 'Test users cleared', count: deleted.count };
        } catch (error) {
            console.error('❌ Error clearing test users:', error);
            throw error;
        }
    }
}

module.exports = new UserSeeder();
