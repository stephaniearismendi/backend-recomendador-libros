const axios = require('axios');
const prisma = require('../src/database/prisma');
const bcrypt = require('bcryptjs');

class UserInitializer {
    constructor() {
        this.randomUserApiUrl = 'https://randomuser.me/api';
    }

    async fetchRandomUsers(count = 20) {
        const response = await axios.get(`${this.randomUserApiUrl}/?results=${count}`);
        return response.data.results;
    }

    async transformUserData(apiUser) {
        const tempPassword = this.generatePassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        return {
            username: this.generateUsername(apiUser.name.first, apiUser.name.last),
            email: apiUser.email,
            password: hashedPassword,
            name: `${apiUser.name.first} ${apiUser.name.last}`,
            bio: this.generateBio(apiUser),
            avatar: apiUser.picture.large,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    generateUsername(firstName, lastName) {
        const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
        const random = Math.floor(Math.random() * 1000);
        return `${base}${random}`;
    }

    generatePassword() {
        return 'temp123';
    }

    generateBio(apiUser) {
        const bios = [
            `Hola, soy ${apiUser.name.first}. Me gusta leer ${this.getRandomGenre()}`,
            `Lector de ${this.getRandomGenre()}. Busco nuevas historias`,
            `Me gustan los libros de ${this.getRandomGenre()}`,
            `Leo ${this.getRandomGenre()} en mi tiempo libre`,
            `Lector de ${this.getRandomGenre()}. Alguna recomendación?`,
        ];
        return bios[Math.floor(Math.random() * bios.length)];
    }

    getRandomGenre() {
        const genres = [
            'fantasía',
            'ciencia ficción',
            'misterio',
            'romance',
            'thriller',
            'histórica',
            'biografías',
            'poesía',
            'aventura',
            'terror',
            'drama',
            'comedia',
        ];
        return genres[Math.floor(Math.random() * genres.length)];
    }

    async hasExistingUsers() {
        const count = await prisma.user.count();
        return count > 0;
    }

    async ensureUniqueUsernames(users) {
        const uniqueUsers = [];

        for (const user of users) {
            let username = user.username;
            let counter = 1;

            while (await this.usernameExists(username)) {
                username = `${user.username}${counter}`;
                counter++;
            }

            uniqueUsers.push({
                ...user,
                username,
            });
        }

        return uniqueUsers;
    }

    async usernameExists(username) {
        const existing = await prisma.user.findUnique({
            where: { username },
        });
        return !!existing;
    }

    async initializeUsers(count = 20, force = false) {
        if (!force) {
            const hasUsers = await this.hasExistingUsers();
            if (hasUsers) {
                console.log('Users already exist in database. Use --force to override.');
                return { message: 'Users already exist', count: 0 };
            }
        }

        const apiUsers = await this.fetchRandomUsers(count);
        console.log(`Fetched ${apiUsers.length} users from API`);

        const usersToCreate = await Promise.all(
            apiUsers.map(apiUser => this.transformUserData(apiUser))
        );

        const uniqueUsers = await this.ensureUniqueUsernames(usersToCreate);

        const createdUsers = await prisma.user.createMany({
            data: uniqueUsers,
            skipDuplicates: true,
        });

        console.log(`Successfully created ${createdUsers.count} users in database`);

        return {
            message: 'Users initialized successfully',
            count: createdUsers.count,
            users: uniqueUsers.slice(0, 5),
        };
    }

    async clearTestUsers() {
        console.log('Clearing test users...');
        const deleted = await prisma.user.deleteMany({
            where: {
                password: {
                    contains: 'temp123'
                }
            },
        });
        console.log(`Deleted ${deleted.count} test users`);
        return { message: 'Test users cleared', count: deleted.count };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1]) || 20;
    const force = args.includes('--force');
    const clear = args.includes('--clear');

    const initializer = new UserInitializer();

    try {
        if (clear) {
            await initializer.clearTestUsers();
        } else {
            const result = await initializer.initializeUsers(count, force);
            console.log('Result:', result);
        }
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = UserInitializer;