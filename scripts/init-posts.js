const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos de ejemplo para posts
const samplePosts = [
    {
        text: "Acabo de terminar 'Cien años de soledad' de Gabriel García Márquez. ¡Qué obra maestra! La forma en que entrelaza la historia de la familia Buendía con la historia de Macondo es simplemente increíble. ¿Alguien más ha leído esta novela?",
        bookTitle: "Cien años de soledad",
        bookAuthor: "Gabriel García Márquez",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Recomiendo mucho 'El nombre del viento' de Patrick Rothfuss. La prosa es hermosa y la historia de Kvothe es fascinante. Es perfecto para los amantes de la fantasía épica.",
        bookTitle: "El nombre del viento",
        bookAuthor: "Patrick Rothfuss",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Estoy leyendo '1984' de George Orwell y me está impactando mucho. La distopía que describe es escalofriante y muy relevante en nuestros tiempos. ¿Qué opinan de esta obra?",
        bookTitle: "1984",
        bookAuthor: "George Orwell",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "¡Acabo de descubrir a Haruki Murakami! Estoy leyendo 'Kafka en la orilla' y me encanta su estilo surrealista. Es como un sueño lúcido en forma de novela.",
        bookTitle: "Kafka en la orilla",
        bookAuthor: "Haruki Murakami",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Para los amantes del misterio, 'El código Da Vinci' de Dan Brown es una lectura obligada. La trama es trepidante y llena de giros inesperados.",
        bookTitle: "El código Da Vinci",
        bookAuthor: "Dan Brown",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Estoy releyendo 'El señor de los anillos' y cada vez me sorprende más la riqueza del mundo que creó Tolkien. La Tierra Media es un universo completo.",
        bookTitle: "El señor de los anillos",
        bookAuthor: "J.R.R. Tolkien",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "¿Alguien ha leído 'Sapiens' de Yuval Noah Harari? Es una perspectiva fascinante sobre la evolución de la humanidad. Muy recomendado para entender nuestro pasado.",
        bookTitle: "Sapiens",
        bookAuthor: "Yuval Noah Harari",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Acabo de terminar 'La sombra del viento' de Carlos Ruiz Zafón. La Barcelona que describe es mágica y la historia de Daniel Sempere me ha cautivado completamente.",
        bookTitle: "La sombra del viento",
        bookAuthor: "Carlos Ruiz Zafón",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Para los que buscan algo diferente, 'El alquimista' de Paulo Coelho es una fábula hermosa sobre seguir nuestros sueños. Muy inspirador.",
        bookTitle: "El alquimista",
        bookAuthor: "Paulo Coelho",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Estoy leyendo 'Dune' de Frank Herbert y me está fascinando el mundo de Arrakis. La política, la ecología, la religión... todo está tan bien construido.",
        bookTitle: "Dune",
        bookAuthor: "Frank Herbert",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Acabo de empezar 'El juego de Ender' de Orson Scott Card. La estrategia militar y la psicología del protagonista son fascinantes. ¿Alguien más lo ha leído?",
        bookTitle: "El juego de Ender",
        bookAuthor: "Orson Scott Card",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Recomiendo 'Los pilares de la Tierra' de Ken Follett. La construcción de una catedral en la Edad Media es el escenario perfecto para una historia épica.",
        bookTitle: "Los pilares de la Tierra",
        bookAuthor: "Ken Follett",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Estoy leyendo 'El perfume' de Patrick Süskind y me está sorprendiendo mucho. La descripción de los olores es increíblemente vívida.",
        bookTitle: "El perfume",
        bookAuthor: "Patrick Süskind",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Para los amantes de la ciencia ficción, 'Fundación' de Isaac Asimov es una lectura obligada. La psicohistoria es un concepto fascinante.",
        bookTitle: "Fundación",
        bookAuthor: "Isaac Asimov",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    },
    {
        text: "Acabo de terminar 'El guardián entre el centeno' de J.D. Salinger. La voz narrativa de Holden Caulfield es única y muy auténtica.",
        bookTitle: "El guardián entre el centeno",
        bookAuthor: "J.D. Salinger",
        bookCover: "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    }
];

// Comentarios de ejemplo
const sampleComments = [
    "¡Totalmente de acuerdo! Es una obra maestra.",
    "Me encanta ese libro, lo he leído varias veces.",
    "Gracias por la recomendación, lo voy a buscar.",
    "¿Dónde lo compraste?",
    "Yo también lo estoy leyendo ahora mismo.",
    "Excelente elección de lectura.",
    "¿Has leído otros libros del mismo autor?",
    "Me gustó mucho, aunque el final me sorprendió.",
    "Es uno de mis favoritos también.",
    "¿Recomiendas algún otro libro similar?",
    "¡Qué coincidencia! Acabo de terminarlo también.",
    "La película no le hace justicia al libro.",
    "¿Sabías que hay una secuela?",
    "Me encanta cómo describe los personajes.",
    "Es perfecto para una tarde lluviosa.",
    "¿Alguna vez has conocido al autor?",
    "La traducción es excelente.",
    "Me recordó a otro libro que leí...",
    "¿Cuánto tiempo te tomó leerlo?",
    "Definitivamente lo voy a releer."
];

async function initPosts() {
    try {
        console.log('🌱 Iniciando seeder de posts...');
        
        // Obtener todos los usuarios
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, avatar: true }
        });
        
        if (users.length === 0) {
            console.log('❌ No hay usuarios en la base de datos. Ejecuta primero: node scripts/init-users.js');
            return;
        }
        
        console.log(`📚 Encontrados ${users.length} usuarios`);
        
        // Limpiar datos existentes (en orden correcto por las claves foráneas)
        await prisma.like.deleteMany({});
        await prisma.postComment.deleteMany({});
        await prisma.post.deleteMany({});
        console.log('🧹 Posts, comentarios y likes existentes eliminados');
        
        // Crear posts de ejemplo
        const createdPosts = [];
        for (let i = 0; i < samplePosts.length; i++) {
            const postData = samplePosts[i];
            const randomUser = users[Math.floor(Math.random() * users.length)];
            
            const post = await prisma.post.create({
                data: {
                    userId: randomUser.id,
                    text: postData.text,
                    bookTitle: postData.bookTitle,
                    bookAuthor: postData.bookAuthor,
                    bookCover: postData.bookCover,
                    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
                }
            });
            
            createdPosts.push(post);
            console.log(`✅ Post creado: "${postData.bookTitle}" por ${randomUser.name || randomUser.username}`);
        }
        
        // Crear comentarios de ejemplo
        console.log('💬 Creando comentarios de ejemplo...');
        for (const post of createdPosts) {
            const numComments = Math.floor(Math.random() * 5) + 1; // 1-5 comentarios por post
            
            for (let i = 0; i < numComments; i++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
                
                await prisma.postComment.create({
                    data: {
                        postId: post.id,
                        userId: randomUser.id,
                        text: randomComment,
                        createdAt: new Date(post.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) // Dentro de 24h del post
                    }
                });
            }
        }
        
        // Crear algunos likes de ejemplo
        console.log('❤️ Creando likes de ejemplo...');
        for (const post of createdPosts) {
            const numLikes = Math.floor(Math.random() * 8) + 1; // 1-8 likes por post
            const likedUsers = new Set();
            
            for (let i = 0; i < numLikes; i++) {
                let randomUser;
                do {
                    randomUser = users[Math.floor(Math.random() * users.length)];
                } while (likedUsers.has(randomUser.id) || randomUser.id === post.userId);
                
                likedUsers.add(randomUser.id);
                
                await prisma.like.create({
                    data: {
                        userId: randomUser.id,
                        postId: post.id,
                        createdAt: new Date(post.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
                    }
                });
            }
        }
        
        console.log('🎉 Seeder de posts completado exitosamente!');
        console.log(`📊 Estadísticas:`);
        console.log(`   - Posts creados: ${createdPosts.length}`);
        console.log(`   - Comentarios creados: ${await prisma.postComment.count()}`);
        console.log(`   - Likes creados: ${await prisma.like.count()}`);
        
    } catch (error) {
        console.error('❌ Error en el seeder de posts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initPosts();
}

module.exports = { initPosts };
