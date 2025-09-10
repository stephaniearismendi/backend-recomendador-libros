const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE_URL = 'http://localhost:3000';



async function getRandomUsers(count = 15) {
    const users = await prisma.user.findMany({
        take: count,
        select: {
            id: true,
            username: true,
            name: true
        }
    });
    return users;
}

async function getRandomBooks(count = 10) {
    const books = await prisma.book.findMany({
        take: count,
        select: {
            id: true,
            title: true,
            author: true,
            imageUrl: true
        }
    });
    return books;
}


async function createClubViaAPI(book, authToken) {
    const numChapters = Math.floor(Math.random() * 6) + 4;
    
    const response = await axios.post(`${API_BASE_URL}/social/clubs`, {
        name: `Club de Lectura - ${book.title}`,
        cover: book.imageUrl,
        chapters: numChapters
    }, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}

async function addMembersToClub(clubId, users, authToken) {
    const numMembers = Math.floor(Math.random() * 8) + 5;
    const selectedUsers = users.slice(0, numMembers);

    for (const user of selectedUsers) {
        try {
            await axios.post(`${API_BASE_URL}/social/clubs/${clubId}/toggle`, {}, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Usuario ${user.id} agregado al club ${clubId}`);
        } catch (error) {
            console.log(`No se pudo agregar usuario ${user.id} al club ${clubId}:`, error.message);
        }
    }

    return selectedUsers.length;
}

async function getAuthToken() {
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
        throw new Error('No se encontraron usuarios. Por favor inicializa usuarios primero.');
    }
    
    const response = await axios.post(`${API_BASE_URL}/users/login`, {
        email: firstUser.email,
        password: 'temp123'
    });
    
    return response.data.token;
}

async function initClubs() {
    try {
        const users = await getRandomUsers();
        if (users.length === 0) {
            console.log('No se encontraron usuarios. Por favor inicializa usuarios primero.');
            return;
        }

        const books = await getRandomBooks();
        console.log(`Found ${users.length} users and ${books.length} books`);

        const authToken = await getAuthToken();
        console.log('Authentication token obtained');

        const results = [];
        const numClubs = Math.min(books.length, 6);

        for (let i = 0; i < numClubs; i++) {
            const club = await createClubViaAPI(books[i], authToken);
            console.log(`Club created: ${club.name}`);
            
            const membersCount = await addMembersToClub(club.id, users, authToken);
            
            results.push({ club, members: membersCount });
            console.log(`Club completed: ${club.name} with ${membersCount} members`);
        }

        console.log(`Successfully created ${results.length} clubs`);
        console.log(`Total members in all clubs: ${results.reduce((sum, r) => sum + r.members, 0)}`);

    } catch (error) {
        console.error('Error initializing clubs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    initClubs()
        .then(() => {
            console.log('Club initialization completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error in club initialization:', error);
            process.exit(1);
        });
}

module.exports = { initClubs };
