const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleStoryContents = [
    "Acabo de terminar este libro",
    "No puedo parar de pensar en el final",
    "¿Alguien más lo ha leído? Necesito comentarlo",
    "Leyendo en el parque. Nada como un buen libro para empezar agosto",
    "Este autor nunca falla",
    "Lo encontré en la librería de segunda mano",
    "Releyendo mi libro favorito de peque",
    "Club de lectura esta noche por discord!",
    "Este libro me da pesadillas pero no puedo parar",
    "Llegaron los libros nuevos",
    "Leyendo en el tren camino al trabajo",
    "Este libro me hizo llorar",
    "No me esperaba ese final",
    "Lo recomiendo",
    "Leyendo en la cama, zzz.",
    "Esto me recordó por qué me gusta leer",
    "Encontré la edición especial que quería",
    "Leyendo con mi gato en el sofá",
    "Este libro me está enseñando mucho",
    "Me encanta cómo evoluciona este personaje",
    "No me puedo creer que no lo había leído antes",
    "Este libro me está volviendo loco",
    "Leyendo en la cafetería",
    "Qué bonita forma de escribir",
    "Esto me está haciendo pensar mucho",
    "Encontré mi nueva obsesión",
    "Leyendo en la playa",
    "Este autor tiene una expresión única",
    "Qué mundo tan bien construido",
    "¿Acabe este libro o el libro acabó conmigo?",
    "Aprendiendo mucho con este libro"
];

function generateBookSpecificContent(book) {
    const bookSpecificContents = [
        `Acabo de terminar ${book.title}`,
        `Recomiendo mucho ${book.title}`,
        `¿Alguien más ha leído ${book.title}? Necesito comentarlo`,
        `${book.title} me da pesadillas pero no puedo parar`,
        `${book.title} me hizo llorar`,
        `No me esperaba ese final en ${book.title}`,
        `${book.title} es oro puro, lo recomiendo`,
        `${book.title} me recordó por qué me gusta leer`,
        `Encontré ${book.title} en la librería de segunda mano`,
        `${book.title} me está enseñando mucho sobre la vida`,
        `Me encanta cómo evoluciona el personaje en ${book.title}`,
        `No puedo creer que no había leído ${book.title} antes`,
        `${book.title} me está volviendo loco`,
        `Qué bonita prosa en ${book.title}`,
        `${book.title} me está haciendo pensar mucho`,
        `Encontré mi nueva obsesión: ${book.title}`,
        `${book.title} es una obra maestra`,
        `Qué mundo tan increíble en ${book.title}`
    ];
    
    return bookSpecificContents[Math.floor(Math.random() * bookSpecificContents.length)];
}

async function getRealBooks() {
    const dbBooks = await prisma.book.findMany({
        take: 20,
        select: {
            title: true,
            author: true,
            imageUrl: true
        }
    });    
    const validBooks = dbBooks.filter(book => book.title && book.imageUrl);

    if (validBooks.length > 0) {
        console.log(`Usando ${validBooks.length} libros de la base de datos`);
        return validBooks.map(book => ({
            title: book.title,
            author: book.author || 'Autor desconocido',
            cover: book.imageUrl
        }));
    }

    //If no books in the database, get books from the API
    const apiBooks = await getBooksFromAPI();
    return apiBooks;
}

async function getBooksFromAPI() {
    const subjects = ['fiction', 'romance', 'mystery', 'science fiction', 'fantasy', 'thriller'];
    const books = [];
    
    for (const subject of subjects) {
        try {
            const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=5`);
            const data = await response.json();
            
            if (data.works) {
                for (const work of data.works) {
                    if (work.title && work.authors && work.authors.length > 0) {
                        const coverId = work.cover_id;
                        const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
                        
                        books.push({
                            title: work.title,
                            author: work.authors[0].name,
                            cover: coverUrl
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`An error occurred while getting books from ${subject}:`, error);
        }
    }
    
    return books.slice(0, 15);
}


async function initStories() {
    try {        
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, avatar: true }
        });
        
        if (users.length === 0) {
            console.log('No hay usuarios en la base de datos. Ejecuta primero: node scripts/init-users.js');
            return;
        }
                
        // First, clean the database
        await prisma.story.deleteMany({});
        
        let realBooks = [];
        try {
            realBooks = await getRealBooks();
        } catch (error) {
            console.error('Error obteniendo libros:', error);
            console.log('Continuando sin libros...');
        }
        
        const storiesToCreate = [];
        const numStories = Math.min(users.length * 3, 50); // Maximum 3 stories per user, maximum 50 total
        
        for (let i = 0; i < numStories; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomBook = realBooks.length > 0 ? realBooks[Math.floor(Math.random() * realBooks.length)] : null;
            const randomContent = randomBook ? 
                generateBookSpecificContent(randomBook) : 
                sampleStoryContents[Math.floor(Math.random() * sampleStoryContents.length)];
            
            // random date in the last 24 hours and expires in 24 hours
            const createdAt = new Date();
            const expiresAt = new Date(createdAt);
            createdAt.setHours(createdAt.getHours() - Math.random() * 24);
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            storiesToCreate.push({
                userId: randomUser.id,
                content: randomContent,
                bookTitle: randomBook?.title || null,
                bookCover: randomBook?.cover || null, 
                createdAt,
                expiresAt
            });
        }
        
        // Creates stories in the database
        const createdStories = await prisma.story.createMany({
            data: storiesToCreate
        });
        
        console.log(`Proceso terminado correctamente:`);
        console.log(`   - Historias creadas: ${createdStories.count}`);
        console.log(`   - Usuarios participantes: ${new Set(storiesToCreate.map(s => s.userId)).size}`);
        console.log(`   - Historias con libros: ${storiesToCreate.filter(s => s.bookTitle).length}`);
        
        
    } catch (error) {
        console.error('Ha ocurrido un error en el seeder de historias:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    initStories()
        .then(() => {
            console.log('¡Seeder de historias completado!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error en el seeder de historias:', error);
            process.exit(1);
        });
}

module.exports = { initStories };
