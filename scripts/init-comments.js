const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Comentarios de ejemplo en español
const sampleComments = [
    "¡Me encanta este libro! Lo leí el año pasado y me fascinó.",
    "Totalmente de acuerdo. Es una obra maestra de la literatura.",
    "¿Alguien más se sintió así después de leerlo?",
    "Increíble recomendación, gracias por compartir.",
    "Lo tengo en mi lista de pendientes desde hace tiempo.",
    "La portada es preciosa, ¿dónde lo compraste?",
    "Este autor nunca decepciona, todas sus obras son geniales.",
    "¿Hay una secuela? Me quedé con ganas de más.",
    "Lo leí en un día, no pude parar de leer.",
    "Mi libro favorito del año sin duda.",
    "¿Alguien sabe si hay una película basada en este libro?",
    "La prosa es simplemente hermosa.",
    "Me identifico mucho con el protagonista.",
    "¿Recomiendas otros libros del mismo autor?",
    "El final me dejó sin palabras.",
    "Perfecto para leer en una tarde lluviosa.",
    "¿Dónde puedo conseguir la edición ilustrada?",
    "Este libro cambió mi perspectiva sobre la vida.",
    "Lo regalé a todos mis amigos, es imprescindible.",
    "¿Hay algún club de lectura que lo esté leyendo?",
    "La traducción es excelente, se nota el cuidado.",
    "Me encanta cómo describe los paisajes.",
    "¿Alguien más lloró en el capítulo 15?",
    "Este libro debería ser lectura obligatoria.",
    "La construcción de personajes es magistral.",
    "¿Hay algún podcast que hable sobre este libro?",
    "Lo leí en inglés y en español, ambas versiones son geniales.",
    "Este libro me inspiró a viajar.",
    "¿Conoces otros libros similares?",
    "La edición de tapa dura es preciosa.",
    "Este libro me acompañó en un momento difícil.",
    "¿Hay algún grupo de discusión sobre este libro?",
    "La ambientación es perfecta para la historia.",
    "Lo recomiendo a todo el mundo.",
    "¿Alguien más notó las referencias históricas?",
    "Este libro me hizo reflexionar mucho.",
    "La prosa es tan fluida que se lee solo.",
    "¿Hay algún documental sobre el autor?",
    "Este libro me recordó por qué amo leer.",
    "¿Alguien más se quedó pensando en el final?",
    "La edición especial vale cada peso.",
    "Este libro me enseñó algo nuevo sobre mí.",
    "¿Hay algún mapa del mundo del libro?",
    "La música que mencionan en el libro es increíble.",
    "Este libro me hizo reír y llorar.",
    "¿Alguien más se imaginó los personajes así?",
    "La investigación histórica es impresionante.",
    "Este libro me conectó con mi familia.",
    "¿Hay algún foro donde discutir este libro?",
    "La edición de bolsillo es perfecta para viajar."
];

// Comentarios con libros (para posts que tienen libros asociados)
const bookComments = [
    "¡Este libro es increíble! Lo leí en un fin de semana.",
    "Me encanta cómo el autor desarrolla los personajes.",
    "¿Alguien más se sintió así después de leerlo?",
    "La portada es preciosa, ¿dónde lo compraste?",
    "Este libro me cambió la perspectiva sobre la vida.",
    "¿Hay una secuela? Me quedé con ganas de más.",
    "Lo regalé a todos mis amigos, es imprescindible.",
    "¿Alguien sabe si hay una película basada en este libro?",
    "La prosa es simplemente hermosa.",
    "¿Recomiendas otros libros del mismo autor?",
    "El final me dejó sin palabras.",
    "Este libro debería ser lectura obligatoria.",
    "¿Hay algún club de lectura que lo esté leyendo?",
    "La traducción es excelente, se nota el cuidado.",
    "Me encanta cómo describe los paisajes.",
    "¿Alguien más lloró en el capítulo 15?",
    "Este libro me inspiró a viajar.",
    "¿Conoces otros libros similares?",
    "La edición de tapa dura es preciosa.",
    "Este libro me acompañó en un momento difícil."
];

async function initComments() {
    try {
        console.log('🚀 Iniciando creación de comentarios...');

        // Obtener posts existentes
        const posts = await prisma.post.findMany({
            include: {
                book: true,
                user: true
            }
        });

        if (posts.length === 0) {
            console.log('❌ No hay posts en la base de datos. Ejecuta primero init-posts.js');
            return;
        }

        // Obtener usuarios existentes
        const users = await prisma.user.findMany();
        if (users.length === 0) {
            console.log('❌ No hay usuarios en la base de datos. Ejecuta primero init-users.js');
            return;
        }

        console.log(`📊 Encontrados ${posts.length} posts y ${users.length} usuarios`);

        const createdComments = [];

        // Crear comentarios para cada post
        for (const post of posts) {
            // Número aleatorio de comentarios por post (1-5)
            const numComments = Math.floor(Math.random() * 5) + 1;
            
            for (let i = 0; i < numComments; i++) {
                // Seleccionar usuario aleatorio (diferente al autor del post)
                let randomUser;
                do {
                    randomUser = users[Math.floor(Math.random() * users.length)];
                } while (randomUser.id === post.userId);

                // Seleccionar comentario aleatorio
                let commentText;
                let bookData = null;

                // Si el post tiene un libro asociado, usar comentarios con libros
                if (post.book) {
                    commentText = bookComments[Math.floor(Math.random() * bookComments.length)];
                    // 30% de probabilidad de que el comentario también mencione el libro
                    if (Math.random() < 0.3) {
                        bookData = {
                            title: post.book.title,
                            author: post.book.author,
                            cover: post.book.imageUrl
                        };
                    }
                } else {
                    commentText = sampleComments[Math.floor(Math.random() * sampleComments.length)];
                }

                // Crear comentario
                const comment = await prisma.postComment.create({
                    data: {
                        postId: post.id,
                        userId: randomUser.id,
                        text: commentText,
                        bookTitle: bookData?.title || null,
                        bookAuthor: bookData?.author || null,
                        bookCover: bookData?.cover || null,
                        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
                    }
                });

                createdComments.push(comment);
            }
        }

        console.log(`✅ Creados ${createdComments.length} comentarios exitosamente`);
        console.log(`📈 Promedio de ${(createdComments.length / posts.length).toFixed(1)} comentarios por post`);

        // Estadísticas adicionales
        const commentsWithBooks = createdComments.filter(c => c.bookTitle).length;
        console.log(`📚 ${commentsWithBooks} comentarios incluyen información de libros`);

    } catch (error) {
        console.error('❌ Error creando comentarios:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initComments();
}

module.exports = { initComments };
