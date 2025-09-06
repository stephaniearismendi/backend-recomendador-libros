const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Contenidos de ejemplo para historias
const sampleStoryContents = [
    "¡Acabo de terminar este libro increíble! 📚",
    "Recomiendo mucho esta lectura, me ha cambiado la perspectiva 💭",
    "¿Alguien más ha leído esto? Necesito hablar con alguien sobre el final 🤯",
    "Leyendo en el parque un domingo perfecto ☀️",
    "Este autor nunca me decepciona ✨",
    "¡Encontré esta joya en la librería de segunda mano! 🏪",
    "Releyendo mi libro favorito de la infancia 📖",
    "Club de lectura esta noche, ¡qué emocionante! 👥",
    "Este libro me está dando pesadillas pero no puedo parar de leerlo 😱",
    "¡Por fin llegó mi pedido de libros! 📦",
    "Leyendo en el metro camino al trabajo 🚇",
    "Este libro me hizo llorar como un bebé 😭",
    "¡Qué final tan inesperado! No me lo veía venir 🤯",
    "Recomendación del día: este libro es oro puro ✨",
    "Leyendo bajo las estrellas esta noche ⭐",
    "Este libro me recordó por qué amo leer 💕",
    "¡Encontré la edición especial que buscaba! 🎉",
    "Leyendo con mi gato en el sofá 🐱",
    "Este libro me está enseñando tanto sobre la vida 📚",
    "¡Qué personaje tan fascinante! Me encanta su desarrollo 👤",
    "No puedo creer que no haya leído esto antes 🤦‍♀️",
    "Este libro me está volviendo loco, no sé qué va a pasar 😵",
    "Leyendo en la cafetería con un café perfecto ☕",
    "¡Qué prosa tan hermosa! Cada página es una joya 💎",
    "Este libro me está haciendo reflexionar mucho 🤔",
    "¡Encontré mi nueva obsesión literaria! 🔥",
    "Leyendo en la playa, qué momento perfecto 🏖️",
    "Este autor tiene una forma única de contar historias ✍️",
    "¡Qué mundo tan fascinante ha creado! 🌍",
    "Este libro me está enseñando historia de una forma increíble 📜"
];

// Función para generar contenido más específico basado en el libro
function generateBookSpecificContent(book) {
    const bookSpecificContents = [
        `¡Acabo de terminar "${book.title}"! 📚`,
        `Recomiendo mucho "${book.title}", me ha cambiado la perspectiva 💭`,
        `¿Alguien más ha leído "${book.title}"? Necesito hablar sobre el final 🤯`,
        `"${book.title}" me está dando pesadillas pero no puedo parar 😱`,
        `"${book.title}" me hizo llorar como un bebé 😭`,
        `¡Qué final tan inesperado en "${book.title}"! No me lo veía venir 🤯`,
        `"${book.title}" es oro puro, recomiendo mucho ✨`,
        `"${book.title}" me recordó por qué amo leer 💕`,
        `¡Encontré "${book.title}" en la librería de segunda mano! 🏪`,
        `"${book.title}" me está enseñando tanto sobre la vida 📚`,
        `¡Qué personaje tan fascinante en "${book.title}"! 👤`,
        `No puedo creer que no haya leído "${book.title}" antes 🤦‍♀️`,
        `"${book.title}" me está volviendo loco, no sé qué va a pasar 😵`,
        `¡Qué prosa tan hermosa en "${book.title}"! 💎`,
        `"${book.title}" me está haciendo reflexionar mucho 🤔`,
        `¡Encontré mi nueva obsesión: "${book.title}"! 🔥`,
        `"${book.title}" tiene una forma única de contar historias ✍️`,
        `¡Qué mundo tan fascinante en "${book.title}"! 🌍`
    ];
    
    return bookSpecificContents[Math.floor(Math.random() * bookSpecificContents.length)];
}

// Función para obtener libros reales de la base de datos
async function getRealBooks() {
    try {
        // Primero intentar obtener libros de la base de datos
        const dbBooks = await prisma.book.findMany({
            take: 20,
            select: {
                title: true,
                author: true,
                imageUrl: true
            }
        });
        
        // Filtrar libros que tengan título e imagen
        const validBooks = dbBooks.filter(book => book.title && book.imageUrl);

        if (validBooks.length > 0) {
            console.log(`📚 Usando ${validBooks.length} libros de la base de datos`);
            return validBooks.map(book => ({
                title: book.title,
                author: book.author || 'Autor desconocido',
                cover: book.imageUrl // Usar la portada real de la base de datos
            }));
        }

        // Si no hay libros en la DB, usar API de OpenLibrary
        console.log('📚 No hay libros en la DB, obteniendo de OpenLibrary API...');
        const apiBooks = await getBooksFromAPI();
        return apiBooks;
    } catch (error) {
        console.error('Error obteniendo libros:', error);
        // Fallback a libros de ejemplo
        return getFallbackBooks();
    }
}

// Función para obtener libros de la API de OpenLibrary
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
            console.error(`Error obteniendo libros de ${subject}:`, error);
        }
    }
    
    return books.slice(0, 15); // Máximo 15 libros
}

// Libros de fallback si fallan las APIs
function getFallbackBooks() {
    return [
        { title: "Cien años de soledad", author: "Gabriel García Márquez", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" },
        { title: "El nombre del viento", author: "Patrick Rothfuss", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" },
        { title: "1984", author: "George Orwell", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" },
        { title: "Kafka en la orilla", author: "Haruki Murakami", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" },
        { title: "El código Da Vinci", author: "Dan Brown", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" }
    ];
}

// Imágenes de ejemplo para historias (opcional)
const sampleImages = [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
];

async function initStories() {
    try {
        console.log('📖 Iniciando seeder de historias...');
        
        // Obtener todos los usuarios
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, avatar: true }
        });
        
        if (users.length === 0) {
            console.log('❌ No hay usuarios en la base de datos. Ejecuta primero: node scripts/init-users.js');
            return;
        }
        
        console.log(`👥 Encontrados ${users.length} usuarios`);
        
        // Limpiar historias existentes
        await prisma.story.deleteMany({});
        console.log('🧹 Historias existentes eliminadas');
        
        // Obtener libros reales
        const realBooks = await getRealBooks();
        console.log(`📚 Libros disponibles para historias: ${realBooks.length}`);
        
        // Crear historias de ejemplo
        const storiesToCreate = [];
        const numStories = Math.min(users.length * 3, 50); // Máximo 3 historias por usuario, máximo 50 total
        
        for (let i = 0; i < numStories; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            // Siempre asignar un libro (100% de las historias tienen libro)
            const randomBook = realBooks.length > 0 ? realBooks[Math.floor(Math.random() * realBooks.length)] : null;
            
            // Generar contenido específico del libro
            const randomContent = randomBook ? 
                generateBookSpecificContent(randomBook) : 
                sampleStoryContents[Math.floor(Math.random() * sampleStoryContents.length)];
            
            // Crear fecha aleatoria en las últimas 24 horas
            const createdAt = new Date();
            createdAt.setHours(createdAt.getHours() - Math.random() * 24);
            
            // Las historias expiran en 24 horas desde su creación
            const expiresAt = new Date(createdAt);
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            storiesToCreate.push({
                userId: randomUser.id,
                content: randomContent,
                bookTitle: randomBook?.title || null, // Título del libro relacionado
                bookCover: randomBook?.cover || null, // Portada del libro (siempre visible)
                createdAt,
                expiresAt
            });
        }
        
        // Crear historias en lotes
        const createdStories = await prisma.story.createMany({
            data: storiesToCreate
        });
        
        console.log('🎉 Seeder de historias completado exitosamente!');
        console.log(`📊 Estadísticas:`);
        console.log(`   - Historias creadas: ${createdStories.count}`);
        console.log(`   - Usuarios participantes: ${new Set(storiesToCreate.map(s => s.userId)).size}`);
        console.log(`   - Historias con libros: ${storiesToCreate.filter(s => s.bookTitle).length}`);
        console.log(`   - Portadas reales: ${storiesToCreate.filter(s => s.bookCover).length}`);
        
        // Mostrar algunas historias de ejemplo
        const sampleStories = await prisma.story.findMany({
            take: 5,
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        
        console.log('\n📝 Ejemplos de historias creadas:');
        sampleStories.forEach((story, index) => {
            const bookInfo = story.bookTitle ? ` | Libro: ${story.bookTitle}` : '';
            const imageInfo = story.imageUrl ? ' | Con imagen' : '';
            console.log(`   ${index + 1}. ${story.user.name || story.user.username}: "${story.content}"${bookInfo}${imageInfo}`);
        });
        
    } catch (error) {
        console.error('❌ Error en el seeder de historias:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initStories()
        .then(() => {
            console.log('🎉 Seeder de historias completado!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error en el seeder de historias:', error);
            process.exit(1);
        });
}

module.exports = { initStories };
